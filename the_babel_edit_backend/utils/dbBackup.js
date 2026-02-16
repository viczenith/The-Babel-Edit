import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUP_DIR = path.join(__dirname, '..', 'backups');

// Ensure backups directory exists
const ensureBackupDir = () => {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`✅ Created backups directory: ${BACKUP_DIR}`);
  }
};

/**
 * Create a backup of the SQLite database
 * @param {string} description - Optional description for the backup
 * @returns {string} Path to the backup file
 */
export const backupDatabase = (description = '') => {
  try {
    ensureBackupDir();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const backupName = `dev_${timestamp}${description ? '_' + description : ''}.sql`;
    const backupPath = path.join(BACKUP_DIR, backupName);
    const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');

    if (!fs.existsSync(dbPath)) {
      console.warn('⚠️ Database file not found, skipping backup');
      return null;
    }

    // Use sqlite3 command line to dump database
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(backupPath);
      const sqlite3Process = spawn('sqlite3', [dbPath, '.dump']);

      sqlite3Process.stdout.pipe(file);

      sqlite3Process.on('error', (err) => {
        fs.unlinkSync(backupPath);
        console.error('❌ Backup failed:', err.message);
        reject(err);
      });

      sqlite3Process.on('close', (code) => {
        if (code === 0) {
          const stats = fs.statSync(backupPath);
          console.log(`✅ Database backed up successfully`);
          console.log(`   Location: ${backupPath}`);
          console.log(`   Size: ${(stats.size / 1024).toFixed(2)} KB`);
          resolve(backupPath);
        } else {
          fs.unlinkSync(backupPath);
          reject(new Error(`sqlite3 exited with code ${code}`));
        }
      });
    });
  } catch (error) {
    console.error('❌ Error during backup:', error.message);
    throw error;
  }
};

/**
 * List all available backups
 * @returns {array} Array of backup file info
 */
export const listBackups = () => {
  try {
    ensureBackupDir();

    const files = fs.readdirSync(BACKUP_DIR)
      .filter(file => file.endsWith('.sql'))
      .map(file => ({
        name: file,
        path: path.join(BACKUP_DIR, file),
        size: fs.statSync(path.join(BACKUP_DIR, file)).size,
        created: fs.statSync(path.join(BACKUP_DIR, file)).mtime
      }))
      .sort((a, b) => b.created - a.created);

    return files;
  } catch (error) {
    console.error('❌ Error listing backups:', error.message);
    return [];
  }
};

/**
 * Restore database from a backup
 * @param {string} backupPath - Path to the backup file
 */
export const restoreDatabase = (backupPath) => {
  try {
    const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');

    if (!fs.existsSync(backupPath)) {
      throw new Error(`Backup file not found: ${backupPath}`);
    }

    // Create a safety backup of current db before restoring
    if (fs.existsSync(dbPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const safetyBackup = path.join(BACKUP_DIR, `pre_restore_${timestamp}.db`);
      fs.copyFileSync(dbPath, safetyBackup);
      console.log(`🔐 Safety backup created: ${safetyBackup}`);
    }

    return new Promise((resolve, reject) => {
      const restoreProcess = spawn('sqlite3', [dbPath]);

      const backupContent = fs.readFileSync(backupPath, 'utf8');
      restoreProcess.stdin.write(backupContent);
      restoreProcess.stdin.end();

      restoreProcess.on('error', (err) => {
        console.error('❌ Restore failed:', err.message);
        reject(err);
      });

      restoreProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Database restored from: ${backupPath}`);
          resolve(true);
        } else {
          reject(new Error(`sqlite3 exited with code ${code}`));
        }
      });
    });
  } catch (error) {
    console.error('❌ Error during restore:', error.message);
    throw error;
  }
};

/**
 * Clean up old backups (keep last N backups)
 * @param {number} keepCount - Number of backups to keep
 */
export const cleanupOldBackups = (keepCount = 10) => {
  try {
    ensureBackupDir();

    const backups = listBackups();

    if (backups.length > keepCount) {
      const toDelete = backups.slice(keepCount);
      toDelete.forEach(backup => {
        fs.unlinkSync(backup.path);
        console.log(`🗑️  Deleted old backup: ${backup.name}`);
      });
      console.log(`✅ Cleaned up ${toDelete.length} old backups, kept ${keepCount}`);
    }
  } catch (error) {
    console.error('❌ Error cleaning up backups:', error.message);
  }
};
