@echo off
echo ==========================================
echo   CHECKING PRINTING STATUS
echo ==========================================
echo.
echo 1. Checking if Apache is running...
tasklist /FI "IMAGENAME eq httpd.exe" 2>NUL | find /I /N "httpd.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo    [OK] Apache is running
) else (
    echo    [ERROR] Apache is NOT running!
)
echo.
echo 2. Checking printer status...
wmic printer where "name='POS-58'" get name,printerstatus,workoffline 2>NUL
if %ERRORLEVEL% NEQ 0 (
    echo    [ERROR] Printer 'POS-58' not found!
    echo    Available printers:
    wmic printer get name 2>NUL
)
echo.
echo 3. Testing print command...
echo Test Print > "%TEMP%\test_print.txt"
print /D:"POS-58" "%TEMP%\test_print.txt" 2>&1
echo.
echo ==========================================
echo   TEST COMPLETE
echo ==========================================
echo.
echo If you see errors above, check:
echo  - XAMPP running as Administrator
echo  - Printer name is correct (POS-58)
echo  - Printer is online and has paper
echo.
pause

