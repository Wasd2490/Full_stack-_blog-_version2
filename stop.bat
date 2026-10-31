@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

rem ============================================================
rem  Blog V2 - stop web server (and optionally PostgreSQL)
rem  Usage:  stop.bat          stop web server only
rem          stop.bat /db      also stop PostgreSQL
rem ============================================================

set "PGDIR=C:\Users\18886\postgres"
set "PGDATA=C:\Users\18886\pgdata"
set "PORT=3005"

echo.
echo Stopping Blog V2 on port %PORT% ...

set "KILLED=0"
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":%PORT% " ^| findstr LISTENING') do (
    echo       killing PID %%a
    taskkill /F /PID %%a >nul 2>&1
    set "KILLED=1"
)
if "%KILLED%"=="0" (
    echo       no process listening on %PORT%
) else (
    echo       web server stopped
)

if /i "%~1"=="/db" (
    echo.
    echo Stopping PostgreSQL ...
    "%PGDIR%\bin\pg_ctl.exe" -D "%PGDATA%" stop
) else (
    echo.
    echo PostgreSQL left running ^(use "stop.bat /db" to stop it too^)
)

echo.
echo Done.
timeout /t 4 >nul
exit /b 0
