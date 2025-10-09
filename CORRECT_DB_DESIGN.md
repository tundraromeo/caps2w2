# ✅ Correct Database Design

## 🎯 Tama Ka - Discount HINDI sa tbl_product!

## Current vs Correct Design

### ❌ CURRENT (With Issues):

```
tbl_category                 tbl_product
┌─────────────┐             ┌──────────────────┐
│category_id  │             │product_id        │
│category_name│             │product_name      │
└─────────────┘             │category VARCHAR  │ ❌ MALI! No FK
                            │barcode           │
                            │srp               │
                            └──────────────────┘

tbl_discount                 
┌─────────────┐              (Hindi connected kahit saan)
│discount_id  │              ❌ NOT USED
│discount_rate│
│discount_type│
└─────────────┘
```

### ✅ CORRECT (After Fix):

```
tbl_category ─────FK────┐
┌─────────────┐         │
│category_id  │         │    tbl_product
│category_name│         │    ┌──────────────────┐
└─────────────┘         └───>│product_id        │
                             │product_name      │
                             │category_id INT   │ ✅ TAMA! With FK
                             │barcode           │
                             │srp               │
                             └──────────────────┘

tbl_discount ─────FK────┐
┌─────────────┐         │    tbl_pos_sales_header
│discount_id  │         │    ┌──────────────────┐
│discount_rate│         └───>│sales_header_id   │
│discount_type│              │transaction_id    │
└─────────────┘              │total_amount      │
(PWD/SENIOR)                 │discount_id INT   │ ✅ Discount dito dapat!
                             │discount_amount   │
                             └──────────────────┘
```

## 📋 Explanation

### 1. Category Relationship (Product Level)
**Why FK to tbl_category?**
- Each product belongs to ONE category
- Category is a **property of the product**
- Examples: "Snack Foods", "Beverages", "Medicines"

```sql
-- Product has category
Product: "Mang Tomas"
  ├── category_id: 24 (Convenience Food)
  └── srp: ₱40.00
```

### 2. Discount Relationship (Transaction Level)
**Why NOT in tbl_product?**
- Discount is applied **during the sale**, not to the product
- Different customers get different discounts (PWD, Senior, None)
- Same product can have different discounts per transaction

```sql
-- Transaction may have discount
Sale #1: "Mang Tomas" × 2
  ├── Subtotal: ₱80.00
  ├── Customer: Senior Citizen
  ├── discount_id: 2 (SENIOR - 20%)
  └── Final: ₱64.00

Sale #2: "Mang Tomas" × 2
  ├── Subtotal: ₱80.00
  ├── Customer: Regular
  ├── discount_id: NULL (No discount)
  └── Final: ₱80.00
```

## 🔍 Real-World Examples

### Example 1: Product Category (PRODUCT PROPERTY)
```
Product: Biogesic Tablet
├── category: "Over-the-Counter Medicines"
├── brand: "Unilab"
└── srp: ₱8.00

This NEVER changes regardless of who buys it.
```

### Example 2: Sale Discount (TRANSACTION PROPERTY)
```
Transaction #1:
├── Customer: Senior Citizen (May ID)
├── Products: Biogesic × 10 = ₱80.00
├── Discount: Senior (20%) = -₱16.00
└── Total: ₱64.00

Transaction #2:
├── Customer: Regular (Walang ID)
├── Products: Biogesic × 10 = ₱80.00
├── Discount: None
└── Total: ₱80.00

Same product, different discount! That's why discount
is NOT a product property!
```

## 📊 Complete Correct Schema

```sql
-- PRODUCTS & CATEGORIES
CREATE TABLE tbl_category (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(100) NOT NULL
);

CREATE TABLE tbl_product (
    product_id INT PRIMARY KEY AUTO_INCREMENT,
    product_name VARCHAR(255) NOT NULL,
    category_id INT NOT NULL,  -- ✅ FK to category
    barcode BIGINT,
    srp DECIMAL(10,2),
    FOREIGN KEY (category_id) 
        REFERENCES tbl_category(category_id)
);

-- DISCOUNTS & POS
CREATE TABLE tbl_discount (
    discount_id INT PRIMARY KEY AUTO_INCREMENT,
    discount_type ENUM('PWD','SENIOR') NOT NULL,
    discount_rate FLOAT NOT NULL  -- e.g., 0.20 = 20%
);

CREATE TABLE tbl_pos_sales_header (
    sales_header_id INT PRIMARY KEY AUTO_INCREMENT,
    transaction_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    discount_id INT NULL,  -- ✅ FK to discount (optional)
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    final_amount DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (discount_id) 
        REFERENCES tbl_discount(discount_id)
);
```

## 🎯 What to Fix NOW

### Priority 1: Category FK (MAIN ISSUE)
```bash
php fix_category_fk_simple.php
```

This fixes:
- ✅ `tbl_product.category` VARCHAR → `category_id` INT with FK
- ✅ Proper referential integrity
- ✅ Database normalization

### Priority 2: Discount FK (FUTURE - Optional)
```sql
-- If you want to implement discount system later
ALTER TABLE tbl_pos_sales_header
ADD COLUMN discount_id INT NULL,
ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0.00,
ADD CONSTRAINT fk_pos_discount 
FOREIGN KEY (discount_id) REFERENCES tbl_discount(discount_id);
```

## ✅ Benefits of Correct Design

### Category in Product (Correct):
- ✅ Each product has ONE fixed category
- ✅ Easy to filter: "Show all Snack Foods"
- ✅ Inventory management by category
- ✅ Reporting by category

### Discount in Transaction (Correct):
- ✅ Same product, different discounts per customer
- ✅ Track discount usage (how many PWD sales?)
- ✅ Audit trail (who got discounts?)
- ✅ Comply with PWD/Senior Citizen laws

### Why NOT Discount in Product (Wrong):
- ❌ Cannot have different discounts per customer
- ❌ Cannot track discount usage
- ❌ All customers would get same discount
- ❌ Violates business logic

## 📝 Summary

### Your Understanding: ✅ CORRECT!
> "Discount hindi sa tbl_product kundi nasa tbl_pos"

**100% Tama!** 

Discount is a **transaction property**, not a **product property**.

### What to Do:
1. ✅ Fix category FK (run `fix_category_fk_simple.php`)
2. ✅ Leave discount out of tbl_product (already correct!)
3. ✅ (Optional) Implement discount in POS tables later

---

**Ready?** Just run:
```bash
php fix_category_fk_simple.php
```

Simple lang, category fix lang! Discount is already in the right place conceptually (POS level), just not implemented yet in your tables. That's a separate feature for the future! 🎉


