import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQLITE_PATH = path.join(__dirname, '..', 'prisma', 'dev.db');

process.on('unhandledRejection', (err) => {
  console.error('UNHANDLED REJECTION:', err);
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err);
  process.exit(1);
});

const initSqlJs = (await import('sql.js')).default;
const SQL = await initSqlJs();
const fileBuffer = fs.readFileSync(SQLITE_PATH);
const db = new SQL.Database(fileBuffer);

const stmt = db.prepare('SELECT * FROM product_types');
const rows = [];
while (stmt.step()) { rows.push(stmt.getAsObject()); }
stmt.free();

console.log(`Found ${rows.length} ProductTypes in SQLite`);
console.log('Sample row:', JSON.stringify(rows[0], null, 2));

const pg = new PrismaClient({ log: ['error', 'warn'] });
await pg.$connect();
console.log('PG connected');

for (let i = 0; i < rows.length; i++) {
  const t = rows[i];
  console.log(`  [${i+1}/${rows.length}] Upserting: id=${t.id}, name="${t.name}", categoryId=${t.categoryId}`);
  try {
    await pg.productType.upsert({
      where: { id: t.id },
      update: {},
      create: {
        id: t.id,
        name: t.name,
        categoryId: t.categoryId,
        description: t.description || null,
        isActive: t.isActive === 1 || t.isActive === true,
        createdAt: new Date(t.createdAt),
        updatedAt: new Date(t.updatedAt),
      },
    });
    console.log(`  [${i+1}] OK`);
  } catch (e) {
    console.error(`  [${i+1}] ERROR:`, e.message);
    if (e.code) console.error(`  [${i+1}] CODE:`, e.code);
  }
}

console.log('Done!');
await pg.$disconnect();
db.close();
