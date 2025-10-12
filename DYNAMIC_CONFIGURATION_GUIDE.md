# 🎯 Dynamic Configuration System
## Based sa Configuration Mode Inputs

**Created:** October 11, 2025  
**Purpose:** Generate units dynamically based on user inputs sa Configuration Mode

---

## 🚨 **Current Problem:**

**Fixed units lang:**
```sql
(155, 'strip (10 tablets)', 10, 65.00, 0, NULL),  -- Fixed: 10 tablets lang
(155, 'box (10 strips)', 100, 600.00, 0, NULL);   -- Fixed: 10 strips lang
```

**Hindi flexible!** Kung sa Configuration Mode mo nilagay:
- **Strips per Box: 9** (instead of 10)
- **Tablets per Strip: 12** (instead of 10)

## ✅ **DYNAMIC SOLUTION:**

### **Configuration Mode Inputs:**
```
Number of Boxes: 2
Strips per Box: 9  
Tablets per Strip: 12
Base Price: ₱7.00
```

### **Auto-Generated Units:**
```sql
-- Base unit
(155, 'tablet', 1, 7.00, 1, 'Individual tablet'),

-- Strip unit (based on tablets_per_strip)
(155, 'strip (12 tablets)', 12, 75.60, 0, '12 tablets per strip - Save ₱8.40'),

-- Box unit (based on strips_per_box)
(155, 'box (9 strips)', 108, 642.60, 0, '9 strips = 108 tablets - Save ₱113.40'),

-- Medium pack (half boxes)
(155, 'medium pack (1 boxes)', 108, 604.80, 0, '1 boxes = 108 tablets - Save ₱151.20'),

-- Large pack (full boxes)
(155, 'large pack (2 boxes)', 216, 1134.00, 0, '2 boxes = 216 tablets - Save ₱378.00'),

-- Promotional unit
(155, 'buy 2 get 1 free', 36, 151.20, 0, 'Buy 2 strips, get 1 free (36 tablets total)');
```

---

## 🎯 **How It Works:**

### **Step 1: Configuration Mode**
User inputs sa Configuration Mode:
- **Number of Boxes:** 2
- **Strips per Box:** 9
- **Tablets per Strip:** 12
- **Base Price:** ₱7.00

### **Step 2: Auto-Calculate**
System calculates:
- **Total tablets per box:** 9 × 12 = 108 tablets
- **Total tablets:** 2 × 108 = 216 tablets
- **Strip price:** 12 × ₱7.00 × 0.9 = ₱75.60 (10% discount)
- **Box price:** 108 × ₱7.00 × 0.85 = ₱642.60 (15% discount)

### **Step 3: Generate Units**
System automatically generates units based on calculations:
- **Individual tablet**
- **Strip (12 tablets)** - based on tablets_per_strip
- **Box (9 strips)** - based on strips_per_box
- **Medium pack (1 box)** - half of total boxes
- **Large pack (2 boxes)** - full quantity
- **Promotional units** - buy X get Y free

---

## 🛒 **Customer Experience:**

### **Scenario 1: Standard Configuration (10 strips, 10 tablets)**
```
Configuration Mode:
- Boxes: 1
- Strips per Box: 10
- Tablets per Strip: 10

Generated Units:
- tablet: 1 tablet = ₱7.00
- strip (10 tablets): 10 tablets = ₱63.00
- box (10 strips): 100 tablets = ₱595.00
```

### **Scenario 2: Different Configuration (9 strips, 12 tablets)**
```
Configuration Mode:
- Boxes: 2
- Strips per Box: 9
- Tablets per Strip: 12

Generated Units:
- tablet: 1 tablet = ₱7.00
- strip (12 tablets): 12 tablets = ₱75.60
- box (9 strips): 108 tablets = ₱642.60
- medium pack (1 boxes): 108 tablets = ₱604.80
- large pack (2 boxes): 216 tablets = ₱1134.00
```

---

## 🔧 **Implementation:**

### **Step 1: Update Configuration Mode**
Add "Generate Units" button sa Configuration Mode:
```javascript
// After user fills configuration
const config = {
    boxes: parseInt(document.getElementById('boxes').value),
    strips_per_box: parseInt(document.getElementById('strips_per_box').value),
    tablets_per_strip: parseInt(document.getElementById('tablets_per_strip').value),
    base_price: parseFloat(document.getElementById('base_price').value)
};

// Call API to generate units
fetch('/Api/dynamic_unit_system.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
        action: 'generate_units_from_config',
        product_id: productId,
        config: config
    })
});
```

### **Step 2: API Response**
```json
{
    "success": true,
    "message": "Units generated successfully",
    "units": [
        {
            "unit_name": "strip (12 tablets)",
            "unit_quantity": 12,
            "unit_price": 75.60,
            "description": "12 tablets per strip - Save ₱8.40"
        }
    ],
    "config": {
        "boxes": 2,
        "strips_per_box": 9,
        "tablets_per_strip": 12,
        "total_tablets": 216
    }
}
```

### **Step 3: POS Display**
POS will show generated units:
```
Paracetamol
┌─────────────────────────────────────┐
│ Unit: [strip (12 tablets) ▼]       │
│ Quantity: [1] [+]                   │
│ Price: ₱75.60                       │
│ Description: 12 tablets per strip   │
│ Savings: Save ₱8.40!                │
│ Stock: 5 available                  │
│ [Add to Cart]                       │
└─────────────────────────────────────┘
```

---

## 💡 **Benefits:**

### **For Business:**
- ✅ **Flexible configuration** - Any box size, strip size
- ✅ **Automatic pricing** - Discounts calculated automatically
- ✅ **Consistent structure** - Same unit types for all products
- ✅ **Easy management** - Change configuration, units update automatically

### **For Customers:**
- ✅ **More options** - Different pack sizes available
- ✅ **Clear pricing** - Savings shown automatically
- ✅ **Consistent experience** - Same unit types across products

---

## 🎯 **Example Workflows:**

### **Workflow 1: Standard Medicine**
1. **Configuration:** 1 box, 10 strips, 10 tablets
2. **Generated:** tablet, strip (10), box (100)
3. **POS:** Customer can buy individual, strip, or box

### **Workflow 2: Different Medicine**
1. **Configuration:** 2 boxes, 9 strips, 12 tablets
2. **Generated:** tablet, strip (12), box (108), medium pack (108), large pack (216)
3. **POS:** Customer has more options (5 different units)

### **Workflow 3: Promotion**
1. **Configuration:** 1 box, 10 strips, 10 tablets + promotion
2. **Generated:** tablet, strip (10), box (100), buy 2 get 1 free (30)
3. **POS:** Customer can choose promotional unit

---

## 🚀 **Next Steps:**

1. ✅ **Create dynamic unit generator** - `dynamic_unit_system.php`
2. ⏳ **Update Configuration Mode** - Add "Generate Units" button
3. ⏳ **Update API** - Call dynamic generator
4. ⏳ **Update POS** - Show generated units
5. ⏳ **Test scenarios** - Different configurations
6. ⏳ **Train staff** - Explain dynamic system

---

**Result:** **Dynamic multi-unit system** na magba-base sa Configuration Mode inputs mo! 🎉

**No more fixed units!** Kung ano ang ilagay mo sa Configuration Mode, doon magba-base ang units! 

---

*Created by: AI Assistant*  
*Date: October 11, 2025*  
*Version: 1.0*

