import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { type JwtVariables, verify } from 'hono/jwt';
import { config } from '@/config';
import { db } from '@/db';
import { issueTokens, tokenHasExpired, updateRefreshToken } from '@/utils/auth.utils';

export type JwtPayload = {
    sub: string;
    exp: number;
};

type Variables = JwtVariables<JwtPayload>;

export const authMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const token = getCookie(c, 'x-auth-token');

    if (!token) {
        c.status(401);
        return c.json({ message: 'Unauthorized' });
    }

    const payload = (await verify(token, config.JWT_SECRET)) as JwtPayload;

    if (tokenHasExpired(payload.exp) === false) {
        c.set('jwtPayload', payload);
    } else {
        const user = await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.id, payload.sub),
        });

        if (!user || user.refresh_token === null) {
            c.status(401);
            return c.json({ message: 'Unauthorized', cause: 'no_refresh_token' });
        }

        const refreshToken = await verify(user.refresh_token, config.JWT_SECRET);

        if (tokenHasExpired(refreshToken.exp!)) {
            await updateRefreshToken(payload.sub, null);
            c.status(401);
            return c.json({ message: 'Unauthorized', cause: 'token_expired' });
        }

        const { payload: newPayload } =  await issueTokens(c, user);

        c.set('jwtPayload', newPayload);
    }

    await next();
});

export const alreadyLoggedInMiddleware = createMiddleware<{ Variables: Variables }>(async (c, next) => {
    const token = getCookie(c, 'x-auth-token');

    if (token) {
        c.status(401);
        return c.json({ message: 'Unauthorized', cause: 'already_logged_in' });
    }

    await next();
});
