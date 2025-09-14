import { SQL } from 'bun';
import type { ExtractTablesWithRelations } from 'drizzle-orm';
import { type BunSQLQueryResultHKT, drizzle } from 'drizzle-orm/bun-sql';
import type { PgTransaction } from 'drizzle-orm/pg-core';
import * as schema from './schema';

const pg = new SQL(String(Bun.env.DB_URL));

export const db = drizzle({ client: pg, schema });

export type DBTransaction = PgTransaction<BunSQLQueryResultHKT, typeof schema, ExtractTablesWithRelations<typeof schema>>;
