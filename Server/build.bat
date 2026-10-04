@echo off
setlocal
python "%~dp0..\tools\build.py" Server %*
exit /b %errorlevel%
