# 🖨️ TAMANG PAG-SETUP NG PRINTER PARA SA POS SYSTEM

## ✅ STEP-BY-STEP GUIDE (Tagalog)

---

## 📦 **PARTE 1: I-SETUP ANG PRINTER SA WINDOWS**

### **Step 1: I-Connect ang Printer** 🔌

1. **I-plug** ang USB cable ng thermal printer sa computer
2. **I-ON** ang printer (may power button usually sa likod o gilid)
3. **Hintayin** na mag-load ng papel (usually may tunog)
4. **Check** kung may LED light na nag-ON (meaning ready na)

---

### **Step 2: I-Install ang Printer Driver** 💿

**Option A: Automatic Installation**
1. Windows ay mag-detect automatically ng printer
2. Hintayin lang ang "Installing device driver" notification
3. Pag tapos, ready na!

**Option B: Manual Installation**
1. Open **Control Panel**
2. Click **Devices and Printers**
3. Click **Add a printer** (sa taas)
4. Piliin ang printer sa list
5. Click **Next** at sundin ang instructions

**Option C: May CD/Driver file**
1. I-insert ang CD o i-download ang driver
2. Double-click ang setup file
3. Click **Install**
4. Restart computer kung kailangan

---

### **Step 3: I-TEST ang Printer sa Windows** 🧪

1. Open **Control Panel**
2. Click **Devices and Printers**
3. **Right-click** sa printer mo
4. Click **Printer properties**
5. Click **Print Test Page** button
6. Dapat mag-print ng test page ✅

**Kung NAG-PRINT = PROCEED TO STEP 4**
**Kung HINDI NAG-PRINT = Check:**
- Naka-ON ba ang printer?
- May papel ba?
- Naka-plug ba ang USB cable?

---

### **Step 4: I-SHARE ang Printer** 🌐

**IMPORTANTE ITO!** Para ma-access ng PHP script.

1. Open **Control Panel**
2. Click **Devices and Printers**
3. **Right-click** sa printer mo
4. Click **Printer properties**
5. Click **Sharing** tab
6. ✅ **CHECK** ang **"Share this printer"**
7. **Note:** I-remember ang **Share name** (usually same lang sa printer name)
8. Click **OK**

---

### **Step 5: Kumuha ng EXACT Printer Name** 📝

**Method 1: Via Control Panel**
1. Open **Control Panel**
2. Click **Devices and Printers**
3. **Tingnan** ang pangalan ng printer (example: POS-58, XP-58, Thermal Printer)
4. **I-copy** ang EXACT name (kasama ang spaces at capitals)

**Method 2: Via Test Page** (Mas madali!)
1. Open browser
2. Go to: `http://localhost/caps2e2/Api/test-printer-simple.php`
3. Click **"Ipakita ang Lahat ng Printer"**
4. **I-copy** ang pangalan ng printer mo sa list

**Halimbawa ng printer names:**
- `POS-58`
- `XP-58`
- `Thermal Printer`
- `Receipt Printer`
- `EPSON TM-T20`

---

## 💻 **PARTE 2: I-CONFIGURE ANG PHP CODE**

### **Step 6: I-Update ang Printer Name sa Code** ✏️

1. **Open** ang file: `Api/print-receipt-fixed-width.php`

2. **Hanapin** ang line 152 (o search for `$printerName =`)

3. **Makikita mo ito:**
```php
$printerName = 'POS-58'; // <-- CHANGE THIS TO YOUR PRINTER NAME
```

4. **Palitan** ang `'POS-58'` ng EXACT name ng printer mo:
```php
$printerName = 'YourPrinterName'; // Example: 'XP-58' or 'Thermal Printer'
```

5. **IMPORTANTE:** 
   - Use **EXACT** name (case-sensitive!)
   - Keep the **single quotes** `' '`
   - Example kung printer mo ay "XP-58":
   ```php
   $printerName = 'XP-58';
   ```

6. **I-SAVE** ang file (Ctrl + S)

---

## 🧪 **PARTE 3: I-TEST ANG SETUP**

### **Step 7: I-Test sa Test Page** 🖨️

1. **Open browser** (Chrome, Firefox, etc.)

2. **I-type sa address bar:**
```
http://localhost/caps2e2/Api/test-printer-simple.php
```

3. **I-type** ang printer name mo sa field

4. **Click** ang button: **"🖨️ I-Test ang Printer"**

5. **Check ang printer** - dapat mag-print ng test receipt! ✅

**Kung NAG-PRINT:**
```
✅ SUCCESS! - Printer is working!
✅ Proceed to Step 8
```

**Kung HINDI NAG-PRINT:**
```
❌ Check ang error message
❌ Go back to Step 5 (check printer name)
❌ Or troubleshoot (see PARTE 4 below)
```

---

### **Step 8: I-Test sa Actual POS** 🛒

1. **Open** ang POS system:
```
http://localhost:3000
```

2. **Login** sa POS

3. **Add item** sa cart

4. **Checkout** at complete ang sale

5. **Dapat automatic mag-print** ng receipt! ✅

---

## 🎉 **TAPOS NA! KUNG GUMAGANA NA:**

✅ Printer ay naka-setup na correctly
✅ Automatic na mag-print ng receipt pag may sale
✅ Receipt format: 32 characters wide (perfect for thermal printer)

---

## ⚠️ **PARTE 4: TROUBLESHOOTING** (Kung may problema)

### **Problem 1: "The system cannot find the file specified"**

**Ibig sabihin:** Mali ang printer name

**Solution:**
1. Go back to Step 5
2. Kumuha ng EXACT printer name
3. Update sa Step 6
4. Test ulit sa Step 7

---

### **Problem 2: "Access is denied"**

**Ibig sabihin:** Hindi naka-share ang printer O walang permission

**Solution:**
1. **Go to Step 4** - I-share ang printer
2. **Run XAMPP as Administrator:**
   - Right-click XAMPP Control Panel
   - Click "Run as administrator"
   - Start Apache
3. **Check printer permissions:**
   - Control Panel → Printers
   - Right-click printer → Properties
   - Security tab → Make sure "Everyone" has Print permission

---

### **Problem 3: "Printer is offline"**

**Ibig sabihin:** Printer ay naka-OFF o disconnected

**Solution:**
1. **I-check kung:**
   - ✅ Naka-ON ba ang printer?
   - ✅ Naka-plug ba ang USB cable?
   - ✅ May papel ba?
2. **Sa Control Panel → Printers:**
   - Right-click printer
   - Uncheck "Use Printer Offline" kung naka-check

---

### **Problem 4: Test page BLANK o walang laman**

**Ibig sabihin:** May error sa PHP o Apache

**Solution:**
1. **Restart Apache:**
   - XAMPP Control Panel
   - Click Stop sa Apache
   - Wait 3 seconds
   - Click Start sa Apache
2. **Check PHP errors:**
   - Open: `C:\xampp\php\php_error.log`
   - Tingnan ang recent errors
3. **Try ulit** ang test page

---

### **Problem 5: Receipt nag-save lang sa file, hindi nag-print**

**Ibig sabihin:** Printing failed, pero may backup

**Solution:**
1. Check kung tama ang printer name (Step 5-6)
2. Check kung naka-ON ang printer
3. Test using Command Prompt:
```cmd
echo Test > test.txt
copy /b test.txt \\localhost\YourPrinterName
```
4. Kung nag-print sa command prompt = problema sa PHP setup
5. Kung hindi nag-print = problema sa printer share (back to Step 4)

---

## 📋 **CHECKLIST: Before Testing**

Bago mag-test, siguraduhin:

- [ ] ✅ Naka-ON ang printer
- [ ] ✅ May papel sa loob
- [ ] ✅ Naka-plug ang USB cable
- [ ] ✅ Naka-install ang driver
- [ ] ✅ Test page sa Windows successful
- [ ] ✅ Naka-share ang printer
- [ ] ✅ Nakuha ang EXACT printer name
- [ ] ✅ Na-update na sa code (line 152)
- [ ] ✅ Naka-save ang file
- [ ] ✅ Naka-restart ang Apache

---

## 🎯 **QUICK REFERENCE**

### Mga Important Files:
```
Api/print-receipt-fixed-width.php  → Main printer code (line 152)
Api/test-printer-simple.php       → Test page (Tagalog)
Api/test-printer.php               → Test page (English)
```

### Mga Important URLs:
```
Test Page:  http://localhost/caps2e2/Api/test-printer-simple.php
POS System: http://localhost:3000
```

### Common Printer Names:
```
POS-58
XP-58
Thermal Printer
Receipt Printer
EPSON TM-T20
Star TSP100
```

---

## 💡 **TIPS**

1. **Printer name ay case-sensitive!**
   - Mali: `pos-58`
   - Mali: `POS58`
   - Tama: `POS-58`

2. **Always test sa Windows first** bago sa POS
   - Control Panel → Print Test Page
   - Kung dito hindi gumagana, hindi rin sa POS

3. **Keep printer ON** lagi habang nag-tetest

4. **Check printer status** sa Control Panel
   - Dapat "Ready" hindi "Offline"

5. **May backup** ang system
   - Kung hindi nag-print, nag-save sa `receipts/` folder
   - Pwede mo i-print manually later

---

## 📞 **NEED MORE HELP?**

Check these files:
- `PRINTER_SETUP_GUIDE.md` - English detailed guide
- `PRINTER_QUICK_START.txt` - Quick reference
- `PRINTER_OPTIONS.md` - Advanced options

Or check logs:
- `C:\xampp\apache\logs\error.log` - Apache errors
- `C:\xampp\php\php_error.log` - PHP errors

---

## ✨ **BONUS: Command Line Test**

Para manual test without browser:

1. Open **Command Prompt** (cmd)
2. Type:
```cmd
echo Test Receipt > test.txt
copy /b test.txt \\localhost\POS-58
```
3. Replace `POS-58` with your printer name
4. Kung nag-print = SUCCESS! ✅

---

**Sundin lang lahat ng steps, guaranteed gumagana yan! 🎉**

Last Updated: 2024-10-09

