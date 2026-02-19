/**
 * Fix image URLs in the database.
 * Replaces hardcoded localhost URLs with relative paths so they resolve dynamically.
 * 
 * Run: node scripts/fix-image-urls.js
 */

import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function fixUrls() {
  const connStr = process.env.DATABASE_URL;
  if (!connStr) { console.error('❌ DATABASE_URL not set'); process.exit(1); }
  
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
  console.log('✅ Connected to PostgreSQL\n');

  // Pattern: replace "http://localhost:5000/uploads/" with "/uploads/"
  // This makes all image URLs relative so they resolve dynamically per environment
  const patterns = [
    'http://localhost:5000',
    'http://localhost:5001',
    'http://localhost:5002',
    'http://localhost:5003',
  ];

  // Tables and columns that may contain image URLs
  const targets = [
    { table: 'products', columns: ['imageUrl', 'images'] },
    { table: 'users', columns: ['avatar'] },
    { table: 'hero_slides', columns: ['imageUrl'] },
    { table: 'highlight_cards', columns: ['imageUrl'] },
    { table: 'dashboard_config', columns: ['summerBannerBackgroundImage', 'landingPageBackgroundImage'] },
    { table: 'collections', columns: ['imageUrl'] },
    { table: 'testimonials', columns: ['avatar'] },
    { table: 'order_items', columns: ['productImage'] },
  ];

  let totalUpdated = 0;

  for (const { table, columns } of targets) {
    for (const col of columns) {
      for (const pattern of patterns) {
        try {
          // For text columns: simple REPLACE
          const result = await client.query(
            `UPDATE "${table}" SET "${col}" = REPLACE("${col}"::text, $1, '') WHERE "${col}"::text LIKE $2`,
            [pattern, `${pattern}%`]
          );
          if (result.rowCount > 0) {
            console.log(`   ✅ ${table}.${col}: replaced "${pattern}" in ${result.rowCount} rows`);
            totalUpdated += result.rowCount;
          }
        } catch (err) {
          // Column might not exist or be wrong type — skip silently
          if (!err.message.includes('does not exist')) {
            console.error(`   ⚠️ ${table}.${col}: ${err.message.slice(0, 80)}`);
          }
        }
      }
    }
  }

  // Also fix JSON array fields (products.images is a JSON array of URL strings)
  for (const pattern of patterns) {
    try {
      const result = await client.query(
        `UPDATE "products" SET "images" = REPLACE("images"::text, $1, '')::jsonb WHERE "images"::text LIKE $2`,
        [pattern, `%${pattern}%`]
      );
      if (result.rowCount > 0) {
        console.log(`   ✅ products.images (JSON): replaced "${pattern}" in ${result.rowCount} rows`);
        totalUpdated += result.rowCount;
      }
    } catch (err) {
      console.error(`   ⚠️ products.images JSON fix: ${err.message.slice(0, 80)}`);
    }
  }

  console.log(`\n📊 Total rows updated: ${totalUpdated}`);

  // Verify: show sample URLs
  console.log('\n📋 Sample image URLs after fix:');
  try {
    const products = await client.query('SELECT "id", "name", "imageUrl", "images" FROM "products" LIMIT 3');
    for (const p of products.rows) {
      console.log(`   Product "${p.name}": imageUrl=${p.imageUrl}`);
      if (p.images) {
        const imgs = typeof p.images === 'string' ? JSON.parse(p.images) : p.images;
        console.log(`     images: ${JSON.stringify(imgs).slice(0, 150)}`);
      }
    }
  } catch (e) { /* ignore */ }

  try {
    const slides = await client.query('SELECT "id", "imageUrl" FROM "hero_slides" LIMIT 3');
    for (const s of slides.rows) {
      console.log(`   HeroSlide: imageUrl=${s.imageUrl}`);
    }
  } catch (e) { /* ignore */ }

  await client.end();
  console.log('\n✅ URL fix complete!');
}

fixUrls().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
