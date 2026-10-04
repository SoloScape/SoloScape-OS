@echo off
setlocal
call "%~dp0Client\build.bat" %*
if errorlevel 1 exit /b %errorlevel%
call "%~dp0Server\build.bat" %*
exit /b %errorlevel%
