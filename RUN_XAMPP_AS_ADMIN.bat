@echo off
chcp 65001 >nul
color 0B

echo.
echo ╔═══════════════════════════════════════════════════════╗
echo ║  🔧 Starting XAMPP with Administrator Rights...      ║
echo ╚═══════════════════════════════════════════════════════╝
echo.

echo ⏳ Checking if running as Administrator...
net session >nul 2>&1
if %errorLevel% == 0 (
    echo ✅ Running as Administrator
    echo.
    echo 🚀 Starting XAMPP Control Panel...
    echo.
    start "" "C:\xampp\xampp-control.exe"
    timeout /t 2 /nobreak >nul
    echo.
    echo ╔═══════════════════════════════════════════════════════╗
    echo ║  ✅ XAMPP Started with Admin Rights!                 ║
    echo ╠═══════════════════════════════════════════════════════╣
    echo ║  Next Steps:                                         ║
    echo ║  1. Start Apache in XAMPP Control Panel             ║
    echo ║  2. Test POS transaction                            ║
    echo ║  3. Printer should work now! ✅                      ║
    echo ╚═══════════════════════════════════════════════════════╝
) else (
    echo ❌ NOT running as Administrator
    echo.
    echo 🔄 Restarting with Administrator rights...
    echo.
    powershell -Command "Start-Process '%~f0' -Verb RunAs"
    exit
)

echo.
pause


