# 🖨️ PRINTER TROUBLESHOOTING GUIDE

## Problema: Hindi nag-print ang receipt kahit may physical printer

### ✅ HINDI KAILANGAN NG ADDITIONAL PACKAGE
Ang system ay gumagamit ng built-in Windows print commands. Pero kailangan i-enable ang PHP permissions.

---

## 🛠️ STEP-BY-STEP FIX

### **STEP 1: I-check kung enabled ang `shell_exec()` sa PHP**

1. **Hanapin ang `php.ini` file:**
   - Kung XAMPP: `C:\xampp\php\php.ini`
   - Kung ibang setup, tingnan sa `phpinfo()`

2. **I-open ang `php.ini` gamit ang Notepad (Run as Administrator)**

3. **Hanapin ang line na ito:**
   ```ini
   disable_functions = 
   ```

4. **Siguraduhing WALA ang `shell_exec` sa listahan:**
   - ✅ TAMA: `disable_functions = `
   - ✅ TAMA: `disable_functions = proc_open,popen`
   - ❌ MALI: `disable_functions = shell_exec,exec,system`
   
   Kung nandyan ang `shell_exec`, **TANGGALIN** mo.

5. **Save at restart Apache:**
   ```bash
   # Sa XAMPP Control Panel
   Click [Stop] sa Apache
   Click [Start] ulit
   ```

---

### **STEP 2: I-check ang Printer Name**

1. **I-open ang Control Panel > Devices and Printers**

2. **I-right-click ang receipt printer > Printer properties**

3. **I-copy ang EXACT printer name** (case-sensitive)

4. **I-update sa `print-receipt-fixed-width.php` (line 149):**
   ```php
   $printerName = 'POS-58'; // <-- PALITAN TO NG EXACT PRINTER NAME MO
   ```

   **Halimbawa:**
   - Kung ang printer name ay `XP-58`, ilagay: `$printerName = 'XP-58';`
   - Kung `Thermal Printer`, ilagay: `$printerName = 'Thermal Printer';`

---

### **STEP 3: I-share ang Printer (Important!)**

1. **Right-click ang printer > Printer properties**

2. **Go to "Sharing" tab**

3. **I-check ang "Share this printer"**

4. **I-note ang share name** (usually same as printer name)

5. **Click [Apply] > [OK]**

---

### **STEP 4: I-set ang Printer as Default**

1. **Sa Devices and Printers**

2. **Right-click ang thermal printer**

3. **Click "Set as default printer"**

---

### **STEP 5: Run XAMPP as Administrator**

**IMPORTANT:** Apache kailangang may permissions para mag-access ng printer.

#### Option A: Using Batch File
```batch
@echo off
echo Running XAMPP as Administrator...
cd /d "C:\xampp"
xampp-control.exe
```
Save as `RUN_XAMPP_AS_ADMIN.bat`, then **Right-click > Run as administrator**

#### Option B: Manual
1. Close XAMPP kung running
2. Go to `C:\xampp`
3. Right-click `xampp-control.exe`
4. Click "Run as administrator"
5. Start Apache

---

### **STEP 6: I-test ang Printer**

1. **Open browser console (F12)**

2. **I-test ang printing:**
   ```javascript
   // I-paste sa console:
   fetch('http://localhost/caps2e2/Api/print-receipt-fixed-width.php', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       date: '2024-01-15',
       time: '14:30:00',
       transactionId: 'TEST123',
       cashier: 'Test User',
       terminalName: 'POS',
       items: [
         { name: 'Test Item', quantity: 1, price: 10.00 }
       ],
       subtotal: 10.00,
       grandTotal: 10.00,
       paymentMethod: 'cash',
       amountPaid: 10.00,
       change: 0
     })
   })
   .then(r => r.json())
   .then(console.log)
   .catch(console.error);
   ```

3. **Tingnan ang response:**
   - ✅ `"success": true` - Printing successful!
   - ❌ `"success": false` - Check error message

---

## 🔍 COMMON ERRORS & SOLUTIONS

### Error: "shell_exec() has been disabled"
**Solution:** I-enable sa `php.ini` (See STEP 1)

### Error: "Printer not found"
**Solution:** I-check ang printer name sa `print-receipt-fixed-width.php` (See STEP 2)

### Error: "Access denied"
**Solution:** Run XAMPP as Administrator (See STEP 5)

### Error: "Unable to print"
**Solution:** 
1. I-share ang printer (See STEP 3)
2. Set as default printer (See STEP 4)
3. Check kung naka-ON ang printer
4. Check kung may papel

---

## 📋 CHECKLIST

Bago mag-test, sigurado na:
- [ ] `shell_exec` is enabled sa `php.ini`
- [ ] Apache restarted after php.ini changes
- [ ] XAMPP running as Administrator
- [ ] Printer is turned ON
- [ ] Printer has paper
- [ ] Printer is shared
- [ ] Printer name sa code matches actual name
- [ ] Printer is set as default

---

## 🆘 STILL NOT WORKING?

### Check PHP Error Log:
```bash
# Location: C:\xampp\php\logs\php_error_log
# Or: C:\xampp\htdocs\caps2e2\php_errors.log
```

### Check Apache Error Log:
```bash
# Location: C:\xampp\apache\logs\error.log
```

### Test Printer Manually (Windows):
```cmd
# Open Command Prompt as Administrator
echo Test print > test.txt
print /D:"POS-58" test.txt
```
Kung mag-print, problem sa PHP. Kung hindi mag-print, problem sa printer setup.

---

## 💡 ALTERNATIVE: Manual Print Fallback

Kung hindi pa rin gumana, may backup solution:

**Sa `print-receipt-fixed-width.php` (line 229-242):**
```php
// Saves receipt to file as backup
$backupDir = __DIR__ . '/../receipts';
if (!is_dir($backupDir)) {
    @mkdir($backupDir, 0777, true);
}
$backupFile = $backupDir . '/receipt_' . ($input['transactionId'] ?? time()) . '.txt';
file_put_contents($backupFile, $formatted);
```

Ang receipt ay naka-save sa `receipts/` folder. Pwede mo i-open at i-print manually.

---

## 📞 NEED MORE HELP?

1. Check logs mentioned above
2. Run the test command in STEP 6
3. Share error messages for specific troubleshooting

