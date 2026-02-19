import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: true });
await client.connect();
const r = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`);
console.log(r.rows.map(r => r.table_name));
await client.end();
