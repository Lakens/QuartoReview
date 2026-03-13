@echo off
title QuartoReview - Building Windows Installer
setlocal

set "ROOT=%~dp0"
set "ELECTRON_DIR=%ROOT%electron"
set "FRONTEND_DIR=%ROOT%frontend"

echo ============================================================
echo  QuartoReview - Windows Installer Build
echo ============================================================
echo.

:: ── Step 1: Install frontend dependencies ───────────────────────────────────
echo [1/4] Installing frontend dependencies...
cd /d "%FRONTEND_DIR%"
call npm install --silent
if errorlevel 1 (
    echo [ERROR] Frontend npm install failed.
    pause
    exit /b 1
)

:: ── Step 2: Build frontend (sets API URL to local backend) ──────────────────
echo [2/4] Building frontend...
call npx vite build
if errorlevel 1 (
    echo [ERROR] Frontend build failed.
    pause
    exit /b 1
)
echo [OK] Frontend built to frontend\dist\
echo.

:: ── Step 3: Install electron dependencies ───────────────────────────────────
echo [3/4] Installing electron dependencies...
cd /d "%ELECTRON_DIR%"
call npm install --silent
if errorlevel 1 (
    echo [ERROR] Electron npm install failed.
    pause
    exit /b 1
)

:: ── Step 4: Build installer ─────────────────────────────────────────────────
echo [4/4] Building Windows installer...
call npm run build:win
if errorlevel 1 (
    echo [ERROR] electron-builder failed.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo  Build complete!  Installer is in: dist\
echo ============================================================
echo.
echo  On first launch, the app will create a config file and show
echo  a dialog with its location. Open that file and add either:
echo    - GITHUB_TOKEN=ghp_...   (simplest, personal use)
echo    - GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET + REDIRECT_URI
echo      (for OAuth, if sharing the installer with others)
echo.
pause
