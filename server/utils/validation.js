const path = require('path');
const fs = require('fs-extra');

// Input validation utilities
class ValidationUtils {
  // Validate ID parameters
  static validateId(id) {
    if (!id) return null;
    const numId = parseInt(id, 10);
    return !isNaN(numId) && numId > 0 ? numId : null;
  }

  // Validate string input
  static validateString(input, maxLength = 1000) {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();
    return trimmed.length > 0 && trimmed.length <= maxLength ? trimmed : null;
  }

  // Validate folder name
  static validateFolderName(name) {
    const validName = this.validateString(name, 255);
    if (!validName) return null;
    
    // Check for invalid characters
    const invalidChars = /[<>:"/\\|?*]/;
    if (invalidChars.test(validName)) return null;
    
    return validName;
  }

  // Validate note title
  static validateNoteTitle(title) {
    return this.validateString(title, 500);
  }

  // Validate note content
  static validateNoteContent(content) {
    if (!content) return '';
    if (typeof content !== 'string') return '';
    return content.length <= 1000000 ? content : content.substring(0, 1000000); // 1MB limit
  }

  // Validate file path for security
  static validateFilePath(filePath, baseDir) {
    if (!filePath || typeof filePath !== 'string') return false;
    
    try {
      const resolvedPath = path.resolve(filePath);
      const resolvedBaseDir = path.resolve(baseDir);
      return resolvedPath.startsWith(resolvedBaseDir);
    } catch (error) {
      return false;
    }
  }

  // Validate file type
  static validateFileType(mimetype, allowedTypes) {
    return allowedTypes.includes(mimetype);
  }

  // Validate file size
  static validateFileSize(size, maxSize) {
    return typeof size === 'number' && size > 0 && size <= maxSize;
  }

  // Sanitize HTML content
  static sanitizeHtml(html) {
    if (!html || typeof html !== 'string') return '';
    
    // Basic HTML sanitization - remove script tags and dangerous attributes
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/data:/gi, '');
  }

  // Validate search query
  static validateSearchQuery(query) {
    const validQuery = this.validateString(query, 200);
    if (!validQuery) return null;
    
    // Remove potentially dangerous characters
    return validQuery.replace(/[<>]/g, '');
  }

  // Validate pagination parameters
  static validatePagination(page, limit) {
    const validPage = Math.max(1, parseInt(page, 10) || 1);
    const validLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    return { page: validPage, limit: validLimit };
  }

  // Validate date range
  static validateDateRange(startDate, endDate) {
    if (!startDate || !endDate) return null;
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    if (start > end) return null;
    
    return { start, end };
  }

  // Validate email (basic)
  static validateEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  // Validate URL (basic)
  static validateUrl(url) {
    if (!url || typeof url !== 'string') return false;
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  // Validate JSON data
  static validateJson(data) {
    if (!data) return null;
    try {
      return typeof data === 'object' ? data : JSON.parse(data);
    } catch {
      return null;
    }
  }

  // Validate file extension
  static validateFileExtension(filename, allowedExtensions) {
    if (!filename || typeof filename !== 'string') return false;
    const ext = path.extname(filename).toLowerCase();
    return allowedExtensions.includes(ext);
  }

  // Generate safe filename
  static generateSafeFilename(originalName) {
    if (!originalName || typeof originalName !== 'string') return null;
    
    const ext = path.extname(originalName);
    const name = path.basename(originalName, ext);
    
    // Remove dangerous characters
    const safeName = name.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    return safeName + ext;
  }

  // Validate backup filename
  static validateBackupFilename(filename) {
    if (!filename || typeof filename !== 'string') return false;
    
    // Only allow alphanumeric, dots, dashes, and underscores
    const safeFilename = /^[a-zA-Z0-9._-]+\.json$/;
    return safeFilename.test(filename);
  }
}

module.exports = ValidationUtils; 