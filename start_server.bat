@echo off
REM ============================================================
REM  ScholarChain – Full-Stack Server Launcher
REM ============================================================
echo.
echo ============================================================
echo  Starting ScholarChain Full-Stack Portal
echo ============================================================
echo.

set "PATH=C:\Program Files\nodejs;%PATH%"

cd /d "%~dp0"

echo [1/2] Checking dependencies...
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
)

echo [2/2] Starting server on http://localhost:5000...
echo.
echo Open your browser and go to: http://localhost:5000
echo.
node server.js
pause
