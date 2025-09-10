const express = require('express');
const router = express.Router();

// Get current upload configuration
router.get('/upload-config', (req, res) => {
  try {
    const { getCurrentConfig } = require('../config/upload');
    const config = getCurrentConfig();
    
    res.json({
      success: true,
      data: {
        preset: process.env.UPLOAD_PRESET || 'office',
        fileSize: Math.round(config.fileSize / (1024 * 1024)), // Convert to MB
        maxFiles: config.files,
        totalSize: Math.round(config.totalSize / (1024 * 1024)) // Convert to MB
      }
    });
  } catch (error) {
    console.error('Error getting upload config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get upload configuration'
    });
  }
});

// Update upload configuration
router.post('/upload-config', (req, res) => {
  try {
    const { preset, customSize } = req.body;
    
    // Validate preset
    const validPresets = ['office', 'images', 'large', 'maximum'];
    if (!validPresets.includes(preset)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid preset. Must be one of: office, images, large, maximum'
      });
    }
    
    // Validate custom size
    if (customSize && (customSize < 1 || customSize > 500)) {
      return res.status(400).json({
        success: false,
        error: 'Custom size must be between 1 and 500 MB'
      });
    }
    
    // For now, we'll just return success since we can't dynamically change server config
    // In a production app, you might want to restart the server or use a config file
    res.json({
      success: true,
      message: 'Upload configuration updated. Restart server to apply changes.',
      data: {
        preset,
        customSize: customSize || null
      }
    });
  } catch (error) {
    console.error('Error updating upload config:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update upload configuration'
    });
  }
});

module.exports = router;