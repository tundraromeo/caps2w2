@echo off
echo ========================================
echo POS-58 NETWORK PRINTER SETUP GUIDE
echo ========================================
echo.
echo This will help you convert your USB
echo printer to a network printer.
echo.
echo STEP 1: Share the printer
echo ---------------------------
echo.
echo 1. Press Windows key + I (open Settings)
echo 2. Go to: Printers and scanners
echo 3. Click on "POS-58"
echo 4. Click "Printer properties"
echo 5. Go to "Sharing" tab
echo 6. CHECK: Share this printer
echo 7. Click OK
echo.
pause
echo.
echo STEP 2: Find your computer's IP
echo ---------------------------------
echo.
ipconfig | findstr "IPv4"
echo.
echo Copy the IP address shown above
echo (e.g., 192.168.1.50)
echo.
pause
echo.
echo STEP 3: Access from another computer
echo ------------------------------------
echo.
echo From any computer on the same network:
echo 1. Press Win+R
echo 2. Type: \\<YOUR-IP>\POS-58
echo 3. Press Enter
echo 4. Windows will install the printer
echo.
echo Example: \\192.168.1.50\POS-58
echo.
pause
echo.
echo DONE! Now your POS-58 is a network printer!
echo.
echo Next: Update test-printer.html with your PC's IP
echo Instead of: 192.168.1.100
echo Use: YOUR-PC-IP
echo.
pause

