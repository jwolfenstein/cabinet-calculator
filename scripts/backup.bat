@echo off
setlocal
set "ROOT=%~dp0.."
set "BACKUPS=%ROOT%\backups"
if not exist "%BACKUPS%" mkdir "%BACKUPS%"

for /f "tokens=1-4 delims=/ " %%a in ('date /t') do set DS=%%d%%b%%c
for /f "tokens=1-2 delims=: " %%a in ('time /t') do set TS=%%a%%b
set "TS=%TS::=%"
set "STAMP=%DS%-%TS%"

set "STAGE=%TEMP%\cabcalc-backup-%STAMP%"
if exist "%STAGE%" rmdir /s /q "%STAGE%"
mkdir "%STAGE%"

REM Mirror project excluding big/derived folders
robocopy "%ROOT%" "%STAGE%" /MIR /NFL /NDL /NP /R:1 /W:1 /XD node_modules dist .git backups .turbo .next coverage >nul

REM Use PowerShell to zip (present on all modern Windows)
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "Compress-Archive -Path '%STAGE%\*' -DestinationPath '%BACKUPS%\cabinet-calculator-%STAMP%.zip' -CompressionLevel Optimal"

rmdir /s /q "%STAGE%"
echo Backup -> "%BACKUPS%\cabinet-calculator-%STAMP%.zip"
endlocal

