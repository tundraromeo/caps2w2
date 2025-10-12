# Multi-Unit System Implementation Guide
## Paano mag-implement ng iba't-ibang units (tablets, packs, boxes)

Created: October 11, 2025

---

## 📋 Overview (Buod)

Ang multi-unit system ay nagpapahintulot sa iyo na magbenta ng produkto sa iba't-ibang units:
- **Tablet/Piraso** - individual pieces
- **Pack/Strips** - (e.g., 10 tablets per pack)
- **Box/Case** - (e.g., 100 tablets per box, or 10 packs per box)

**Example:**
- 1 tablet = ₱10
- 1 pack (10 tablets) = ₱90 (save ₱10)
- 1 box (100 tablets) = ₱800 (save ₱200)

---

## 🗄️ Step 1: Database Setup

### A. Run the SQL Migration

```bash
# Go to phpMyAdmin or MySQL command line
# Run the file: add_multi_unit_system.sql
```

This will create:
1. `tbl_product_units` - stores different units for each product
2. `tbl_unit_conversions` - optional table for complex conversions
3. Add columns to `tbl_product`:
   - `allow_multi_unit` - enable multi-unit for this product
   - `default_unit` - default unit to display

### B. Add Units to Your Products

**Example 1: Medicine (Biogesic)**
```sql
-- Enable multi-unit
UPDATE tbl_product SET allow_multi_unit = 1, default_unit = 'tablet' WHERE product_id = 1;

-- Add units
INSERT INTO tbl_product_units (product_id, unit_name, unit_quantity, unit_price, is_base_unit) VALUES
(1, 'tablet', 1, 10.00, 1),           -- Base unit: 1 tablet
(1, 'strip (10tabs)', 10, 90.00, 0),  -- 1 strip = 10 tablets
(1, 'box (100tabs)', 100, 800.00, 0); -- 1 box = 100 tablets
```

**Example 2: Snack (Chips)**
```sql
-- Enable multi-unit
UPDATE tbl_product SET allow_multi_unit = 1, default_unit = 'pack' WHERE product_id = 152;

-- Add units
INSERT INTO tbl_product_units (product_id, unit_name, unit_quantity, unit_price, is_base_unit) VALUES
(152, 'pack', 1, 40.00, 1),              -- Base unit: 1 pack
(152, 'bundle (6 packs)', 6, 220.00, 0), -- 1 bundle = 6 packs = ₱220
(152, 'box (24 packs)', 24, 800.00, 0);  -- 1 box = 24 packs = ₱800
```

---

## 🔌 Step 2: API Integration

### Available Endpoints

#### 1. Get Products with Units
```javascript
const response = await fetch('http://localhost/caps2e2/Api/convenience_store_api.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'get_convenience_products_fifo',
    location_name: 'Convenience Store',
    search: ''
  })
});

const data = await response.json();
// Each product now has:
// - has_units: true/false
// - units: [{ unit_name, unit_price, unit_quantity, available_stock }]
// - default_unit: 'piece' or 'tablet' etc.
```

#### 2. Get Specific Product Units
```javascript
const response = await fetch('http://localhost/caps2e2/Api/product_units_api.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'get_product_units',
    product_id: 152
  })
});
```

#### 3. Convert Between Units
```javascript
const response = await fetch('http://localhost/caps2e2/Api/product_units_api.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'convert_unit',
    product_id: 152,
    from_unit: 'box (24 packs)',
    to_unit: 'pack',
    quantity: 2  // 2 boxes
  })
});
// Returns: { converted_quantity: 48, base_quantity: 48 }
```

---

## 💻 Step 3: Frontend Implementation (React/Next.js)

### A. Product Card with Unit Selector

```jsx
// In your POS page
import { useState } from 'react';

function ProductCard({ product }) {
  const [selectedUnit, setSelectedUnit] = useState(
    product.has_units && product.units.length > 0 
      ? product.units[0] 
      : null
  );
  const [quantity, setQuantity] = useState(1);
  
  // Get current price based on selected unit
  const currentPrice = selectedUnit ? selectedUnit.unit_price : product.price;
  const maxStock = selectedUnit ? selectedUnit.available_stock : product.quantity;
  
  const handleAddToCart = () => {
    const cartItem = {
      product: product,
      quantity: quantity,
      unit: selectedUnit,
      unit_price: currentPrice,
      // Convert to base units for inventory tracking
      base_quantity: selectedUnit 
        ? quantity * selectedUnit.unit_quantity 
        : quantity
    };
    
    addToCart(cartItem);
  };
  
  return (
    <div className="product-card">
      <h3>{product.product_name}</h3>
      <p>Stock: {maxStock} {selectedUnit?.unit_name || 'pcs'}</p>
      
      {/* Unit Selector */}
      {product.has_units && product.units.length > 0 && (
        <div className="unit-selector">
          <label>Select Unit:</label>
          <select 
            value={selectedUnit?.unit_id} 
            onChange={(e) => {
              const unit = product.units.find(u => u.unit_id == e.target.value);
              setSelectedUnit(unit);
              setQuantity(1); // Reset quantity
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
      
      {/* Quantity Input */}
      <div className="quantity-input">
        <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
        <input 
          type="number" 
          value={quantity} 
          onChange={(e) => setQuantity(Math.max(1, Math.min(maxStock, parseInt(e.target.value) || 1)))}
          min="1"
          max={maxStock}
        />
        <button onClick={() => setQuantity(Math.min(maxStock, quantity + 1))}>+</button>
      </div>
      
      {/* Price Display */}
      <div className="price-display">
        <p>Price: ₱{currentPrice.toFixed(2)}</p>
        <p className="total">Total: ₱{(currentPrice * quantity).toFixed(2)}</p>
        
        {/* Show savings if buying in bulk */}
        {selectedUnit && !selectedUnit.is_base_unit && (
          <p className="savings">
            Save ₱{((selectedUnit.unit_quantity * product.price) - selectedUnit.unit_price).toFixed(2)} 
            vs buying {selectedUnit.unit_quantity} individually
          </p>
        )}
      </div>
      
      <button 
        onClick={handleAddToCart}
        disabled={quantity > maxStock || maxStock === 0}
        className="add-to-cart-btn"
      >
        {maxStock === 0 ? 'Out of Stock' : 'Add to Cart'}
      </button>
    </div>
  );
}
```

### B. Cart Item Display

```jsx
function CartItem({ item }) {
  return (
    <div className="cart-item">
      <h4>{item.product.product_name}</h4>
      
      {/* Show unit information */}
      {item.unit && (
        <p className="unit-info">
          {item.quantity} × {item.unit.unit_name}
          {item.unit.unit_quantity > 1 && (
            <span className="base-units">
              ({item.quantity * item.unit.unit_quantity} pieces total)
            </span>
          )}
        </p>
      )}
      
      <p className="price">
        ₱{item.unit_price.toFixed(2)} × {item.quantity} = 
        ₱{(item.unit_price * item.quantity).toFixed(2)}
      </p>
    </div>
  );
}
```

---

## 📊 Step 4: Handling Sales with Units

### Modified Save Sale Function

```javascript
async function saveSale(cart, paymentInfo) {
  // Convert cart items to include base quantities for stock deduction
  const saleItems = cart.map(item => ({
    product_id: item.product.id,
    quantity: item.quantity,
    price: item.unit_price,
    unit_name: item.unit?.unit_name || 'piece',
    unit_quantity: item.unit?.unit_quantity || 1,
    // This will be used for FIFO stock deduction
    base_quantity: item.unit 
      ? item.quantity * item.unit.unit_quantity 
      : item.quantity
  }));
  
  const response = await fetch('http://localhost/caps2e2/Api/convenience_store_api.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'pos_sale',
      items: saleItems,
      payment_method: paymentInfo.method,
      amount_paid: paymentInfo.amount,
      terminal_name: 'Convenience POS',
      location_name: 'Convenience Store'
    })
  });
  
  return await response.json();
}
```

---

## 🎯 Complete Example: Adding Units to Existing Product

Let's say you want to add units to "Siga&Spicy" (product_id = 152):

```sql
-- Step 1: Enable multi-unit
UPDATE tbl_product 
SET allow_multi_unit = 1, default_unit = 'pack' 
WHERE product_id = 152;

-- Step 2: Add units
INSERT INTO tbl_product_units (product_id, unit_name, unit_quantity, unit_price, is_base_unit, barcode) VALUES
-- Base unit: Individual pack
(152, 'pack', 1, 40.00, 1, '4801668100288'),

-- Bundle: 6 packs with discount
(152, 'bundle (6 packs)', 6, 220.00, 0, NULL),

-- Box: 24 packs with bigger discount  
(152, 'box (24 packs)', 24, 800.00, 0, NULL);

-- Step 3: Verify
SELECT 
    p.product_name,
    pu.unit_name,
    pu.unit_quantity,
    pu.unit_price,
    pu.is_base_unit,
    -- Calculate available stock in this unit
    FLOOR(
        (SELECT SUM(quantity) FROM tbl_transfer_batch_details WHERE product_id = p.product_id)
        / pu.unit_quantity
    ) as available_in_unit
FROM tbl_product p
JOIN tbl_product_units pu ON p.product_id = pu.product_id
WHERE p.product_id = 152;
```

**Result:**
```
product_name | unit_name          | unit_quantity | unit_price | available_in_unit
-------------|-------------------|---------------|------------|------------------
Siga&Spicy   | pack              | 1             | 40.00      | 43
Siga&Spicy   | bundle (6 packs)  | 6             | 220.00     | 7
Siga&Spicy   | box (24 packs)    | 24            | 800.00     | 1
```

---

## 🔍 Testing the Multi-Unit System

### Test in POS:

1. **Search for product** "Siga&Spicy"
2. **See unit options**:
   - Pack (₱40) - 43 available
   - Bundle 6 packs (₱220) - 7 available  
   - Box 24 packs (₱800) - 1 available
3. **Select "Bundle"** and quantity = 2
4. **Add to cart**:
   - Shows: 2 × bundle (6 packs) = ₱440
   - Backend deducts: 12 pieces from inventory
5. **Complete sale**
6. **Check stock**: Should show 31 packs remaining (43 - 12)

---

## 🐛 Troubleshooting

### Problem: Units not showing in POS
**Solution**: 
```sql
-- Check if product has multi-unit enabled
SELECT product_id, product_name, allow_multi_unit, default_unit 
FROM tbl_product WHERE product_id = 152;

-- Check if units exist
SELECT * FROM tbl_product_units WHERE product_id = 152;
```

### Problem: Wrong stock calculation
**Solution**:
```sql
-- Recalculate available stock
SELECT 
    p.product_name,
    pu.unit_name,
    SUM(tbd.quantity) as total_base_stock,
    pu.unit_quantity,
    FLOOR(SUM(tbd.quantity) / pu.unit_quantity) as available_in_unit
FROM tbl_product p
JOIN tbl_transfer_batch_details tbd ON p.product_id = tbd.product_id
JOIN tbl_product_units pu ON p.product_id = pu.product_id
WHERE p.product_id = 152
GROUP BY pu.unit_id;
```

---

## 📝 Best Practices

1. **Always set a base unit** (`is_base_unit = 1`) - usually the smallest sellable unit
2. **Use clear unit names**: "pack (10 tablets)" instead of just "pack"
3. **Calculate bulk discounts** properly to incentivize larger purchases
4. **Test conversions** before going live
5. **Keep barcodes unique** - if a box has a different barcode, add it to the unit

---

## 🚀 Next Steps

1. ✅ Run database migration (`add_multi_unit_system.sql`)
2. ✅ Add units to your products (start with 2-3 products for testing)
3. ⏳ Update POS frontend to show unit selector
4. ⏳ Test with real transactions
5. ⏳ Train staff on new multi-unit system
6. ⏳ Roll out to all products that need it

---

## 📞 Support

If you need help:
- Check database logs: `SELECT * FROM tbl_activity_log WHERE activity_type LIKE '%UNIT%'`
- Check API logs: Look for errors in browser console (F12)
- Verify stock movements: `SELECT * FROM tbl_stock_movements WHERE product_id = ?`

---

**Created by:** AI Assistant  
**Date:** October 11, 2025  
**Version:** 1.0

