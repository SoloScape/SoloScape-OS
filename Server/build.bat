@echo off
setlocal
python "%~dp0..\tools\build_runner.py" Server %*
exit /b %errorlevel%
