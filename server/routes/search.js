const express = require('express');
const router = express.Router();
const dbManager = require('../utils/database');
const ValidationUtils = require('../utils/validation');

// Global search
router.get('/', async (req, res) => {
  try {
    const { q, type, limit, offset } = req.query;
    
    const validQuery = ValidationUtils.validateSearchQuery(q);
    if (!validQuery) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required and must be between 1-200 characters'
      });
    }

    const { page, limit: validLimit } = ValidationUtils.validatePagination(
      parseInt(offset) || 1, 
      parseInt(limit) || 20
    );
    const offsetValue = (page - 1) * validLimit;

    let searchType = type || 'all';
    if (!['all', 'notes', 'folders', 'attachments'].includes(searchType)) {
      searchType = 'all';
    }

    const searchTerm = `%${validQuery}%`;
    const results = {};

    // Search notes
    if (searchType === 'all' || searchType === 'notes') {
      const notes = await dbManager.getAll(`
        SELECT n.id, n.title, n.content, n.folder_id, n.created_at, n.updated_at,
               f.name as folder_name,
               COUNT(a.id) as attachment_count
        FROM notes n
        LEFT JOIN folders f ON n.folder_id = f.id
        LEFT JOIN attachments a ON n.id = a.note_id
        WHERE n.title LIKE ? OR n.content LIKE ?
        GROUP BY n.id
        ORDER BY 
          CASE 
            WHEN n.title LIKE ? THEN 1
            WHEN n.title LIKE ? THEN 2
            ELSE 3
          END,
          n.updated_at DESC
        LIMIT ? OFFSET ?
      `, [searchTerm, searchTerm, validQuery, `%${validQuery}%`, validLimit, offsetValue]);

      results.notes = notes;
    }

    // Search folders
    if (searchType === 'all' || searchType === 'folders') {
      const folders = await dbManager.getAll(`
        SELECT id, name, parent_id, created_at
        FROM folders
        WHERE name LIKE ?
        ORDER BY 
          CASE 
            WHEN name LIKE ? THEN 1
            WHEN name LIKE ? THEN 2
            ELSE 3
          END,
          created_at DESC
        LIMIT ? OFFSET ?
      `, [searchTerm, validQuery, `%${validQuery}%`, validLimit, offsetValue]);

      results.folders = folders;
    }

    // Search attachments
    if (searchType === 'all' || searchType === 'attachments') {
      const attachments = await dbManager.getAll(`
        SELECT a.id, a.filename, a.original_name, a.uploaded_at,
               n.id as note_id, n.title as note_title,
               f.name as folder_name
        FROM attachments a
        JOIN notes n ON a.note_id = n.id
        LEFT JOIN folders f ON n.folder_id = f.id
        WHERE a.original_name LIKE ?
        ORDER BY 
          CASE 
            WHEN a.original_name LIKE ? THEN 1
            WHEN a.original_name LIKE ? THEN 2
            ELSE 3
          END,
          a.uploaded_at DESC
        LIMIT ? OFFSET ?
      `, [searchTerm, validQuery, `%${validQuery}%`, validLimit, offsetValue]);

      results.attachments = attachments;
    }

    // Get total counts for pagination
    const totalCounts = {};
    
    if (searchType === 'all' || searchType === 'notes') {
      const noteCount = await dbManager.getRow(`
        SELECT COUNT(DISTINCT n.id) as count
        FROM notes n
        WHERE n.title LIKE ? OR n.content LIKE ?
      `, [searchTerm, searchTerm]);
      totalCounts.notes = noteCount.count;
    }

    if (searchType === 'all' || searchType === 'folders') {
      const folderCount = await dbManager.getRow(`
        SELECT COUNT(*) as count
        FROM folders
        WHERE name LIKE ?
      `, [searchTerm]);
      totalCounts.folders = folderCount.count;
    }

    if (searchType === 'all' || searchType === 'attachments') {
      const attachmentCount = await dbManager.getRow(`
        SELECT COUNT(*) as count
        FROM attachments
        WHERE original_name LIKE ?
      `, [searchTerm]);
      totalCounts.attachments = attachmentCount.count;
    }

    res.json({
      success: true,
      data: results,
      pagination: {
        page,
        limit: validLimit,
        total: totalCounts,
        hasMore: Object.values(totalCounts).some(count => count > page * validLimit)
      },
      query: validQuery,
      type: searchType
    });
  } catch (error) {
    console.error('Error performing search:', error);
    res.status(500).json({
      success: false,
      error: 'Search failed'
    });
  }
});

// Advanced search with filters
router.get('/advanced', async (req, res) => {
  try {
    const { 
      q, 
      folder_id, 
      date_from, 
      date_to, 
      type, 
      limit, 
      offset,
      sort_by,
      sort_order
    } = req.query;

    const validQuery = ValidationUtils.validateSearchQuery(q);
    if (!validQuery) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required and must be between 1-200 characters'
      });
    }

    const { page, limit: validLimit } = ValidationUtils.validatePagination(
      parseInt(offset) || 1, 
      parseInt(limit) || 20
    );
    const offsetValue = (page - 1) * validLimit;

    // Validate date range
    const dateRange = ValidationUtils.validateDateRange(date_from, date_to);
    
    // Validate sort parameters
    const validSortBy = ['title', 'created_at', 'updated_at', 'name'].includes(sort_by) ? sort_by : 'updated_at';
    const validSortOrder = ['asc', 'desc'].includes(sort_order?.toLowerCase()) ? sort_order.toLowerCase() : 'desc';

    let searchType = type || 'notes';
    if (!['notes', 'folders', 'attachments'].includes(searchType)) {
      searchType = 'notes';
    }

    const searchTerm = `%${validQuery}%`;
    const conditions = [];
    const params = [];

    // Base search condition
    if (searchType === 'notes') {
      conditions.push('(n.title LIKE ? OR n.content LIKE ?)');
      params.push(searchTerm, searchTerm);
    } else if (searchType === 'folders') {
      conditions.push('f.name LIKE ?');
      params.push(searchTerm);
    } else if (searchType === 'attachments') {
      conditions.push('a.original_name LIKE ?');
      params.push(searchTerm);
    }

    // Folder filter
    if (folder_id) {
      const validFolderId = ValidationUtils.validateId(folder_id);
      if (validFolderId) {
        if (searchType === 'notes') {
          conditions.push('n.folder_id = ?');
        } else if (searchType === 'attachments') {
          conditions.push('n.folder_id = ?');
        }
        params.push(validFolderId);
      }
    }

    // Date range filter
    if (dateRange) {
      if (searchType === 'notes') {
        conditions.push('n.updated_at BETWEEN ? AND ?');
      } else if (searchType === 'folders') {
        conditions.push('f.created_at BETWEEN ? AND ?');
      } else if (searchType === 'attachments') {
        conditions.push('a.uploaded_at BETWEEN ? AND ?');
      }
      params.push(dateRange.start.toISOString(), dateRange.end.toISOString());
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    let query = '';
    if (searchType === 'notes') {
      query = `
        SELECT n.id, n.title, n.content, n.folder_id, n.created_at, n.updated_at,
               f.name as folder_name,
               COUNT(a.id) as attachment_count
        FROM notes n
        LEFT JOIN folders f ON n.folder_id = f.id
        LEFT JOIN attachments a ON n.id = a.note_id
        ${whereClause}
        GROUP BY n.id
        ORDER BY n.${validSortBy} ${validSortOrder}
        LIMIT ? OFFSET ?
      `;
    } else if (searchType === 'folders') {
      query = `
        SELECT id, name, parent_id, created_at
        FROM folders f
        ${whereClause}
        ORDER BY f.${validSortBy} ${validSortOrder}
        LIMIT ? OFFSET ?
      `;
    } else if (searchType === 'attachments') {
      query = `
        SELECT a.id, a.filename, a.original_name, a.uploaded_at,
               n.id as note_id, n.title as note_title,
               f.name as folder_name
        FROM attachments a
        JOIN notes n ON a.note_id = n.id
        LEFT JOIN folders f ON n.folder_id = f.id
        ${whereClause}
        ORDER BY a.${validSortBy} ${validSortOrder}
        LIMIT ? OFFSET ?
      `;
    }

    params.push(validLimit, offsetValue);

    const results = await dbManager.getAll(query, params);

    // Get total count for pagination
    let countQuery = '';
    if (searchType === 'notes') {
      countQuery = `
        SELECT COUNT(DISTINCT n.id) as count
        FROM notes n
        LEFT JOIN folders f ON n.folder_id = f.id
        ${whereClause}
      `;
    } else if (searchType === 'folders') {
      countQuery = `
        SELECT COUNT(*) as count
        FROM folders f
        ${whereClause}
      `;
    } else if (searchType === 'attachments') {
      countQuery = `
        SELECT COUNT(*) as count
        FROM attachments a
        JOIN notes n ON a.note_id = n.id
        LEFT JOIN folders f ON n.folder_id = f.id
        ${whereClause}
      `;
    }

    const countParams = params.slice(0, -2); // Remove limit and offset
    const totalCount = await dbManager.getRow(countQuery, countParams);

    res.json({
      success: true,
      data: results,
      pagination: {
        page,
        limit: validLimit,
        total: totalCount.count,
        hasMore: totalCount.count > page * validLimit
      },
      filters: {
        query: validQuery,
        type: searchType,
        folder_id: folder_id ? ValidationUtils.validateId(folder_id) : null,
        date_range: dateRange,
        sort_by: validSortBy,
        sort_order: validSortOrder
      }
    });
  } catch (error) {
    console.error('Error performing advanced search:', error);
    res.status(500).json({
      success: false,
      error: 'Advanced search failed'
    });
  }
});

// Search suggestions
router.get('/suggestions', async (req, res) => {
  try {
    const { q, type } = req.query;
    
    const validQuery = ValidationUtils.validateSearchQuery(q);
    if (!validQuery || validQuery.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Search query must be at least 2 characters long'
      });
    }

    let searchType = type || 'all';
    if (!['all', 'notes', 'folders', 'attachments'].includes(searchType)) {
      searchType = 'all';
    }

    const searchTerm = `%${validQuery}%`;
    const suggestions = [];

    // Get note title suggestions
    if (searchType === 'all' || searchType === 'notes') {
      const noteSuggestions = await dbManager.getAll(`
        SELECT DISTINCT title as text, 'note' as type
        FROM notes
        WHERE title LIKE ?
        ORDER BY 
          CASE 
            WHEN title LIKE ? THEN 1
            WHEN title LIKE ? THEN 2
            ELSE 3
          END,
          updated_at DESC
        LIMIT 5
      `, [searchTerm, validQuery, `%${validQuery}%`]);

      suggestions.push(...noteSuggestions);
    }

    // Get folder name suggestions
    if (searchType === 'all' || searchType === 'folders') {
      const folderSuggestions = await dbManager.getAll(`
        SELECT DISTINCT name as text, 'folder' as type
        FROM folders
        WHERE name LIKE ?
        ORDER BY 
          CASE 
            WHEN name LIKE ? THEN 1
            WHEN name LIKE ? THEN 2
            ELSE 3
          END,
          created_at DESC
        LIMIT 5
      `, [searchTerm, validQuery, `%${validQuery}%`]);

      suggestions.push(...folderSuggestions);
    }

    // Get attachment name suggestions
    if (searchType === 'all' || searchType === 'attachments') {
      const attachmentSuggestions = await dbManager.getAll(`
        SELECT DISTINCT original_name as text, 'attachment' as type
        FROM attachments
        WHERE original_name LIKE ?
        ORDER BY 
          CASE 
            WHEN original_name LIKE ? THEN 1
            WHEN original_name LIKE ? THEN 2
            ELSE 3
          END,
          uploaded_at DESC
        LIMIT 5
      `, [searchTerm, validQuery, `%${validQuery}%`]);

      suggestions.push(...attachmentSuggestions);
    }

    // Sort suggestions by relevance
    suggestions.sort((a, b) => {
      const aExact = a.text.toLowerCase().startsWith(validQuery.toLowerCase());
      const bExact = b.text.toLowerCase().startsWith(validQuery.toLowerCase());
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      return a.text.localeCompare(b.text);
    });

    res.json({
      success: true,
      data: suggestions.slice(0, 10), // Limit to 10 suggestions
      query: validQuery,
      type: searchType
    });
  } catch (error) {
    console.error('Error getting search suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get search suggestions'
    });
  }
});

// Search statistics
router.get('/stats', async (req, res) => {
  try {
    const { q } = req.query;
    
    const validQuery = ValidationUtils.validateSearchQuery(q);
    if (!validQuery) {
      return res.status(400).json({
        success: false,
        error: 'Search query is required'
      });
    }

    const searchTerm = `%${validQuery}%`;

    // Get counts for each type
    const noteCount = await dbManager.getRow(`
      SELECT COUNT(DISTINCT n.id) as count
      FROM notes n
      WHERE n.title LIKE ? OR n.content LIKE ?
    `, [searchTerm, searchTerm]);

    const folderCount = await dbManager.getRow(`
      SELECT COUNT(*) as count
      FROM folders
      WHERE name LIKE ?
    `, [searchTerm]);

    const attachmentCount = await dbManager.getRow(`
      SELECT COUNT(*) as count
      FROM attachments
      WHERE original_name LIKE ?
    `, [searchTerm]);

    // Get recent matches
    const recentNotes = await dbManager.getAll(`
      SELECT n.id, n.title, n.updated_at, f.name as folder_name
      FROM notes n
      LEFT JOIN folders f ON n.folder_id = f.id
      WHERE n.title LIKE ? OR n.content LIKE ?
      ORDER BY n.updated_at DESC
      LIMIT 3
    `, [searchTerm, searchTerm]);

    const recentFolders = await dbManager.getAll(`
      SELECT id, name, created_at
      FROM folders
      WHERE name LIKE ?
      ORDER BY created_at DESC
      LIMIT 3
    `, [searchTerm]);

    res.json({
      success: true,
      data: {
        query: validQuery,
        counts: {
          notes: noteCount.count,
          folders: folderCount.count,
          attachments: attachmentCount.count,
          total: noteCount.count + folderCount.count + attachmentCount.count
        },
        recent: {
          notes: recentNotes,
          folders: recentFolders
        }
      }
    });
  } catch (error) {
    console.error('Error getting search stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get search statistics'
    });
  }
});

module.exports = router; 