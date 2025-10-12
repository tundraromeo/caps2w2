# 🎯 Flexible Multi-Unit System Guide
## Para sa Different Box Sizes at Promotions

**Created:** October 11, 2025  
**Purpose:** Handle different box sizes, promotions, and custom quantities

---

## 🚨 **Current Problem:**

**Fixed units only:**
```sql
(155, 'box (10 strips)', 100, 600.00, 0);  -- Fixed: 10 strips lang
```

**Hindi flexible para sa:**
- Box na 9 strips lang
- Box na 12 strips
- Promotions (Buy 2 Get 1 Free)
- Custom quantities

---

## ✅ **Flexible Solution:**

### **1. Multiple Box Sizes**
```sql
-- Different box sizes for same product
(155, 'small box (9 strips)', 90, 580.00, 0, 'bulk_discount', '9 strips = 90 tablets'),
(155, 'regular box (10 strips)', 100, 600.00, 0, 'bulk_discount', '10 strips = 100 tablets'),
(155, 'large box (12 strips)', 120, 700.00, 0, 'bulk_discount', '12 strips = 120 tablets'),
(155, 'promo box (15 strips)', 150, 800.00, 0, 'bulk_discount', '15 strips = 150 tablets - Special!');
```

### **2. Promotional Units**
```sql
-- Buy 2 Get 1 Free
(155, 'buy 2 get 1 free', 30, 130.00, 0, 'buy_x_get_y', 'Buy 2 strips, get 1 free (30 tablets total)');

-- Christmas Special
(155, 'christmas special (20 strips)', 200, 1200.00, 0, 'bulk_discount', 'Christmas Special - Save ₱200!');
```

### **3. Custom Quantities**
```sql
-- Travel pack
(155, 'travel pack (5 strips)', 50, 320.00, 0, 'bulk_discount', '5 strips = 50 tablets - Travel size');

-- Institutional pack
(155, 'institutional pack (50 strips)', 500, 2800.00, 0, 'bulk_discount', '50 strips = 500 tablets - Hospital size');
```

---

## 🎯 **Real-World Examples:**

### **Example 1: Paracetamol**
| Unit | Quantity | Price | Description |
|------|----------|-------|-------------|
| tablet | 1 | ₱7.00 | Individual tablet |
| strip (10 tablets) | 10 | ₱65.00 | Save ₱5! |
| small box (9 strips) | 90 | ₱580.00 | Small family pack |
| regular box (10 strips) | 100 | ₱600.00 | Standard pack |
| large box (12 strips) | 120 | ₱700.00 | Large family pack |
| promo box (15 strips) | 150 | ₱800.00 | Special promotion! |
| buy 2 get 1 free | 30 | ₱130.00 | Buy 2 strips, get 1 free |

### **Example 2: Biogesic**
| Unit | Quantity | Price | Description |
|------|----------|-------|-------------|
| tablet | 1 | ₱5.00 | Individual tablet |
| strip (10 tablets) | 10 | ₱45.00 | Save ₱5! |
| travel pack (5 strips) | 50 | ₱220.00 | Travel size |
| family pack (20 strips) | 200 | ₱850.00 | Family size |
| institutional pack (50 strips) | 500 | ₱2000.00 | Hospital/Clinic size |

---

## 🛒 **Customer Experience:**

### **Scenario 1: Different Box Sizes**
Customer: *"May box ba na 9 strips lang? Hindi ko kailangan ng 10 strips."*
- **Small box (9 strips)** - 90 tablets for ₱580 ✅
- **Regular box (10 strips)** - 100 tablets for ₱600
- **Large box (12 strips)** - 120 tablets for ₱700

### **Scenario 2: Promotions**
Customer: *"May promo ba kayo?"*
- **Buy 2 Get 1 Free** - 30 tablets for ₱130 (save ₱65!)
- **Christmas Special** - 20 strips for ₱1200 (save ₱200!)

### **Scenario 3: Different Needs**
- **Travel:** Travel pack (5 strips) - 50 tablets
- **Family:** Family pack (20 strips) - 200 tablets  
- **Hospital:** Institutional pack (50 strips) - 500 tablets

---

## 🔧 **Implementation:**

### **STEP 1: Run the Flexible SQL**
```bash
# Run sa phpMyAdmin
flexible_multi_unit_system.sql
```

### **STEP 2: Update API**
The API will return all available units with descriptions:
```json
{
  "product_id": 155,
  "product_name": "Paracetamol",
  "units": [
    {
      "unit_name": "tablet",
      "unit_quantity": 1,
      "unit_price": 7.00,
      "unit_description": "Individual tablet"
    },
    {
      "unit_name": "small box (9 strips)",
      "unit_quantity": 90,
      "unit_price": 580.00,
      "unit_description": "9 strips = 90 tablets - Small family pack"
    }
  ]
}
```

### **STEP 3: Update POS Frontend**
The POS will show:
- **Unit dropdown** with descriptions
- **Savings information** ("Save ₱20!")
- **Promotional badges** ("PROMO!")
- **Stock availability** per unit

---

## 💡 **Benefits:**

### **For Customers:**
- ✅ **More choices** - Different box sizes
- ✅ **Better deals** - Promotions and bulk discounts
- ✅ **Clear information** - Unit descriptions and savings

### **For Business:**
- ✅ **Flexible pricing** - Different margins per unit
- ✅ **Promotion management** - Easy to add/remove promos
- ✅ **Inventory control** - Stock tracking per unit type
- ✅ **Customer satisfaction** - Meet different needs

---

## 🎯 **POS Display Example:**

```
Paracetamol
┌─────────────────────────────────────┐
│ Unit: [small box (9 strips) ▼]     │
│ Quantity: [1] [+]                   │
│ Price: ₱580.00                      │
│ Description: 9 strips = 90 tablets  │
│ Savings: Save ₱50!                  │
│ Stock: 5 available                  │
│ [Add to Cart]                       │
└─────────────────────────────────────┘
```

**In Cart:**
```
Paracetamol
1 x small box (9 strips) - ₱580.00
(90 tablets total)
```

---

## 🚀 **Next Steps:**

1. ✅ **Run flexible SQL** - Setup multiple units
2. ⏳ **Update API** - Return flexible units
3. ⏳ **Update POS** - Show unit descriptions
4. ⏳ **Test scenarios** - Different box sizes
5. ⏳ **Add promotions** - Buy X Get Y Free
6. ⏳ **Train staff** - Explain new options

---

**Result:** **Flexible multi-unit system** na pwede mag-handle ng lahat ng box sizes at promotions! 🎉

---

*Created by: AI Assistant*  
*Date: October 11, 2025*  
*Version: 1.0*

