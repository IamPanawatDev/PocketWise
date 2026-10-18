@echo off
setlocal

:: Define project paths relative to this script
set "BACKEND_DIR=%~dp0backend\src\PocketWise.Api"
set "FRONTEND_DIR=%~dp0frontend\pocketwise-web"

:: Check if Windows Terminal (wt.exe) is available
where wt.exe >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    wt.exe --title "PocketWise Backend" -d "%BACKEND_DIR%" cmd.exe /k "dotnet watch run" ; new-tab --title "PocketWise Frontend" -d "%FRONTEND_DIR%" cmd.exe /k "npm run dev"
) else (
    echo Windows Terminal (wt.exe) was not found. Opening separate Command Prompt windows...
    start "PocketWise Backend" /D "%BACKEND_DIR%" cmd.exe /k "dotnet watch run"
    start "PocketWise Frontend" /D "%FRONTEND_DIR%" cmd.exe /k "npm run dev"
)

endlocal
