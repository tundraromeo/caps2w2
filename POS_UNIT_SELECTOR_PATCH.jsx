// =====================================================
// PATCH: Add Unit Selector to POS Convenience
// =====================================================
// Add this code to app/POS_convenience/page.js
// Insert this BEFORE the quantity input section (around line 3083)

// STEP 1: Add unit state management (add to existing useState declarations around line 19)
const [selectedUnits, setSelectedUnits] = useState({}); // Track selected unit for each product

// STEP 2: Add unit selection logic (add after existing functions around line 955)
const handleUnitChange = (productId, unitId) => {
  setSelectedUnits(prev => ({
    ...prev,
    [productId]: unitId
  }));
  
  // Reset quantity to 1 when unit changes
  setQuantityInputs(prev => ({
    ...prev,
    [productId]: 1
  }));
};

const getCurrentUnit = (product) => {
  if (!product.has_units || !product.units || product.units.length === 0) {
    return null; // No units available
  }
  
  const selectedUnitId = selectedUnits[product.id];
  if (selectedUnitId) {
    return product.units.find(u => u.unit_id == selectedUnitId);
  }
  
  // Default to first unit (usually base unit)
  return product.units[0];
};

const getCurrentPrice = (product) => {
  const currentUnit = getCurrentUnit(product);
  return currentUnit ? currentUnit.unit_price : product.srp;
};

const getMaxQuantity = (product) => {
  const currentUnit = getCurrentUnit(product);
  if (currentUnit) {
    return currentUnit.available_stock || 0;
  }
  return product.quantity || 0;
};

// STEP 3: Update addToCart function (modify existing function around line 956)
const addToCart = (product, quantity) => {
  const currentUnit = getCurrentUnit(product);
  const price = getCurrentPrice(product);
  const maxQty = getMaxQuantity(product);
  
  if (quantity <= 0 || quantity > maxQty) {
    toast.warning(`Please enter a valid quantity (1–${maxQty})`);
    return;
  }
  
  // Update local stock immediately
  updateLocalStock(product.id, -quantity);
  
  setCart(prevCart => {
    const existingItem = prevCart.find(item => 
      item.product.id === product.id && 
      (!currentUnit || item.unit?.unit_id === currentUnit.unit_id)
    );
    
    if (existingItem) {
      return prevCart.map(item =>
        item.product.id === product.id && 
        (!currentUnit || item.unit?.unit_id === currentUnit.unit_id)
          ? { ...item, quantity: item.quantity + quantity }
          : item
      );
    } else {
      return [...prevCart, { 
        product, 
        quantity, 
        unit: currentUnit,
        unit_price: price,
        base_quantity: currentUnit ? quantity * currentUnit.unit_quantity : quantity
      }];
    }
  });
  
  setQuantityInputs(prev => ({
    ...prev,
    [product.id]: 1
  }));
  
  toast.success(`Added ${quantity} ${currentUnit ? currentUnit.unit_name : 'piece'}(s) to cart`);
};

// STEP 4: Replace the quantity input section (around line 3083) with this:
<td className="px-4 py-4">
  <div className="flex items-center justify-end gap-2">
    {/* Unit Selector - Only show if product has units */}
    {product.has_units && product.units && product.units.length > 0 && (
      <div className="flex flex-col gap-1 min-w-[120px]">
        <label className="text-xs text-gray-600 font-medium">Unit:</label>
        <select
          value={selectedUnits[product.id] || product.units[0].unit_id}
          onChange={(e) => handleUnitChange(product.id, e.target.value)}
          className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
        >
          {product.units.map(unit => (
            <option key={unit.unit_id} value={unit.unit_id}>
              {unit.unit_name} - ₱{parseFloat(unit.unit_price).toFixed(2)}
              {unit.available_stock > 0 && ` (${unit.available_stock})`}
            </option>
          ))}
        </select>
      </div>
    )}
    
    {/* Quantity Controls */}
    <div className="flex items-center gap-1">
      <button
        onClick={() => {
          const currentQty = quantityInputs[product.id] || 1;
          const maxQty = getMaxQuantity(product);
          if (currentQty > 1) {
            setQuantityInputs(prev => ({ ...prev, [product.id]: currentQty - 1 }));
          }
        }}
        className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-l flex items-center justify-center text-base font-bold transition-colors"
        disabled={(quantityInputs[product.id] || 1) <= 1}
      >
        −
      </button>
      <input
        type="number"
        min="1"
        max={getMaxQuantity(product)}
        id={`qty-input-${product.id}`}
        value={quantityInputs[product.id] || 1}
        onChange={(e) => {
          const value = parseInt(e.target.value) || 1;
          const maxQty = getMaxQuantity(product);
          const clampedValue = Math.max(1, Math.min(value, maxQty));
          setQuantityInputs(prev => ({ ...prev, [product.id]: clampedValue }));
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addToCart(product, quantityInputs[product.id] || 1);
          }
        }}
        className="w-20 px-2 py-1 border-2 border-gray-300 rounded-none text-center text-gray-900 font-bold text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
      />
      <button
        onClick={() => {
          const currentQty = quantityInputs[product.id] || 1;
          const maxQty = getMaxQuantity(product);
          if (currentQty < maxQty) {
            setQuantityInputs(prev => ({ ...prev, [product.id]: currentQty + 1 }));
          }
        }}
        className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-r flex items-center justify-center text-base font-bold transition-colors"
        disabled={(quantityInputs[product.id] || 1) >= getMaxQuantity(product)}
      >
        +
      </button>
    </div>
    
    {/* Price Display */}
    <div className="flex flex-col items-end min-w-[80px]">
      <span className="text-sm font-bold text-green-600">
        ₱{getCurrentPrice(product).toFixed(2)}
      </span>
      <span className="text-xs text-gray-500">
        {getCurrentUnit(product) ? getCurrentUnit(product).unit_name : 'each'}
      </span>
    </div>
  </div>
</td>

// STEP 5: Update cart display (around line 3200) to show units:
// Find the cart item display and update it to show:
<div className="flex items-center justify-between">
  <div className="flex flex-col">
    <span className="font-medium text-gray-900">{item.product.product_name}</span>
    <span className="text-sm text-gray-600">
      {item.quantity} × {item.unit ? item.unit.unit_name : 'piece'}
      {item.unit && item.unit.unit_quantity > 1 && (
        <span className="text-xs text-gray-500">
          {' '}({item.quantity * item.unit.unit_quantity} pieces total)
        </span>
      )}
    </span>
  </div>
  <div className="text-right">
    <span className="font-bold text-green-600">
      ₱{((item.unit ? item.unit.unit_price : item.product.srp) * item.quantity).toFixed(2)}
    </span>
  </div>
</div>

