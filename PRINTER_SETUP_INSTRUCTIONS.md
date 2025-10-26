# Printer Setup Instructions for Users

## Quick Start Guide

### For Users with QZ Tray (Recommended for Thermal Printers)

1. **Download QZ Tray**
   - Visit: https://qz.io/download/
   - Download and install the latest version

2. **Start QZ Tray**
   - Run the QZ Tray application (look for the tray icon)

3. **Access the POS System**
   - Open your browser and go to the POS system
   - If using HTTPS (https://enguiostore.vercel.app), you'll need to allow insecure content

4. **Allow Insecure Content (HTTPS only)**
   - In Chrome/Edge: Click the lock icon (🔒) in the address bar
   - Click "Site settings"
   - Under "Insecure content", select "Allow"
   - Refresh the page

5. **Accept QZ Tray Connection**
   - When prompted by QZ Tray, click "Allow"
   - Wait 3 seconds for automatic connection

6. **Verify Connection**
   - Look for the green "🖨️ QZ Tray Ready" indicator in the top-right corner

### For Users without QZ Tray (Browser Print)

1. **No Installation Required**
   - Just open the POS system in your browser
   - The system will automatically use browser print

2. **Print Receipts**
   - Complete a transaction
   - Browser print dialog will open automatically
   - Select your printer and click "Print"

## Understanding the Printer Status Indicator

The indicator in the top-right corner shows:

| Icon | Color | Status | Meaning |
|------|-------|--------|---------|
| 🖨️ | Green | Connected | QZ Tray is connected and ready |
| 🔄 | Yellow (pulsing) | Connecting | Attempting to connect (auto-reconnects every 3 seconds) |
| ⚠️ | Orange | Offline | QZ Tray not available, using browser print |
| ❌ | Red | Error | Connection failed |

### Click Actions

- **When Connected** (🖨️): Click to test printer
- **When Disconnected** (⚠️/❌): Click to manually connect to QZ Tray

## Troubleshooting

### Problem: Can't Connect to QZ Tray

**Solution 1: Check if QZ Tray is Running**
- Look for QZ Tray icon in system tray (bottom-right of screen)
- If not running, start QZ Tray application

**Solution 2: Allow Insecure Content**
- Click lock icon (🔒) in browser address bar
- Click "Site settings" → "Insecure content" → "Allow"
- Refresh page

**Solution 3: Accept QZ Tray Popup**
- When QZ Tray shows connection popup, click "Allow"
- Browser may block QZ Tray connection, check for popup blockers

**Solution 4: Check Firewall**
- Ensure firewall allows QZ Tray to communicate
- Add QZ Tray to firewall exceptions if needed

### Problem: Printer Not Printing

**Solution 1: Test Connection**
- Click the printer status indicator
- Look for "Test connection successful" message

**Solution 2: Check Printer**
- Ensure printer is powered on
- Check if printer is connected to computer (USB/WiFi)
- Try printing a test page from OS settings

**Solution 3: Use Browser Print**
- If QZ Tray doesn't work, browser print will automatically activate
- Complete a transaction and use browser print dialog

### Problem: Receipt Doesn't Format Correctly

**Solution 1: Use Thermal Printer**
- This system is optimized for thermal printers (58mm)
- Normal printers may not format correctly
- Use browser print for normal printers

**Solution 2: Adjust Browser Print Settings**
- In browser print dialog, try different page sizes
- Select "More settings" and adjust margins

## Browser-Specific Instructions

### Google Chrome / Microsoft Edge

1. Click lock icon (🔒) in address bar
2. Click "Site settings"
3. Find "Insecure content" section
4. Select "Allow"
5. Refresh page

### Firefox

1. Click the shield icon in address bar
2. Click "Disable protection for this page"
3. Refresh page

### Safari

1. Safari blocks mixed content by default
2. For best results, use browser print fallback
3. QZ Tray may not work due to Safari restrictions

## Configuration for POS58 Thermal Printers

The system is optimized for 58mm thermal printers like:

- Epson TM-T20
- Star TSP100
- Bixolon SRP-350
- Any POS58 compatible thermal printer

### Setting Up Your Thermal Printer

1. **Install Printer Drivers**
   - Install drivers for your thermal printer
   - Connect printer via USB

2. **Configure in QZ Tray**
   - Open QZ Tray settings
   - Select your thermal printer
   - Set paper size to 58mm

3. **Test Print**
   - Click printer status indicator
   - Select "Test printer"
   - Verify print quality

## Auto-Reconnect Feature

The system automatically attempts to reconnect to QZ Tray every 3 seconds:

- Shows "🔄 Auto-connecting..." status
- Will connect automatically when QZ Tray starts
- No action needed from user

To disable auto-reconnect:
- Manual connection can be triggered by clicking printer indicator

## Security Notes

### HTTPS Sites (Vercel, etc.)

When accessing over HTTPS:
- Browser may block QZ Tray connections
- "Mixed content" warnings are normal
- Users must allow insecure content
- This is required for QZ Tray to work

### Browser Print is Secure

- Browser print works without additional permissions
- No installation required
- Works on any HTTPS site
- Perfect fallback solution

## Support Contacts

If you need help:

1. Check this guide first
2. Look at browser console (F12) for errors
3. Verify QZ Tray is running
4. Try browser print fallback
5. Contact system administrator

## Frequently Asked Questions

**Q: Do I need to install QZ Tray?**
A: Not necessarily. The system will use browser print automatically if QZ Tray is not available.

**Q: What if QZ Tray doesn't connect?**
A: The system will automatically use browser print. Just complete transactions normally.

**Q: Can I use my regular printer?**
A: Yes! Browser print works with any printer. Format may differ from thermal printers.

**Q: How do I know if it's working?**
A: Look for the green "🖨️ QZ Tray Ready" or "Browser Print Ready" indicator.

**Q: Can I use this offline?**
A: No, you need internet connection to access the POS system. But QZ Tray runs locally.

**Q: Is it safe to allow insecure content?**
A: Yes, it's required for QZ Tray to communicate with your browser. QZ Tray is trusted software.

**Q: What happens if I close QZ Tray?**
A: The system will auto-reconnect every 3 seconds when you restart QZ Tray. No need to refresh the page.

**Q: Can multiple users use this?**
A: Each user needs QZ Tray installed on their computer. Browser print works for everyone.

