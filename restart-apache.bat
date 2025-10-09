@echo off
echo ========================================
echo    Restarting Apache...
echo ========================================
echo.

echo Stopping Apache...
C:\xampp\apache\bin\httpd.exe -k stop
timeout /t 3 /nobreak >nul

echo Starting Apache...
C:\xampp\apache\bin\httpd.exe -k start
timeout /t 2 /nobreak >nul

echo.
echo ========================================
echo    Apache Restarted!
echo ========================================
echo.
echo Now try: http://localhost/caps2e2/Api/test-printer-simple.php
echo.
pause

