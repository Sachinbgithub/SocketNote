import axios from 'axios';

// Dynamic API base URL detection
const getApiBaseUrl = () => {
  const hostname = window.location.hostname;
  console.log('API: Current hostname:', hostname);
  
  // If we're accessing from localhost, use the proxy
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('API: Using proxy for localhost');
    return '/api';
  }
  
  // If hostname is empty or undefined, use fallback IP
  if (!hostname || hostname === '') {
    console.log('API: Hostname empty, using fallback IP');
    // Extract IP from current location
    const currentUrl = window.location.href;
    const ipMatch = currentUrl.match(/http:\/\/(\d+\.\d+\.\d+\.\d+):/);
    if (ipMatch) {
      const fallbackUrl = `http://${ipMatch[1]}:3000/api`;
      console.log('API: Using extracted IP:', fallbackUrl);
      return fallbackUrl;
    }
    // Use common network IP as fallback
    const fallbackUrl = 'http://192.168.0.101:3000/api';
    console.log('API: Using hardcoded fallback IP:', fallbackUrl);
    return fallbackUrl;
  }
  
  // If accessing from network, use the server's network IP
  const networkUrl = `http://${hostname}:3000/api`;
  console.log('API: Using network IP:', networkUrl);
  return networkUrl;
};

// Create axios instance with dynamic base URL
const api = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    
    // Handle network errors
    if (!error.response) {
      return Promise.reject({
        message: 'Network error. Please check your connection.',
        type: 'network'
      });
    }
    
    // Handle server errors
    const { status, data } = error.response;
    let message = 'An error occurred';
    
    if (data && data.error) {
      message = data.error;
    } else if (status === 404) {
      message = 'Resource not found';
    } else if (status === 500) {
      message = 'Server error';
    } else if (status >= 400 && status < 500) {
      message = 'Request error';
    }
    
    return Promise.reject({
      message,
      status,
      data,
      type: 'api'
    });
  }
);

// API helper functions
export const apiService = {
  // Folder operations
  folders: {
    getAll: () => api.get('/folders'),
    getById: (id) => api.get(`/folders/${id}`),
    create: (data) => api.post('/folders', data),
    update: (id, data) => api.put(`/folders/${id}`, data),
    delete: (id) => api.delete(`/folders/${id}`),
    getStats: (id) => api.get(`/folders/${id}/stats`),
  },

  // Note operations
  notes: {
    getAll: () => api.get('/notes'),
    getByFolder: (folderId) => api.get(`/notes/folder/${folderId}`),
    getById: (id) => api.get(`/notes/${id}`),
    create: (data) => api.post('/notes', data),
    update: (id, data) => api.put(`/notes/${id}`, data),
    delete: (id) => api.delete(`/notes/${id}`),
    move: (id, folderId) => api.patch(`/notes/${id}/move`, { folder_id: folderId }),
    autoSave: (id, content) => api.patch(`/notes/${id}/autosave`, { content }),
    getStats: (id) => api.get(`/notes/${id}/stats`),
  },

  // Upload operations
  upload: {
    single: (file, noteId) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('note_id', noteId);
      
      // For file uploads, we need to use the full URL when not on localhost
      const uploadUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? '/api/upload/single' 
        : `${getApiBaseUrl()}/upload/single`;
      
      console.log('Upload single - URL:', uploadUrl);
      console.log('Upload single - Hostname:', window.location.hostname);
      
      return axios.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds for file uploads
      });
    },
    multiple: (files, noteId) => {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      formData.append('note_id', noteId);
      
      // For file uploads, we need to use the full URL when not on localhost
      const uploadUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? '/api/upload/multiple' 
        : `${getApiBaseUrl()}/upload/multiple`;
      
      console.log('Upload multiple - URL:', uploadUrl);
      console.log('Upload multiple - Hostname:', window.location.hostname);
      console.log('Upload multiple - Files count:', files.length);
      
      return axios.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 30000, // 30 seconds for file uploads
      });
    },
    delete: (id) => api.delete(`/upload/${id}`),
    getByNote: (noteId) => api.get(`/upload/note/${noteId}`),
  },

  // Search operations
  search: {
    global: (query, options = {}) => api.get('/search', { params: { q: query, ...options } }),
    advanced: (query, options = {}) => api.get('/search/advanced', { params: { q: query, ...options } }),
    suggestions: (query, type = 'all') => api.get('/search/suggestions', { params: { q: query, type } }),
    stats: (query) => api.get('/search/stats', { params: { q: query } }),
  },

  // Backup operations
  backup: {
    export: (includeAttachments = false) => api.post('/backup/export', { include_attachments: includeAttachments }),
    import: (backupData, overwrite = false) => api.post('/backup/import', { backup_data: backupData, overwrite }),
    history: () => api.get('/backup/history'),
    delete: (filename) => api.delete(`/backup/${filename}`),
    stats: () => api.get('/backup/stats'),
  },

  // Health check
  health: () => api.get('/health'),
};

// File size formatter
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Date formatter
export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Relative time formatter
export const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) {
    return 'just now';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else {
    return formatDate(dateString);
  }
};

// Search highlight helper
export const highlightSearchTerm = (text, searchTerm) => {
  if (!searchTerm || !text) return text;
  
  const regex = new RegExp(`(${searchTerm})`, 'gi');
  return text.replace(regex, '<mark class="search-highlight">$1</mark>');
};

// Debounce helper
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle helper
export const throttle = (func, limit) => {
  let inThrottle;
  return function() {
    const args = arguments;
    const context = this;
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Local storage helpers
export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error writing to localStorage:', error);
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from localStorage:', error);
    }
  },
  
  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Error clearing localStorage:', error);
    }
  }
};

export default api; 