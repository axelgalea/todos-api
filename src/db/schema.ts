import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { createInsertSchema, createUpdateSchema } from 'drizzle-zod';

export const todos = pgTable('todos', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    description: text('description'),
    completed: timestamp('completed_at'),
    created_at: timestamp('created_at').defaultNow(),
    updated_at: timestamp('updated_at')
        .defaultNow()
        .$onUpdate(() => new Date()),
    deleted_at: timestamp('deleted_at'),
});

export const todosInsertSchema = createInsertSchema(todos);
export const todosUpdateSchema = createUpdateSchema(todos);
