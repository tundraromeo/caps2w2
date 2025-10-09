# 🖨️ QZ Tray Complete Setup Guide - Enguio's Pharmacy POS

## 📋 Overview

QZ Tray allows your web-based POS system to print directly to local printers, even when hosted online (Namecheap). This guide will walk you through the complete setup process.

---

## 🎯 What is QZ Tray?

QZ Tray is a desktop application that acts as a bridge between your web browser and local printers. It works on:
- ✅ Windows
- ✅ macOS  
- ✅ Linux

**Key Benefits:**
- 🌐 Works with hosted websites (Namecheap)
- 🖨️ Direct printing to local thermal printers
- 🔒 Secure WebSocket connection
- 🆓 Free for basic use

---

## 📥 Step 1: Download and Install QZ Tray

### 1.1 Download QZ Tray

1. Visit: **https://qz.io/download/**
2. Download the Windows installer
3. Run the installer and follow the prompts

### 1.2 Start QZ Tray

1. After installation, launch **QZ Tray** from your Start Menu
2. You should see a QZ icon in your system tray (bottom-right corner)
3. Right-click the icon to see the menu
4. Make sure it shows "Connected" status

### 1.3 Configure QZ Tray to Auto-Start

1. Right-click QZ Tray icon in system tray
2. Select **"Launch on Startup"** to enable auto-start
3. This ensures QZ Tray runs automatically when Windows starts

---

## 🔧 Step 2: Configure Your Printer

### 2.1 Verify Printer is Connected

1. Make sure your **POS-58** thermal printer is:
   - ✅ Connected via USB
   - ✅ Powered on
   - ✅ Has paper loaded
   - ✅ Installed in Windows (shows in Devices and Printers)

### 2.2 Test Printer in Windows

1. Open **Settings** → **Devices** → **Printers & scanners**
2. Find your **POS-58** printer
3. Click on it and select **"Manage"**
4. Click **"Print test page"**
5. Verify the test page prints correctly

---

## 🧪 Step 3: Test QZ Tray Connection

### 3.1 Open the QZ Tray Test Page

1. Make sure XAMPP Apache is running
2. Open your browser and go to:
   ```
   http://localhost/caps2e2/qz-tray-test.html
   ```

### 3.2 Test the Connection

1. Click **"Connect to QZ Tray"** button
2. You should see: ✅ "Connected to QZ Tray successfully!"
3. The available printers list will appear

### 3.3 Select Your Printer

1. Click on **POS-58** in the printer list
2. It should highlight in green
3. A test receipt preview will appear

### 3.4 Test Print

1. Click **"Test Print"** button
2. Your printer should print a test receipt
3. If successful, you'll see: ✅ "Test receipt printed successfully!"

**Troubleshooting:**
- ❌ "QZ Tray is not running" → Start QZ Tray application
- ❌ "No printers found" → Check printer is installed in Windows
- ❌ Print fails → Check printer is online and has paper

---

## 🌐 Step 4: Upload PHP Script to Namecheap

### 4.1 Upload qz-tray-receipt.php

1. Connect to your Namecheap hosting via FTP (FileZilla)
2. Navigate to your website's `Api` folder
3. Upload the file: `Api/qz-tray-receipt.php`

### 4.2 Test the PHP Script

1. Open your browser and test the endpoint:
   ```
   https://your-domain.com/Api/qz-tray-receipt.php
   ```
2. You should see a JSON response (even if it says invalid input)

---

## 🔗 Step 5: Integrate with POS System

### 5.1 Files Already Updated

The following files have been updated with QZ Tray integration:

1. ✅ `app/POS_convenience/page.js` - POS system with QZ Tray support
2. ✅ `public/qz-tray-integration.js` - QZ Tray integration module
3. ✅ `Api/qz-tray-receipt.php` - Receipt generation for QZ Tray

### 5.2 How It Works

```
┌─────────────────────────────────────────────────────────┐
│                    POS System Flow                      │
└─────────────────────────────────────────────────────────┘

1. Customer completes purchase in POS
2. POS calls printReceipt() function
3. System checks if QZ Tray is available:

   ┌─ QZ Tray Available? ─┐
   │                       │
   YES                    NO
   │                       │
   ├─ Use QZ Tray         └─ Use Server Print
   │  (For Online)           (For Local XAMPP)
   │
   ├─ Get receipt from qz-tray-receipt.php
   ├─ Send to QZ Tray via WebSocket
   └─ Print to local printer ✅
```

### 5.3 Automatic Fallback

The POS system automatically:
- 🌐 **Online (Namecheap):** Uses QZ Tray for printing
- 💻 **Local (XAMPP):** Uses server-side printing (print-receipt-fixed-width.php)

---

## 🚀 Step 6: Test with Your POS System

### 6.1 Local Testing (XAMPP)

1. Make sure QZ Tray is running
2. Start your Next.js dev server:
   ```bash
   npm run dev
   ```
3. Open POS: `http://localhost:3000/POS_convenience`
4. Add items to cart and complete a sale
5. Receipt should print automatically via QZ Tray

### 6.2 Online Testing (Namecheap)

1. Make sure QZ Tray is running on your local machine
2. Upload all files to Namecheap
3. Open your online POS: `https://your-domain.com/POS_convenience`
4. Add items to cart and complete a sale
5. Receipt should print to your local printer via QZ Tray

---

## 🔍 Step 7: Troubleshooting

### Problem: "QZ Tray is not running"

**Solution:**
1. Start QZ Tray application
2. Check system tray for QZ icon
3. Right-click icon → verify it says "Connected"

### Problem: "QZ Tray not available, falling back to server print"

**Solution:**
1. This is normal behavior when QZ Tray is not detected
2. For local XAMPP, it will use server-side printing
3. For online hosting, install QZ Tray on the client machine

### Problem: Printer not found in QZ Tray

**Solution:**
1. Check printer is installed in Windows
2. Open Settings → Printers & scanners
3. Verify printer shows up and is online
4. Click "Refresh Printers" in test page

### Problem: Print job sent but nothing prints

**Solution:**
1. Check printer has paper
2. Check printer is online (not in error state)
3. Open Windows Print Queue and check for stuck jobs
4. Restart printer and try again

### Problem: CORS error when accessing PHP script

**Solution:**
1. The PHP script already has CORS headers enabled
2. If still getting errors, check your Namecheap hosting settings
3. Make sure the API folder is accessible

---

## 📊 Step 8: Verify Everything Works

### ✅ Checklist

- [ ] QZ Tray installed and running
- [ ] QZ Tray set to auto-start on Windows startup
- [ ] Printer (POS-58) installed and working in Windows
- [ ] Test page prints successfully from qz-tray-test.html
- [ ] qz-tray-receipt.php uploaded to Namecheap
- [ ] POS system updated with QZ Tray integration
- [ ] Test sale prints receipt successfully (local)
- [ ] Test sale prints receipt successfully (online)

---

## 🎓 Understanding the System

### Local XAMPP Setup
```
POS → print-receipt-fixed-width.php → Windows Print Command → Printer
```

### Online Namecheap Setup
```
POS → qz-tray-receipt.php → QZ Tray (via WebSocket) → Local Printer
```

### Key Differences

| Feature | Local XAMPP | Online (Namecheap) |
|---------|-------------|-------------------|
| Printing Method | Server-side (PHP shell_exec) | Client-side (QZ Tray) |
| Requires Admin | Yes (XAMPP as Admin) | No |
| Requires QZ Tray | No | Yes |
| Works Remotely | No | Yes |
| Setup Complexity | Medium | Easy |

---

## 💡 Tips and Best Practices

### 1. Keep QZ Tray Running
- Enable "Launch on Startup" so it starts automatically
- Check system tray to verify it's running

### 2. Printer Maintenance
- Keep printer drivers updated
- Regularly clean printer head
- Always have spare thermal paper rolls

### 3. Testing
- Use qz-tray-test.html for quick printer tests
- Test after any system updates
- Verify both local and online printing work

### 4. Backup Plan
- If QZ Tray fails, system falls back to server printing
- Consider email receipts as additional backup (already implemented)
- Keep printer manual handy for troubleshooting

---

## 📞 Support Resources

- **QZ Tray Documentation:** https://qz.io/docs/
- **QZ Tray Community:** https://github.com/qzind/tray/discussions
- **Printer Manual:** Check POS-58 documentation

---

## 🎉 Success!

If you've completed all steps and can print receipts from your online POS, congratulations! Your system is now fully configured for both local and online printing.

**What's Next?**
- Train staff on the POS system
- Monitor printer performance
- Keep QZ Tray updated
- Enjoy seamless receipt printing! 🖨️✨

---

## 📝 Quick Reference Commands

### Start Development Server
```bash
npm run dev
```

### Test QZ Tray
```
http://localhost/caps2e2/qz-tray-test.html
```

### Open POS System
```
http://localhost:3000/POS_convenience
```

### Check QZ Tray Status
Right-click QZ Tray icon in system tray → Check "Connected" status

---

**Last Updated:** October 9, 2025  
**Version:** 1.0  
**Author:** Enguio's Pharmacy Development Team

