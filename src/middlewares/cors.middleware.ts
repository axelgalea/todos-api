import { cors } from 'hono/cors';

export const corsMiddleware = cors({
    origin: ['http://localhost:4321'],
    allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Allowed HTTP methods
    allowHeaders: ['Content-Type', 'Authorization'], // Allowed request headers
    credentials: true, // Allow sending cookies/credentials
    maxAge: 600, // Preflight request cache duration (in seconds)
});
