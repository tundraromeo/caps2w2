@echo off
echo ==========================================
echo   CHECKING PRINTER STATUS
echo ==========================================
echo.

echo [1] Checking if POS-58 printer exists...
wmic printer where "name='POS-58'" get name,printerstatus,workoffline 2>NUL
if %ERRORLEVEL% NEQ 0 (
    echo    ❌ POS-58 printer NOT FOUND!
    echo.
    echo Available printers:
    wmic printer get name
    goto :end
) else (
    echo    ✅ POS-58 printer found
)

echo.
echo [2] Checking printer status...
wmic printer where "name='POS-58'" get name,printerstatus,workoffline,default 2>NUL

echo.
echo [3] Testing print command...
echo Test Print > "%TEMP%\test_print.txt"
print /D:"POS-58" "%TEMP%\test_print.txt" 2>&1

echo.
echo [4] Checking print queue...
echo Print queue status:
wmic printer where "name='POS-58'" get name,printerstatus 2>NUL

:end
echo.
echo ==========================================
echo   PRINTER STATUS CHECK COMPLETE
echo ==========================================
echo.
echo If printer not found:
echo   - Check if printer is installed in Windows
echo   - Check if printer is connected via USB
echo   - Check if printer drivers are installed
echo.
echo If printer found but not printing:
echo   - Check if printer is online
echo   - Check if printer has paper
echo   - Check if printer is not in error state
echo.
pause
