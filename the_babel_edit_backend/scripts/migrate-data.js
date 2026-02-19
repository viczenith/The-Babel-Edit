/**
 * Data Migration Script: SQLite → PostgreSQL (Supabase)
 * Uses raw pg client (single connection) + sql.js to avoid Prisma pool issues.
 * Run: node scripts/migrate-data.js
 */

import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env') });
const SQLITE_PATH = path.join(__dirname, '..', 'prisma', 'dev.db');

if (!fs.existsSync(SQLITE_PATH)) {
  console.error('❌ SQLite database not found at:', SQLITE_PATH);
  process.exit(1);
}

// ── SQLite helpers ──────────────────────────────────────────
async function loadSqlite() {
  const initSqlJs = (await import('sql.js')).default;
  const SQL = await initSqlJs();
  return new SQL.Database(fs.readFileSync(SQLITE_PATH));
}

function queryAll(db, sql) {
  const stmt = db.prepare(sql);
  const rows = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  return rows;
}

// ── Value helpers ───────────────────────────────────────────
const toBool = (v) => v === 1 || v === true || v === '1' || v === 'true';
const toDate = (v) => { if (!v) return null; const d = new Date(v); return isNaN(d.getTime()) ? null : d; };
const toFloat = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const toInt = (v) => { const n = parseInt(v, 10); return isNaN(n) ? 0 : n; };
const toIntNull = (v) => { if (v === null || v === undefined) return null; const n = parseInt(v, 10); return isNaN(n) ? null : n; };
const toFloatNull = (v) => { if (v === null || v === undefined) return null; const n = parseFloat(v); return isNaN(n) ? null : n; };
const parseJson = (v) => { if (!v) return '[]'; try { return typeof v === 'string' ? v : JSON.stringify(v); } catch { return '[]'; } };
const now = () => new Date().toISOString();
const d = (v) => toDate(v)?.toISOString() || now();
const dNull = (v) => toDate(v)?.toISOString() || null;
const s = (v) => v || null; // string or null

// ── Main ────────────────────────────────────────────────────
async function migrate() {
  console.log('🔄 Starting data migration: SQLite → PostgreSQL (raw pg)...\n');

  const db = await loadSqlite();
  // Parse DATABASE_URL manually to avoid pg client parsing issues
  const connStr = process.env.DATABASE_URL;
  if (!connStr) { console.error('❌ DATABASE_URL not set'); process.exit(1); }
  
  const url = new URL(connStr);
  const useSSL = connStr.includes('sslmode=require') || connStr.includes('sslmode=verify');
  const client = new pg.Client({
    host: url.hostname,
    port: parseInt(url.port) || 5432,
    database: url.pathname.slice(1),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    ssl: useSSL ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 30000,
  });
  console.log(`   Host: ${url.hostname}, Port: ${url.port}, DB: ${url.pathname.slice(1)}, SSL: ${useSSL}`);
  await client.connect();
  console.log('✅ Connected to PostgreSQL\n');

  // Helper: upsert via raw SQL with ON CONFLICT
  async function upsertMany(label, emoji, selectSql, tableName, columns, conflictTarget, rowMapper) {
    try {
      const rows = queryAll(db, selectSql);
      console.log(`${emoji} ${label}: ${rows.length} records`);
      if (rows.length === 0) { console.log(`   ✅ ${label} — nothing to migrate`); return; }

      let ok = 0, fail = 0;
      for (const row of rows) {
        try {
          const values = rowMapper(row);
          const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
          const sql = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders}) ON CONFLICT (${conflictTarget.map(c => `"${c}"`).join(', ')}) DO NOTHING`;
          await client.query(sql, values);
          ok++;
        } catch (err) {
          fail++;
          console.error(`   ⚠️ ${label} row failed:`, err.message.slice(0, 120));
        }
      }
      console.log(`   ✅ ${label}: ${ok} ok, ${fail} failed`);
    } catch (err) {
      console.error(`   ❌ ${label} error:`, err.message);
    }
  }

  // ── 1. Users ──────────────────────────────────────────────
  await upsertMany('Users', '👤', 'SELECT * FROM users', 'users',
    ['id','email','password','firstName','lastName','phone','googleId','refreshToken','avatar','isVerified','isAgree','isSuspended','role','isPrimary','createdAt','updatedAt'],
    ['id'],
    r => [r.id, r.email, s(r.password), s(r.firstName), s(r.lastName), s(r.phone), s(r.googleId), s(r.refreshToken), s(r.avatar), toBool(r.isVerified), toBool(r.isAgree), toBool(r.isSuspended), r.role || 'USER', toBool(r.isPrimary), d(r.createdAt), d(r.updatedAt)]
  );

  // ── 2. SuperAdminTokens ───────────────────────────────────
  await upsertMany('SuperAdminTokens', '🔑', 'SELECT * FROM super_admin_tokens', 'super_admin_tokens',
    ['id','tokenHash','createdBy','createdAt','expiresAt','usedBy','usedAt','revoked','purpose'],
    ['id'],
    r => [r.id, r.tokenHash, r.createdBy, d(r.createdAt), d(r.expiresAt), s(r.usedBy), dNull(r.usedAt), toBool(r.revoked), s(r.purpose)]
  );

  // ── 3. Collections ────────────────────────────────────────
  await upsertMany('Collections', '📦', 'SELECT * FROM collections', 'collections',
    ['id','name','description','imageUrl','isActive','createdAt','updatedAt'],
    ['id'],
    r => [r.id, r.name, s(r.description), s(r.imageUrl), toBool(r.isActive), d(r.createdAt), d(r.updatedAt)]
  );

  // ── 4. ProductCategories ──────────────────────────────────
  await upsertMany('ProductCategories', '📂', 'SELECT * FROM product_categories', 'product_categories',
    ['id','name','slug','description','isActive','createdAt','updatedAt'],
    ['id'],
    r => [r.id, r.name, r.slug, s(r.description), toBool(r.isActive), d(r.createdAt), d(r.updatedAt)]
  );

  // ── 5. ProductTypes ───────────────────────────────────────
  await upsertMany('ProductTypes', '🏷️ ', 'SELECT * FROM product_types', 'product_types',
    ['id','name','categoryId','description','isActive','createdAt','updatedAt'],
    ['id'],
    r => [r.id, r.name, r.categoryId, s(r.description), toBool(r.isActive), d(r.createdAt), d(r.updatedAt)]
  );

  // ── 6. Products ───────────────────────────────────────────
  await upsertMany('Products', '🛍️ ', 'SELECT * FROM products', 'products',
    ['id','name','description','price','comparePrice','imageUrl','images','stock','sku','threshold','collectionId','typeId','categoryId','categoryName','sizes','colors','tags','weight','dimensions','isActive','isFeatured','discountPercentage','avgRating','reviewCount','createdAt','updatedAt'],
    ['id'],
    r => [r.id, r.name, s(r.description), toFloat(r.price), toFloatNull(r.comparePrice), r.imageUrl || '', parseJson(r.images), toInt(r.stock), s(r.sku), toIntNull(r.threshold), s(r.collectionId), s(r.typeId), s(r.categoryId), r.categoryName || 'clothes', parseJson(r.sizes), parseJson(r.colors), parseJson(r.tags), toFloatNull(r.weight), s(r.dimensions), toBool(r.isActive), toBool(r.isFeatured), toIntNull(r.discountPercentage), toFloat(r.avgRating), toInt(r.reviewCount), d(r.createdAt), d(r.updatedAt)]
  );

  // ── 7. Carts ──────────────────────────────────────────────
  await upsertMany('Carts', '🛒', 'SELECT * FROM carts', 'carts',
    ['id','userId','createdAt','updatedAt'],
    ['id'],
    r => [r.id, r.userId, d(r.createdAt), d(r.updatedAt)]
  );

  // ── 8. CartItems ──────────────────────────────────────────
  await upsertMany('CartItems', '📝', 'SELECT * FROM cart_items', 'cart_items',
    ['id','cartId','productId','quantity','size','color','createdAt','updatedAt'],
    ['id'],
    r => [r.id, r.cartId, r.productId, toInt(r.quantity) || 1, s(r.size), s(r.color), d(r.createdAt), d(r.updatedAt)]
  );

  // ── 9. Addresses ──────────────────────────────────────────
  await upsertMany('Addresses', '📍', 'SELECT * FROM addresses', 'addresses',
    ['id','userId','firstName','lastName','company','address1','address2','city','state','postalCode','country','phone','isDefault','createdAt','updatedAt'],
    ['id'],
    r => [r.id, r.userId, r.firstName, r.lastName, s(r.company), r.address1, s(r.address2), r.city, r.state, r.postalCode, r.country, s(r.phone), toBool(r.isDefault), d(r.createdAt), d(r.updatedAt)]
  );

  // ── 10. Orders ────────────────────────────────────────────
  await upsertMany('Orders', '📋', 'SELECT * FROM orders', 'orders',
    ['id','orderNumber','userId','status','paymentStatus','paymentMethod','paymentIntentId','subtotal','tax','shipping','discount','total','shippingAddressId','trackingNumber','estimatedDelivery','notes','cancelledAt','shippedAt','deliveredAt','createdAt','updatedAt'],
    ['id'],
    r => [r.id, r.orderNumber, r.userId, r.status || 'PENDING', r.paymentStatus || 'PENDING', s(r.paymentMethod), s(r.paymentIntentId), toFloat(r.subtotal), toFloat(r.tax), toFloat(r.shipping), toFloat(r.discount), toFloat(r.total), s(r.shippingAddressId), s(r.trackingNumber), dNull(r.estimatedDelivery), s(r.notes), dNull(r.cancelledAt), dNull(r.shippedAt), dNull(r.deliveredAt), d(r.createdAt), d(r.updatedAt)]
  );

  // ── 11. OrderItems ────────────────────────────────────────
  await upsertMany('OrderItems', '📦', 'SELECT * FROM order_items', 'order_items',
    ['id','orderId','productId','quantity','price','size','color','productName','productImage','createdAt','updatedAt'],
    ['id'],
    r => [r.id, r.orderId, r.productId, toInt(r.quantity) || 1, toFloat(r.price), s(r.size), s(r.color), r.productName || '', s(r.productImage), d(r.createdAt), d(r.updatedAt)]
  );

  // ── 12. Reviews ───────────────────────────────────────────
  await upsertMany('Reviews', '⭐', 'SELECT * FROM reviews', 'reviews',
    ['id','userId','productId','rating','title','comment','isVerified','createdAt','updatedAt'],
    ['id'],
    r => [r.id, r.userId, r.productId, toInt(r.rating) || 5, s(r.title), s(r.comment), toBool(r.isVerified), d(r.createdAt), d(r.updatedAt)]
  );

  // ── 13. WishlistItems ─────────────────────────────────────
  await upsertMany('WishlistItems', '❤️ ', 'SELECT * FROM wishlist_items', 'wishlist_items',
    ['id','userId','productId','createdAt'],
    ['id'],
    r => [r.id, r.userId, r.productId, d(r.createdAt)]
  );

  // ── 14. Testimonials ──────────────────────────────────────
  await upsertMany('Testimonials', '💬', 'SELECT * FROM testimonials', 'testimonials',
    ['id','author','text','avatar','createdAt','updatedAt'],
    ['id'],
    r => [r.id, r.author, r.text, s(r.avatar), d(r.createdAt), d(r.updatedAt)]
  );

  // ── 15. Feedbacks ─────────────────────────────────────────
  await upsertMany('Feedbacks', '📝', 'SELECT * FROM feedbacks', 'feedbacks',
    ['id','userId','type','message','pageUrl','isResolved','isFeatured','createdAt','updatedAt'],
    ['id'],
    r => [r.id, s(r.userId), r.type || 'GENERAL', r.message, s(r.pageUrl), toBool(r.isResolved), toBool(r.isFeatured), d(r.createdAt), d(r.updatedAt)]
  );

  // ── 16. HeroSlides ────────────────────────────────────────
  await upsertMany('HeroSlides', '🖼️ ', 'SELECT * FROM hero_slides', 'hero_slides',
    ['id','imageUrl','alt','description','position','createdAt','updatedAt'],
    ['id'],
    r => [r.id, r.imageUrl, s(r.alt), s(r.description), toInt(r.position), d(r.createdAt), d(r.updatedAt)]
  );

  // ── 17. HighlightCards ────────────────────────────────────
  await upsertMany('HighlightCards', '🃏', 'SELECT * FROM highlight_cards', 'highlight_cards',
    ['id','title','description','imageUrl','position','createdAt','updatedAt'],
    ['id'],
    r => [r.id, r.title, s(r.description), s(r.imageUrl), toInt(r.position), d(r.createdAt), d(r.updatedAt)]
  );

  // ── 18. DashboardConfig ───────────────────────────────────
  await upsertMany('DashboardConfig', '⚙️ ', 'SELECT * FROM dashboard_config', 'dashboard_config',
    ['id','summerBannerTitle','summerBannerDescription','summerBannerButtonText','summerBannerCountdownDays','summerBannerCountdownHours','summerBannerCountdownMinutes','summerBannerCountdownSeconds','summerBannerBackgroundImage','landingPageBackgroundMode','landingPageBackgroundImage','landingPageVideoUrl','landingPageTitle','landingPageSubtitle','landingPageButtonText','landingPageButtonLink','landingPageOverlayOpacity','createdAt','updatedAt'],
    ['id'],
    r => [r.id, r.summerBannerTitle || 'Summer Collection', r.summerBannerDescription || "Limited time offer", r.summerBannerButtonText || 'Shop Now', toInt(r.summerBannerCountdownDays), toInt(r.summerBannerCountdownHours), toInt(r.summerBannerCountdownMinutes), toInt(r.summerBannerCountdownSeconds), s(r.summerBannerBackgroundImage), r.landingPageBackgroundMode || 'NONE', s(r.landingPageBackgroundImage), s(r.landingPageVideoUrl), r.landingPageTitle || 'Welcome', r.landingPageSubtitle || 'Discover', r.landingPageButtonText || 'Shop Now', r.landingPageButtonLink || '/products', toInt(r.landingPageOverlayOpacity) || 40, d(r.createdAt), d(r.updatedAt)]
  );

  // ── 19. Announcements ─────────────────────────────────────
  await upsertMany('Announcements', '📢', 'SELECT * FROM announcements', 'announcements',
    ['id','title','message','type','linkText','linkUrl','backgroundColor','textColor','isActive','isDismissible','priority','startDate','endDate','createdAt','updatedAt'],
    ['id'],
    r => [r.id, r.title, r.message, r.type || 'INFO', s(r.linkText), s(r.linkUrl), s(r.backgroundColor), s(r.textColor), toBool(r.isActive), toBool(r.isDismissible), toInt(r.priority), dNull(r.startDate), dNull(r.endDate), d(r.createdAt), d(r.updatedAt)]
  );

  // ── 20. SiteSettings ──────────────────────────────────────
  await upsertMany('SiteSettings', '🔧', 'SELECT * FROM site_settings', 'site_settings',
    ['key','value','group','label','createdAt','updatedAt'],
    ['key'],
    r => [r.key, r.value, r.group || 'general', s(r.label), d(r.createdAt), d(r.updatedAt)]
  );

  // ── 21. AuditLogs ─────────────────────────────────────────
  await upsertMany('AuditLogs', '📜', 'SELECT * FROM audit_logs', 'audit_logs',
    ['id','action','resource','resourceId','details','previousValues','userId','userEmail','userRole','ipAddress','userAgent','sessionId','severity','createdAt'],
    ['id'],
    r => [r.id, r.action, s(r.resource), s(r.resourceId), s(r.details), s(r.previousValues), s(r.userId), s(r.userEmail), s(r.userRole), s(r.ipAddress), s(r.userAgent), s(r.sessionId), r.severity || 'info', d(r.createdAt)]
  );

  // ── Summary ───────────────────────────────────────────────
  console.log('\n📊 PostgreSQL record counts:');
  const countTables = ['users','super_admin_tokens','collections','product_categories','product_types','products','carts','cart_items','addresses','orders','order_items','reviews','wishlist_items','testimonials','feedbacks','hero_slides','highlight_cards','dashboard_config','announcements','site_settings','audit_logs'];
  for (const t of countTables) {
    try {
      const res = await client.query(`SELECT COUNT(*) as cnt FROM "${t}"`);
      console.log(`   ${t}: ${res.rows[0].cnt}`);
    } catch { console.log(`   ${t}: (error counting)`); }
  }

  db.close();
  await client.end();
  console.log('\n✅ Migration complete!');
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
