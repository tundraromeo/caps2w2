@echo off
echo ==========================================
echo   DIRECT PRINTER TEST
echo ==========================================
echo.

echo Testing printer: POS-58
echo.

echo Creating test file...
echo Test Print from Direct Command > test_print.txt
echo.

echo Sending to printer...
print /D:"POS-58" test_print.txt

echo.
echo Command executed. Check your printer!
echo.

echo Cleaning up...
del test_print.txt

echo.
echo ==========================================
echo   TEST COMPLETE
echo ==========================================
echo.
echo If nothing printed:
echo   - Check if printer is online
echo   - Check if printer has paper
echo   - Check if printer is shared
echo   - Try running XAMPP as Administrator
echo.
pause
