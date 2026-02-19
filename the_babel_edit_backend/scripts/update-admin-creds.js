import pg from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const { Client } = pg;

async function updateCredentials() {
  // Disable SSL certificate validation for Supabase
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: true });
  await client.connect();
  console.log('✅ Connected to database');

  const superAdminHash = await bcrypt.hash('B@belSup3r!2026x', 12);
  const adminHash = await bcrypt.hash('B@belAdm1n!2026x', 12);

  // Update SUPER_ADMIN: change email and password
  const r1 = await client.query(
    `UPDATE users SET email = $1, password = $2 WHERE email = $3 RETURNING email, role`,
    ['superadmin@thebabeledit.com', superAdminHash, 'admin@babeledit.com']
  );
  console.log('SUPER_ADMIN:', r1.rowCount > 0 ? `✅ Updated → ${r1.rows[0].email}` : '⚠️ Not found (admin@babeledit.com)');

  // Update ADMIN: change email and password
  const r2 = await client.query(
    `UPDATE users SET email = $1, password = $2 WHERE email = $3 RETURNING email, role`,
    ['admin@thebabeledit.com', adminHash, 'isiquedan@gmail.com']
  );
  console.log('ADMIN:', r2.rowCount > 0 ? `✅ Updated → ${r2.rows[0].email}` : '⚠️ Not found (isiquedan@gmail.com)');

  // Verify
  const verify = await client.query(`SELECT email, role FROM users WHERE role IN ('SUPER_ADMIN', 'ADMIN') ORDER BY role`);
  console.log('\n📋 Current admin accounts:');
  verify.rows.forEach(r => console.log(`  ${r.role}: ${r.email}`));

  await client.end();
  console.log('\n✅ Done');
}

updateCredentials().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
