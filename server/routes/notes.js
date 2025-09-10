const express = require('express');
const router = express.Router();
const dbManager = require('../utils/database');
const ValidationUtils = require('../utils/validation');

// Get all notes
router.get('/', async (req, res) => {
  try {
    const notes = await dbManager.getAll(`
      SELECT n.id, n.title, n.content, n.folder_id, n.created_at, n.updated_at,
             f.name as folder_name,
             COUNT(a.id) as attachment_count
      FROM notes n
      LEFT JOIN folders f ON n.folder_id = f.id
      LEFT JOIN attachments a ON n.id = a.note_id
      GROUP BY n.id
      ORDER BY n.updated_at DESC
    `);

    res.json({
      success: true,
      data: notes
    });
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch notes' 
    });
  }
});

// Get notes by folder
router.get('/folder/:folderId', async (req, res) => {
  try {
    const { folderId } = req.params;
    const validFolderId = ValidationUtils.validateId(folderId);

    if (!validFolderId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid folder ID' 
      });
    }

    // Check if folder exists
    const folder = await dbManager.getRow(
      'SELECT id, name FROM folders WHERE id = ?',
      [validFolderId]
    );

    if (!folder) {
      return res.status(404).json({ 
        success: false, 
        error: 'Folder not found' 
      });
    }

    const notes = await dbManager.getAll(`
      SELECT n.id, n.title, n.content, n.folder_id, n.created_at, n.updated_at,
             f.name as folder_name,
             COUNT(a.id) as attachment_count
      FROM notes n
      LEFT JOIN folders f ON n.folder_id = f.id
      LEFT JOIN attachments a ON n.id = a.note_id
      WHERE n.folder_id = ?
      GROUP BY n.id
      ORDER BY n.updated_at DESC
    `, [validFolderId]);

    res.json({
      success: true,
      data: notes,
      folder: folder
    });
  } catch (error) {
    console.error('Error fetching notes by folder:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch notes' 
    });
  }
});

// Get single note with attachments
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validId = ValidationUtils.validateId(id);

    if (!validId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid note ID' 
      });
    }

    const note = await dbManager.getRow(`
      SELECT n.id, n.title, n.content, n.folder_id, n.created_at, n.updated_at,
             f.name as folder_name
      FROM notes n
      LEFT JOIN folders f ON n.folder_id = f.id
      WHERE n.id = ?
    `, [validId]);

    if (!note) {
      return res.status(404).json({ 
        success: false, 
        error: 'Note not found' 
      });
    }

    // Get attachments for this note
    const attachments = await dbManager.getAll(`
      SELECT id, filename, original_name, file_path, uploaded_at
      FROM attachments
      WHERE note_id = ?
      ORDER BY uploaded_at ASC
    `, [validId]);

    res.json({
      success: true,
      data: {
        ...note,
        attachments
      }
    });
  } catch (error) {
    console.error('Error fetching note:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch note' 
    });
  }
});

// Create new note
router.post('/', async (req, res) => {
  try {
    const { title, content, folder_id } = req.body;

    const validTitle = ValidationUtils.validateNoteTitle(title);
    if (!validTitle) {
      return res.status(400).json({ 
        success: false, 
        error: 'Note title is required and must be between 1-500 characters' 
      });
    }

    const validContent = ValidationUtils.validateNoteContent(content);
    const validFolderId = folder_id ? ValidationUtils.validateId(folder_id) : null;

    // Check if folder exists (if folder_id is provided)
    if (validFolderId) {
      const folderExists = await dbManager.getRow(
        'SELECT id FROM folders WHERE id = ?',
        [validFolderId]
      );
      
      if (!folderExists) {
        return res.status(400).json({ 
          success: false, 
          error: 'Folder not found' 
        });
      }
    }

    const result = await dbManager.runQuery(
      'INSERT INTO notes (title, content, folder_id) VALUES (?, ?, ?)',
      [validTitle, validContent, validFolderId]
    );

    const newNote = await dbManager.getRow(`
      SELECT n.id, n.title, n.content, n.folder_id, n.created_at, n.updated_at,
             f.name as folder_name
      FROM notes n
      LEFT JOIN folders f ON n.folder_id = f.id
      WHERE n.id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json({ 
      success: true, 
      data: newNote,
      message: 'Note created successfully' 
    });
  } catch (error) {
    console.error('Error creating note:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create note' 
    });
  }
});

// Update note
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content, folder_id } = req.body;

    const validId = ValidationUtils.validateId(id);
    if (!validId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid note ID' 
      });
    }

    const validTitle = ValidationUtils.validateNoteTitle(title);
    if (!validTitle) {
      return res.status(400).json({ 
        success: false, 
        error: 'Note title is required and must be between 1-500 characters' 
      });
    }

    const validContent = ValidationUtils.validateNoteContent(content);
    const validFolderId = folder_id ? ValidationUtils.validateId(folder_id) : null;

    // Check if note exists
    const existingNote = await dbManager.getRow(
      'SELECT id FROM notes WHERE id = ?',
      [validId]
    );

    if (!existingNote) {
      return res.status(404).json({ 
        success: false, 
        error: 'Note not found' 
      });
    }

    // Check if folder exists (if folder_id is provided)
    if (validFolderId) {
      const folderExists = await dbManager.getRow(
        'SELECT id FROM folders WHERE id = ?',
        [validFolderId]
      );
      
      if (!folderExists) {
        return res.status(400).json({ 
          success: false, 
          error: 'Folder not found' 
        });
      }
    }

    await dbManager.runQuery(
      'UPDATE notes SET title = ?, content = ?, folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [validTitle, validContent, validFolderId, validId]
    );

    const updatedNote = await dbManager.getRow(`
      SELECT n.id, n.title, n.content, n.folder_id, n.created_at, n.updated_at,
             f.name as folder_name
      FROM notes n
      LEFT JOIN folders f ON n.folder_id = f.id
      WHERE n.id = ?
    `, [validId]);

    res.json({ 
      success: true, 
      data: updatedNote,
      message: 'Note updated successfully' 
    });
  } catch (error) {
    console.error('Error updating note:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update note' 
    });
  }
});

// Auto-save note content
router.patch('/:id/autosave', async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;

    const validId = ValidationUtils.validateId(id);
    if (!validId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid note ID' 
      });
    }

    const validContent = ValidationUtils.validateNoteContent(content);

    // Check if note exists
    const existingNote = await dbManager.getRow(
      'SELECT id FROM notes WHERE id = ?',
      [validId]
    );

    if (!existingNote) {
      return res.status(404).json({ 
        success: false, 
        error: 'Note not found' 
      });
    }

    await dbManager.runQuery(
      'UPDATE notes SET content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [validContent, validId]
    );

    res.json({ 
      success: true, 
      message: 'Note auto-saved successfully' 
    });
  } catch (error) {
    console.error('Error auto-saving note:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to auto-save note' 
    });
  }
});

// Delete note
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validId = ValidationUtils.validateId(id);

    if (!validId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid note ID' 
      });
    }

    // Check if note exists
    const note = await dbManager.getRow(
      'SELECT id, title FROM notes WHERE id = ?',
      [validId]
    );

    if (!note) {
      return res.status(404).json({ 
        success: false, 
        error: 'Note not found' 
      });
    }

    // Delete note (cascade will handle attachments)
    await dbManager.runQuery('DELETE FROM notes WHERE id = ?', [validId]);

    res.json({ 
      success: true, 
      message: 'Note deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting note:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete note' 
    });
  }
});

// Move note to different folder
router.patch('/:id/move', async (req, res) => {
  try {
    const { id } = req.params;
    const { folder_id } = req.body;

    const validId = ValidationUtils.validateId(id);
    if (!validId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid note ID' 
      });
    }

    const validFolderId = folder_id ? ValidationUtils.validateId(folder_id) : null;

    // Check if note exists
    const note = await dbManager.getRow(
      'SELECT id FROM notes WHERE id = ?',
      [validId]
    );

    if (!note) {
      return res.status(404).json({ 
        success: false, 
        error: 'Note not found' 
      });
    }

    // Check if target folder exists (if folder_id is provided)
    if (validFolderId) {
      const folderExists = await dbManager.getRow(
        'SELECT id FROM folders WHERE id = ?',
        [validFolderId]
      );
      
      if (!folderExists) {
        return res.status(400).json({ 
          success: false, 
          error: 'Target folder not found' 
        });
      }
    }

    await dbManager.runQuery(
      'UPDATE notes SET folder_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [validFolderId, validId]
    );

    const movedNote = await dbManager.getRow(`
      SELECT n.id, n.title, n.content, n.folder_id, n.created_at, n.updated_at,
             f.name as folder_name
      FROM notes n
      LEFT JOIN folders f ON n.folder_id = f.id
      WHERE n.id = ?
    `, [validId]);

    res.json({ 
      success: true, 
      data: movedNote,
      message: 'Note moved successfully' 
    });
  } catch (error) {
    console.error('Error moving note:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to move note' 
    });
  }
});

// Get note statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const validId = ValidationUtils.validateId(id);

    if (!validId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid note ID' 
      });
    }

    // Check if note exists
    const note = await dbManager.getRow(
      'SELECT id, title FROM notes WHERE id = ?',
      [validId]
    );

    if (!note) {
      return res.status(404).json({ 
        success: false, 
        error: 'Note not found' 
      });
    }

    // Get attachment count
    const attachmentCountResult = await dbManager.getRow(
      'SELECT COUNT(*) as count FROM attachments WHERE note_id = ?',
      [validId]
    );
    const attachmentCount = attachmentCountResult.count;

    // Get word count
    const noteContent = await dbManager.getRow(
      'SELECT content FROM notes WHERE id = ?',
      [validId]
    );
    
    const wordCount = noteContent.content ? 
      noteContent.content.trim().split(/\s+/).length : 0;

    // Get character count
    const charCount = noteContent.content ? noteContent.content.length : 0;

    res.json({
      success: true,
      data: {
        note,
        stats: {
          attachments: attachmentCount,
          words: wordCount,
          characters: charCount
        }
      }
    });
  } catch (error) {
    console.error('Error fetching note stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch note statistics' 
    });
  }
});

module.exports = router; 