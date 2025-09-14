import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { db } from '@/db';
import { loginSchema } from '@/db/schema/auth.schema';
import { users, usersInsertSchema } from '@/db/schema/users.schema';
import { alreadyLoggedInMiddleware } from '@/middlewares/auth.middleware';
import { issueTokens, verifyPassword } from '@/utils/auth.utils';

export const routesAuth = new Hono();

routesAuth.use('*', alreadyLoggedInMiddleware);

routesAuth.post('/login', zValidator('json', loginSchema), async c => {
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

routesAuth.post('/register', zValidator('json', usersInsertSchema), async c => {
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
            password,
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
