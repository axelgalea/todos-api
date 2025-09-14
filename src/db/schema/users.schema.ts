import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createSelectSchema } from 'drizzle-zod';
import type * as z from 'zod';

export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    password: text('password').notNull(),
    role: text('role', { enum: ['admin', 'user'] })
        .notNull()
        .default('user'),
    refresh_token: text('refresh_token'),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at')
        .defaultNow()
        .$onUpdate(() => new Date()),
    deleted_at: timestamp('deleted_at'),
});

export const usersSelectSchema = createSelectSchema(users);

export const usersInsertSchema = createSelectSchema(users).omit({
    id: true,
    role: true,
    refresh_token: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
});

export const usersUpdateSchema = createSelectSchema(users).omit({
    created_at: true,
    updated_at: true,
});

export type User = z.infer<typeof usersSelectSchema>;
