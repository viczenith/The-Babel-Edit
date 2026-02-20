import pg from 'pg';

const c = new pg.Client({
  connectionString: 'postgresql://postgres.mcwpnvuaqgknyttwpgus:8OReS2AXhKhNwlBf@aws-0-us-west-2.pooler.supabase.com:5432/postgres',
  ssl: { rejectUnauthorized: false },
});

await c.connect();

// Find all products with their SKU
const r = await c.query("SELECT id, name, sku FROM products ORDER BY name");
console.log('All products:');
for (const row of r.rows) {
  console.log(`  "${row.name}" -> sku=${JSON.stringify(row.sku)}`);
}

// Count empty string SKUs
const empty = await c.query("SELECT count(*) FROM products WHERE sku = ''");
console.log(`\nProducts with empty string SKU: ${empty.rows[0].count}`);

// Fix: set empty string SKUs to NULL
const fix = await c.query("UPDATE products SET sku = NULL WHERE sku = ''");
console.log(`Fixed ${fix.rowCount} rows (set empty SKU to NULL)`);

await c.end();
