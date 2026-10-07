@echo off
setlocal
cd /d "%~dp0"

call npm install
if errorlevel 1 exit /b %errorlevel%

call npm run typecheck
if errorlevel 1 exit /b %errorlevel%

call npm run test:protocol
if errorlevel 1 exit /b %errorlevel%

call npm run build
if errorlevel 1 exit /b %errorlevel%

endlocal
