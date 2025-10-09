# Category and Discount Foreign Key Fix

## 🔍 Problem Identified

Your database has a **normalization issue** where:

### ❌ Current Problem:
1. **`tbl_product.category`** - Stored as `VARCHAR(255)` instead of a foreign key
2. **`tbl_discount`** - Table exists but not connected to any other table
3. **Data Integrity Risk** - No referential integrity enforcement

### Example of Current Bad Design:
```sql
CREATE TABLE `tbl_product` (
  `product_id` int(11) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `category` varchar(255) NOT NULL,  -- ❌ Should be INT with FK
  ...
)
```

### Why This is Wrong:
- ❌ Allows typos: "Snack Foods" vs "snack foods" vs "SnackFoods"
- ❌ No referential integrity
- ❌ Wastes storage space (storing full text instead of ID)
- ❌ Difficult to rename categories (must update all products)
- ❌ Cannot enforce valid categories
- ❌ Poor database performance

## ✅ Correct Design (After Fix)

```sql
-- Category table (reference table)
CREATE TABLE `tbl_category` (
  `category_id` int(11) NOT NULL PRIMARY KEY,
  `category_name` varchar(100) NOT NULL
)

-- Product table with proper FK
CREATE TABLE `tbl_product` (
  `product_id` int(11) NOT NULL,
  `product_name` varchar(255) NOT NULL,
  `category_id` int(11) NOT NULL,  -- ✅ Proper foreign key
  `discount_id` int(11) NULL,       -- ✅ Optional discount FK
  ...
  FOREIGN KEY (category_id) REFERENCES tbl_category(category_id),
  FOREIGN KEY (discount_id) REFERENCES tbl_discount(discount_id)
)
```

### Benefits of Correct Design:
- ✅ Referential integrity enforced
- ✅ Cannot use invalid categories
- ✅ Saves storage space (4 bytes vs 255 bytes)
- ✅ Easy to rename categories (one place)
- ✅ Better performance with indexes
- ✅ Proper database normalization (3NF)

## 📋 Migration Process

The migration script will:

### Step 1: Backup Current Data
```sql
CREATE TABLE tbl_product_category_backup AS
SELECT product_id, category as category_name, CURRENT_TIMESTAMP as backup_date
FROM tbl_product;
```

### Step 2: Add New Column
```sql
ALTER TABLE tbl_product ADD COLUMN category_id INT NULL AFTER category;
```

### Step 3: Map Existing Data
```sql
UPDATE tbl_product p
INNER JOIN tbl_category c ON p.category = c.category_name
SET p.category_id = c.category_id;
```

### Step 4: Handle Unmapped Categories
- Creates "Uncategorized" category for any products with invalid category names
- Assigns unmapped products to this category

### Step 5: Remove Old Column
```sql
ALTER TABLE tbl_product DROP COLUMN category;
```

### Step 6: Add Foreign Key
```sql
ALTER TABLE tbl_product
ADD CONSTRAINT fk_product_category 
FOREIGN KEY (category_id) 
REFERENCES tbl_category(category_id)
ON DELETE RESTRICT
ON UPDATE CASCADE;
```

### Step 7: Add Discount FK (Optional)
```sql
ALTER TABLE tbl_product ADD COLUMN discount_id INT NULL;

ALTER TABLE tbl_product
ADD CONSTRAINT fk_product_discount 
FOREIGN KEY (discount_id) 
REFERENCES tbl_discount(discount_id);
```

## 🚀 How to Run the Migration

### Option 1: Using PHP Script (Recommended)
```bash
php migrate_category_discount_fk.php
```

**This script will:**
- ✅ Check current database state
- ✅ Show what will be changed
- ✅ Ask for confirmation
- ✅ Run migration in a transaction
- ✅ Rollback if any errors occur
- ✅ Verify changes after completion

### Option 2: Using SQL File Directly
```sql
-- Open MySQL client
mysql -u root -p enguio2

-- Run the migration
source fix_category_discount_foreign_keys.sql;

-- Review and commit or rollback
COMMIT;  -- If everything looks good
-- or
ROLLBACK;  -- If there are issues
```

## ⚠️ IMPORTANT: Before Running

1. **BACKUP YOUR DATABASE!**
   ```bash
   mysqldump -u root -p enguio2 > backup_before_fk_fix.sql
   ```

2. **Test on Development First**
   - Don't run on production directly
   - Test with a copy of your database

3. **Check Your Data**
   - Ensure all products have valid categories
   - Review unmapped categories list

4. **Plan Downtime**
   - This migration may take a few seconds
   - Consider running during low-traffic period

## 📊 Current Database State

### Your Current Products:
Looking at your SQL dump, you have:
- 4 products in tbl_product
- All using VARCHAR for category
- Categories: "Convenience Food (Ready-to-Eat)", "Snack Foods"

### Current Categories in tbl_category:
```
16 - Over-the-Counter Medicines
17 - Prescription Medicines
18 - Vitamins & Supplements
19 - First Aid & Medical Supplies
20 - Personal Hygiene Products
21 - Sanitary Products
22 - Baby Care Products
23 - Skincare & Grooming
24 - Convenience Food (Ready-to-Eat)  ✅ Matches your products
25 - Snack Foods                       ✅ Matches your products
26 - Beverages
27 - Frozen / Chilled Items
28 - Tobacco Products
29 - Alcoholic Beverages
30 - Household Essentials
31 - Pet Care
32 - Seasonal / Emergency Items
```

**Good News:** All your current product categories match existing categories in tbl_category, so migration should be smooth!

## 🔧 Code Changes Needed After Migration

### 1. Update API Endpoints

**Before (OLD):**
```php
// Creating a product with category name
$stmt = $pdo->prepare("
    INSERT INTO tbl_product (product_name, category, ...) 
    VALUES (?, ?, ...)
");
$stmt->execute([$name, 'Snack Foods', ...]);
```

**After (NEW):**
```php
// Creating a product with category_id
$stmt = $pdo->prepare("
    INSERT INTO tbl_product (product_name, category_id, ...) 
    VALUES (?, ?, ...)
");
$stmt->execute([$name, 25, ...]); // 25 = Snack Foods category_id
```

### 2. Update SELECT Queries

**Before:**
```php
$stmt = $pdo->query("SELECT * FROM tbl_product");
```

**After:**
```php
$stmt = $pdo->query("
    SELECT 
        p.*,
        c.category_name
    FROM tbl_product p
    LEFT JOIN tbl_category c ON p.category_id = c.category_id
");
```

### 3. Update Frontend Forms

**Before:**
```javascript
// Text input for category
<input type="text" name="category" />
```

**After:**
```javascript
// Dropdown from tbl_category
<select name="category_id">
  <option value="24">Convenience Food (Ready-to-Eat)</option>
  <option value="25">Snack Foods</option>
  ...
</select>
```

## 📈 Benefits for Your Thesis/Capstone

This fix demonstrates:

1. **Database Normalization** (3NF)
   - Eliminates data redundancy
   - Proper use of foreign keys
   
2. **Data Integrity**
   - Referential integrity constraints
   - Cannot insert invalid categories
   
3. **Professional Standards**
   - Industry best practices
   - Academic-quality database design
   
4. **System Reliability**
   - Prevents data anomalies
   - Ensures data consistency

## 🆘 Troubleshooting

### Error: "Cannot add foreign key constraint"
**Cause:** Data type mismatch or orphaned records
**Solution:**
```sql
-- Check for invalid category references
SELECT DISTINCT p.category 
FROM tbl_product p
LEFT JOIN tbl_category c ON p.category = c.category_name
WHERE c.category_id IS NULL;
```

### Error: "Duplicate key name"
**Cause:** Constraint already exists
**Solution:** Drop existing constraint first
```sql
ALTER TABLE tbl_product DROP FOREIGN KEY fk_product_category;
```

### Want to Rollback?
If you used the PHP script and it completed:
```sql
-- Restore from backup
DROP TABLE tbl_product;
CREATE TABLE tbl_product AS SELECT * FROM tbl_product_category_backup;
-- Then restore full backup
mysql -u root -p enguio2 < backup_before_fk_fix.sql
```

## ✅ Verification After Migration

Run this query to verify:
```sql
-- Check foreign keys
SELECT 
    TABLE_NAME,
    COLUMN_NAME,
    CONSTRAINT_NAME,
    REFERENCED_TABLE_NAME,
    REFERENCED_COLUMN_NAME
FROM 
    INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
WHERE 
    TABLE_SCHEMA = 'enguio2' 
    AND TABLE_NAME = 'tbl_product'
    AND REFERENCED_TABLE_NAME IS NOT NULL;
```

Expected Output:
```
tbl_product | category_id | fk_product_category | tbl_category | category_id
tbl_product | discount_id | fk_product_discount | tbl_discount | discount_id
```

## 📝 Summary

**What was wrong:**
- Category stored as VARCHAR instead of foreign key reference
- No referential integrity
- Poor database design

**What we fixed:**
- ✅ Changed category to use category_id (INT)
- ✅ Added foreign key constraint to tbl_category
- ✅ Added optional discount_id foreign key
- ✅ Proper database normalization
- ✅ Enforced data integrity

**Your database is now professionally designed! 🎉**

---

**Created:** October 9, 2025  
**Database:** enguio2  
**Impact:** tbl_product structure modified  
**Benefit:** Improved data integrity and database normalization


