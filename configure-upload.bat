@echo off
title SocketNote - Upload Configuration
color 0B

echo.
echo ========================================
echo    SocketNote Upload Configuration
echo ========================================
echo.

echo Current upload size limits:
echo.
echo [1] Office Mode
echo     - 50MB per file
echo     - 10 files maximum per upload
echo     - 500MB total per request
echo     - Best for: Documents, small images
echo.
echo [2] Images Mode  
echo     - 100MB per file
echo     - 5 files maximum per upload
echo     - 500MB total per request
echo     - Best for: High-resolution photos
echo.
echo [3] Large Mode
echo     - 200MB per file
echo     - 3 files maximum per upload
echo     - 600MB total per request
echo     - Best for: Large documents, videos
echo.
echo [4] Maximum Mode
echo     - 500MB per file
echo     - 2 files maximum per upload
echo     - 1GB total per request
echo     - Best for: Very large files
echo.
echo [5] Custom Mode
echo     - Set your own limits
echo.

set /p choice="Choose upload configuration (1-5): "

if "%choice%"=="1" (
    set UPLOAD_PRESET=office
    echo.
    echo [CONFIG] Set to Office mode
    echo - 50MB per file
    echo - 10 files maximum
    echo - 500MB total per request
) else if "%choice%"=="2" (
    set UPLOAD_PRESET=images
    echo.
    echo [CONFIG] Set to Images mode
    echo - 100MB per file
    echo - 5 files maximum
    echo - 500MB total per request
) else if "%choice%"=="3" (
    set UPLOAD_PRESET=large
    echo.
    echo [CONFIG] Set to Large mode
    echo - 200MB per file
    echo - 3 files maximum
    echo - 600MB total per request
) else if "%choice%"=="4" (
    set UPLOAD_PRESET=maximum
    echo.
    echo [CONFIG] Set to Maximum mode
    echo - 500MB per file
    echo - 2 files maximum
    echo - 1GB total per request
) else if "%choice%"=="5" (
    echo.
    echo [CUSTOM] Enter custom file size limit (in MB):
    set /p custom_size="File size (MB): "
    echo [CUSTOM] Enter maximum number of files:
    set /p custom_files="Max files: "
    echo.
    echo [INFO] Custom configuration will be applied
    echo - %custom_size%MB per file
    echo - %custom_files% files maximum
    set UPLOAD_PRESET=custom
) else (
    set UPLOAD_PRESET=office
    echo [CONFIG] Invalid choice, using default Office mode
)

echo.
echo ========================================
echo    Configuration Applied
echo ========================================
echo.
echo Upload preset: %UPLOAD_PRESET%
echo.
echo This configuration will be used when you start SocketNote.
echo To change it again, run this script or start-socketnote.bat
echo.
echo Press any key to exit...
pause >nul