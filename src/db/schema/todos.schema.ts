import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import * as z from 'zod';

export const todos = pgTable('todos', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    completed_at: timestamp('completed_at'),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at')
        .defaultNow()
        .$onUpdate(() => new Date()),
    deleted_at: timestamp('deleted_at'),
});

export const todosSelectSchema = createSelectSchema(todos);

export const todosInsertSchema = createInsertSchema(todos).omit({
    id: true,
    completed_at: true,
    created_at: true,
    updated_at: true,
    deleted_at: true,
});

const basedUpdateSchema = createUpdateSchema(todos).omit({
    created_at: true,
    updated_at: true,
});

export const todosUpdateSchema = basedUpdateSchema.extend({
    completed_at: z.coerce.date().optional(),
});

export type Todo = z.infer<typeof todosSelectSchema>;
