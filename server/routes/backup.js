const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const dbManager = require('../utils/database');
const ValidationUtils = require('../utils/validation');

// Export data to JSON
router.post('/export', async (req, res) => {
  try {
    const { include_attachments = false } = req.body;

    // Validate boolean parameter
    const includeAttachments = Boolean(include_attachments);

    // Create backup directory
    const backupDir = path.join(__dirname, '..', 'backups', uuidv4());
    await fs.ensureDir(backupDir);

    // Export data using transaction for consistency
    const backupData = await dbManager.transaction(async (db) => {
      // Get all folders
      const folders = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM folders ORDER BY id', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Get all notes
      const notes = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM notes ORDER BY id', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      // Get all attachments
      const attachments = await new Promise((resolve, reject) => {
        db.all('SELECT * FROM attachments ORDER BY id', (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        });
      });

      return {
        metadata: {
          version: '1.0.0',
          exported_at: new Date().toISOString(),
          include_attachments: includeAttachments,
          total_folders: folders.length,
          total_notes: notes.length,
          total_attachments: attachments.length
        },
        data: {
          folders,
          notes,
          attachments: includeAttachments ? attachments : []
        }
      };
    });

    // Generate filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backup-${timestamp}.json`;
    const destPath = path.join(backupDir, fileName);

    // Write backup file
    await fs.writeJson(destPath, backupData, { spaces: 2 });

    // Copy attachment files if requested
    if (includeAttachments) {
      const attachmentsDir = path.join(backupDir, 'attachments');
      await fs.ensureDir(attachmentsDir);

      for (const attachment of backupData.data.attachments) {
        try {
          const sourcePath = attachment.file_path;
          if (await fs.pathExists(sourcePath)) {
            const fileName = path.basename(sourcePath);
            const destPath = path.join(attachmentsDir, fileName);
            await fs.copy(sourcePath, destPath);
          }
        } catch (error) {
          console.error(`Error copying attachment ${attachment.id}:`, error);
        }
      }
    }

    // Save backup record
    const backupRecord = {
      filename: fileName,
      path: destPath,
      size: await fs.stat(destPath).then(stats => stats.size),
      include_attachments: includeAttachments,
      created_at: new Date().toISOString()
    };

    res.json({
      success: true,
      data: backupRecord,
      message: 'Backup created successfully'
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create backup'
    });
  }
});

// Import data from JSON
router.post('/import', async (req, res) => {
  try {
    const { backup_data, overwrite = false } = req.body;

    // Validate backup data
    const validBackupData = ValidationUtils.validateJson(backup_data);
    if (!validBackupData || !validBackupData.data) {
      return res.status(400).json({
        success: false,
        error: 'Invalid backup data format'
      });
    }

    const { folders, notes, attachments } = validBackupData.data;
    const shouldOverwrite = Boolean(overwrite);

    // Validate data structure
    if (!Array.isArray(folders) || !Array.isArray(notes)) {
      return res.status(400).json({
        success: false,
        error: 'Backup data must contain folders and notes arrays'
      });
    }

    // Import data using transaction
    const importResult = await dbManager.transaction(async (db) => {
      let importedCount = 0;
      let skippedCount = 0;

      // Import folders
      for (const folder of folders) {
        try {
          // Check if folder exists
          const existingFolder = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM folders WHERE name = ? AND parent_id IS ?', 
              [folder.name, folder.parent_id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
              });
          });

          if (existingFolder && !shouldOverwrite) {
            skippedCount++;
            continue;
          }

          if (existingFolder && shouldOverwrite) {
            await new Promise((resolve, reject) => {
              db.run('UPDATE folders SET name = ?, parent_id = ? WHERE id = ?',
                [folder.name, folder.parent_id, existingFolder.id], (err) => {
                  if (err) reject(err);
                  else resolve();
                });
            });
          } else {
            await new Promise((resolve, reject) => {
              db.run('INSERT INTO folders (name, parent_id) VALUES (?, ?)',
                [folder.name, folder.parent_id], (err) => {
                  if (err) reject(err);
                  else resolve();
                });
            });
          }
          importedCount++;
        } catch (error) {
          console.error('Error importing folder:', error);
        }
      }

      // Import notes
      for (const note of notes) {
        try {
          // Check if note exists
          const existingNote = await new Promise((resolve, reject) => {
            db.get('SELECT id FROM notes WHERE title = ? AND folder_id IS ?',
              [note.title, note.folder_id], (err, row) => {
                if (err) reject(err);
                else resolve(row);
              });
          });

          if (existingNote && !shouldOverwrite) {
            skippedCount++;
            continue;
          }

          if (existingNote && shouldOverwrite) {
            await new Promise((resolve, reject) => {
              db.run('UPDATE notes SET title = ?, content = ?, folder_id = ? WHERE id = ?',
                [note.title, note.content, note.folder_id, existingNote.id], (err) => {
                  if (err) reject(err);
                  else resolve();
                });
            });
          } else {
            await new Promise((resolve, reject) => {
              db.run('INSERT INTO notes (title, content, folder_id) VALUES (?, ?, ?)',
                [note.title, note.content, note.folder_id], (err) => {
                  if (err) reject(err);
                  else resolve();
                });
            });
          }
          importedCount++;
        } catch (error) {
          console.error('Error importing note:', error);
        }
      }

      return { importedCount, skippedCount };
    });

    res.json({
      success: true,
      data: importResult,
      message: `Import completed: ${importResult.importedCount} items imported, ${importResult.skippedCount} skipped`
    });
  } catch (error) {
    console.error('Error importing backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to import backup'
    });
  }
});

// Get backup history
router.get('/history', async (req, res) => {
  try {
    const backupsDir = path.join(__dirname, '..', 'backups');
    
    if (!await fs.pathExists(backupsDir)) {
      return res.json({
        success: true,
        data: []
      });
    }

    const backupFolders = await fs.readdir(backupsDir);
    const backupHistory = [];

    for (const folder of backupFolders) {
      const folderPath = path.join(backupsDir, folder);
      const stats = await fs.stat(folderPath);
      
      if (stats.isDirectory()) {
        const files = await fs.readdir(folderPath);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        for (const file of jsonFiles) {
          try {
            const filePath = path.join(folderPath, file);
            const fileStats = await fs.stat(filePath);
            const backupData = await fs.readJson(filePath);
            
            backupHistory.push({
              id: folder,
              filename: file,
              path: filePath,
              size: fileStats.size,
              created_at: backupData.metadata?.exported_at || fileStats.birthtime.toISOString(),
              include_attachments: backupData.metadata?.include_attachments || false,
              total_folders: backupData.metadata?.total_folders || 0,
              total_notes: backupData.metadata?.total_notes || 0,
              total_attachments: backupData.metadata?.total_attachments || 0
            });
          } catch (error) {
            console.error(`Error reading backup file ${file}:`, error);
          }
        }
      }
    }

    // Sort by creation date (newest first)
    backupHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({
      success: true,
      data: backupHistory
    });
  } catch (error) {
    console.error('Error getting backup history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get backup history'
    });
  }
});

// Delete backup
router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    
    // Validate filename
    if (!ValidationUtils.validateBackupFilename(filename)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid backup filename'
      });
    }

    const backupsDir = path.join(__dirname, '..', 'backups');
    
    if (!await fs.pathExists(backupsDir)) {
      return res.status(404).json({
        success: false,
        error: 'Backup not found'
      });
    }

    // Find backup folder containing the file
    const backupFolders = await fs.readdir(backupsDir);
    let backupPath = null;

    for (const folder of backupFolders) {
      const folderPath = path.join(backupsDir, folder);
      const stats = await fs.stat(folderPath);
      
      if (stats.isDirectory()) {
        const files = await fs.readdir(folderPath);
        if (files.includes(filename)) {
          backupPath = folderPath;
          break;
        }
      }
    }

    if (!backupPath) {
      return res.status(404).json({
        success: false,
        error: 'Backup not found'
      });
    }

    // Delete the entire backup folder
    await fs.remove(backupPath);

    res.json({
      success: true,
      message: 'Backup deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting backup:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete backup'
    });
  }
});

// Get backup statistics
router.get('/stats', async (req, res) => {
  try {
    const backupsDir = path.join(__dirname, '..', 'backups');
    
    if (!await fs.pathExists(backupsDir)) {
      return res.json({
        success: true,
        data: {
          total_backups: 0,
          total_size: 0,
          oldest_backup: null,
          newest_backup: null,
          average_size: 0
        }
      });
    }

    const backupFolders = await fs.readdir(backupsDir);
    let totalSize = 0;
    let backupCount = 0;
    let oldestBackup = null;
    let newestBackup = null;

    for (const folder of backupFolders) {
      const folderPath = path.join(backupsDir, folder);
      const stats = await fs.stat(folderPath);
      
      if (stats.isDirectory()) {
        const files = await fs.readdir(folderPath);
        const jsonFiles = files.filter(file => file.endsWith('.json'));
        
        for (const file of jsonFiles) {
          try {
            const filePath = path.join(folderPath, file);
            const fileStats = await fs.stat(filePath);
            const backupData = await fs.readJson(filePath);
            
            totalSize += fileStats.size;
            backupCount++;
            
            const backupDate = new Date(backupData.metadata?.exported_at || fileStats.birthtime);
            
            if (!oldestBackup || backupDate < oldestBackup) {
              oldestBackup = backupDate;
            }
            
            if (!newestBackup || backupDate > newestBackup) {
              newestBackup = backupDate;
            }
          } catch (error) {
            console.error(`Error reading backup file ${file}:`, error);
          }
        }
      }
    }

    res.json({
      success: true,
      data: {
        total_backups: backupCount,
        total_size: totalSize,
        oldest_backup: oldestBackup?.toISOString() || null,
        newest_backup: newestBackup?.toISOString() || null,
        average_size: backupCount > 0 ? Math.round(totalSize / backupCount) : 0
      }
    });
  } catch (error) {
    console.error('Error getting backup stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get backup statistics'
    });
  }
});

module.exports = router; 