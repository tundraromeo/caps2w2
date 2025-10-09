# 🖨️ POS Printer Setup Guide

## Quick Setup (3 Steps)

### Step 1: Find Your Printer Name
1. Open **Control Panel** → **Devices and Printers**
2. Find your receipt printer (it might be named: POS-58, XP-58, Thermal Printer, etc.)
3. Right-click on it → **Printer Properties**
4. **Copy the exact printer name** shown at the top of the window

### Step 2: Share Your Printer
1. Right-click your printer → **Printer Properties**
2. Go to **Sharing** tab
3. Check ✅ **Share this printer**
4. Use the same name or make note of the share name
5. Click **OK**

### Step 3: Configure the Printer in Code
1. Open `Api/print-receipt-fixed-width.php`
2. Find line 152 (look for `$printerName = 'POS-58';`)
3. Replace `'POS-58'` with your actual printer name from Step 1
4. Save the file

**Example:**
```php
$printerName = 'Your-Printer-Name-Here'; // Replace with your actual printer name
```

---

## Testing the Printer

### Test 1: Manual Print Test
1. Open Command Prompt (Windows Key + R, type `cmd`)
2. Run this command (replace `POS-58` with your printer name):
```cmd
echo Test Receipt > test.txt && copy /b test.txt \\localhost\POS-58
```

If you see "1 file(s) copied", your printer is working! ✅

### Test 2: POS System Test
1. Open your POS system
2. Add any item to cart
3. Complete the checkout process
4. The receipt should print automatically!

---

## Common Issues & Solutions

### ❌ Error: "The system cannot find the file specified"
**Solution:** Your printer name is wrong. Go back to Step 1 and get the exact name.

### ❌ Error: "Access is denied"
**Solution:** 
1. Make sure the printer is shared (Step 2)
2. Run XAMPP as Administrator
3. Check printer permissions in Windows

### ❌ Error: "Printer offline"
**Solution:**
1. Turn printer on and wait for it to be ready
2. In Control Panel → Printers, right-click your printer
3. Uncheck "Use Printer Offline" if it's checked
4. Check printer cable connections

### ❌ Receipt saves to file instead of printing
**Solution:** This is the fallback behavior when printing fails. Check:
1. Printer is turned on
2. Printer name is correct in the PHP file
3. Printer is shared
4. Try the Manual Print Test above

---

## How It Works

When you click **CHECKOUT** in the POS:

1. ✅ Sale is saved to database
2. ✅ Receipt data is sent to `Api/print-receipt-fixed-width.php`
3. ✅ PHP creates a formatted receipt (32 characters wide)
4. ✅ Receipt is sent to your thermal printer using Windows `copy` command
5. ✅ Paper automatically feeds from the printer
6. ✅ If printing fails, receipt is saved to `receipts/` folder as backup

---

## Printer Compatibility

This system works with:
- ✅ 58mm thermal printers (most common for POS)
- ✅ 80mm thermal printers
- ✅ Any printer that accepts raw text via Windows printer sharing

**Tested Printer Models:**
- POS-58
- XP-58
- Epson TM-T20
- Star TSP100
- Most generic USB thermal printers

---

## Advanced: Multiple Printers

If you have multiple terminals with different printers:

1. Create printer configuration in a separate file:
```php
// Api/printer-config.php
<?php
return [
    'Convenience POS' => 'POS-58',
    'Pharmacy POS' => 'XP-58',
    'Inventory Terminal' => 'Office-Printer'
];
?>
```

2. Modify `print-receipt-fixed-width.php` to use terminal-specific printers

---

## Need Help?

1. **Check the Console:** Press F12 in your browser → Console tab
2. **Check PHP Error Log:** Look in `php_errors.log` in your project folder
3. **Test Manually:** Use the Command Prompt test from above
4. **Check Printer Queue:** Control Panel → Printers → Right-click → "See what's printing"

---

## Printer Receipt Format

The receipt is formatted for 32-character width:
```
================================
    ENGUIO'S PHARMACY
================================
Date: 2024-01-15
Time: 14:30:45
TXN ID: TXN123456
Cashier: John Doe
Terminal: Convenience POS
--------------------------------
QTY ITEM          PRICE   TOTAL
--------------------------------
1   Paracetamol   15.00   15.00
2   Vitamin C     25.00   50.00
--------------------------------
SUBTOTAL:                 65.00
--------------------------------
GRAND TOTAL:              65.00
--------------------------------
PAYMENT: CASH
CASH:                    100.00
CHANGE:                   35.00
================================
       Thank you!
     Please come again
  This is your official receipt
```

---

## Automatic Printing is Already Enabled!

✅ Your POS system is **already configured** to print automatically on checkout.

The code flow:
1. `handleCheckout()` in `page.js` (line 2453)
2. Calls `printReceipt()` (line 2474)
3. Sends data to `Api/print-receipt-fixed-width.php`
4. Printer receives and prints the receipt

**You just need to:**
1. Configure the correct printer name (see Step 3 above)
2. Make sure printer is on and shared
3. Test it!

---

## Troubleshooting Checklist

- [ ] Printer is powered on
- [ ] Printer has paper loaded
- [ ] Printer is connected via USB
- [ ] Printer shows as "Ready" in Windows (not "Offline")
- [ ] Printer is shared in Windows
- [ ] Printer name in PHP matches exactly (case-sensitive!)
- [ ] XAMPP/Apache has permission to access printer
- [ ] Manual print test works (Command Prompt test)

---

**🎉 Once configured, your printer will automatically print receipts every time you complete a sale!**

