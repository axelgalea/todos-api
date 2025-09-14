import { eq } from 'drizzle-orm';
import type { Context } from 'hono';
import { setCookie } from 'hono/cookie';
import { sign } from 'hono/jwt';
import { DateTime, Duration } from 'luxon';
import { config } from '@/config';
import { db } from '@/db';
import { type User, users } from '@/db/schema';

export const generateTokens = async (user: User) => {
    const token_exp = Math.floor(DateTime.now().plus({ minutes: config.JWT_EXPIRATION_IN_MINUTES }).toSeconds());
    const refresh_token_exp = Math.floor(DateTime.now().plus({ days: config.JWT_REFRESH_EXPIRATION_IN_DAYS }).toSeconds());

    const payload = {
        sub: user.id,
        exp: token_exp,
    };

    const token = await sign(payload, config.JWT_SECRET);
    const refresh_token = await sign({ sub: user.id, exp: refresh_token_exp }, config.JWT_SECRET);

    return { token, token_exp, refresh_token };
};

export const setTokenCookie = async (c: Context, token: string) => {
    setCookie(c, 'x-auth-token', token, {
        httpOnly: true,
        secure: true,
        expires: DateTime.now().plus({ minutes: config.JWT_EXPIRATION_IN_MINUTES }).toJSDate(),
        maxAge: Duration.fromObject({ minutes: config.JWT_EXPIRATION_IN_MINUTES }).toMillis(),
        sameSite: 'Strict',
    });
};

export const updateRefreshToken = async (id: string, refresh_token: string | null) => {
    await db.update(users).set({ refresh_token }).where(eq(users.id, id));
};

export const tokenHasExpired = (token_exp: number) => {
    return token_exp < DateTime.now().toSeconds();
};

export async function issueTokens(c: Context, user: User) {
    const { token, token_exp, refresh_token } = await generateTokens(user);

    setTokenCookie(c, token);

    await updateRefreshToken(user.id, refresh_token);

    return {
        payload: {
            sub: user.id,
            exp: token_exp,
        },
    };
}

export const verifyPassword = async (input: string, original: string) => {
    return await Bun.password.verify(input, original);
};
