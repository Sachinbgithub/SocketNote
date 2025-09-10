 # SocketNote Network Access Guide

This guide explains how to start SocketNote and access it from any device on your local network.

## 🚀 Quick Start

### Windows Users
Double-click `start-socketnote.bat` or run:
```cmd
start-socketnote.bat
```

### Linux/Mac Users
```bash
chmod +x start-socketnote.sh
./start-socketnote.sh
```

### PowerShell Users (Windows)
```powershell
.\start-socketnote.ps1
```

## 📱 Network Access

Once started, SocketNote will be accessible from any device on your local network:

### Backend API
- **Local**: http://localhost:3000
- **Network**: http://YOUR_IP:3000

### Frontend Application
- **Local**: http://localhost:5173
- **Network**: http://YOUR_IP:5173

## 🔍 Finding Your IP Address

### Windows
```cmd
ipconfig
```
Look for "IPv4 Address" under your network adapter.

### Linux/Mac
```bash
ifconfig
# or
ip addr show
```

### Common IP Ranges
- **Home Networks**: 192.168.x.x or 10.0.x.x
- **Office Networks**: 172.16.x.x to 172.31.x.x

## 📋 Access Examples

If your computer's IP is `192.168.1.100`:

### From Another Computer
- Open browser and go to: `http://192.168.1.100:5173`
- The SocketNote interface will load
- All features work: notes, folders, file uploads, search

### From Mobile Device
- Connect to the same WiFi network
- Open browser and go to: `http://192.168.1.100:5173`
- Full mobile-responsive interface

### From Tablet
- Same process as mobile device
- Touch-friendly interface for notes and folders

## 🔧 Troubleshooting

### "Connection Refused" Error
1. **Check Firewall**: Windows Firewall might be blocking the ports
   - Go to Windows Defender Firewall
   - Allow Node.js through firewall
   - Or temporarily disable firewall for testing

2. **Check Antivirus**: Some antivirus software blocks network access
   - Add Node.js to antivirus exceptions
   - Or temporarily disable real-time protection

3. **Check Network**: Ensure all devices are on the same network
   - Same WiFi network
   - Same subnet (192.168.1.x, etc.)

### Port Already in Use
If you get "port already in use" error:
```bash
# Kill processes on ports 3000 and 5173
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID_NUMBER> /F

netstat -ano | findstr :5173
taskkill /PID <PID_NUMBER> /F

# Linux/Mac
lsof -ti:3000 | xargs kill -9
lsof -ti:5173 | xargs kill -9
```

### Dependencies Not Installing
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and reinstall
rm -rf node_modules server/node_modules client/node_modules
npm run install-all
```

## 🛡️ Security Notes

### Local Network Only
- SocketNote is designed for local network use
- No external internet access required
- Data stays on your local network

### Firewall Configuration
- Port 3000: Backend API
- Port 5173: Frontend application
- Only allow these ports on your local network

### Data Privacy
- All notes and files stored locally
- No cloud services involved
- Complete control over your data

## �� Mobile Access Tips

### iOS Safari
- Add to home screen for app-like experience
- Full functionality including file uploads

### Android Chrome
- Add to home screen
- Enable "Desktop site" for better experience

### File Uploads on Mobile
- Camera integration for photos
- Document picker for files
- Drag & drop works on touch devices

## �� Auto-Start Options

### Windows Startup
1. Create shortcut to `start-socketnote.bat`
2. Copy to Startup folder: `%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup`

### Linux Systemd Service
```bash
# Create service file
sudo nano /etc/systemd/system/socketnote.service

# Add content:
[Unit]
Description=SocketNote Application
After=network.target

[Service]
Type=simple
User=your-username
WorkingDirectory=/path/to/socketnote
ExecStart=/usr/bin/npm run dev
Restart=always

[Install]
WantedBy=multi-user.target

# Enable and start
sudo systemctl enable socketnote
sudo systemctl start socketnote
```

## �� Performance Tips

### Large Files
- Default limit: 50MB per file
- Can be increased in `server/config/upload.js`
- Consider network speed for large uploads

### Multiple Users
- SQLite handles concurrent access well
- No user limit (limited by network capacity)
- Each user gets their own session

### Network Speed
- Gigabit Ethernet: Best performance
- WiFi 5/6: Good performance
- Older WiFi: May be slower for large files

## 🆘 Getting Help

### Check Logs
- Backend logs: Console output when running
- Frontend logs: Browser Developer Tools (F12)

### Common Issues
1. **Port conflicts**: Change ports in config files
2. **Permission errors**: Run as administrator (Windows) or with sudo (Linux)
3. **Network issues**: Check IP address and firewall settings

### Support
- Check the main README.md for detailed setup
- Review VERSIONING_GUIDE.md for updates
- GitHub Issues for bug reports

---

**Happy Note Sharing!** 📝✨