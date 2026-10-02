@echo off
setlocal
pushd "%~dp0" || exit /b 1

call gradlew.bat run %*
set "RUN_EXIT_CODE=%ERRORLEVEL%"

popd
if "%~1"=="" pause
exit /b %RUN_EXIT_CODE%
