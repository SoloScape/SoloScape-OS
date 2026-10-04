@echo off
setlocal
echo [1/2] Building client...
call "%~dp0Client\build.bat" %*
if errorlevel 1 exit /b %errorlevel%
echo [2/2] Building server...
call "%~dp0Server\build.bat" %*
exit /b %errorlevel%
