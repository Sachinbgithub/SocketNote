# 🚀 Quick Deployment to Main System

## Method 1: Simple Copy & Run (Recommended for Office Use)

### Step 1: Copy to Main System
```bash
# Copy the entire project folder to your main system
# Example: C:\OfficeNotesApp\ or /opt/office-notes-app/
```

### Step 2: Install Dependencies
```bash
# Navigate to project directory
cd /path/to/office-notes-app

# Install all dependencies (one command)
npm run install-all
```

### Step 3: Initialize Database
```bash
cd server
npm run init-db
```

### Step 4: Start Production Mode
```bash
# Windows
start-production.bat

# Linux/Mac
chmod +x start-production.sh
./start-production.sh
```

### Step 5: Access
- **Local**: http://localhost:3000
- **Network**: http://YOUR_SYSTEM_IP:3000

## Method 2: PM2 Process Manager (For Always-On Systems)

### Step 1: Install PM2
```bash
npm install -g pm2
```

### Step 2: Build and Start
```bash
# Build the client
cd client && npm run build && cd ..

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

### Step 3: Access
- **Local**: http://localhost:3000
- **Network**: http://YOUR_SYSTEM_IP:3000

## Method 3: Docker (For Containerized Environments)

### Step 1: Build Docker Image
```bash
docker build -t office-notes-app .
```

### Step 2: Run Container
```bash
docker run -d -p 3000:3000 --name office-notes office-notes-app
```

## 📋 System Requirements

- **Node.js**: 18.x or higher
- **RAM**: 512MB minimum, 1GB recommended
- **Storage**: 100MB minimum
- **Network**: Local network access

## 🔧 Configuration

### Ports
- **Default**: 3000 (can be changed in server/index.js)
- **Firewall**: Allow port 3000 for network access

### Data Storage
- **Database**: `server/database.sqlite`
- **Uploads**: `server/uploads/`
- **Backups**: `server/backups/`

## 🛡️ Security Notes

1. **Network Access**: Only accessible on local network
2. **No Authentication**: Anyone on network can access
3. **File Uploads**: Limited to images, 10MB max
4. **Backups**: Use built-in backup feature regularly

## 📊 Monitoring

### Check if Running
```bash
# Check if server is running
netstat -an | findstr :3000

# Check PM2 status
pm2 status
```

### View Logs
```bash
# PM2 logs
pm2 logs office-notes-app

# Direct logs
tail -f logs/combined.log
```

## 🔄 Maintenance

### Regular Backups
```bash
# Manual backup
curl -X POST http://localhost:3000/api/backup/export

# Automated backup (add to cron/scheduler)
0 2 * * * curl -X POST http://localhost:3000/api/backup/export
```

### Updates
```bash
# Update dependencies
npm update

# Restart application
pm2 restart office-notes-app
```

## 🆘 Troubleshooting

### Common Issues:
1. **Port 3000 in use**: Change port in server/index.js
2. **Database errors**: Restart server
3. **Upload fails**: Check disk space
4. **Network access**: Check firewall settings

### Restart Application:
```bash
# PM2 restart
pm2 restart office-notes-app

# Manual restart
pm2 stop office-notes-app
pm2 start ecosystem.config.js --env production
```

## 📞 Support

- **Developer**: Sachin
- **Version**: 1.0.0
- **Last Updated**: August 2025 