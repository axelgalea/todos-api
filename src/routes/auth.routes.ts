import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';

import { db } from '@/db';
import { users } from '@/db/schema/users.schema';
import { alreadyLoggedInMiddleware, authMiddleware } from '@/middlewares/auth.middleware';
import { loginSchema, registerSchema } from '@/schemas/auth.schema';
import { hashPassword, issueTokens, verifyPassword } from '@/utils/auth.utils';

export const routesAuth = new Hono();

routesAuth.post('/login', zValidator('json', loginSchema), alreadyLoggedInMiddleware, async c => {
    const { email, password } = c.req.valid('json');

    const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email),
    });

    if (!user || user.deleted_at !== null) {
        c.status(401);

        return c.json({
            message: 'Unauthorized',
            cause: 'invalid_credentials',
        });
    }

    const isValidPassword = await verifyPassword(password, user.password);

    if (!isValidPassword) {
        c.status(401);

        return c.json({
            message: 'Unauthorized',
            cause: 'invalid_credentials',
        });
    }

    await issueTokens(c, user);

    return c.json({
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            created_at: user.created_at,
            updated_at: user.updated_at,
        },
    });
});

routesAuth.get('/current-user', authMiddleware, async c => {
    const payload = await c.get('jwtPayload');

    return c.json({
        user: await db.query.users.findFirst({
            where: (users, { eq }) => eq(users.id, payload.sub),
            columns: {
                password: false,
                refresh_token: false,
            },
        }),
    });
});

routesAuth.post('/register', zValidator('json', registerSchema), alreadyLoggedInMiddleware, async c => {
    const { name, email, password } = c.req.valid('json');

    const user = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.email, email),
    });

    if (user) {
        c.status(400);

        return c.json({
            message: 'User already exists',
        });
    }

    const [newUser] = await db
        .insert(users)
        .values({
            name,
            email,
            password: await hashPassword(password),
        })
        .returning();

    await issueTokens(c, newUser);

    return c.json({
        user: {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            created_at: newUser.created_at,
            updated_at: newUser.updated_at,
        },
    });
});
