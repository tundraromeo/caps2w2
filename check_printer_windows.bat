@echo off
echo ==========================================
echo   CHECK PRINTER STATUS
echo ==========================================
echo.

echo Checking if POS-58 printer exists...
echo.

:: Check if printer exists
wmic printer get name,status,workoffline | findstr "POS-58"

echo.
echo Checking print queue...
echo.

:: Check print queue
powershell "Get-Printer -Name 'POS-58' | Select-Object Name, PrinterStatus, DriverName"

echo.
echo Checking if printer is shared...
echo.

:: Check printer sharing
powershell "Get-Printer -Name 'POS-58' | Select-Object Name, Shared, ShareName"

echo.
echo Checking print spooler service...
echo.

:: Check print spooler
sc query spooler

echo.
echo ==========================================
echo   MANUAL CHECKS NEEDED:
echo ==========================================
echo 1. Go to Windows Settings ^> Devices ^> Printers
echo 2. Find POS-58 printer
echo 3. Check if it shows "Ready" (green) or "Offline" (gray)
echo 4. Right-click ^> Manage ^> Print test page
echo 5. Check if printer has paper
echo 6. Check USB connection
echo.
pause
