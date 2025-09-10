// Upload configuration
const uploadConfig = {
  // File size limits (in bytes)
  limits: {
    // Office use - moderate files
    office: {
      fileSize: 50 * 1024 * 1024, // 50MB
      files: 10, // 10 files per request
      totalSize: 500 * 1024 * 1024 // 500MB total
    },
    
    // High-res images - larger files
    images: {
      fileSize: 100 * 1024 * 1024, // 100MB
      files: 5, // 5 files per request
      totalSize: 500 * 1024 * 1024 // 500MB total
    },
    
    // Large files - maximum safe limit
    large: {
      fileSize: 200 * 1024 * 1024, // 200MB
      files: 3, // 3 files per request
      totalSize: 600 * 1024 * 1024 // 600MB total
    },
    
    // Maximum safe limit
    maximum: {
      fileSize: 500 * 1024 * 1024, // 500MB
      files: 2, // 2 files per request
      totalSize: 1000 * 1024 * 1024 // 1GB total
    }
  },
  
  // Allowed file types
  allowedTypes: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'image/bmp',
    'image/tiff',
    'application/pdf',
    'text/plain',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Archive files
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    'application/x-tar',
    'application/gzip',
    'application/x-gzip',
    'application/octet-stream' // For some archive files that don't have proper MIME type
  ],
  
  // Upload directory
  uploadDir: 'uploads',
  
  // Timeout settings (in milliseconds)
  timeout: {
    upload: 5 * 60 * 1000, // 5 minutes
    request: 10 * 60 * 1000 // 10 minutes
  }
};

// Get current configuration (change this to switch between presets)
const getCurrentConfig = () => {
  // Change this to switch between: 'office', 'images', 'large', 'maximum'
  const preset = process.env.UPLOAD_PRESET || 'office';
  return uploadConfig.limits[preset];
};

module.exports = {
  uploadConfig,
  getCurrentConfig
}; 