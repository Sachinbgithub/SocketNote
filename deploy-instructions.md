# Office Notes Sharing App - Deployment Guide

## Option 1: Direct Copy (Simplest)

### Step 1: Copy Project to Main System
```bash
# Copy the entire project folder to your main system
# Example: Copy to C:\OfficeNotesApp\ or /opt/office-notes-app/
```

### Step 2: Install Dependencies
```bash
# Navigate to project directory
cd /path/to/office-notes-app

# Install all dependencies
npm run install-all
```

### Step 3: Initialize Database
```bash
# Initialize the database
cd server
npm run init-db
```

### Step 4: Start the Application
```bash
# Start both server and client
npm run dev

# Or start them separately:
# Terminal 1 - Server
cd server
npm run dev

# Terminal 2 - Client  
cd client
npm run dev
```

### Step 5: Access the Application
- **Local**: http://localhost:5173
- **Network**: http://YOUR_SYSTEM_IP:5173

## Option 2: Production Build (Recommended)

### Step 1: Build the Client
```bash
cd client
npm run build
```

### Step 2: Configure Production Server
The server is already configured to serve the built client in production mode.

### Step 3: Set Environment Variables
```bash
# Set NODE_ENV to production
export NODE_ENV=production
# or on Windows:
set NODE_ENV=production
```

### Step 4: Start Production Server
```bash
cd server
npm start
```

### Step 5: Access the Application
- **Local**: http://localhost:3000
- **Network**: http://YOUR_SYSTEM_IP:3000

## Option 3: Docker Deployment

### Step 1: Create Dockerfile
```dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY server/package*.json ./server/
COPY client/package*.json ./client/

# Install dependencies
RUN npm run install-all

# Copy source code
COPY . .

# Build client
RUN cd client && npm run build

# Expose port
EXPOSE 3000

# Start server
CMD ["cd", "server", "&&", "npm", "start"]
```

### Step 2: Build and Run Docker Container
```bash
# Build the image
docker build -t office-notes-app .

# Run the container
docker run -d -p 3000:3000 --name office-notes office-notes-app
```

## System Requirements

### Minimum Requirements:
- **Node.js**: 18.x or higher
- **RAM**: 512MB
- **Storage**: 100MB
- **Network**: Local network access

### Recommended Requirements:
- **Node.js**: 20.x LTS
- **RAM**: 1GB
- **Storage**: 500MB
- **Network**: Gigabit Ethernet

## Configuration

### Database Location
The SQLite database is stored at: `server/database.sqlite`

### Upload Directory
File uploads are stored at: `server/uploads/`

### Backup Directory
Backups are stored at: `server/backups/`

## Security Considerations

### For Production Deployment:
1. **Change default ports** if needed
2. **Set up firewall rules** to restrict access
3. **Use HTTPS** for external access
4. **Regular backups** of the database
5. **Monitor disk space** for uploads

### Network Access Control:
```bash
# Example: Allow only specific IP ranges
# Add to your firewall rules
```

## Maintenance

### Regular Tasks:
1. **Database backups**: Use the built-in backup feature
2. **Clean old uploads**: Monitor upload directory size
3. **Update dependencies**: Run `npm update` periodically
4. **Monitor logs**: Check server logs for errors

### Backup Strategy:
```bash
# Manual backup
curl -X POST http://localhost:3000/api/backup/export

# Automated backup (cron job)
0 2 * * * curl -X POST http://localhost:3000/api/backup/export
```

## Troubleshooting

### Common Issues:
1. **Port already in use**: Change ports in config files
2. **Database locked**: Restart the server
3. **Upload fails**: Check disk space and permissions
4. **Network access denied**: Check firewall settings

### Logs:
- **Server logs**: Check terminal output
- **Client logs**: Check browser console
- **Database logs**: Check SQLite database integrity

## Performance Optimization

### For High Usage:
1. **Increase Node.js memory**: `--max-old-space-size=2048`
2. **Use PM2** for process management
3. **Set up reverse proxy** (nginx/Apache)
4. **Enable compression** for static files

### PM2 Setup:
```bash
# Install PM2
npm install -g pm2

# Start with PM2
pm2 start server/index.js --name "office-notes"

# Save PM2 configuration
pm2 save
pm2 startup
``` 