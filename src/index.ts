import { Hono } from 'hono';
import { config } from '@/config';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { corsMiddleware } from '@/middlewares/cors.middleware';
import { loggerMiddleware } from '@/middlewares/logger.middleware';
import { routesAuth } from '@/routes/auth.routes';
import { routesTodos } from '@/routes/todos.routes';

const app = new Hono();

// Global middlewares
app.use('/*', corsMiddleware);
app.use(loggerMiddleware);

// Public routes
app.get('/', c => c.text('Hello Hono!'));
app.route('/auth', routesAuth);

// Protected routes
app.use('/api/*', authMiddleware);

app.get('/api', c =>
    c.json({
        todos: `${config.API_URL}/todos`,
    }),
);

app.route('/api/todos', routesTodos);

export default app;
