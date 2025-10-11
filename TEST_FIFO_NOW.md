# 🧪 Test FIFO System NOW - Quick Guide

## ✅ AYOS NA! Subukan mo na ngayon!

---

## 🚀 Quick Test Steps

### 1️⃣ Start Dev Server (Kung hindi pa running)
```bash
npm run dev
```

### 2️⃣ Open POS
```
http://localhost:3000/POS_convenience
```

### 3️⃣ Login Credentials
```
Username: jepox
Password: [your password]
```

---

## 🔍 Visual Verification

### ✅ Dapat makita mo:

1. **FIFO Notice Banner** (bago!)
```
┌────────────────────────────────────────────────────┐
│  📅 FIFO System Active - Products Sorted by        │
│     Expiration Date                                 │
│  ⚠️ Products expiring soonest appear first         │
└────────────────────────────────────────────────────┘
```

2. **Expiration Date Column** (bago!)
```
Product Table Headers:
📦 Product Name | 📅 Expiration | 📊 Stock | 💰 Price | ...
```

3. **Color-Coded Expiration Dates** (bago!)
```
🔴 Red    = Expires ≤7 days (URGENT!)
⚠️ Orange = Expires 8-30 days (Priority)
⏰ Yellow = Expires 31-60 days (Monitor)
✅ Green  = Expires 60+ days (Safe)
```

---

## 🧪 Test Case 1: Load All Products

### Steps:
1. Click **"🔍 Search"** button (without typing anything)
2. Wait for products to load

### ✅ Expected Results:
- Products should appear sorted by expiration date
- Oldest (earliest expiry) products at the top
- Each product shows expiration date with color coding
- Console shows: `"🔍 normalizeProducts output (deduplicated by expiration)"`

### Example Display:
```
Product Name              Expiration           Stock    Price
──────────────────────────────────────────────────────────────
Biogesic 500mg           🔴 Dec 10, 2024       50      ₱8.50
                            5d left
──────────────────────────────────────────────────────────────
Bioflu                   ⚠️ Dec 25, 2024       75      ₱10.00
                            20d left
──────────────────────────────────────────────────────────────
Amoxicillin 500mg        ⏰ Jan 20, 2025       120     ₱15.00
                            45d left
```

---

## 🧪 Test Case 2: Barcode Scanning

### Steps:
1. Type a barcode in search box (or use scanner): e.g., `123456789`
2. Press **Enter**

### ✅ Expected Results:
- Product with that barcode appears
- Shows **earliest expiring batch** of that product
- Expiration date clearly visible
- Console shows: `"✅ Product found in Convenience Store: [product name]"`

### Example:
```
Search: 123456789

Result:
┌────────────────────────────────────────────────────┐
│  📱 Biogesic 500mg (Barcode Scanned)              │
│  🔴 Expires: Dec 10, 2024 - 5d left               │
│  Stock: 50 pcs                                     │
│  Price: ₱8.50                                      │
└────────────────────────────────────────────────────┘
```

---

## 🧪 Test Case 3: Search by Name

### Steps:
1. Type product name in search box: e.g., `"Biogesic"`
2. Press **Enter**

### ✅ Expected Results:
- Shows all "Biogesic" products
- Sorted by expiration (earliest first)
- Multiple batches of same product shown separately
- Each with its own expiration date

### Example:
```
Search: "Biogesic"

Results (sorted by expiration):
┌────────────────────────────────────────────────────┐
│  Biogesic 500mg                                    │
│  🔴 Dec 10, 2024 - 5d left - 50 pcs              │
├────────────────────────────────────────────────────┤
│  Biogesic 500mg                                    │
│  ⚠️ Jan 15, 2025 - 40d left - 100 pcs            │
├────────────────────────────────────────────────────┤
│  Biogesic Flu                                      │
│  ✅ Mar 20, 2025 - 100d left - 150 pcs           │
└────────────────────────────────────────────────────┘
```

---

## 🧪 Test Case 4: Add to Cart & Checkout

### Steps:
1. Select product with **RED** expiration warning (urgent!)
2. Set quantity (e.g., 10 pcs)
3. Click **"➕ Add"**
4. Fill payment details
5. Click **"🛒 CHECKOUT"**

### ✅ Expected Results:
- Product added to cart successfully
- Receipt generated
- Backend consumes from **earliest expiring batch**
- Stock quantity updated
- Console shows: `"FIFO stock updated: consumed X units"`

---

## 🧪 Test Case 5: Multiple Batch Consumption

### Setup:
Product has 2 batches:
- Batch A: 50 pcs (expires in 5 days)
- Batch B: 100 pcs (expires in 40 days)

### Steps:
1. Customer wants **70 pcs**
2. Add 70 pcs to cart
3. Complete checkout

### ✅ Expected Backend Behavior:
```
Backend should:
1. Consume all 50 pcs from Batch A ✓
2. Consume 20 pcs from Batch B ✓
3. Leave 80 pcs in Batch B ✓

Console logs:
"Consuming from batch BATCH-A: 50 units"
"Consuming from batch BATCH-B: 20 units"
"FIFO stock updated successfully"
```

---

## 🔍 Console Monitoring

### Open Browser Console (F12)

### Look for these logs:

#### On Product Load:
```javascript
🔍 normalizeProducts input: [array of products]
🔄 Prioritized "Biogesic 500mg" expiring on 2024-12-10 over 2025-01-15 (FIFO - Earliest Expiry First)
🔍 normalizeProducts output (deduplicated by expiration): [sorted array]
```

#### On Product Display:
```javascript
📊 Product: Biogesic 500mg - Available Quantity: 50 - Price: ₱8.50 - Location: Convenience Store
✅ Loaded 15 products for Convenience Store
```

#### On Barcode Scan:
```javascript
🔍 Scanning barcode: 123456789 for location: Convenience Store
📡 API Response for Convenience Store: {success: true, data: [...]}
✅ Product found in Convenience Store: Biogesic 500mg
```

#### On Checkout:
```javascript
📤 Sending receipt data: {transactionId: "TXN123456", ...}
✅ Receipt printed successfully via server!
🔄 Updating local stock for 3 items...
✅ All stock updates completed successfully
```

---

## ⚠️ Common Issues & Solutions

### Issue 1: Products not sorted by expiration
**Solution:**
1. Check console for normalization logs
2. Verify products have `expiration_date` or `transfer_expiration` field
3. Check backend API response includes expiration dates

### Issue 2: No expiration date showing
**Solution:**
1. Verify backend query includes expiration date fields
2. Check `tbl_transfer_batch_details` has valid expiration dates
3. Ensure `transfer_expiration` or `expiration_date` is populated

### Issue 3: Wrong batch consumed
**Solution:**
1. Check FIFO stock table has correct expiration dates
2. Verify backend `process_convenience_sale` uses expiration-based ORDER BY
3. Check console logs for batch consumption sequence

---

## 📊 Quick Validation Checklist

### Visual Checks:
- [ ] ✅ FIFO notice banner visible
- [ ] ✅ Expiration date column in product table
- [ ] ✅ Color-coded badges (red/orange/yellow/green)
- [ ] ✅ "Xd left" counter displayed
- [ ] ✅ Products sorted earliest to latest expiry

### Functional Checks:
- [ ] ✅ Load all products shows correct order
- [ ] ✅ Barcode scan selects earliest batch
- [ ] ✅ Search maintains expiration order
- [ ] ✅ Add to cart works normally
- [ ] ✅ Checkout consumes from earliest batch
- [ ] ✅ Multiple batch consumption works correctly

### Console Checks:
- [ ] ✅ Normalization logs show FIFO priority
- [ ] ✅ No JavaScript errors
- [ ] ✅ Backend API responses valid
- [ ] ✅ Stock update logs confirm FIFO

---

## 🎯 Success Indicators

### ✅ System is working correctly when you see:

1. **Red-flagged products at top of list**
   - These are expiring soon (≤7 days)
   - Should be sold ASAP

2. **Green products at bottom of list**
   - These have longest shelf life (60+ days)
   - No urgency to sell

3. **Console shows FIFO priority messages**
   - "Prioritized ... expiring on [earlier date] over [later date]"
   - "FIFO - Earliest Expiry First"

4. **Barcode scan returns earliest batch**
   - Not the newest batch
   - Not the highest stock batch
   - But the **earliest expiring** batch

5. **Checkout consumes oldest stock first**
   - Console logs: "Consuming from batch BATCH-XXX"
   - Batches consumed in expiration order

---

## 📸 Screenshot Guide

### Take screenshots of:

1. **Product List View**
   - Shows expiration dates
   - Color-coded badges visible
   - FIFO banner at top

2. **Barcode Scan Result**
   - Shows earliest expiring batch
   - Barcode indicator visible
   - Expiration date prominent

3. **Console Logs**
   - FIFO priority messages
   - Normalization output
   - Stock update confirmations

---

## 🚨 Emergency Rollback

### If may problema:

1. **Frontend only** - Refresh browser (Ctrl+R)
2. **Need old behavior** - Contact developer
3. **Backend issue** - Check API logs

### Backup Plan:
```
Old sorting still works in backend
Just frontend changed to show expiration dates
System still functional even if display wrong
```

---

## 📞 Need Help?

### Debug Checklist:
1. [ ] Check browser console for errors
2. [ ] Verify products loaded from database
3. [ ] Check API response format
4. [ ] Verify expiration dates exist in database
5. [ ] Test with different products

### Contact Developer:
- Include console logs
- Screenshot of issue
- Steps to reproduce
- Expected vs actual behavior

---

## ✅ READY TO TEST!

**Subukan mo na ngayon ang bagong FIFO system!**

1. Open POS
2. Load products
3. Check expiration dates
4. Try barcode scanning
5. Complete a sale
6. Verify console logs

**Dapat makita mo ang improvement agad! 🎉**

---

**Created:** October 11, 2025  
**Status:** ✅ READY FOR TESTING

