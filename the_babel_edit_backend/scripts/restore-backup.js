#!/usr/bin/env node

/**
 * RESTORE BACKUP SCRIPT
 * 
 * This script restores the database from a backup.
 * 
 * Usage: node scripts/restore-backup.js [backupName]
 * 
 * Examples:
 *   node scripts/restore-backup.js dev_2024-02-13T12-34-56_auto.sql
 *   node scripts/restore-backup.js latest
 */

import { listBackups, restoreDatabase } from '../utils/dbBackup.js';
import path from 'path';

const args = process.argv.slice(2);
const backupName = args[0];

console.log('\n🔄 DATABASE RESTORE PROCESS');
console.log('═══════════════════════════════════════\n');

if (!backupName) {
  console.log('❌ Error: No backup specified\n');
  console.log('📋 Available backups:\n');
  
  const backups = listBackups();
  if (backups.length === 0) {
    console.log('   No backups available\n');
    process.exit(1);
  }

  backups.forEach((backup, idx) => {
    const created = new Date(backup.created).toLocaleString();
    console.log(`   ${idx + 1}. ${backup.name}`);
    console.log(`      Size: ${(backup.size / 1024).toFixed(2)} KB | Created: ${created}\n`);
  });

  console.log('Usage: node scripts/restore-backup.js [backupName]\n');
  console.log('Example: node scripts/restore-backup.js dev_2024-02-13T12-34-56_auto.sql\n');
  process.exit(1);
}

(async () => {
  try {
    let backupPath;

    if (backupName === 'latest') {
      const backups = listBackups();
      if (backups.length === 0) {
        console.error('❌ No backups available');
        process.exit(1);
      }
      backupPath = backups[0].path;
      console.log(`✅ Selected latest backup: ${backups[0].name}\n`);
    } else {
      const backups = listBackups();
      const backup = backups.find(b => b.name === backupName);
      if (!backup) {
        console.error(`❌ Backup not found: ${backupName}`);
        console.error('\nAvailable backups:');
        backups.forEach(b => console.error(`   • ${b.name}`));
        process.exit(1);
      }
      backupPath = backup.path;
    }

    console.log('⚠️  WARNING: This will replace your current database!\n');
    console.log(`📍 Restoring from: ${backupPath}`);
    console.log('\n🔐 A safety backup of your current database will be created.\n');

    const confirm = await new Promise(resolve => {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      readline.question('Continue? (yes/no): ', answer => {
        readline.close();
        resolve(answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y');
      });
    });

    if (!confirm) {
      console.log('\n❌ Restore cancelled');
      process.exit(0);
    }

    console.log('');
    await restoreDatabase(backupPath);
    
    console.log('\n✅ Database restored successfully!');
    console.log('\n📌 Note:');
    console.log('   • Your previous database was backed up as a safety measure');
    console.log('   • Run your application to verify everything works\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
