import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from '@electric-sql/client';
import { zValidator } from '@hono/zod-validator';
import { count, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { config } from '@/config';
import { db } from '@/db';
import { todos, todosInsertSchema, todosUpdateSchema } from '@/db/schema';
import { generateTxId } from '@/db/utils';

const { API_URL, ELECTRIC_URL } = config;
export const routesTodos = new Hono();

routesTodos.get('/shape', async c => {
    const electricUrl = new URL(`${ELECTRIC_URL}/v1/shape`);
    const url = new URL(c.req.url);

    // passthrough parameters from electric client
    url.searchParams.forEach((value, key) => {
        if (ELECTRIC_PROTOCOL_QUERY_PARAMS.includes(key)) {
            electricUrl.searchParams.set(key, value);
        }
    });

    // set shape parameters
    // full spec: https://github.com/electric-sql/electric/blob/main/website/electric-api.yaml
    electricUrl.searchParams.set('table', 'todos');
    // Where clause to filter rows in the table (optional).
    // originUrl.searchParams.set("where", "completed = true")

    // Select the columns to sync (optional)
    // originUrl.searchParams.set("columns", "id,text,completed")

    const response = await fetch(electricUrl);
    const headers = new Headers(response.headers);
    headers.delete('content-encoding');
    headers.delete('content-length');

    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
});

routesTodos.get('/', async c => {
    const queries = c.req.queries();
    const limit = queries.limit ? parseInt(queries.limit[0], 10) : 10;
    const page = queries.page ? parseInt(queries.page[0], 10) : 1;

    const [result] = await db.select({ count: count() }).from(todos);

    const pages = Math.ceil(result.count / limit);
    const prev = page > 1 ? `${API_URL}/todos?page=${page - 1}&limit=${limit}` : null;
    const next = page < pages ? `${API_URL}/todos?page=${page + 1}&limit=${limit}` : null;

    return c.json({
        info: {
            count: result.count,
            pages: pages,
            next: next,
            prev: prev,
        },
        results: await db.query.todos.findMany({
            limit: limit,
            offset: (page - 1) * limit,
            where: (todos, { isNull }) => isNull(todos.deleted_at),
            orderBy: [sql`${todos.completed_at} desc nulls first`, sql`${todos.updated_at} DESC`],
            extras: {
                url: sql<string>`${API_URL} || '/todos/' || ${todos.id}`.as('url'),
            },
        }),
    });
});

routesTodos.get('/:id', async c => {
    const id = c.req.param().id;

    const todo = await db.query.todos.findFirst({
        where: (todos, { eq }) => eq(todos.id, id),
        extras: {
            url: sql<string>`${API_URL} || '/todos/' || ${todos.id}`.as('url'),
        },
    });

    if (!todo) {
        c.status(404);
        return c.json({ message: 'Not found' });
    }

    return c.json(todo);
});

routesTodos.post('/', zValidator('json', todosInsertSchema), async c => {
    try {
        const validated = c.req.valid('json');

        const response = await db.transaction(async tx => {
            const txid = await generateTxId(tx);
            const [todo] = await db.insert(todos).values(validated).returning();

            return {
                txid,
                todo,
            };
        });

        return c.json(response);
    } catch (error) {
        console.error(`Error creating todo:`, error);
        c.status(500);
        return c.json({
            error: 'Failed to create todo',
            details: error instanceof Error ? error.message : String(error),
        });
    }
});

routesTodos.patch('/:id', zValidator('json', todosUpdateSchema), async c => {
    try {
        const id = c.req.param().id;
        const validated = c.req.valid('json');

        const response = await db.transaction(async tx => {
            const txid = await generateTxId(tx);

            const [updatedTodo] = await tx
                .update(todos)
                .set({
                    ...validated,
                    updated_at: new Date(),
                })
                .where(eq(todos.id, id))
                .returning();

            if (!updatedTodo) {
                throw new Error('Not found');
            }

            return {
                txid,
                todo: updatedTodo,
            };
        });

        return c.json(response);
    } catch (error) {
        console.error(`Error updating todo:`, error);

        if (error instanceof Error && error.message === 'Not found') {
            c.status(404);
            return c.json({ error: 'Todo not found' });
        }

        c.status(500);

        return c.json({
            error: 'Failed to update todo',
            details: error instanceof Error ? error.message : String(error),
        });
    }
});

routesTodos.delete('/:id', async c => {
    try {
        const id = c.req.param().id;

        const response = await db.transaction(async tx => {
            const txid = await generateTxId(tx);

            const [deletedTodo] = await tx.update(todos).set({ deleted_at: new Date() }).where(eq(todos.id, id)).returning();

            if (!deletedTodo) {
                throw new Error('Not found');
            }

            return {
                txid,
                todo: deletedTodo,
            };
        });

        return c.json(response);
    } catch (error) {
        console.error(`Error deleting todo:`, error);

        if (error instanceof Error && error.message === 'Not found') {
            c.status(404);
            return c.json({ error: 'Todo not found' });
        }

        c.status(500);

        return c.json({
            error: 'Failed to delete todo',
            details: error instanceof Error ? error.message : String(error),
        });
    }
});
