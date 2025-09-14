import * as z from 'zod';

export const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(1).max(32),
});
