# 🐛 DEBUG POS PRINTING

## Problema: Hindi nag-print sa POS pero gumana ang test page

### STEP 1: Check Browser Console

1. **Open POS system:**
   ```
   http://localhost:3000/POS_convenience
   ```

2. **Open Browser Console (F12)**
   - Click "Console" tab

3. **Add item and checkout**

4. **Tingnan sa console kung may:**
   - ✓ "Sending receipt data" - Print function was called
   - ✓ "Server print result" - Server responded
   - ✓ "Receipt printed successfully via server!" - Success
   - ✗ Any error messages

### STEP 2: Kung Walang "Sending receipt data"

Ibig sabihin hindi na-call ang print function. Possible reasons:

1. **Dev server not running properly**
   - Stop: Ctrl+C
   - Start: `npm run dev`
   - Refresh browser

2. **Old cached version**
   - Hard refresh: Ctrl+Shift+R
   - Or clear cache

3. **JavaScript error preventing execution**
   - Check console for errors BEFORE checkout

### STEP 3: Kung May "Sending receipt data" pero walang result

Ibig sabihin may error sa fetch. Check:

1. **API endpoint accessible?**
   ```
   http://localhost/caps2e2/Api/print-receipt-fixed-width.php
   ```
   Should show error (no POST data) but should load

2. **CORS issue?**
   Check console for CORS errors

3. **Network error?**
   Check Network tab (F12 → Network)
   Look for print-receipt-fixed-width.php request

### STEP 4: Kung May Result pero "success: false"

Check ang error message sa console. Common errors:

- "Access is denied" → XAMPP not as Admin
- "The system cannot find the file" → Wrong printer name
- "Printer offline" → Printer not ready

### STEP 5: Quick Fix - Add Debug Logging

Gawin mo ito para makita natin kung ano talaga ang nangyayari:

1. **Open POS sa browser**
2. **Press F12 (Console)**
3. **Paste this code sa console:**

```javascript
// Override printReceipt to add more logging
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  console.log('🔍 FETCH CALLED:', args[0]);
  try {
    const response = await originalFetch.apply(this, args);
    console.log('📥 FETCH RESPONSE:', response.status, response.statusText);
    return response;
  } catch (error) {
    console.error('❌ FETCH ERROR:', error);
    throw error;
  }
};
console.log('✅ Debug logging enabled!');
```

4. **Then checkout again**
5. **Copy lahat ng logs sa console**
6. **Send sa akin**

### STEP 6: Alternative - Test Direct API Call

Paste this sa browser console:

```javascript
async function testDirectPrint() {
  const testData = {
    storeName: "Test Store",
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
    transactionId: 'TEST' + Date.now(),
    cashier: 'Test',
    terminalName: 'Test',
    items: [{name: 'Test', quantity: 1, price: 10, total: 10}],
    subtotal: 10,
    grandTotal: 10,
    paymentMethod: 'CASH',
    amountPaid: 10,
    change: 0
  };

  console.log('📤 Sending test data...');
  
  try {
    const response = await fetch('http://localhost/caps2e2/Api/print-receipt-fixed-width.php', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(testData)
    });
    
    console.log('📥 Response status:', response.status);
    const result = await response.json();
    console.log('📋 Result:', result);
    
    if (result.success) {
      console.log('✅ PRINT SUCCESS!');
    } else {
      console.error('❌ PRINT FAILED:', result.message);
    }
  } catch (error) {
    console.error('❌ ERROR:', error);
  }
}

// Run test
testDirectPrint();
```

### STEP 7: Check if printReceipt is being called

Paste this sa console BEFORE checkout:

```javascript
// Intercept printReceipt calls
window.printReceiptCalled = false;
console.log('🔍 Monitoring printReceipt calls...');
console.log('Now try to checkout and see if this gets called');
```

Then checkout and check if you see any logs.

---

## MOST LIKELY ISSUES:

### Issue 1: Dev Server Not Restarted
**Solution:**
```bash
# Stop server (Ctrl+C)
npm run dev
# Hard refresh browser (Ctrl+Shift+R)
```

### Issue 2: XAMPP Not as Administrator
**Solution:**
```
1. Close XAMPP
2. Run: RUN_XAMPP_AS_ADMIN.bat
3. Start Apache
```

### Issue 3: Printer Not Ready
**Solution:**
```
1. Check printer is ON
2. Check has paper
3. Check not in error state
4. Test from Windows Settings
```

### Issue 4: Wrong API URL
**Solution:**
Check if NEXT_PUBLIC_API_BASE_URL is set correctly in .env.local

---

## QUICK DIAGNOSTIC

Run these in order:

1. ✓ Test printer from Windows Settings
2. ✓ Test from test_print_direct.html
3. ✓ Check browser console during POS checkout
4. ✓ Paste debug code in console
5. ✓ Send me the console logs

---

## SABIHIN MO SA AKIN:

1. **Ano ang nakita mo sa browser console?**
   - May "Sending receipt data" ba?
   - May errors ba?

2. **Gumana ba ang test_print_direct.html?**
   - Kung oo, pero hindi sa POS = code issue
   - Kung hindi both = printer/XAMPP issue

3. **Naka-restart ka na ba ng dev server?**
   - `npm run dev`
   - Hard refresh browser

**Send sa akin ang screenshot ng console para makita ko ang problema!** 📸

