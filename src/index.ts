import { zValidator } from '@hono/zod-validator';
import { count, eq, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { db } from './db';
import { todos, todosInsertSchema, todosUpdateSchema } from './db/schema';

const API_URL = String(Bun.env.API_URL);
const app = new Hono();

app.use(
    '/*', // Apply CORS to all routes
    cors({
        origin: ['*.rocketicg.cl'], // Allowed origins
        allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Allowed HTTP methods
        allowHeaders: ['Content-Type', 'Authorization'], // Allowed request headers
        credentials: true, // Allow sending cookies/credentials
        maxAge: 86400, // Preflight request cache duration (in seconds)
    }),
);

app.get('/', c => {
    return c.text('Hello Hono!');
});

app.get('/api', async c => {
    return c.json({
        todos: `${API_URL}/todos`,
    });
});

app.get('/api/todos', async c => {
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
            orderBy: [sql`${todos.completed} desc nulls first`, sql`${todos.updated_at} DESC`],
            extras: {
                url: sql<string>`${API_URL} || '/todos/' || ${todos.id}`.as('url'),
            },
        }),
    });
});

app.post('/api/todos', zValidator('json', todosInsertSchema), async c => {
    const validated = c.req.valid('json');
    const [todo] = await db.insert(todos).values(validated).returning();

    return c.json(todo);
});

app.get('/api/todos/:id', async c => {
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

app.patch('/api/todos/:id', zValidator('json', todosUpdateSchema), async c => {
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

    const validated = c.req.valid('json');
    const [updatedTodo] = await db.update(todos).set(validated).where(eq(todos.id, id)).returning();

    return c.json(updatedTodo);
});

app.patch('/api/todos/:id/toggle-completed', async c => {
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

    const [updatedTodo] = await db
        .update(todos)
        .set({
            completed: todo.completed ? null : new Date(),
        })
        .where(eq(todos.id, id))
        .returning();

    return c.json(updatedTodo);
});

app.delete('/api/todos/:id', async c => {
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

    const [deletedTodo] = await db.update(todos).set({ deleted_at: new Date() }).where(eq(todos.id, id)).returning();

    return c.json(deletedTodo);
});

export default app;
