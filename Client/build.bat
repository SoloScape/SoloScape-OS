@echo off
setlocal
for /d %%J in ("%ProgramFiles%\Eclipse Adoptium\jdk-21*") do if exist "%%~fJ\bin\java.exe" set "JAVA_HOME=%%~fJ"
if defined JAVA_HOME set "PATH=%JAVA_HOME%\bin;%PATH%"
pushd "%~dp0" || exit /b 1
call gradlew.bat build installDist --console=plain %*
set "result=%errorlevel%"
popd
exit /b %result%
