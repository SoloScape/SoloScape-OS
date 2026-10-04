@echo off
setlocal
for /d %%J in ("%ProgramFiles%\Eclipse Adoptium\jdk-21*") do if exist "%%~fJ\bin\java.exe" set "JAVA_HOME=%%~fJ"
if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;%PATH%"
pushd "%~dp0" || exit /b 1

if not exist ".data\cache\SERVER\main_file_cache.dat2" goto install
if not exist ".data\cache\SERVER\main_file_cache.idx255" goto install
if not exist "api\generated\src\main\kotlin\org\rsmod\api\table\MusicRow.kt" goto generate
if not exist "api\generated\src\main\kotlin\org\rsmod\api\table\MusicModernRow.kt" goto generate
goto build

:install
echo First-time setup is required. Installing the cache and generating API sources...
call gradlew.bat install
set "BUILD_EXIT_CODE=%ERRORLEVEL%"
if not "%BUILD_EXIT_CODE%"=="0" goto finish
goto build

:generate
echo Generating API sources from the bundled cache...
call gradlew.bat :or-cache:generateApi
set "BUILD_EXIT_CODE=%ERRORLEVEL%"
if not "%BUILD_EXIT_CODE%"=="0" goto finish

:build
call gradlew.bat build :server:app:installDist %*
set "BUILD_EXIT_CODE=%ERRORLEVEL%"

:finish
popd
if "%~1"=="" pause
exit /b %BUILD_EXIT_CODE%
