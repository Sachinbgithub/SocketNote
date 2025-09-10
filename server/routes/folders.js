const express = require('express');
const router = express.Router();
const dbManager = require('../utils/database');
const ValidationUtils = require('../utils/validation');

// Get all folders with nested structure
router.get('/', async (req, res) => {
  try {
    // Get all folders
    const folders = await dbManager.getAll(`
      SELECT id, name, parent_id, created_at
      FROM folders
      ORDER BY name
    `);

    // Build nested structure
    const buildTree = (parentId = null) => {
      return folders
        .filter(folder => folder.parent_id === parentId)
        .map(folder => ({
          ...folder,
          children: buildTree(folder.id)
        }));
    };

    const folderTree = buildTree();
    
    res.json({
      success: true,
      data: folderTree,
      flat: folders
    });
  } catch (error) {
    console.error('Error fetching folders:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch folders' 
    });
  }
});

// Get single folder
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validId = ValidationUtils.validateId(id);

    if (!validId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid folder ID' 
      });
    }

    const folder = await dbManager.getRow(
      'SELECT id, name, parent_id, created_at FROM folders WHERE id = ?',
      [validId]
    );

    if (!folder) {
      return res.status(404).json({ 
        success: false, 
        error: 'Folder not found' 
      });
    }

    res.json({ success: true, data: folder });
  } catch (error) {
    console.error('Error fetching folder:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch folder' 
    });
  }
});

// Create new folder
router.post('/', async (req, res) => {
  try {
    const { name, parent_id } = req.body;

    const validName = ValidationUtils.validateFolderName(name);
    if (!validName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Folder name is required and must be between 1-255 characters without invalid characters' 
      });
    }

    const validParentId = parent_id ? ValidationUtils.validateId(parent_id) : null;

    // Check if parent folder exists (if parent_id is provided)
    if (validParentId) {
      const parentExists = await dbManager.getRow(
        'SELECT id FROM folders WHERE id = ?',
        [validParentId]
      );
      
      if (!parentExists) {
        return res.status(400).json({ 
          success: false, 
          error: 'Parent folder not found' 
        });
      }
    }

    // Check if folder with same name exists in same parent
    const existingFolder = await dbManager.getRow(
      'SELECT id FROM folders WHERE name = ? AND parent_id IS ?',
      [validName, validParentId]
    );

    if (existingFolder) {
      return res.status(409).json({ 
        success: false, 
        error: 'Folder with this name already exists in the same location' 
      });
    }

    const result = await dbManager.runQuery(
      'INSERT INTO folders (name, parent_id) VALUES (?, ?)',
      [validName, validParentId]
    );

    const newFolder = await dbManager.getRow(
      'SELECT id, name, parent_id, created_at FROM folders WHERE id = ?',
      [result.lastInsertRowid]
    );

    res.status(201).json({ 
      success: true, 
      data: newFolder,
      message: 'Folder created successfully' 
    });
  } catch (error) {
    console.error('Error creating folder:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to create folder' 
    });
  }
});

// Update folder
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, parent_id } = req.body;

    const validId = ValidationUtils.validateId(id);
    if (!validId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid folder ID' 
      });
    }

    const validName = ValidationUtils.validateFolderName(name);
    if (!validName) {
      return res.status(400).json({ 
        success: false, 
        error: 'Folder name is required and must be between 1-255 characters without invalid characters' 
      });
    }

    const validParentId = parent_id ? ValidationUtils.validateId(parent_id) : null;

    // Check if folder exists
    const existingFolder = await dbManager.getRow(
      'SELECT id, name, parent_id FROM folders WHERE id = ?',
      [validId]
    );

    if (!existingFolder) {
      return res.status(404).json({ 
        success: false, 
        error: 'Folder not found' 
      });
    }

    // Prevent circular reference (folder cannot be its own parent)
    if (validParentId === validId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Folder cannot be its own parent' 
      });
    }

    // Check if parent folder exists (if parent_id is provided)
    if (validParentId) {
      const parentExists = await dbManager.getRow(
        'SELECT id FROM folders WHERE id = ?',
        [validParentId]
      );
      
      if (!parentExists) {
        return res.status(400).json({ 
          success: false, 
          error: 'Parent folder not found' 
        });
      }

      // Check for circular reference in hierarchy
      const checkCircularReference = async (folderId, targetId) => {
        const children = await dbManager.getAll(
          'SELECT id FROM folders WHERE parent_id = ?',
          [folderId]
        );
        
        for (const child of children) {
          if (child.id === targetId) return true;
          if (await checkCircularReference(child.id, targetId)) return true;
        }
        return false;
      };

      if (await checkCircularReference(validParentId, validId)) {
        return res.status(400).json({ 
          success: false, 
          error: 'Cannot move folder: would create circular reference' 
        });
      }
    }

    // Check if folder with same name exists in same parent (excluding current folder)
    const duplicateFolder = await dbManager.getRow(
      'SELECT id FROM folders WHERE name = ? AND parent_id IS ? AND id != ?',
      [validName, validParentId, validId]
    );

    if (duplicateFolder) {
      return res.status(409).json({ 
        success: false, 
        error: 'Folder with this name already exists in the same location' 
      });
    }

    await dbManager.runQuery(
      'UPDATE folders SET name = ?, parent_id = ? WHERE id = ?',
      [validName, validParentId, validId]
    );

    const updatedFolder = await dbManager.getRow(
      'SELECT id, name, parent_id, created_at FROM folders WHERE id = ?',
      [validId]
    );

    res.json({ 
      success: true, 
      data: updatedFolder,
      message: 'Folder updated successfully' 
    });
  } catch (error) {
    console.error('Error updating folder:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to update folder' 
    });
  }
});

// Delete folder
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validId = ValidationUtils.validateId(id);

    if (!validId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid folder ID' 
      });
    }

    // Check if folder exists
    const folder = await dbManager.getRow(
      'SELECT id, name, parent_id FROM folders WHERE id = ?',
      [validId]
    );

    if (!folder) {
      return res.status(404).json({ 
        success: false, 
        error: 'Folder not found' 
      });
    }

    // Prevent deletion of root folder (ID 1)
    if (folder.id === 1) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete root folder' 
      });
    }

    // Check if folder has children
    const children = await dbManager.getAll(
      'SELECT id FROM folders WHERE parent_id = ?',
      [validId]
    );

    if (children.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete folder with subfolders. Please delete subfolders first.' 
      });
    }

    // Check if folder has notes
    const notes = await dbManager.getAll(
      'SELECT id FROM notes WHERE folder_id = ?',
      [validId]
    );

    if (notes.length > 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'Cannot delete folder with notes. Please move or delete notes first.' 
      });
    }

    // Delete folder (cascade will handle any remaining references)
    await dbManager.runQuery('DELETE FROM folders WHERE id = ?', [validId]);

    res.json({ 
      success: true, 
      message: 'Folder deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting folder:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to delete folder' 
    });
  }
});

// Get folder statistics
router.get('/:id/stats', async (req, res) => {
  try {
    const { id } = req.params;
    const validId = ValidationUtils.validateId(id);

    if (!validId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid folder ID' 
      });
    }

    // Check if folder exists
    const folder = await dbManager.getRow(
      'SELECT id, name FROM folders WHERE id = ?',
      [validId]
    );

    if (!folder) {
      return res.status(404).json({ 
        success: false, 
        error: 'Folder not found' 
      });
    }

    // Get subfolder count
    const subfolderCountResult = await dbManager.getRow(
      'SELECT COUNT(*) as count FROM folders WHERE parent_id = ?',
      [validId]
    );
    const subfolderCount = subfolderCountResult.count;

    // Get note count
    const noteCountResult = await dbManager.getRow(
      'SELECT COUNT(*) as count FROM notes WHERE folder_id = ?',
      [validId]
    );
    const noteCount = noteCountResult.count;

    // Get total attachment count for notes in this folder
    const attachmentCountResult = await dbManager.getRow(
      `SELECT COUNT(*) as count 
       FROM attachments a 
       JOIN notes n ON a.note_id = n.id 
       WHERE n.folder_id = ?`,
      [validId]
    );
    const attachmentCount = attachmentCountResult.count;

    res.json({
      success: true,
      data: {
        folder,
        stats: {
          subfolders: subfolderCount,
          notes: noteCount,
          attachments: attachmentCount
        }
      }
    });
  } catch (error) {
    console.error('Error fetching folder stats:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch folder statistics' 
    });
  }
});

module.exports = router; 