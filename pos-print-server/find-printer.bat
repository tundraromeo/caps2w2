@echo off
echo ========================================
echo Finding Network Printers...
echo ========================================
echo.

REM Find all devices on the network
echo Checking for printers on common IP ranges...
echo.

REM Check common IP ranges
for /L %%i in (1,1,254) do (
    ping -n 1 -w 100 192.168.1.%%i >nul 2>&1
    if %%i==1 set /a found=0
)

echo.
echo ========================================
echo Testing common printer IPs...
echo ========================================
echo.

REM Test common printer IPs
for %%j in (100 101 102 200 1 2 3) do (
    echo Testing 192.168.1.%%j...
    ping -n 1 -w 500 192.168.1.%%j >nul 2>&1
    if errorlevel 1 (
        echo   [ ] 192.168.1.%%j - Not reachable
    ) else (
        echo   [X] 192.168.1.%%j - REACHABLE!
    )
)

echo.
echo ========================================
echo Step 1: Check printer network settings
echo ========================================
echo.
echo 1. Press the SETUP button on your POS-58 printer
echo 2. Navigate to Network Settings
echo 3. Look for "TCP/IP" or "IP Address"
echo 4. Write down the IP address shown
echo.
echo OR
echo.
echo 1. Open Windows Settings
echo 2. Go to Printers & scanners
echo 3. Right-click on POS-58
echo 4. Select "Printer properties"
echo 5. Go to "Ports" tab
echo 6. Look for the IP address in the port list
echo.
echo ========================================
echo Step 2: Test the printer IP
echo ========================================
echo.
echo After finding the IP, test with this command:
echo.
echo telnet <PRINTER_IP> 9100
echo.
echo If it connects, the IP is correct!
echo.
pause

