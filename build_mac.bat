@echo off
title QuartoReview - macOS Build Helper
setlocal

set "ROOT=%~dp0"

echo ============================================================
echo  QuartoReview - macOS Build Helper
echo ============================================================
echo.
echo A real macOS app bundle ^(.app/.dmg^) must be built on macOS.
echo This Windows batch file is here for consistency with build_win.bat
echo and to document the exact command sequence for a Mac machine.
echo.
echo On macOS, run:
echo   chmod +x build_mac.sh
echo   ./build_mac.sh
echo.
echo That script will:
echo   1. install frontend dependencies
echo   2. build frontend/dist
echo   3. install electron dependencies
echo   4. run electron-builder --mac
echo.
echo Why this cannot finish here:
echo   electron-builder can package Windows installers on Windows,
echo   but macOS desktop artifacts need a macOS build environment.
echo.
pause
