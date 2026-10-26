@echo off
REM ============================================================
REM  ScholarChain – Setup & Test Runner
REM  Run this batch file once to install Node.js + dependencies
REM  and then run the test suite.
REM ============================================================

echo.
echo ============================================================
echo  ScholarChain Setup Script
echo ============================================================
echo.

REM Check if Node.js is installed
where node >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo.
    echo Please install Node.js from: https://nodejs.org/en/download/
    echo Recommended: LTS version (18.x or 20.x)
    echo.
    echo After installing Node.js, run this script again.
    echo.
    pause
    exit /b 1
)

echo [OK] Node.js found:
node --version
echo.

echo [OK] npm found:
npm --version
echo.

echo [1/3] Installing dependencies (solc, ganache, ethers)...
cd /d "%~dp0"
npm install
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] npm install failed. Check your internet connection.
    pause
    exit /b 1
)
echo [OK] Dependencies installed.
echo.

echo [2/3] Running test suite...
echo.
node test.js
IF %ERRORLEVEL% NEQ 0 (
    echo.
    echo [WARN] Some tests failed. See output above.
) ELSE (
    echo.
    echo [OK] All tests passed!
)
echo.

echo [3/3] Setup complete!
echo.
echo Next steps:
echo   1. Open Ganache Desktop (port 7545)
echo   2. Open ScholarChain.html in your browser
echo   3. Click "Connect to Ganache"
echo   4. Compile the contract and paste bytecode (see README.md)
echo   5. Click "Run Full Demo"
echo.
pause
