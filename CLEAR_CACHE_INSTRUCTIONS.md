# How to Clear Cache and See Updated Receipt Text

## Problem
The receipt still shows "This is your official receipt" instead of "THIS IS NOT AN OFFICIAL RECEIPT"

## Solution Steps:

### Step 1: Clear Browser Cache
1. **Chrome/Edge:**
   - Press `Ctrl + Shift + Delete`
   - Select "Cached images and files"
   - Time range: "All time"
   - Click "Clear data"

2. **Or use Hard Refresh:**
   - Press `Ctrl + Shift + R` (or `Ctrl + F5`)
   - Do this multiple times if needed

### Step 2: Clear Next.js Cache (if using Next.js dev server)
1. Stop the Next.js dev server (Ctrl + C)
2. Delete the `.next` folder:
   ```
   Remove-Item -Recurse -Force .next
   ```
3. Restart the dev server:
   ```
   npm run dev
   ```

### Step 3: Verify the Code is Updated
Open browser console (F12) and check:
- Look for message: "✓ Receipt contains correct footer text: THIS IS NOT AN OFFICIAL RECEIPT"
- If you see "✗ ERROR" messages, there's still a caching issue

### Step 4: Test Print
1. Make a new sale/transaction
2. Print a NEW receipt (don't look at old printed receipts)
3. Check the footer - it should show:
   ```
   Thank you!
   Please come again
   THIS IS NOT AN OFFICIAL RECEIPT
   ```

## Verification
All files have been updated:
- ✅ frontend/app/POS_convenience/page.js
- ✅ frontend/app/POS_convenience/printer.js
- ✅ frontend/app/POS_convenience/online-printing.js
- ✅ backend/Api/print_direct.php
- ✅ backend/Api/qz-tray-receipt.php

## If Still Not Working
1. Completely close and reopen the browser
2. Try a different browser
3. Restart your computer (sometimes helps clear all caches)
4. Check the browser console (F12) for any errors

