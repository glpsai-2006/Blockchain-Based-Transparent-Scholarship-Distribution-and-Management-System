@echo off
title ScholarChain - Push to GitHub
color 0A

echo.
echo ============================================================
echo   ScholarChain - Push to GitHub
echo   Repo: https://github.com/glpsai-2006/Blockchain-Based-Transparent-Scholarship-Distribution-and-Management-System
echo ============================================================
echo.

:: Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Git is not installed!
    echo.
    echo Please install Git from: https://git-scm.com/download/win
    echo Then run this script again.
    echo.
    pause
    exit /b 1
)

echo [OK] Git found:
git --version
echo.

cd /d "d:\Blockchain-Based Transparent Scholarship Distribution and Management System"

:: Initialize git repo if not already done
if not exist ".git" (
    echo [STEP 1] Initializing Git repository...
    git init
    echo.
) else (
    echo [STEP 1] Git repository already initialized.
    echo.
)

:: Configure user (uses system git config if already set)
echo [STEP 2] Setting Git identity...
git config user.email "glpsai2006@gmail.com"
git config user.name "glpsai-2006"
echo.

:: Add all files
echo [STEP 3] Staging all files...
git add .
echo.

:: Show what will be committed
echo [STEP 4] Files staged for commit:
git status --short
echo.

:: Commit
echo [STEP 5] Creating commit...
git commit -m "feat: Complete ScholarChain blockchain scholarship system v1.0

- Solidity smart contract (contracts/ScholarshipSystem.sol)
- Full-stack Express.js web server with JWT authentication
- Frontend: ScholarChain.html with MetaMask integration
- Ganache local blockchain node (ganache_node.js)
- Automated test suite - all 33 tests passing (test.js)
- API tests (test_api.js), RPC proxy tests (test_rpc_proxy.js)
- Role-based access: Authority, College, Student, Auditor, Oracle
- Transparent on-chain scholarship distribution tracking
- Complete README with setup instructions"

echo.

:: Set remote origin
echo [STEP 6] Setting remote origin...
git remote remove origin 2>nul
git remote add origin https://github.com/glpsai-2006/Blockchain-Based-Transparent-Scholarship-Distribution-and-Management-System.git
echo.

:: Rename branch to main
echo [STEP 7] Setting branch to main...
git branch -M main
echo.

:: Push to GitHub
echo [STEP 8] Pushing to GitHub...
echo (You may be prompted for your GitHub username and password/token)
echo.
git push -u origin main
echo.

if errorlevel 1 (
    echo.
    echo [WARNING] Push failed. This might be because:
    echo   1. You need a GitHub Personal Access Token (not your password)
    echo   2. The remote repo already has commits (use: git push --force)
    echo.
    echo To create a token: GitHub ^> Settings ^> Developer settings ^> Personal access tokens
    echo Then use the token as your password when prompted.
    echo.
    echo If repo already has content, run: git push -u origin main --force
    echo.
) else (
    echo.
    echo ============================================================
    echo   SUCCESS! Your code is now on GitHub!
    echo   Visit: https://github.com/glpsai-2006/Blockchain-Based-Transparent-Scholarship-Distribution-and-Management-System
    echo ============================================================
    echo.
)

pause
