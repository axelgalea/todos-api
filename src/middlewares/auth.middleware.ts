import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { decode, type JwtVariables, verify } from 'hono/jwt';
import { JwtTokenExpired } from 'hono/utils/jwt/types';
import { config } from '@/config';
import { db } from '@/db';
import { issueTokens, updateRefreshToken } from '@/utils/auth.utils';

export type JwtPayload = {
    sub: string;
    exp: number;
};

type Variables = JwtVariables<JwtPayload>;

export const authMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const token = getCookie(c, 'x-auth-token');

    if (!token) {
        return c.json({ message: 'Unauthorized', cause: 'missing_token' }, 401);
    }

    try {
        const payload = await verify(token, config.JWT_SECRET);
        c.set('jwtPayload', payload);
        await next();
    } catch (error) {
        if (!(error instanceof JwtTokenExpired)) {
            return c.json({ message: 'Unauthorized', cause: 'invalid_token' }, 401);
        }
    }

    const decoded = decode(token);
    const payload = decoded.payload as JwtPayload;

    const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, payload.sub),
    });

    if (!user || user.refresh_token === null) {
        return c.json({ message: 'Unauthorized', cause: 'missing_refresh_token' }, 401);
    }

    try {
        await verify(user.refresh_token, config.JWT_SECRET);
        const { payload: newPayload } = await issueTokens(c, user);
        c.set('jwtPayload', newPayload);

        await next();
    } catch (error) {
        console.error(error);
        await updateRefreshToken(payload.sub, null);

        return c.json({ message: 'Unauthorized', cause: 'token_expired' }, 401);
    }
});

export const alreadyLoggedInMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const token = getCookie(c, 'x-auth-token');

    if (token) {
        return c.json({ message: 'Unauthorized', cause: 'already_logged_in' }, 401);
    }

    await next();
});
