import { sql } from 'drizzle-orm';

type Txid = number;

export async function generateTxId(tx: any): Promise<Txid> {
    // The ::xid cast strips off the epoch, giving you the raw 32-bit value
    // that matches what PostgreSQL sends in logical replication streams
    // (and then exposed through Electric which we'll match against
    // in the client).
    const result = await tx.execute(sql`SELECT pg_current_xact_id()::xid::text as txid`);
    const txid = result[0]?.txid;

    if (txid === undefined) {
        throw new Error(`Failed to get transaction ID`);
    }

    return parseInt(txid, 10);
}
