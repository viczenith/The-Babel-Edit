/**
 * Fix JSON image URL columns (images jsonb) in the database.
 * Run: node scripts/fix-json-urls.js
 */
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const connStr = process.env.DATABASE_URL;
const url = new URL(connStr);
const client = new pg.Client({
  host: url.hostname,
  port: parseInt(url.port) || 5432,
  database: url.pathname.slice(1),
  user: decodeURIComponent(url.username),
  password: decodeURIComponent(url.password),
  ssl: connStr.includes('sslmode=require') ? { rejectUnauthorized: false } : false,
});

await client.connect();
console.log('Connected to PostgreSQL');

// Fix products.images (jsonb array of URL strings)
const r1 = await client.query(
  `UPDATE "products" SET "images" = REPLACE("images"::text, 'http://localhost:5000', '')::jsonb WHERE "images"::text LIKE '%http://localhost:5000%'`
);
console.log(`products.images: ${r1.rowCount} rows fixed`);

// Fix order_items.productImage
const r2 = await client.query(
  `UPDATE "order_items" SET "productImage" = REPLACE("productImage", 'http://localhost:5000', '') WHERE "productImage" LIKE 'http://localhost:5000%'`
);
console.log(`order_items.productImage: ${r2.rowCount} rows fixed`);

// Verify
const check = await client.query('SELECT "id", "name", "imageUrl", "images" FROM "products" LIMIT 2');
for (const p of check.rows) {
  console.log(`\nProduct "${p.name}":`);
  console.log(`  imageUrl: ${p.imageUrl}`);
  console.log(`  images: ${JSON.stringify(p.images)}`);
}

const slides = await client.query('SELECT "id", "imageUrl" FROM "hero_slides" LIMIT 3');
for (const s of slides.rows) {
  console.log(`HeroSlide: ${s.imageUrl}`);
}

await client.end();
console.log('\nDone!');
