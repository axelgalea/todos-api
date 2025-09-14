import { SQL } from 'bun';
import { drizzle } from 'drizzle-orm/bun-sql';
import * as schema from './schema';

const pg = new SQL(String(Bun.env.DB_URL));

export const db = drizzle({ client: pg, schema });
