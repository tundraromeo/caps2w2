# 📍 Saan Ilagay ang Discount sa POS Tables?

## ✅ SAGOT: **`tbl_pos_sales_header`**

## 🎯 Bakit dito?

### Discount Flow sa Real World:
```
1. Cashier scans products
   ├── Biogesic × 5 = ₱40
   ├── Paracetamol × 3 = ₱30
   └── Subtotal: ₱70

2. Customer shows Senior ID
   ├── Senior Discount: 20%
   ├── Discount Amount: -₱14
   └── TOTAL TO PAY: ₱56

3. ONE TRANSACTION = ONE DISCOUNT TYPE
```

Kaya dapat sa **transaction level**, hindi sa product level!

---

## 📊 Database Design

### ❌ WRONG: Discount sa tbl_product
```sql
tbl_product
├── product_id
├── product_name
├── discount_id  ❌ MALI!
└── ...

Problem: 
- Same product, iba-iba ang customer (Senior, PWD, Regular)
- Hindi flexible
- Wrong business logic
```

### ❌ WRONG: Discount sa tbl_pos_sales_details (items)
```sql
tbl_pos_sales_details
├── sales_details_id
├── product_id
├── quantity
├── price
├── discount_id  ❌ MALI DIN!
└── ...

Problem:
- Complicated computation
- Discount applies sa total, hindi per item
- Hard to track
```

### ✅ CORRECT: Discount sa tbl_pos_sales_header
```sql
tbl_pos_sales_header
├── sales_header_id
├── transaction_id
├── total_amount         (Subtotal)
├── discount_id          ✅ TAMA! (FK to tbl_discount)
├── discount_amount      ✅ Computed discount
├── final_amount         ✅ After discount
└── terminal_id
```

---

## 🏗️ Complete POS Structure with Discount

```
┌─────────────────────────────────────────────────┐
│            POS TRANSACTION FLOW                 │
└─────────────────────────────────────────────────┘

tbl_pos_transaction
┌──────────────────┐
│transaction_id: 51│ ← Main transaction
│date: 2025-10-09  │
│time: 14:30:00    │
│emp_id: 4 (jepox)│
│payment: cash     │
└────────┬─────────┘
         │
         ├─────────────────────────────────────┐
         │                                     │
         ▼                                     ▼
tbl_pos_sales_header               tbl_pos_sales_details
┌─────────────────────┐            ┌──────────────────┐
│sales_header_id: 44  │            │product_id: 130   │
│transaction_id: 51   │◄───────────│quantity: 5       │
│total_amount: 250.00 │            │price: 50.00      │
│discount_id: 2       │◄──┐        └──────────────────┘
│discount_amount: 50  │   │        ┌──────────────────┐
│final_amount: 200.00 │   │        │product_id: 131   │
│terminal_id: 1       │   │        │quantity: 3       │
└─────────────────────┘   │        │price: 40.00      │
                          │        └──────────────────┘
                          │
                          │        tbl_discount
                          │        ┌──────────────────┐
                          └────────┤discount_id: 2    │
                                   │type: SENIOR      │
                                   │rate: 0.20 (20%) │
                                   └──────────────────┘
```

---

## 💡 Example Scenarios

### Scenario 1: Regular Customer (No Discount)
```sql
-- Products scanned:
- Mang Tomas × 2 @ ₱40 = ₱80
- Total: ₱80

-- Insert to tbl_pos_sales_header:
INSERT INTO tbl_pos_sales_header (
    transaction_id, 
    total_amount, 
    discount_id,      -- NULL (walang discount)
    discount_amount,  -- ₱0.00
    final_amount,     -- ₱80.00 (same as total)
    reference_number, 
    terminal_id
) VALUES (
    51, 
    80.00, 
    NULL,    ✅ No discount
    0.00,    ✅ Zero discount
    80.00,   ✅ Full amount
    'TXN001', 
    1
);
```

### Scenario 2: Senior Citizen (20% Discount)
```sql
-- Products scanned:
- Biogesic × 10 @ ₱8 = ₱80
- Total: ₱80
- Customer: Senior Citizen (ID shown)

-- Calculate discount:
-- ₱80 × 20% = ₱16 discount
-- Final: ₱80 - ₱16 = ₱64

-- Insert to tbl_pos_sales_header:
INSERT INTO tbl_pos_sales_header (
    transaction_id, 
    total_amount, 
    discount_id,      -- 2 (SENIOR)
    discount_amount,  -- ₱16.00
    final_amount,     -- ₱64.00
    reference_number, 
    terminal_id
) VALUES (
    52, 
    80.00, 
    2,       ✅ Senior discount
    16.00,   ✅ 20% of ₱80
    64.00,   ✅ ₱80 - ₱16
    'TXN002', 
    1
);
```

### Scenario 3: PWD (20% Discount)
```sql
-- Products scanned:
- Medicine × 5 @ ₱100 = ₱500
- Total: ₱500
- Customer: PWD (ID shown)

-- Calculate discount:
-- ₱500 × 20% = ₱100 discount
-- Final: ₱500 - ₱100 = ₱400

-- Insert to tbl_pos_sales_header:
INSERT INTO tbl_pos_sales_header (
    transaction_id, 
    total_amount, 
    discount_id,      -- 1 (PWD)
    discount_amount,  -- ₱100.00
    final_amount,     -- ₱400.00
    reference_number, 
    terminal_id
) VALUES (
    53, 
    500.00, 
    1,       ✅ PWD discount
    100.00,  ✅ 20% of ₱500
    400.00,  ✅ ₱500 - ₱100
    'TXN003', 
    1
);
```

---

## 🔧 SQL to Add Discount to POS

### Complete Migration:
```sql
-- 1. Add discount reference data
INSERT INTO tbl_discount (discount_id, discount_type, discount_rate) VALUES
(1, 'PWD', 0.20),     -- 20% for PWD
(2, 'SENIOR', 0.20);  -- 20% for Senior

-- 2. Add columns to tbl_pos_sales_header
ALTER TABLE tbl_pos_sales_header
ADD COLUMN discount_id INT NULL AFTER total_amount,
ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0.00 AFTER discount_id,
ADD COLUMN final_amount DECIMAL(10,2) DEFAULT 0.00 AFTER discount_amount;

-- 3. Update existing records
UPDATE tbl_pos_sales_header
SET final_amount = total_amount,
    discount_amount = 0.00
WHERE discount_id IS NULL;

-- 4. Add Foreign Key
ALTER TABLE tbl_pos_sales_header
ADD CONSTRAINT fk_pos_sales_discount 
FOREIGN KEY (discount_id) 
REFERENCES tbl_discount(discount_id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- 5. Add index
ALTER TABLE tbl_pos_sales_header
ADD INDEX idx_discount_id (discount_id);
```

---

## 📋 Complete Table Structure After Fix

### tbl_discount (Reference Table)
```sql
CREATE TABLE tbl_discount (
    discount_id INT PRIMARY KEY,
    discount_type ENUM('PWD','SENIOR') NOT NULL,
    discount_rate FLOAT NOT NULL  -- 0.20 = 20%
)

Data:
1 | PWD    | 0.20 (20%)
2 | SENIOR | 0.20 (20%)
```

### tbl_pos_sales_header (With Discount - CORRECT!)
```sql
CREATE TABLE tbl_pos_sales_header (
    sales_header_id INT PRIMARY KEY,
    transaction_id INT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,      -- Subtotal before discount
    discount_id INT NULL,                     -- ✅ FK to tbl_discount
    discount_amount DECIMAL(10,2) DEFAULT 0,  -- ✅ Computed discount
    final_amount DECIMAL(10,2) DEFAULT 0,     -- ✅ After discount
    reference_number VARCHAR(255) NOT NULL,
    terminal_id INT NOT NULL,
    FOREIGN KEY (discount_id) REFERENCES tbl_discount(discount_id)
)

Example Data:
sales_header_id | total_amount | discount_id | discount_amount | final_amount | reference
44              | 1000.00      | NULL        | 0.00           | 1000.00      | TXN001 (Regular)
45              | 1000.00      | 2           | 200.00         | 800.00       | TXN002 (Senior)
46              | 500.00       | 1           | 100.00         | 400.00       | TXN003 (PWD)
```

---

## 💻 Code Implementation

### 1. Frontend (POS Interface)
```javascript
// During checkout
const subtotal = calculateCartTotal(); // ₱1000

// Customer type selection
let discountId = null;
let discountRate = 0;

if (customerType === 'SENIOR') {
    discountId = 2;
    discountRate = 0.20; // 20%
} else if (customerType === 'PWD') {
    discountId = 1;
    discountRate = 0.20; // 20%
}

const discountAmount = subtotal * discountRate;
const finalAmount = subtotal - discountAmount;

// Send to backend
const saleData = {
    total_amount: subtotal,      // ₱1000
    discount_id: discountId,     // 2 (SENIOR)
    discount_amount: discountAmount, // ₱200
    final_amount: finalAmount    // ₱800
};
```

### 2. Backend (API - Save Sale)
```php
// Save sale with discount
$stmt = $pdo->prepare("
    INSERT INTO tbl_pos_sales_header (
        transaction_id,
        total_amount,
        discount_id,
        discount_amount,
        final_amount,
        reference_number,
        terminal_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
");

$stmt->execute([
    $transactionId,
    $totalAmount,      // ₱1000
    $discountId,       // 2 (SENIOR) or NULL
    $discountAmount,   // ₱200 or 0
    $finalAmount,      // ₱800 (what customer pays)
    $referenceNumber,
    $terminalId
]);
```

### 3. Backend (Reports - Sales with Discount)
```php
// Get sales with discount info
$stmt = $pdo->query("
    SELECT 
        sh.sales_header_id,
        sh.reference_number,
        sh.total_amount,
        sh.discount_amount,
        sh.final_amount,
        d.discount_type,
        d.discount_rate,
        pt.date,
        pt.time
    FROM tbl_pos_sales_header sh
    LEFT JOIN tbl_pos_transaction pt ON sh.transaction_id = pt.transaction_id
    LEFT JOIN tbl_discount d ON sh.discount_id = d.discount_id
    ORDER BY pt.date DESC, pt.time DESC
");
```

---

## 📈 Reports You Can Generate

### 1. Discount Usage Report
```sql
-- How many PWD vs Senior discounts?
SELECT 
    d.discount_type,
    COUNT(*) as transaction_count,
    SUM(sh.discount_amount) as total_discount_given
FROM tbl_pos_sales_header sh
INNER JOIN tbl_discount d ON sh.discount_id = d.discount_id
GROUP BY d.discount_type;

Output:
PWD    | 50 transactions | ₱15,000 total discount
SENIOR | 120 transactions | ₱38,000 total discount
```

### 2. Daily Discount Summary
```sql
SELECT 
    pt.date,
    COUNT(sh.discount_id) as discounted_sales,
    SUM(sh.discount_amount) as total_discount,
    SUM(sh.final_amount) as revenue_after_discount
FROM tbl_pos_sales_header sh
INNER JOIN tbl_pos_transaction pt ON sh.transaction_id = pt.transaction_id
WHERE sh.discount_id IS NOT NULL
GROUP BY pt.date
ORDER BY pt.date DESC;
```

### 3. Sales by Customer Type
```sql
SELECT 
    CASE 
        WHEN d.discount_type = 'PWD' THEN 'PWD Customer'
        WHEN d.discount_type = 'SENIOR' THEN 'Senior Citizen'
        ELSE 'Regular Customer'
    END as customer_type,
    COUNT(*) as sales_count,
    SUM(sh.total_amount) as gross_sales,
    SUM(sh.discount_amount) as total_discounts,
    SUM(sh.final_amount) as net_sales
FROM tbl_pos_sales_header sh
LEFT JOIN tbl_discount d ON sh.discount_id = d.discount_id
LEFT JOIN tbl_pos_transaction pt ON sh.transaction_id = pt.transaction_id
WHERE pt.date = CURDATE()
GROUP BY customer_type;
```

---

## 🎨 Frontend UI Example

### POS Checkout Screen:
```
┌─────────────────────────────────────────┐
│           POS - Checkout                │
├─────────────────────────────────────────┤
│ Items:                                  │
│  • Biogesic × 10      ₱80.00           │
│  • Paracetamol × 5    ₱40.00           │
│                                         │
│ Subtotal:             ₱120.00           │
│                                         │
│ Customer Type:                          │
│  ○ Regular                              │
│  ● Senior Citizen                       │
│  ○ PWD                                  │
│                                         │
│ Discount (20%):      -₱24.00           │
│ ─────────────────────────────          │
│ TOTAL TO PAY:         ₱96.00           │
│                                         │
│ [Complete Sale]                         │
└─────────────────────────────────────────┘
```

---

## 📝 Summary

### Question:
> "Saang tbl_pos_ ko yan magandang ilagay?"

### Answer:
**`tbl_pos_sales_header`** - Kasi:

1. ✅ **Transaction-level** ang discount, hindi product-level
2. ✅ **One discount per transaction** lang
3. ✅ **Easy computation** - apply sa total amount
4. ✅ **Proper business logic** - same as real-world POS
5. ✅ **Easy reporting** - discount analytics

### What to Add:
```sql
tbl_pos_sales_header:
  + discount_id (FK to tbl_discount)
  + discount_amount (computed)
  + final_amount (total - discount)
```

### DON'T Add Discount To:
- ❌ `tbl_product` - Wrong! Product property yan
- ❌ `tbl_pos_sales_details` - Wrong! Item level yan
- ❌ `tbl_pos_transaction` - Pwede pero redundant
- ✅ `tbl_pos_sales_header` - CORRECT! Transaction summary ito

---

## 🚀 Ready to Implement?

Run:
```bash
php fix_new_sql.php          # Fix category_id NULL values & add FK
```

Then:
```bash
mysql -u root -p enguio2 < add_discount_to_pos.sql   # Add discount to POS
```

Or manual sa phpMyAdmin:
1. Open `add_discount_to_pos.sql`
2. Copy SQL commands
3. Paste sa phpMyAdmin SQL tab
4. Execute

**Tapos!** ✅ Category FK ✅ Discount sa tamang location! 🎉


