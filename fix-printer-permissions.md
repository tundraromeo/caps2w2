# 🔧 FIX: Printer gumagana sa Notepad pero hindi sa POS

## PROBLEMA
✅ Gumagana ang printer pag manual print (Notepad, Word, etc.)
❌ Hindi gumagana pag sa POS transaction

## DAHILAN
Apache/PHP ay walang permission to access the printer dahil:
1. Hindi naka-share properly ang printer
2. Apache hindi running as Administrator
3. Windows User Account Control (UAC) blocking

---

## SOLUSYON (3 Methods - Try lahat hanggang may gumana)

### METHOD 1: Run XAMPP as Administrator ⭐ (MOST COMMON FIX)

1. **CLOSE** ang XAMPP Control Panel kung naka-open
2. **Right-click** sa XAMPP Control Panel icon (sa Desktop or Start Menu)
3. **Click** "Run as administrator"
4. Click **"Yes"** sa UAC prompt
5. **Start** Apache
6. **Test** ulit ang POS transaction

✅ **Ito ang most common solution!**

---

### METHOD 2: Fix Printer Share Permissions

1. **Open** Control Panel
2. **Go to** Devices and Printers
3. **Right-click** sa printer mo
4. **Click** "Printer properties"
5. **Go to** "Sharing" tab
6. Make sure:
   - ✅ "Share this printer" is CHECKED
   - Share name = printer name (example: POS-58)
7. **Go to** "Security" tab
8. **Click** "Add..."
9. **Type** "Everyone" (without quotes)
10. **Click** "Check Names" then "OK"
11. Make sure "Everyone" has **"Print"** permission checked
12. **Click** "Apply" then "OK"

---

### METHOD 3: Use Direct Printer Access (Updated Code)

Replace the printer code to use direct access instead of share name.

**File:** `Api/print-receipt-fixed-width.php`
**Line ~152-170**

Change FROM:
```php
$printerName = 'POS-58';
$command = 'copy /b ' . escapeshellarg($temp) . ' ' . escapeshellarg('\\\\localhost\\' . $printerName);
```

Change TO:
```php
$printerName = 'POS-58'; // Your printer name
// Try direct printer port instead of share
$command = 'print /D:"' . $printerName . '" "' . $temp . '" 2>&1';
```

---

### METHOD 4: Set Apache Service to Run as Administrator

1. Open **Services** (Win + R, type `services.msc`)
2. Find **"Apache2.4"** in the list
3. Right-click → **Properties**
4. Go to **"Log On"** tab
5. Select **"Local System account"**
6. Check **"Allow service to interact with desktop"**
7. Click **"Apply"** then **"OK"**
8. **Restart Apache** service

---

## COMPLETE FIX CODE (Copy-Paste Ready)

Replace the entire printing section in `Api/print-receipt-fixed-width.php` around line 152:


