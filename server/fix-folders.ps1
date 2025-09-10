# PowerShell script to fix duplicate folder names
Write-Host "=== FIXING DUPLICATE FOLDER NAMES ===" -ForegroundColor Green
Write-Host ""

# Check if node is available
try {
    $nodeVersion = node --version
    Write-Host "Node.js version: $nodeVersion" -ForegroundColor Yellow
} catch {
    Write-Host "Node.js not found. Please install Node.js first." -ForegroundColor Red
    exit 1
}

# Run the cleanup script
Write-Host "Running folder cleanup script..." -ForegroundColor Yellow
node cleanup-folders.js

Write-Host ""
Write-Host "=== CLEANUP COMPLETED ===" -ForegroundColor Green
Write-Host "You can now try creating new folders in the application." -ForegroundColor Cyan 