const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs-extra');
const { v4: uuidv4 } = require('uuid');
const dbManager = require('../utils/database');
const ValidationUtils = require('../utils/validation');
const { getCurrentConfig, uploadConfig } = require('../config/upload');

// Configure multer for file uploads with security improvements
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const uploadDir = path.join(__dirname, '..', 'uploads');
      
      // Ensure upload directory exists and is within allowed path
      const resolvedUploadDir = path.resolve(uploadDir);
      const serverDir = path.resolve(__dirname, '..');
      
      if (!resolvedUploadDir.startsWith(serverDir)) {
        return cb(new Error('Invalid upload directory path'), null);
      }
      
      await fs.ensureDir(resolvedUploadDir);
      cb(null, resolvedUploadDir);
    } catch (error) {
      cb(error, null);
    }
  },
  filename: (req, file, cb) => {
    try {
      // Generate safe filename with original extension
      const originalExt = path.extname(file.originalname || '');
      const safeExt = ValidationUtils.validateFileExtension(originalExt, ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.pdf', '.txt', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.7z', '.tar', '.gz']) ? originalExt : '';
      const uniqueName = `${uuidv4()}${safeExt}`;
      cb(null, uniqueName);
    } catch (error) {
      cb(error, null);
    }
  }
});

// Enhanced file filter with better validation
const fileFilter = (req, file, cb) => {
  try {
    // Validate file type
    if (!uploadConfig.allowedTypes.includes(file.mimetype)) {
      return cb(new Error(`Invalid file type: ${file.mimetype}. Allowed types: ${uploadConfig.allowedTypes.join(', ')}`), false);
    }

    // Validate file extension
    const ext = path.extname(file.originalname || '').toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.tiff', '.pdf', '.txt', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.7z', '.tar', '.gz'];
    
    if (!ValidationUtils.validateFileExtension(file.originalname, allowedExtensions)) {
      return cb(new Error(`Invalid file extension: ${ext}`), false);
    }

    // Validate filename
    const safeFilename = ValidationUtils.generateSafeFilename(file.originalname);
    if (!safeFilename) {
      return cb(new Error('Invalid filename'), false);
    }

    cb(null, true);
  } catch (error) {
    cb(error, false);
  }
};

// Configure multer with limits and filters
const currentConfig = getCurrentConfig();
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: currentConfig.fileSize,
    files: currentConfig.files
  }
});

// Upload single file
router.post('/single', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const { note_id } = req.body;
    const validNoteId = ValidationUtils.validateId(note_id);

    if (!validNoteId) {
      // Delete uploaded file if no valid note_id provided
      await fs.remove(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'Valid note ID is required'
      });
    }

    // Validate file path for security
    const uploadsDir = path.resolve(__dirname, '..', 'uploads');
    if (!ValidationUtils.validateFilePath(req.file.path, uploadsDir)) {
      await fs.remove(req.file.path);
      return res.status(400).json({
        success: false,
        error: 'Invalid file path'
      });
    }

    // Check if note exists
    const note = await dbManager.getRow(
      'SELECT id FROM notes WHERE id = ?',
      [validNoteId]
    );

    if (!note) {
      // Delete uploaded file if note doesn't exist
      await fs.remove(req.file.path);
      return res.status(404).json({
        success: false,
        error: 'Note not found'
      });
    }

    // Save file info to database
    const result = await dbManager.runQuery(
      'INSERT INTO attachments (filename, original_name, file_path, note_id) VALUES (?, ?, ?, ?)',
      [req.file.filename, req.file.originalname, req.file.path, validNoteId]
    );

    const attachment = await dbManager.getRow(
      'SELECT id, filename, original_name, file_path, uploaded_at FROM attachments WHERE id = ?',
      [result.lastInsertRowid]
    );

    res.status(201).json({
      success: true,
      data: attachment,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    
    // Clean up uploaded file if it exists
    if (req.file) {
      try {
        await fs.remove(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to upload file'
    });
  }
});

// Upload multiple files
router.post('/multiple', upload.array('files', 5), async (req, res) => {
  try {
    console.log('=== MULTIPLE UPLOAD STARTED ===');
    console.log('Request body:', req.body);
    console.log('Files received:', req.files ? req.files.length : 0);
    console.log('Request headers:', req.headers);
    
    // Check database connection health
    try {
      const db = await dbManager.getDatabase();
      console.log('Database connection verified');
    } catch (dbError) {
      console.error('Database connection failed:', dbError);
      return res.status(500).json({
        success: false,
        error: 'Database connection failed'
      });
    }
    
    if (!req.files || req.files.length === 0) {
      console.log('No files uploaded');
      return res.status(400).json({
        success: false,
        error: 'No files uploaded'
      });
    }

    const { note_id } = req.body;
    console.log('Note ID from request:', note_id);
    
    const validNoteId = ValidationUtils.validateId(note_id);
    console.log('Validated note ID:', validNoteId);

    if (!validNoteId) {
      console.log('Invalid note ID, cleaning up files');
      // Delete all uploaded files if no valid note_id provided
      for (const file of req.files) {
        await fs.remove(file.path);
      }
      return res.status(400).json({
        success: false,
        error: 'Valid note ID is required'
      });
    }

    console.log('Checking if note exists...');
    // Check if note exists with timeout
    const note = await Promise.race([
      dbManager.getRow(
        'SELECT id FROM notes WHERE id = ?',
        [validNoteId]
      ),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 10000)
      )
    ]);
    console.log('Note found:', note);

    if (!note) {
      console.log('Note not found, cleaning up files');
      // Delete all uploaded files if note doesn't exist
      for (const file of req.files) {
        await fs.remove(file.path);
      }
      return res.status(404).json({
        success: false,
        error: 'Note not found'
      });
    }

    console.log('Processing files...');
    const uploadedFiles = [];
    const uploadsDir = path.resolve(__dirname, '..', 'uploads');

    // Save each file info to database with timeout
    for (let i = 0; i < req.files.length; i++) {
      const file = req.files[i];
      console.log(`Processing file ${i + 1}/${req.files.length}:`, file.originalname);
      
      try {
        // Validate file path for security
        if (!ValidationUtils.validateFilePath(file.path, uploadsDir)) {
          console.log(`File ${file.originalname} failed path validation, removing`);
          await fs.remove(file.path);
          continue;
        }

        console.log(`Inserting file ${file.originalname} into database...`);
        const result = await Promise.race([
          dbManager.runQuery(
            'INSERT INTO attachments (filename, original_name, file_path, note_id) VALUES (?, ?, ?, ?)',
            [file.filename, file.originalname, file.path, validNoteId]
          ),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database insert timeout')), 15000)
          )
        ]);
        console.log(`File ${file.originalname} inserted with ID:`, result.lastInsertRowid);

        const attachment = await Promise.race([
          dbManager.getRow(
            'SELECT id, filename, original_name, file_path, uploaded_at FROM attachments WHERE id = ?',
            [result.lastInsertRowid]
          ),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Database retrieval timeout')), 10000)
          )
        ]);
        console.log(`Retrieved attachment data:`, attachment);

        uploadedFiles.push(attachment);
        console.log(`File ${file.originalname} processed successfully`);
      } catch (fileError) {
        console.error(`Error processing file ${file.originalname}:`, fileError);
        // Remove the file if there was an error
        try {
          await fs.remove(file.path);
        } catch (cleanupError) {
          console.error(`Error cleaning up file ${file.originalname}:`, cleanupError);
        }
      }
    }

    console.log(`Upload completed. ${uploadedFiles.length} files uploaded successfully`);
    res.status(201).json({
      success: true,
      data: uploadedFiles,
      message: `${uploadedFiles.length} files uploaded successfully`
    });
  } catch (error) {
    console.error('=== UPLOAD ERROR ===');
    console.error('Error uploading files:', error);
    console.error('Error stack:', error.stack);
    
    // Clean up uploaded files if they exist
    if (req.files) {
      console.log('Cleaning up uploaded files due to error...');
      for (const file of req.files) {
        try {
          await fs.remove(file.path);
          console.log(`Cleaned up file: ${file.originalname}`);
        } catch (cleanupError) {
          console.error(`Error cleaning up file ${file.originalname}:`, cleanupError);
        }
      }
    }

    res.status(500).json({
      success: false,
      error: 'Failed to upload files',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete attachment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validId = ValidationUtils.validateId(id);

    if (!validId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid attachment ID'
      });
    }

    // Get attachment info
    const attachment = await dbManager.getRow(
      'SELECT id, filename, file_path FROM attachments WHERE id = ?',
      [validId]
    );

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: 'Attachment not found'
      });
    }

    // Validate file path for security before deletion
    const uploadsDir = path.resolve(__dirname, '..', 'uploads');
    if (ValidationUtils.validateFilePath(attachment.file_path, uploadsDir)) {
      // Delete file from filesystem
      try {
        await fs.remove(attachment.file_path);
      } catch (fileError) {
        console.error('Error deleting file from filesystem:', fileError);
        // Continue with database deletion even if file doesn't exist
      }
    }

    // Delete from database
    await dbManager.runQuery('DELETE FROM attachments WHERE id = ?', [validId]);

    res.json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting attachment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete attachment'
    });
  }
});

// Get attachment info
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validId = ValidationUtils.validateId(id);

    if (!validId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid attachment ID'
      });
    }

    const attachment = await dbManager.getRow(
      'SELECT id, filename, original_name, file_path, note_id, uploaded_at FROM attachments WHERE id = ?',
      [validId]
    );

    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: 'Attachment not found'
      });
    }

    res.json({
      success: true,
      data: attachment
    });
  } catch (error) {
    console.error('Error fetching attachment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attachment'
    });
  }
});

// Get attachments for a note
router.get('/note/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;
    const validNoteId = ValidationUtils.validateId(noteId);

    if (!validNoteId) {
      return res.status(400).json({
        success: false,
        error: 'Invalid note ID'
      });
    }

    // Check if note exists
    const note = await dbManager.getRow(
      'SELECT id FROM notes WHERE id = ?',
      [validNoteId]
    );

    if (!note) {
      return res.status(404).json({
        success: false,
        error: 'Note not found'
      });
    }

    const attachments = await dbManager.getAll(
      'SELECT id, filename, original_name, file_path, uploaded_at FROM attachments WHERE note_id = ? ORDER BY uploaded_at ASC',
      [validNoteId]
    );

    res.json({
      success: true,
      data: attachments
    });
  } catch (error) {
    console.error('Error fetching note attachments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attachments'
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      const maxSizeMB = Math.round(currentConfig.fileSize / (1024 * 1024));
      return res.status(400).json({
        success: false,
        error: `File too large. Maximum size is ${maxSizeMB}MB.`
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: `Too many files. Maximum ${currentConfig.files} files per upload.`
      });
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Unexpected file field.'
      });
    }
  }

  if (error.message.includes('Invalid file type') || error.message.includes('Invalid file extension') || error.message.includes('Invalid filename')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  console.error('Upload error:', error);
  res.status(500).json({
    success: false,
    error: 'Upload failed'
  });
});

module.exports = router; 