const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs-extra');
const os = require('os');

// Import route handlers
const folderRoutes = require('./routes/folders');
const noteRoutes = require('./routes/notes');
const uploadRoutes = require('./routes/upload');
const searchRoutes = require('./routes/search');
const backupRoutes = require('./routes/backup');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Security middleware with proper configuration
app.use(helmet({
  contentSecurityPolicy: NODE_ENV === 'production' ? {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  } : false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting with different limits for different endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 upload requests per windowMs
  message: 'Too many upload requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const searchLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 50, // limit each IP to 50 search requests per windowMs
  message: 'Too many search requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting
app.use('/api/', generalLimiter);
app.use('/api/upload', uploadLimiter);
app.use('/api/search', searchLimiter);

// CORS configuration with proper security
const corsOptions = {
  origin: NODE_ENV === 'production' 
    ? [
        'http://localhost:5173',
        'http://localhost:3000',
        // Add your production domains here
        // 'https://yourdomain.com'
      ]
    : [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://192.168.0.101:5173',
        'http://192.168.80.1:5173',
        'http://192.168.126.1:5173',
        'http://172.26.96.1:5173',
        // Allow all network access in development
        /^http:\/\/192\.168\.\d+\.\d+:\d+$/,
        /^http:\/\/172\.\d+\.\d+\.\d+:\d+$/,
        // Allow file:// origins for testing
        'null',
        'file://'
      ], // Allow network access in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'X-Total-Count'],
  maxAge: 86400 // 24 hours
};

app.use(cors(corsOptions));

// Body parsing middleware with reasonable limits
app.use(express.json({ 
  limit: '100mb', // Increased for file uploads
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      res.status(400).json({ error: 'Invalid JSON' });
      throw new Error('Invalid JSON');
    }
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '100mb' // Increased for file uploads
}));

// Request size validation middleware - moved after routes to avoid blocking uploads
app.use((req, res, next) => {
  // Skip size validation for upload routes
  if (req.path.startsWith('/api/upload')) {
    return next();
  }
  
  const contentLength = parseInt(req.headers['content-length'] || '0');
  const maxSize = 5 * 1024 * 1024; // 5MB for non-upload requests
  
  if (contentLength > maxSize) {
    return res.status(413).json({
      success: false,
      error: 'Request entity too large. Maximum size is 5MB for non-upload requests.'
    });
  }
  
  next();
});

// Serve static files from uploads directory with security headers
app.use('/uploads', (req, res, next) => {
  // Add security headers for file downloads
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Disposition', 'attachment');
  next();
}, express.static(path.join(__dirname, 'uploads')));

// Serve static files from client build (in production)
if (NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../client/dist')));
}

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Office Notes Sharing App API',
    version: '1.0.0',
    environment: NODE_ENV,
    endpoints: {
      folders: '/api/folders',
      notes: '/api/notes',
      upload: '/api/upload',
      search: '/api/search',
      backup: '/api/backup',
      health: '/api/health'
    },
    client: NODE_ENV === 'production' ? 'Built-in' : 'http://localhost:5173',
    documentation: 'See README.md for API documentation'
  });
});

// Test upload page endpoint
app.get('/test-upload', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>File Upload Test</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        .result { margin: 10px 0; padding: 10px; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; }
        .error { background: #f8d7da; color: #721c24; }
        .info { background: #d1ecf1; color: #0c5460; }
        button { padding: 10px 20px; margin: 5px; }
        input { margin: 10px 0; }
    </style>
</head>
<body>
    <h1>File Upload Test</h1>
    
    <div>
        <label>Note ID: <input type="text" id="noteId" value="23"></label>
    </div>
    
    <div>
        <label>File: <input type="file" id="fileInput" accept=".txt,.pdf,.zip"></label>
    </div>
    
    <button onclick="testUpload()">Test Upload</button>
    <button onclick="testServer()">Test Server</button>
    <button onclick="testSimple()">Test Simple</button>
    
    <div id="result"></div>

    <script>
        const serverUrl = window.location.origin.replace(/:\d+$/, ':3000');
        console.log('Using server URL:', serverUrl);

        function showResult(message, type = 'info') {
            const div = document.getElementById('result');
            div.textContent = message;
            div.className = 'result ' + type;
        }

        async function testServer() {
            try {
                showResult('Testing server connection...', 'info');
                const response = await fetch(serverUrl + '/api/health');
                const data = await response.json();
                showResult('Server OK: ' + data.status, 'success');
            } catch (error) {
                showResult('Server Error: ' + error.message, 'error');
            }
        }

        async function testSimple() {
            try {
                showResult('Testing simple endpoint...', 'info');
                const response = await fetch(serverUrl + '/test-simple');
                const data = await response.json();
                showResult('Simple test OK: ' + JSON.stringify(data), 'success');
            } catch (error) {
                showResult('Simple test Error: ' + error.message, 'error');
            }
        }

        async function testUpload() {
            const noteId = document.getElementById('noteId').value;
            const fileInput = document.getElementById('fileInput');
            
            if (!fileInput.files[0]) {
                showResult('Please select a file', 'error');
                return;
            }

            try {
                showResult('Starting upload...', 'info');
                
                const formData = new FormData();
                formData.append('files', fileInput.files[0]);
                formData.append('note_id', noteId);

                console.log('Uploading file:', fileInput.files[0].name);
                console.log('Note ID:', noteId);
                console.log('FormData entries:');
                for (let [key, value] of formData.entries()) {
                    console.log(key, ':', value);
                }

                const startTime = Date.now();
                
                const response = await fetch(serverUrl + '/api/upload/multiple', {
                    method: 'POST',
                    body: formData
                });

                const endTime = Date.now();
                const duration = endTime - startTime;

                if (response.ok) {
                    const data = await response.json();
                    showResult('Upload successful in ' + duration + 'ms! Files: ' + data.data.length, 'success');
                } else {
                    const data = await response.json();
                    showResult('Upload failed: ' + data.error + ' (Status: ' + response.status + ')', 'error');
                    console.error('Upload error response:', data);
                }
            } catch (error) {
                showResult('Upload error: ' + error.message, 'error');
                console.error('Upload error:', error);
            }
        }

        // Test server on load
        window.addEventListener('load', testServer);
    </script>
</body>
</html>
  `);
});

// Simple test endpoint
app.get('/test-simple', (req, res) => {
  res.json({ 
    message: 'Server is working!', 
    timestamp: new Date().toISOString(),
    note: 'This endpoint works without any authentication or complex logic'
  });
});

// API routes
app.use('/api/folders', folderRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/backup', backupRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV,
    version: '1.0.0'
  });
});

// Serve React app for all other routes (in production)
if (NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/dist/index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  
  // Don't leak error details in production
  const errorMessage = NODE_ENV === 'development' ? err.message : 'Internal server error';
  
  res.status(500).json({ 
    success: false,
    error: errorMessage,
    ...(NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Route not found',
    path: req.path,
    method: req.method
  });
});

// Get local IP addresses for network access
function getLocalIPs() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  
  for (const name of Object.keys(interfaces)) {
    for (const interface of interfaces[name]) {
      // Skip internal and non-IPv4 addresses
      if (interface.family === 'IPv4' && !interface.internal) {
        addresses.push(interface.address);
      }
    }
  }
  
  return addresses;
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
  const localIPs = getLocalIPs();
  
  // Get upload configuration
  let uploadInfo = '';
  try {
    const { getCurrentConfig } = require('./config/upload');
    const config = getCurrentConfig();
    const maxSizeMB = Math.round(config.fileSize / (1024 * 1024));
    uploadInfo = `📎 Upload: ${maxSizeMB}MB per file, ${config.files} files max`;
  } catch (error) {
    uploadInfo = '📎 Upload: 50MB per file, 10 files max (default)';
  }
  
  console.log('🚀 Office Notes Sharing App Server Started!');
  console.log('============================================');
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📱 Local: http://localhost:${PORT}`);
  
  if (localIPs.length > 0) {
    console.log('🌐 Network Access:');
    localIPs.forEach(ip => {
      console.log(`   http://${ip}:${PORT}`);
    });
  }
  
  console.log('============================================');
  console.log('📁 Uploads directory:', path.join(__dirname, 'uploads'));
  console.log('💾 Database:', path.join(__dirname, 'database.sqlite'));
  console.log(uploadInfo);
  console.log('🔒 Security: Rate limiting, CORS, Helmet enabled');
  console.log('============================================');
});

module.exports = app; 