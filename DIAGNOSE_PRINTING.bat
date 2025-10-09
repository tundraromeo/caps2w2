@echo off
color 0A
echo.
echo ╔══════════════════════════════════════════════════════════╗
echo ║         PRINTING DIAGNOSTIC TOOL                         ║
echo ╚══════════════════════════════════════════════════════════╝
echo.
echo [1/5] Checking XAMPP Apache...
tasklist /FI "IMAGENAME eq httpd.exe" 2>NUL | find /I /N "httpd.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo    ✓ Apache is RUNNING
) else (
    echo    ✗ Apache is NOT RUNNING - START XAMPP!
    goto :end
)
echo.

echo [2/5] Checking if running as Administrator...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo    ✓ Running as ADMINISTRATOR
) else (
    echo    ✗ NOT running as Administrator
    echo    ! Run XAMPP as Administrator for printing to work!
)
echo.

echo [3/5] Checking installed printers...
wmic printer get name 2>NUL | findstr /V "Name" | findstr /V "^$"
echo.

echo [4/5] Checking POS-58 printer specifically...
wmic printer where "name='POS-58'" get name,printerstatus,workoffline 2>NUL
if %ERRORLEVEL% NEQ 0 (
    echo    ✗ POS-58 printer NOT FOUND!
    echo    ! Install or check printer name
) else (
    echo    ✓ POS-58 printer found
)
echo.

echo [5/5] Testing print command...
echo Test from Diagnostic Tool > "%TEMP%\diagnostic_test.txt"
print /D:"POS-58" "%TEMP%\diagnostic_test.txt" 2>&1
echo.

echo ══════════════════════════════════════════════════════════
echo   DIAGNOSTIC COMPLETE
echo ══════════════════════════════════════════════════════════
echo.
echo Next steps:
echo  1. If Apache not running: Start XAMPP
echo  2. If not Administrator: Run RUN_XAMPP_AS_ADMIN.bat
echo  3. If printer not found: Check Windows printer settings
echo  4. If print test failed: Check printer is online and has paper
echo.

:end
pause

