@echo off
chcp 65001 >nul
color 0A
echo.
echo ╔════════════════════════════════════════════╗
echo ║   🖨️  QUICK PRINTER TEST - POS SYSTEM     ║
echo ╔════════════════════════════════════════════╝
echo.
echo Step 1: Listing available printers...
echo ════════════════════════════════════════════
wmic printer get name
echo.
echo ════════════════════════════════════════════
echo.
echo Step 2: Enter your printer name
echo        (Copy from list above)
echo.
set /p PRINTER_NAME="Printer Name: "
echo.
echo Step 3: Creating test receipt...
echo ════════════════════════════════════════════

(
echo ================================
echo       TEST RECEIPT
echo ================================
echo Date: %DATE%
echo Time: %TIME%
echo --------------------------------
echo Kung nakita mo ito,
echo GUMAGANA ANG PRINTER MO!
echo ================================
echo.
echo.
) > test_receipt.txt

echo.
echo Step 4: Sending to printer: %PRINTER_NAME%
echo ════════════════════════════════════════════
copy /b test_receipt.txt "\\localhost\%PRINTER_NAME%" 2>&1

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ╔════════════════════════════════════════════╗
    echo ║  ✅ SUCCESS! Check your printer!          ║
    echo ╚════════════════════════════════════════════╝
    echo.
    echo Next step: Update printer name in:
    echo Api/print-receipt-fixed-width.php (line 152)
    echo.
    echo Change to: $printerName = '%PRINTER_NAME%';
) else (
    echo.
    echo ╔════════════════════════════════════════════╗
    echo ║  ❌ FAILED! Check printer setup           ║
    echo ╚════════════════════════════════════════════╝
    echo.
    echo Troubleshooting:
    echo 1. Check if printer name is EXACTLY correct
    echo 2. Make sure printer is ON
    echo 3. Make sure printer is SHARED in Windows
    echo 4. Try running as Administrator
)

echo.
del test_receipt.txt 2>nul
pause

