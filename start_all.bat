@echo off
REM ============================================================
REM  ScholarChain – One-Click Complete System Launcher
REM  Starts Ganache Blockchain Node + Full-Stack Web Server
REM ============================================================
echo.
echo ============================================================
echo  Starting ScholarChain Complete Blockchain Platform
echo ============================================================
echo.

set "PATH=C:\Program Files\nodejs;%PATH%"
cd /d "%~dp0"

echo [1/2] Starting Ganache Consortium Node on port 7545...
start "ScholarChain Ganache Node (Port 7545)" cmd /k "node ganache_node.js"

echo [2/2] Starting Full-Stack Web Server on http://localhost:5000...
start "ScholarChain Web Server (Port 5000)" cmd /k "node server.js"

timeout /t 3 /nobreak >nul

echo.
echo ============================================================
echo  All services are ACTIVE!
echo  Opening browser at http://localhost:5000 ...
echo ============================================================
start http://localhost:5000
echo.
pause
