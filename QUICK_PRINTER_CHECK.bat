@echo off
echo ==========================================
echo   QUICK PRINTER CHECK
echo ==========================================
echo.
echo Checking installed printers...
echo.
wmic printer get name,printerstatus,workoffline
echo.
echo ==========================================
echo.
echo If you see POS-58 above, it's installed!
echo.
echo PrinterStatus meanings:
echo   3 = Idle (Ready to print)
echo   4 = Printing
echo   7 = Offline
echo.
pause

