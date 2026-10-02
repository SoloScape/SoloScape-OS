@echo off
setlocal
pushd "%~dp0" || exit /b 1

call gradlew.bat build %*
set "BUILD_EXIT_CODE=%ERRORLEVEL%"

popd
if "%~1"=="" pause
exit /b %BUILD_EXIT_CODE%
