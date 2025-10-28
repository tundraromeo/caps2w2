# Senior Citizen Discount Update - Implementation Guide

## Overview
This update adds functionality to capture Senior Citizen ID Number and Full Name when applying Senior discount in the POS system.

---

## 📦 Changes Made

### 1. **Database Schema Update**
**File:** `backend/Api/update_senior_discount_schema.sql`

**Changes:**
- Added `senior_id_number` VARCHAR(100) column to `tbl_pos_sales_header`
- Added `senior_name` VARCHAR(255) column to `tbl_pos_sales_header`
- Created index on `senior_id_number` for faster lookups

**How to Apply:**
```sql
-- Run this SQL script in your database
mysql -u your_username -p your_database < backend/Api/update_senior_discount_schema.sql

-- OR import via phpMyAdmin:
-- 1. Open phpMyAdmin
-- 2. Select database 'enguio2'
-- 3. Go to SQL tab
-- 4. Copy and paste contents of update_senior_discount_schema.sql
-- 5. Click "Go" to execute
```

### 2. **Frontend Changes**
**File:** `frontend/app/POS_convenience/page.js`

**Changes:**
- Added state variables for Senior ID and Name (lines 217-218)
- Added input fields in discount modal for Senior information (lines 4264-4293)
- Added validation to ensure Senior info is required when Senior discount is selected (lines 4307-4320)
- Updated API call to send Senior information to backend (lines 2261-2262)
- Auto-clear Senior info when switching to non-Senior discount

**Features:**
- ✅ Input fields only appear when "Senior" or "Senior Citizen" discount is selected
- ✅ Validation prevents applying discount without filling ID and Name
- ✅ Toast notifications for missing information
- ✅ Auto-clear when removing discount or switching to PWD

### 3. **Backend API Changes**
**File:** `backend/Api/sales_api.php`

**Changes:**
- Added extraction of `seniorIdNumber` and `seniorName` from request (lines 205-206)
- Updated INSERT statement to include senior fields (lines 209-210)
- Handles NULL values correctly when no senior discount is applied

---

## 🚀 Deployment Steps

### Step 1: Update Database Schema
```bash
# Option A: Using MySQL command line
cd backend/Api
mysql -u root -p enguio2 < update_senior_discount_schema.sql

# Option B: Using phpMyAdmin
# 1. Open http://localhost/phpmyadmin
# 2. Select 'enguio2' database
# 3. Click 'SQL' tab
# 4. Open update_senior_discount_schema.sql in a text editor
# 5. Copy all contents
# 6. Paste into phpMyAdmin SQL box
# 7. Click 'Go'
```

### Step 2: Verify Database Changes
```sql
-- Run this query to verify columns were added
DESCRIBE tbl_pos_sales_header;

-- You should see:
-- senior_id_number | varchar(100) | YES | | NULL |
-- senior_name      | varchar(255) | YES | | NULL |
```

### Step 3: Frontend Files
The frontend changes are already applied to:
- `frontend/app/POS_convenience/page.js`

No additional deployment steps needed if using the same codebase.

### Step 4: Backend Files
The backend changes are already applied to:
- `backend/Api/sales_api.php`

No additional deployment steps needed if using the same codebase.

### Step 5: Test the Implementation
1. Open POS Convenience page
2. Add an item to cart
3. Press **Alt+D** or click **Apply Discount** button
4. Select **"Senior Citizen"** discount
5. **NEW:** Two input fields will appear:
   - Senior Citizen ID Number *
   - Full Name *
6. Try clicking "Apply" without filling - should show error
7. Fill both fields and click "Apply"
8. Complete the checkout
9. Verify in database that senior info was saved:
```sql
SELECT 
    sh.sales_header_id,
    sh.transaction_id,
    sh.total_amount,
    sh.senior_id_number,
    sh.senior_name,
    pt.date,
    pt.time
FROM tbl_pos_sales_header sh
JOIN tbl_pos_transaction pt ON sh.transaction_id = pt.transaction_id
WHERE sh.senior_id_number IS NOT NULL
ORDER BY pt.date DESC, pt.time DESC
LIMIT 10;
```

---

## 📋 Features & Validations

### ✅ **What Works**
1. **Conditional Display**
   - Senior info fields only show for Senior discount
   - Hidden for PWD, other discounts, or no discount

2. **Required Validation**
   - Cannot apply Senior discount without ID Number
   - Cannot apply Senior discount without Full Name
   - Shows toast error if missing

3. **Auto-Clear**
   - Fields clear when switching to PWD
   - Fields clear when removing discount
   - Fields clear when canceling modal (if discount changed)

4. **Database Storage**
   - Senior ID and Name saved to `tbl_pos_sales_header`
   - NULL values stored for non-Senior discounts
   - Indexed for fast lookups

### 🔐 **Security & Data Integrity**
- Input sanitization in backend
- NULL handling for non-Senior transactions
- Index on senior_id_number for reporting queries

---

## 📊 Reporting Queries

### Get all Senior Citizen transactions:
```sql
SELECT 
    sh.transaction_id,
    sh.senior_id_number,
    sh.senior_name,
    sh.total_amount,
    sh.discount_amount,
    sh.final_amount,
    pt.date,
    pt.time,
    term.terminal_name
FROM tbl_pos_sales_header sh
JOIN tbl_pos_transaction pt ON sh.transaction_id = pt.transaction_id
JOIN tbl_pos_terminal term ON sh.terminal_id = term.terminal_id
WHERE sh.senior_id_number IS NOT NULL
ORDER BY pt.date DESC, pt.time DESC;
```

### Count Senior transactions by date:
```sql
SELECT 
    pt.date,
    COUNT(*) as senior_transactions,
    SUM(sh.total_amount) as total_sales,
    SUM(sh.discount_amount) as total_discounts
FROM tbl_pos_sales_header sh
JOIN tbl_pos_transaction pt ON sh.transaction_id = pt.transaction_id
WHERE sh.senior_id_number IS NOT NULL
GROUP BY pt.date
ORDER BY pt.date DESC;
```

### Find specific Senior by ID:
```sql
SELECT 
    sh.*,
    pt.date,
    pt.time
FROM tbl_pos_sales_header sh
JOIN tbl_pos_transaction pt ON sh.transaction_id = pt.transaction_id
WHERE sh.senior_id_number = 'SC-123456'
ORDER BY pt.date DESC, pt.time DESC;
```

---

## 🐛 Troubleshooting

### Issue: "Column not found" error
**Solution:** Run the database migration script again
```sql
-- Check if columns exist
SHOW COLUMNS FROM tbl_pos_sales_header LIKE 'senior%';

-- If not, run the migration
SOURCE backend/Api/update_senior_discount_schema.sql;
```

### Issue: Senior fields not showing in modal
**Solution:** 
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Check browser console for JavaScript errors

### Issue: Data not saving to database
**Solution:**
1. Check database columns exist:
```sql
DESCRIBE tbl_pos_sales_header;
```
2. Check backend API logs in `backend/Api/php_errors.log`
3. Verify API endpoint is receiving data (check Network tab in browser DevTools)

---

## 📝 Notes

- **Backward Compatibility:** Old transactions without senior info will have NULL values
- **Optional Fields:** System still works for non-Senior discounts (PWD, etc.)
- **Data Privacy:** Senior information is stored securely in the database
- **Audit Trail:** All sales with Senior discount now have traceable beneficiary information

---

## ✅ Checklist

- [ ] Database schema updated (columns added)
- [ ] Frontend updated (POS_convenience/page.js)
- [ ] Backend API updated (sales_api.php)
- [ ] Tested Senior discount with valid data
- [ ] Tested validation (empty fields)
- [ ] Tested PWD discount (no senior fields)
- [ ] Verified data saved to database
- [ ] Tested reporting queries

---

## 📞 Support

If you encounter any issues:
1. Check the Troubleshooting section above
2. Review browser console for errors (F12)
3. Check backend logs: `backend/Api/php_errors.log`
4. Verify database schema matches expected structure

---

**Last Updated:** October 28, 2025  
**Version:** 1.0  
**Author:** System Update

