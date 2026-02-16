#!/usr/bin/env node

/**
 * MANUAL DATABASE BACKUP SCRIPT
 * 
 * Creates an immediate backup of the database
 * Usage: npm run db:backup
 * 
 * Optional: Add description
 * Usage: node scripts/backup.js "my_backup_description"
 */

import { backupDatabase, listBackups, cleanupOldBackups } from '../utils/dbBackup.js';

const args = process.argv.slice(2);
const description = args[0] || new Date().toLocaleString();

console.log('\n💾 DATABASE BACKUP');
console.log('═══════════════════════════════════════\n');

(async () => {
  try {
    // Create backup
    await backupDatabase(description);

    // Cleanup old backups (keep last 10)
    cleanupOldBackups(10);

    // Show all backups
    console.log('\n📋 All backups:');
    const backups = listBackups();
    backups.forEach((backup, idx) => {
      const created = new Date(backup.created).toLocaleString();
      console.log(`   ${idx + 1}. ${backup.name} (${(backup.size / 1024).toFixed(2)} KB)`);
      console.log(`      Created: ${created}`);
    });

    console.log('\n✅ Done!\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
