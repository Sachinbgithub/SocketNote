@echo off
title SocketNote - Simple Startup
color 0A

echo.
echo ========================================
echo    SocketNote - Simple Startup
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [INFO] Node.js version:
node --version
echo.

REM Install dependencies if needed
if not exist "node_modules" (
    echo [SETUP] Installing root dependencies...
    npm install
)

if not exist "server\node_modules" (
    echo [SETUP] Installing server dependencies...
    cd server
    npm install
    cd ..
)

if not exist "client\node_modules" (
    echo [SETUP] Installing client dependencies...
    cd client
    npm install
    cd ..
)

REM Initialize database if needed
if not exist "server\database.sqlite" (
    echo [SETUP] Initializing database...
    cd server
    npm run init-db
    cd ..
)

echo.
echo ========================================
echo    Starting SocketNote
echo ========================================
echo.
echo [INFO] Starting backend server...
echo [INFO] Backend will be available at: http://localhost:3000
echo [INFO] Network access: http://YOUR_IP:3000
echo.

REM Start backend in a new window
start "SocketNote Backend" cmd /k "cd server && npm run dev"

echo [INFO] Waiting 3 seconds for backend to start...
timeout /t 3 /nobreak >nul

echo [INFO] Starting frontend server...
echo [INFO] Frontend will be available at: http://localhost:5173
echo [INFO] Network access: http://YOUR_IP:5173
echo.

REM Start frontend in a new window
start "SocketNote Frontend" cmd /k "cd client && npm run dev"

echo.
echo ========================================
echo    SocketNote Started Successfully!
echo ========================================
echo.
echo Two new windows have opened:
echo 1. Backend server (port 3000)
echo 2. Frontend server (port 5173)
echo.
echo To access SocketNote:
echo - Local: http://localhost:5173
echo - Network: http://YOUR_IP:5173
echo.
echo To stop: Close both server windows
echo.
echo Press any key to exit this launcher...
pause >nul