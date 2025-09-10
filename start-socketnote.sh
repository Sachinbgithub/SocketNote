 #!/bin/bash

# SocketNote Startup Script for Linux/Mac
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo -e "${GREEN}========================================"
echo -e "    SocketNote - Starting Application"
echo -e "========================================${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}ERROR: Node.js is not installed or not in PATH${NC}"
    echo -e "${YELLOW}Please install Node.js from https://nodejs.org/${NC}"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}ERROR: npm is not installed or not in PATH${NC}"
    exit 1
fi

echo -e "${CYAN}[INFO] Node.js version: $(node --version)${NC}"
echo -e "${CYAN}[INFO] npm version: $(npm --version)${NC}"
echo ""

# Check and install dependencies
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}[SETUP] Installing root dependencies...${NC}"
    npm install
fi

if [ ! -d "server/node_modules" ]; then
    echo -e "${YELLOW}[SETUP] Installing server dependencies...${NC}"
    cd server
    npm install
    cd ..
fi

if [ ! -d "client/node_modules" ]; then
    echo -e "${YELLOW}[SETUP] Installing client dependencies...${NC}"
    cd client
    npm install
    cd ..
fi

echo -e "${GREEN}[SETUP] Dependencies check complete!${NC}"
echo ""

# Initialize database if it doesn't exist
if [ ! -f "server/database.sqlite" ]; then
    echo -e "${YELLOW}[SETUP] Initializing database...${NC}"
    cd server
    npm run init-db
    cd ..
    echo -e "${GREEN}[SETUP] Database initialized successfully!${NC}"
    echo ""
fi

echo -e "${GREEN}========================================"
echo -e "    Starting SocketNote Application"
echo -e "========================================${NC}"
echo ""
echo -e "${CYAN}[INFO] Backend will start on port 3000${NC}"
echo -e "${CYAN}[INFO] Frontend will start on port 5173${NC}"
echo -e "${CYAN}[INFO] Both will be accessible from your local network${NC}"
echo ""
echo -e "${YELLOW}[INFO] Press Ctrl+C to stop both servers${NC}"
echo ""

# Start both servers concurrently
echo -e "${GREEN}[STARTING] Launching backend and frontend...${NC}"
npm run dev

echo ""
echo -e "${YELLOW}[INFO] SocketNote has been stopped${NC}"