import * as z from 'zod';

export const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(1).max(32),
});

export const registerSchema = z.object({
    name: z.string().min(1).max(71),
    email: z.email(),
    password: z.string().min(1).max(32),
});
