#!/usr/bin/env node

/**
 * SAFE MIGRATION SCRIPT
 * 
 * This script ensures data is backed up before running Prisma migrations.
 * Usage: node scripts/safe-migrate.js [description]
 * 
 * Example:
 *   node scripts/safe-migrate.js "add_landing_page_fields"
 */

import { spawn } from 'child_process';
import { backupDatabase, listBackups } from '../utils/dbBackup.js';

const args = process.argv.slice(2);
const description = args[0] || 'auto';

console.log('\n🔐 SAFE MIGRATION PROCESS');
console.log('═══════════════════════════════════════');

(async () => {
  try {
    // Step 1: Backup existing database
    console.log('\n📦 Step 1: Backing up database...');
    const backupPath = await backupDatabase(description);

    if (!backupPath) {
      console.log('⚠️  No database to backup (first run?)');
    }

    // Step 2: Show existing backups
    console.log('\n📋 Step 2: Available backups:');
    const backups = listBackups();
    if (backups.length > 0) {
      backups.slice(0, 5).forEach((backup, idx) => {
        console.log(`   ${idx + 1}. ${backup.name} (${(backup.size / 1024).toFixed(2)} KB)`);
      });
      if (backups.length > 5) {
        console.log(`   ... and ${backups.length - 5} more`);
      }
    } else {
      console.log('   No backups available yet');
    }

    // Step 3: Run migration
    console.log('\n⚙️  Step 3: Running Prisma migration...');
    console.log('   Command: npx prisma migrate dev --name ' + description);
    console.log('');

    return new Promise((resolve, reject) => {
      const migrationProcess = spawn('npx', ['prisma', 'migrate', 'dev', '--name', description], {
        stdio: 'inherit',
        cwd: process.cwd()
      });

      migrationProcess.on('close', (code) => {
        if (code === 0) {
          console.log('\n✅ Migration completed successfully!');
          console.log('\n📌 Important:');
          console.log('   • Database backed up before migration');
          console.log('   • If issues occur, backups are in: ./backups/');
          console.log('   • Restore with: node scripts/restore-backup.js [backupName]');
          resolve();
        } else {
          console.error(`\n❌ Migration failed with code ${code}`);
          console.error('\n⚠️  Your database was backed up before migration:');
          console.error(`   📍 Location: ${backupPath}`);
          console.error('\n   To restore, run:');
          console.error(`   node scripts/restore-backup.js ${backupPath?.split('\\').pop() || 'backup_filename'}`);
          reject(new Error('Migration failed'));
        }
      });

      migrationProcess.on('error', (err) => {
        console.error('\n❌ Error running migration:', err.message);
        reject(err);
      });
    });
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
