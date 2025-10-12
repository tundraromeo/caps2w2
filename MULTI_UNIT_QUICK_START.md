# 🚀 Multi-Unit System - Quick Start Guide
### Mabilisang Gabay sa Multi-Unit System

**Created:** October 11, 2025  
**Status:** ✅ READY TO USE

---

## 📦 Ano ang Multi-Unit System?

Pwede nang magbenta ng produkto sa iba't-ibang units:
- **Individual** - 1 piraso (₱40)
- **Pack/Bundle** - 6 piraso (₱220 - save ₱20!)
- **Box/Case** - 24 piraso (₱800 - save ₱160!)

---

## ⚡ 3 SIMPLE STEPS

### STEP 1: Import Database Tables ⏱️ 2 minutes

1. Open phpMyAdmin: `http://localhost/phpmyadmin`
2. Select database: `enguio2`
3. Click "Import" tab
4. Choose file: `add_multi_unit_system.sql`
5. Click "Go"

✅ **Done!** New tables created:
- `tbl_product_units` - stores units (tablet, pack, box)
- `tbl_unit_conversions` - handles conversions

---

### STEP 2: Add Units to Products ⏱️ 5 minutes

Open SQL tab in phpMyAdmin and run:

```sql
-- Example: Siga&Spicy (Product ID 152)
-- Enable multi-unit
UPDATE tbl_product 
SET allow_multi_unit = 1, default_unit = 'pack' 
WHERE product_id = 152;

-- Add 3 units: pack, bundle, box
INSERT INTO tbl_product_units (product_id, unit_name, unit_quantity, unit_price, is_base_unit) VALUES
(152, 'pack', 1, 40.00, 1),            -- Base: 1 pack = ₱40
(152, 'bundle (6 packs)', 6, 220.00, 0), -- 6 packs = ₱220 (₱36.67 each)
(152, 'box (24 packs)', 24, 800.00, 0);  -- 24 packs = ₱800 (₱33.33 each)

-- Verify it worked
SELECT 
    p.product_name,
    pu.unit_name,
    pu.unit_quantity,
    pu.unit_price,
    FLOOR(43 / pu.unit_quantity) as available_stock
FROM tbl_product p
JOIN tbl_product_units pu ON p.product_id = pu.product_id
WHERE p.product_id = 152;
```

**Result:**
```
product_name | unit_name          | unit_quantity | unit_price | available_stock
-------------|-------------------|---------------|------------|----------------
Siga&Spicy   | pack              | 1             | 40.00      | 43
Siga&Spicy   | bundle (6 packs)  | 6             | 220.00     | 7
Siga&Spicy   | box (24 packs)    | 24            | 800.00     | 1
```

---

### STEP 3: Test It! ⏱️ 3 minutes

#### Option A: Use Test Page (Recommended)

1. Open browser: `http://localhost/caps2e2/test_multi_unit_pos.html`
2. Search for "Siga&Spicy"
3. See unit selector dropdown:
   - pack (₱40) - 43 available
   - bundle 6 packs (₱220) - 7 available
   - box 24 packs (₱800) - 1 available
4. Select "bundle", quantity = 2
5. Click "Add to Cart"
6. See: 2 × bundle (6 packs) = ₱440
7. ✅ **It works!**

#### Option B: Test API Directly

Open browser console (F12) and run:

```javascript
// Test get products with units
fetch('http://localhost/caps2e2/Api/convenience_store_api.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'get_convenience_products_fifo',
    location_name: 'Convenience Store'
  })
})
.then(r => r.json())
.then(data => {
  console.log('Products with units:', data.data);
  // Look for products with has_units: true
});
```

---

## 📁 Files Created

| File | Purpose |
|------|---------|
| `add_multi_unit_system.sql` | Database migration (run this first!) |
| `Api/product_units_api.php` | API for managing product units |
| `Api/convenience_store_api.php` | Updated to include unit data |
| `test_multi_unit_pos.html` | Test page (standalone) |
| `MULTI_UNIT_IMPLEMENTATION_GUIDE.md` | Complete documentation |
| `MULTI_UNIT_QUICK_START.md` | This file! |

---

## 🎯 Add Units to More Products

### Template for Medicines (Tablets)

```sql
-- Example: Biogesic
UPDATE tbl_product SET allow_multi_unit = 1, default_unit = 'tablet' WHERE product_id = ?;

INSERT INTO tbl_product_units (product_id, unit_name, unit_quantity, unit_price, is_base_unit) VALUES
(?, 'tablet', 1, 10.00, 1),           -- 1 tablet
(?, 'strip (10 tabs)', 10, 90.00, 0), -- 10 tablets
(?, 'box (100 tabs)', 100, 800.00, 0); -- 100 tablets
```

### Template for Snacks (Packs)

```sql
-- Example: Chips
UPDATE tbl_product SET allow_multi_unit = 1, default_unit = 'pack' WHERE product_id = ?;

INSERT INTO tbl_product_units (product_id, unit_name, unit_quantity, unit_price, is_base_unit) VALUES
(?, 'pack', 1, 40.00, 1),              -- 1 pack
(?, 'bundle (6 packs)', 6, 220.00, 0), -- 6 packs
(?, 'case (24 packs)', 24, 850.00, 0); -- 24 packs
```

### Template for Drinks (Bottles)

```sql
-- Example: Coke
UPDATE tbl_product SET allow_multi_unit = 1, default_unit = 'bottle' WHERE product_id = ?;

INSERT INTO tbl_product_units (product_id, unit_name, unit_quantity, unit_price, is_base_unit) VALUES
(?, 'bottle', 1, 30.00, 1),              -- 1 bottle
(?, '6-pack', 6, 160.00, 0),             -- 6 bottles
(?, 'case (24 bottles)', 24, 600.00, 0); -- 24 bottles
```

---

## 🔧 Integrate into Main POS

To add multi-unit to your main POS (`app/POS_convenience/page.js`):

### 1. Update Product Card Component

Find the product display section and add:

```jsx
{/* Add after product name */}
{product.has_units && product.units && product.units.length > 0 && (
  <div className="unit-selector">
    <label>Select Unit:</label>
    <select 
      value={selectedUnit?.unit_id} 
      onChange={(e) => {
        const unit = product.units.find(u => u.unit_id == e.target.value);
        setSelectedUnit(unit);
      }}
    >
      {product.units.map(unit => (
        <option key={unit.unit_id} value={unit.unit_id}>
          {unit.unit_name} - ₱{parseFloat(unit.unit_price).toFixed(2)}
          {unit.available_stock > 0 && ` (${unit.available_stock} available)`}
        </option>
      ))}
    </select>
  </div>
)}
```

### 2. Update addToCart Function

```jsx
const addToCart = (product, quantity) => {
  // Get selected unit if available
  const selectedUnit = /* get from state or dropdown */;
  
  const cartItem = {
    product: product,
    quantity: quantity,
    unit: selectedUnit,
    unit_price: selectedUnit ? selectedUnit.unit_price : product.price,
    // Convert to base units for inventory deduction
    base_quantity: selectedUnit 
      ? quantity * selectedUnit.unit_quantity 
      : quantity
  };
  
  setCart(prevCart => [...prevCart, cartItem]);
};
```

### 3. Update Cart Display

```jsx
{/* Show unit in cart */}
{item.unit && (
  <span className="unit-badge">
    {item.quantity} × {item.unit.unit_name}
    {item.unit.unit_quantity > 1 && 
      ` (${item.quantity * item.unit.unit_quantity} pieces)`
    }
  </span>
)}
```

---

## 💡 Best Practices

### ✅ DO:
- Start with 2-3 products for testing
- Use clear unit names: "pack (6 pieces)" not just "pack"
- Offer bulk discounts to encourage larger purchases
- Test with small quantities first
- Keep base unit as the smallest sellable unit

### ❌ DON'T:
- Add units to all products at once (test first!)
- Use confusing unit names
- Price bulk units higher than individual (no savings)
- Forget to set `is_base_unit = 1` for the base unit
- Skip testing before going live

---

## 📊 Check if It's Working

### SQL Queries to Verify

```sql
-- 1. Check if product has multi-unit enabled
SELECT product_id, product_name, allow_multi_unit, default_unit 
FROM tbl_product 
WHERE product_id = 152;

-- 2. See all units for a product
SELECT * FROM tbl_product_units WHERE product_id = 152;

-- 3. Calculate available stock in each unit
SELECT 
    p.product_name,
    pu.unit_name,
    SUM(tbd.quantity) as total_base_stock,
    FLOOR(SUM(tbd.quantity) / pu.unit_quantity) as available_in_unit,
    pu.unit_price
FROM tbl_product p
JOIN tbl_transfer_batch_details tbd ON p.product_id = tbd.product_id
JOIN tbl_product_units pu ON p.product_id = pu.product_id
WHERE p.product_id = 152
GROUP BY pu.unit_id;
```

---

## 🆘 Troubleshooting

### Problem: "Units not showing in API"
```sql
-- Check if allow_multi_unit is enabled
SELECT product_id, allow_multi_unit FROM tbl_product WHERE product_id = 152;
-- Should show: allow_multi_unit = 1

-- If not, enable it:
UPDATE tbl_product SET allow_multi_unit = 1 WHERE product_id = 152;
```

### Problem: "Wrong stock count"
```sql
-- Recalculate stock
SELECT 
    p.product_name,
    SUM(tbd.quantity) as total_pieces,
    pu.unit_name,
    pu.unit_quantity,
    FLOOR(SUM(tbd.quantity) / pu.unit_quantity) as available_in_unit
FROM tbl_product p
JOIN tbl_transfer_batch_details tbd ON p.product_id = tbd.product_id
JOIN tbl_product_units pu ON p.product_id = pu.product_id
WHERE p.product_id = 152
GROUP BY pu.unit_id;
```

### Problem: "API returns empty units array"
- Check: Product must have `allow_multi_unit = 1`
- Check: Units must have `status = 'active'`
- Check: Product must have stock in `tbl_transfer_batch_details`

---

## 🎉 Success Checklist

- [ ] Database migration completed
- [ ] Sample product has units (verified with SQL)
- [ ] Test page shows unit selector
- [ ] Can add different units to cart
- [ ] Cart shows correct prices
- [ ] Stock deducts properly after sale
- [ ] Ready to integrate into main POS!

---

## 📞 Need Help?

1. **Check logs:** Browser Console (F12) for frontend errors
2. **Check database:** phpMyAdmin → `tbl_product_units`
3. **Test API:** Use test page or browser console
4. **Read full guide:** `MULTI_UNIT_IMPLEMENTATION_GUIDE.md`

---

## 🔄 Next Steps

1. ✅ Test with provided test page
2. ⏳ Add units to 5-10 key products
3. ⏳ Train staff on new system
4. ⏳ Integrate into main POS
5. ⏳ Go live!

---

**Congratulations!** 🎊 Multi-unit system is ready to use!

Test URL: `http://localhost/caps2e2/test_multi_unit_pos.html`

---

*Last updated: October 11, 2025*  
*Version: 1.0 - Initial Release*

