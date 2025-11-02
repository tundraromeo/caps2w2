

// pages/pos.js
"use client";
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import apiHandler, { getApiEndpointForAction } from '../lib/apiHandler';
import { getApiUrl } from '../lib/apiConfig';

export default function POS() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchSuggestions, setSearchSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [total, setTotal] = useState(0);
  const [quantityInputs, setQuantityInputs] = useState({});
  const [selectedIndex, setSelectedIndex] = useState(0); // For product grid
  const [navigationIndex, setNavigationIndex] = useState(0); // 0: Search, 1: Products, 2: Checkout
  const [paymentMethod, setPaymentMethod] = useState(''); // 'cash' or 'gcash' or 'split'
  const [terminalName, setTerminalName] = useState('Convenience POS');
  const [locationName, setLocationName] = useState('Convenience Store');
  const [amountPaid, setAmountPaid] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [showRefInput, setShowRefInput] = useState(false);
  const [change, setChange] = useState(0);
  // Split Payment
  const [useSplitPayment, setUseSplitPayment] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [gcashAmount, setGcashAmount] = useState('');
  const cashAmountRef = useRef(null);
  const gcashAmountRef = useRef(null);
  const [checkoutFocusIndex, setCheckoutFocusIndex] = useState(0); // 0: Amount, 1: Cash, 2: GCash, 3: Ref, 4: Checkout
  const amountPaidRef = useRef(null);
  const cashBtnRef = useRef(null);
  const gcashBtnRef = useRef(null);
  const refNumRef = useRef(null);
  const checkoutBtnRef = useRef(null);
  const discountBtnRef = useRef(null);
  const cartListRef = useRef(null);
  const cartItemRefs = useRef([]);
  const prevCartLenRef = useRef(0);
  const productListRef = useRef(null);
  const productItemRefs = useRef([]);
  const prevNavigationIndex = useRef(navigationIndex);
  const [cartFocusIndex, setCartFocusIndex] = useState(0);
  const justBlurredAmountPaid = useRef(false);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [salesHistory, setSalesHistory] = useState([]); // Persisted in localStorage
  const [historySelectedIndex, setHistorySelectedIndex] = useState(0);
  const [historyMode, setHistoryMode] = useState('sales'); // 'sales' | 'items'
  const [showTodayOnly, setShowTodayOnly] = useState(true); // Filter for today's sales only
  const [historyItemSelectedIndex, setHistoryItemSelectedIndex] = useState(0);
  const [showReturnQtyModal, setShowReturnQtyModal] = useState(false);
  const [returnModal, setReturnModal] = useState({ transactionId: null, productId: null, max: 0 });
  const [returnQtyInput, setReturnQtyInput] = useState('');
  const [showClearCartModal, setShowClearCartModal] = useState(false);
  const [showCustomerReturnModal, setShowCustomerReturnModal] = useState(false);
  const [showReturnConfirmModal, setShowReturnConfirmModal] = useState(false);
  const [showWrongTerminalAlert, setShowWrongTerminalAlert] = useState(false);
  const [isCheckoutProcessing, setIsCheckoutProcessing] = useState(false);
  const [customerReturnData, setCustomerReturnData] = useState({
    transactionId: '',
    returnReason: '',
    customReason: '',
    items: []
  });
  const returnReasonRef = useRef(null);
  const transactionIdRef = useRef(null);
  const [returnQuantities, setReturnQuantities] = useState({});

  // Logout state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Credentials update state
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [credentialsData, setCredentialsData] = useState({
    fullName: '',
    email: '',
    username: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [credentialsFocusIndex, setCredentialsFocusIndex] = useState(0); // 0: Name, 1: Email, 2: Username, 3: Password, 4: Confirm Password, 5: Save, 6: Cancel
  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false);
  const credentialsRefs = useRef([]);

  // Printing integration state
  const [printerStatus, setPrinterStatus] = useState('ready'); // 'ready', 'testing'
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);

  // Payment method modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentModalFocusIndex, setPaymentModalFocusIndex] = useState(0); // 0: Cash, 1: GCash, 2: Ref#, 3: Confirm
  const paymentModalRefs = useRef([]);
  const paymentCashBtnRef = useRef(null);
  const paymentAmountInputRef = useRef(null);


  // Auto-focus Transaction ID field when modal opens
  useEffect(() => {
    if (showCustomerReturnModal) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        setTimeout(() => {
          if (transactionIdRef.current) {
            transactionIdRef.current.focus();
            transactionIdRef.current.select();
          }
        }, 200);
      });
    }
  }, [showCustomerReturnModal]);

  // Auto-focus credentials modal fields
  useEffect(() => {
    if (showCredentialsModal && credentialsRefs.current[credentialsFocusIndex]) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          credentialsRefs.current[credentialsFocusIndex]?.focus();
        }, 100);
      });
    }
    }, [showCredentialsModal, credentialsFocusIndex]);

  // Auto-focus payment modal on Cash button
  useEffect(() => {
    if (showPaymentModal) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          paymentCashBtnRef.current?.focus();
        }, 100);
      });
    }
  }, [showPaymentModal]);

  // Debug log for credentials data changes
  useEffect(() => {

  }, [credentialsData]);

  const [recentTransactions, setRecentTransactions] = useState([]);
  const [showRecentTransactions, setShowRecentTransactions] = useState(false);
  const [showTotalSalesModal, setShowTotalSalesModal] = useState(false);
  const [todaySalesData, setTodaySalesData] = useState({
    totalSales: 0,
    totalTransactions: 0,
    cashSales: 0,
    gcashSales: 0,
    totalDiscount: 0,
    loading: false
  });

  // Centralized API call helper
  const handleApiCall = async (action, data = {}) => {
    try {
      const endpoint = getApiEndpointForAction(action);
      const response = await apiHandler.callAPI(endpoint, action, data);
      return response;
    } catch (error) {
      console.error("❌ API Call Error:", error);
      return {
        success: false,
        message: error.message || "API call failed",
        error: "REQUEST_ERROR"
      };
    }
  };

  // Focus modal when it opens for keyboard events
  useEffect(() => {
    if (showTotalSalesModal) {
      const modalElement = document.querySelector('[data-modal="sales-modal"]');
      if (modalElement) {
        modalElement.focus();
      }
    }
  }, [showTotalSalesModal]);

  // Clear old sales history with wrong date format
  const clearOldSalesHistory = () => {
    if (confirm('Clear all sales history? This will remove old sales with incorrect date format.')) {
      localStorage.removeItem('pos-sales-history');
      setSalesHistory([]);

    }
  };
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountType, setDiscountType] = useState(null); // string label from DB or 'PWD' | 'Senior' | null
  const [discountSelection, setDiscountSelection] = useState('PWD');
  const [discountAmount, setDiscountAmount] = useState(0);
  const [discountOptions, setDiscountOptions] = useState([]); // [{id, type, rate}]
  const [payableTotal, setPayableTotal] = useState(0);
  const [seniorIdNumber, setSeniorIdNumber] = useState('');
  const [seniorName, setSeniorName] = useState('');
  const seniorIdInputRef = useRef(null);
  const seniorNameInputRef = useRef(null);

  // Auto-focus Senior ID input when Senior discount is selected
  useEffect(() => {
    if (showDiscountModal && discountSelection) {
      const isSeniorDiscount = (discountSelection === 'Senior Citizen' || discountSelection === 'Senior' || String(discountSelection).toLowerCase().includes('senior'));
      if (isSeniorDiscount) {
        requestAnimationFrame(() => {
          setTimeout(() => {
            seniorIdInputRef.current?.focus();
          }, 150);
        });
      }
    }
  }, [discountSelection, showDiscountModal]);

  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentProductId, setAdjustmentProductId] = useState(null);
  const [adjustmentQty, setAdjustmentQty] = useState('1');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [barcodeScannedProduct, setBarcodeScannedProduct] = useState(null);
  const [autoScanBuffer, setAutoScanBuffer] = useState('');
  const [currentTime, setCurrentTime] = useState(null);
  const autoScanTimeoutRef = useRef(null);
  const suspendedCartRef = useRef(null); // for suspend/resume
  const lastScanRef = useRef({ code: null, time: 0 });
  const isLoadingProductsRef = useRef(false); // prevent infinite reload loops

  const startNewTransaction = () => {
    clearCart();
    setAmountPaid('');
    setReferenceNumber('');
    setDiscountType(null);
    setDiscountSelection('PWD');
    setShowRefInput(false);
    setNavigationIndex(0);
    setSelectedIndex(0);
    try { localStorage.removeItem('pos-cart'); } catch (_) {}
  };

  const getDiscountTypesFromDb = () => (discountOptions?.length ? discountOptions.map(o => String(o.type)) : ['PWD', 'Senior Citizen']);

  const stepDiscountSelection = (step) => {
    const base = getDiscountTypesFromDb();
    const options = [...base, 'None'];
    const currentIndex = Math.max(0, options.indexOf(discountSelection));
    const nextIndex = (currentIndex + step + options.length) % options.length;
    setDiscountSelection(options[nextIndex]);
  };

  const getDiscountRatePercent = () => {
    if (!discountType) return 0;
    // Support synonyms (Senior -> Senior Citizen)
    const normalizedType = String(discountType).toLowerCase() === 'senior' ? 'senior citizen' : String(discountType).toLowerCase();
    const dbOption = discountOptions.find(o => String(o.type).toLowerCase() === normalizedType);
    let rate = 0;
    if (dbOption && Number.isFinite(dbOption.rate)) {
      rate = dbOption.rate;
      if (rate > 1) rate = rate / 100; // convert percentage 20 -> 0.20
    } else if (["pwd", "senior", "senior citizen"].includes(String(discountType).toLowerCase())) {
      rate = 0.20; // fallback default
    }
    return Math.round(rate * 100);
  };

  // Function to get location based on terminal name
  const getLocationFromTerminal = (terminal) => {
    const terminalLower = String(terminal || '').toLowerCase();
    if (terminalLower.includes('convenience')) {
      return 'Convenience Store';
    } else if (terminalLower.includes('pharmacy')) {
      return 'Pharmacy Store';
    }
    return 'Convenience Store'; // default
  };

  // Fetch discount options from backend
  useEffect(() => {
    const fetchDiscounts = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/backend/Api'}/sales_api.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_discounts' })
        });
        const data = await res.json();
        if (data?.success && Array.isArray(data.data)) {
          const normalized = data.data.map(d => {
            const rawType = (d.discount_type ?? d.discountType ?? d.type ?? '').toString().trim();
            const tLower = rawType.toLowerCase();
            const finalType = !rawType ? 'Senior Citizen' : (tLower === 'senior' ? 'Senior Citizen' : rawType);
            const rateNum = Number(d.discount_rate ?? d.rate ?? 0);
            return { id: d.discount_id ?? d.id ?? finalType, type: finalType, rate: rateNum };
          });
          // Ensure we at least have PWD and Senior Citizen options if missing labels
          const types = new Set(normalized.map(o => o.type.toLowerCase()));
          if (!types.has('pwd')) normalized.push({ id: 'PWD', type: 'PWD', rate: 0.2 });
          if (!types.has('senior citizen')) normalized.push({ id: 'Senior Citizen', type: 'Senior Citizen', rate: 0.2 });
          setDiscountOptions(normalized);
        } else {
          setDiscountOptions([]);
        }
      } catch (e) {
        setDiscountOptions([]);
      }
    };
    fetchDiscounts();
  }, []);

  // Compute discount and payable total
  useEffect(() => {
    let rate = 0;
    if (discountType) {
      const dbOption = discountOptions.find(o => String(o.type).toLowerCase() === String(discountType).toLowerCase());
      if (dbOption && Number.isFinite(dbOption.rate) && dbOption.rate > 0 && dbOption.rate < 1.01) {
        rate = dbOption.rate; // assume decimal like 0.2; if 20 use conversion below
        if (rate > 1) rate = rate / 100; // support percentage stored as 20
      } else {
        // Fallback: 20% for PWD or Senior labels
        rate = 0.20;
      }
    }
    const computedDiscount = Number((total * rate).toFixed(2));
    const computedPayable = Math.max(0, Number((total - computedDiscount).toFixed(2)));
    setDiscountAmount(computedDiscount);
    setPayableTotal(computedPayable);
  }, [total, discountType, discountOptions]);

  // Compute change based on payable total - prevent negative change
  useEffect(() => {
    const base = payableTotal;
    
    if (useSplitPayment) {
      // Split payment: calculate based on cash + gcash
      const cash = parseFloat(cashAmount) || 0;
      const gcash = parseFloat(gcashAmount) || 0;
      const totalPaid = cash + gcash;
      const calculatedChange = totalPaid - base;
      const finalChange = Math.max(0, calculatedChange);
      setChange(finalChange);
    } else if (amountPaid && !isNaN(amountPaid)) {
      const paidAmount = parseFloat(amountPaid);
      const calculatedChange = paidAmount - base;
      // Only allow positive change or zero - no negative amounts
      const finalChange = Math.max(0, calculatedChange);
      setChange(finalChange);
    } else {
      setChange(0);
    }
  }, [amountPaid, payableTotal, useSplitPayment, cashAmount, gcashAmount]);

  useEffect(() => {
    if (navigationIndex === 2) {
      requestAnimationFrame(() => {
        if (checkoutFocusIndex === 0 && amountPaidRef.current) {
          amountPaidRef.current.focus();
        } else if (checkoutFocusIndex === 1 && cashBtnRef.current) {
          cashBtnRef.current.focus();
        } else if (checkoutFocusIndex === 2 && gcashBtnRef.current) {
          gcashBtnRef.current.focus();
        } else if (checkoutFocusIndex === 3 && refNumRef.current) {
          refNumRef.current.focus();
        } else if (checkoutFocusIndex === 4 && checkoutBtnRef.current) {
          checkoutBtnRef.current.focus();
        }
      });
    }
  }, [navigationIndex, checkoutFocusIndex, paymentMethod]);

  // Auto-scroll the cart list to keep the focused item in view
  useEffect(() => {
    if (checkoutFocusIndex === 'cart' && cartItemRefs.current[cartFocusIndex]) {
      try {
        cartItemRefs.current[cartFocusIndex].scrollIntoView({ block: 'nearest' });
      } catch (_) {}
    }
  }, [checkoutFocusIndex, cartFocusIndex, cart.length]);

  // When items are added to cart, scroll to bottom so the new item is visible
  useEffect(() => {
    const prevLen = prevCartLenRef.current;
    if (cartListRef.current && cart.length > prevLen) {
      try {
        cartListRef.current.scrollTop = cartListRef.current.scrollHeight;
      } catch (_) {}
    }
    prevCartLenRef.current = cart.length;
  }, [cart.length]);

  useEffect(() => {
    if (navigationIndex === 2 && prevNavigationIndex.current !== 2) {
      setCheckoutFocusIndex(0);
    }
    prevNavigationIndex.current = navigationIndex;
  }, [navigationIndex]);

  useEffect(() => {
    if (navigationIndex === 2) {
      if (cart.length === 0 && checkoutFocusIndex !== 4) {
        setCheckoutFocusIndex(4); // Only checkout button is focusable
      } else if (cart.length > 0 && checkoutFocusIndex === 4) {
        setCheckoutFocusIndex(0); // Start at Amount Paid when cart is filled
      }
    } else if (navigationIndex === 1 && checkoutFocusIndex !== 0) {
      setCheckoutFocusIndex(0); // Reset focus when navigating to product card
    }
  }, [cart.length, navigationIndex]);

  // Products will be loaded from the backend; no sample data fallback

  const normalizeProducts = (rows) => {
    if (!Array.isArray(rows)) return [];

    // Process all products first with safety checks
    const processedProducts = rows
      .filter(d => d && (d.id || d.product_id || d.productId)) // Only process valid products with any ID field
      .map((d) => {
      const id = d.id ?? d.product_id ?? d.productId;
      const name = String(d.name ?? d.product_name ?? d.productName ?? '').trim();
      
      // Skip products with no name
      if (!name || name === '') return null;
      
      // Get expiration date first to determine which price to use
      const expirationDate = d.expiration ?? d.expiration_date ?? d.transfer_expiration ?? null;
      
      // If using expiration (earliest date), use transfer_srp to match the batch
      // If using transfer_expiration, use transfer_srp
      // Otherwise fallback to regular price logic
      let priceRaw;
      if (expirationDate === d.expiration || expirationDate === d.expiration_date) {
        // Using earliest expiration date - use transfer_srp to match the batch
        priceRaw = Number(d.transfer_srp) || 0;
      } else {
        // Fallback to regular price logic
        const unitPrice = Number(d.unit_price) || 0;
        const srp = Number(d.srp) || 0;
        priceRaw = (unitPrice > 0) ? unitPrice : (srp > 0 ? srp : (Number(d.price) || 0));
      }
      const quantityRaw = d.quantity ?? d.available_quantity ?? d.stock ?? 0;
      const category = String(d.category ?? d.category_name ?? 'Uncategorized');
      const location = d.location_name ?? d.location ?? null;
      const description = String(d.description ?? '');
      const isBulkProduct = d.bulk ?? d.is_bulk ?? false;
      const prescriptionFromDB = d.requires_prescription ?? d.prescription_required ?? d.prescription ?? false;
      
      // Extract SRP field for receipt display
      const srpRaw = Number(d.srp) || Number(d.transfer_srp) || 0;
      
      // Expiration date already determined above
      
      // Logic: If it's a bulk product OR convenience store terminal, prescription should be NO
      const requiresPrescription = isBulkProduct ? false : Boolean(prescriptionFromDB);
      
      return {
        id: Number(id ?? 0) || id,
        name: String(name),
        price: Number(priceRaw) || 0,
        srp: Number(srpRaw) || 0,
        quantity: Number(quantityRaw) || 0,
        category: String(category),
        description: String(description),
        location_name: location ? String(location) : null,
        requires_prescription: requiresPrescription,
        is_bulk: Boolean(isBulkProduct),
        expiration_date: expirationDate // Add expiration date
      };
    })
    .filter(product => product !== null); // Remove null products

    // Deduplicate products by ID - keep the one with EARLIEST expiration (FIFO principle)
    const uniqueProducts = [];
    const productMap = new Map();
    
    processedProducts.forEach(product => {
      if (!product.id || !product.name) return; // Skip invalid products
      
      const existingProduct = productMap.get(product.id);
      
      if (!existingProduct) {
        // First occurrence of this product ID
        productMap.set(product.id, product);
        uniqueProducts.push(product);
      } else {
        // Duplicate product ID found - keep the one with EARLIEST expiration date (FIFO)
        const currentExpiry = product.expiration_date ? new Date(product.expiration_date) : new Date('9999-12-31');
        const existingExpiry = existingProduct.expiration_date ? new Date(existingProduct.expiration_date) : new Date('9999-12-31');
        
        if (currentExpiry < existingExpiry) {
          // Replace with earlier expiration version (FIFO principle - sell oldest stock first)
          const index = uniqueProducts.findIndex(p => p.id === product.id);
          if (index !== -1) {
            uniqueProducts[index] = product;
            productMap.set(product.id, product);
          }
        }
      }
    });
    
    // Sort final products by expiration date (earliest first), then by name
    uniqueProducts.sort((a, b) => {
      const aDate = a.expiration_date ? new Date(a.expiration_date) : new Date('9999-12-31');
      const bDate = b.expiration_date ? new Date(b.expiration_date) : new Date('9999-12-31');
      
      if (aDate.getTime() !== bDate.getTime()) {
        return aDate - bDate; // Earlier expiration first
      }
      return a.name.localeCompare(b.name); // Then alphabetically
    });
    
    return uniqueProducts;
  };

  // Generate search suggestions based on current products
  const generateSearchSuggestions = (query) => {
    if (!query || query.length < 1) {
      setSearchSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const queryLower = query.toLowerCase();
    const suggestions = products
      .filter(product => {
        // Safety checks - ensure product and required fields exist
        if (!product || !product.name) return false;
        
        const name = String(product.name || '').toLowerCase();
        const description = String(product.description || '').toLowerCase();
        const category = String(product.category || '').toLowerCase();
        
        return name.includes(queryLower) ||
               description.includes(queryLower) ||
               category.includes(queryLower);
      })
      .slice(0, 5) // Limit to 5 suggestions
      .map(product => ({
        id: product.id,
        name: product.name || '',
        description: product.description || '',
        category: product.category || 'Uncategorized',
        price: product.price || 0,
        quantity: product.quantity || 0
      }));

    setSearchSuggestions(suggestions);
    setShowSuggestions(suggestions.length > 0);
  };

  const handleBarcodeScan = async (barcode) => {
    const code = String(barcode || '').trim();
    if (!code) return;
    // Debounce: ignore identical scans within 800ms (prevents double-processing from multiple inputs)
    const now = Date.now();
    if (lastScanRef.current.code === code && (now - lastScanRef.current.time) < 800) {
      return;
    }
    lastScanRef.current = { code, time: now };
    
    // Clear previous scanned product state to start fresh
    setBarcodeScannedProduct(null);
    
    try {
      // Clear search term immediately for better UX
      setSearchTerm('');
      
      // Resolve current location_id to avoid name mismatches (e.g., "Convenience" vs "Convenience Store")
      let resolvedLocationId = null;
      let resolvedLocationName = null;
      try {
        const locResp = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/backend/Api'}/sales_api.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'get_locations' })
        });
        const locJson = await locResp.json().catch(() => ({}));
        if (locJson?.success && Array.isArray(locJson.data)) {
          const wanted = String(locationName || '').toLowerCase();
          const match = locJson.data.find(l => String(l.location_name || '').toLowerCase().includes(wanted));
          if (match) {
            resolvedLocationId = match.location_id;
            resolvedLocationName = String(match.location_name || '').trim();
          } else {
            // fallback: try common synonyms
            const syn = wanted.includes('convenience') ? 'convenience' : wanted.includes('pharmacy') ? 'pharmacy' : wanted;
            const match2 = locJson.data.find(l => String(l.location_name || '').toLowerCase().includes(syn));
            if (match2) { resolvedLocationId = match2.location_id; resolvedLocationName = String(match2.location_name || '').trim(); }
          }
        }
      } catch (_) {}
      
      // First, try to find the product in the current location using convenience store API
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/backend/Api'}/convenience_store_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'search_by_barcode', 
          location_name: (resolvedLocationName || locationName || '').trim(),
          barcode: code // Use specific barcode search
        })
      });
      const json = await res.json();
      
      if (json?.success && json?.data && Array.isArray(json.data) && json.data.length > 0) {
        // Product found via barcode in current location; show only this product in the list
        const scannedProduct = json.data[0]; // Get first matching product
        setBarcodeScannedProduct(scannedProduct);

        const pRaw = scannedProduct;
        // Use same price logic as normalizeProducts
        const unitPrice = Number(pRaw.unit_price) || 0;
        const srp = Number(pRaw.srp) || 0;
        const price = (unitPrice > 0) ? unitPrice : (srp > 0 ? srp : (Number(pRaw.price) || 0));
        
        // Get expiration date
        const expirationDate = pRaw.expiration ?? pRaw.expiration_date ?? pRaw.transfer_expiration ?? null;
        
        const normalized = {
          id: Number(pRaw.product_id ?? pRaw.id ?? 0) || (pRaw.product_id ?? pRaw.id),
          name: String(pRaw.product_name ?? pRaw.name ?? ''),
          price: price,
          quantity: Number(pRaw.available_quantity ?? pRaw.quantity ?? 0) || 0,
          category: String(pRaw.category ?? 'Uncategorized'),
          barcode: String(pRaw.barcode ?? ''),
          location_name: String(pRaw.location_name ?? ''),
          expiration_date: expirationDate,
          requires_prescription: pRaw.requires_prescription ?? pRaw.prescription_required ?? pRaw.prescription ?? false,
          is_bulk: pRaw.bulk ?? pRaw.is_bulk ?? false
        };
        
        // Check if this product is already in cart and adjust available quantity
        const cartItem = cart.find(item => item.product.id === normalized.id);
        if (cartItem) {
          normalized.quantity = Math.max(0, normalized.quantity - cartItem.quantity);
        }
        
        // Replace products list with the scanned product to show only this product
        setProducts([normalized]);
        setSelectedIndex(0);
        setNavigationIndex(1);
        
        // Always set quantity input to 1 when scanning
        setQuantityInputs(prev => ({
          ...prev,
          [normalized.id]: 1
        }));
        
        // Auto-focus quantity input field for immediate editing
        setTimeout(() => {
          const qtyInput = document.getElementById(`qty-input-${normalized.id}`);
          if (qtyInput) {
            qtyInput.focus();
            qtyInput.select(); // Select all text for easy replacement
          }
        }, 100);
        
        // Clear barcode indicator after 5 seconds
        setTimeout(() => setBarcodeScannedProduct(null), 5000);
        return;
      }
    } catch (e) {
      console.error('Barcode scan error:', e);
      toast.error(
        <div>
          <div className="font-bold">Scan failed. Please try again.</div>
          <div className="mt-1 text-sm">Error: {e.message}</div>
        </div>
      );
    }
  };

  // Load all available products for the current location (wrapped in useCallback to prevent infinite loops)
  const loadAllProducts = useCallback(async () => {
    try {
      // Get location ID for the current location
      const locationResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/backend/Api'}/sales_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_locations' })
      });
      
      const locationData = await locationResponse.json();
      if (locationData?.success && Array.isArray(locationData.data)) {
        // Find exact location match with better matching logic
        const currentLocation = locationData.data.find(loc => {
          const dbLocationName = String(loc.location_name || '').trim();
          const selectedLocationName = String(locationName || '').trim();
          // Exact match or contains match for convenience/pharmacy
          return dbLocationName === selectedLocationName || 
                 (selectedLocationName.toLowerCase().includes('convenience') && dbLocationName.toLowerCase().includes('convenience')) ||
                 (selectedLocationName.toLowerCase().includes('pharmacy') && dbLocationName.toLowerCase().includes('pharmacy'));
        });
        
        if (currentLocation) {
          // Load products for this specific location using convenience store API with accurate stock quantities
          const productResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/backend/Api'}/convenience_store_api.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              action: 'get_pos_products_fifo', 
              location_name: currentLocation.location_name // Pass exact location name
            })
          });
          
          const productData = await productResponse.json();
          if (productData?.success && Array.isArray(productData.data)) {
            const normalized = normalizeProducts(productData.data);
            
            // Additional client-side filtering to ensure products are from correct location
            const filteredProducts = normalized.filter(product => {
              // If product has location info, verify it matches
              if (product.location_name) {
                return product.location_name === currentLocation.location_name;
              }
              // If no location info, assume it's from the queried location
              return true;
            });
            
            setProducts(filteredProducts);
          } else {
            console.warn(`No products found for location: ${currentLocation.location_name}`);
            setProducts([]);
          }
        } else {
          setProducts([]);
        }
      } else {
        setProducts([]);
      }
    } catch (error) {
      setProducts([]);
    }
  }, [locationName]); // Only re-create function when locationName changes

  // Search products by name for the current location (for items without barcodes)
  const searchProductsByName = async (term) => {
    const query = String(term || '').trim();
    if (!query) return;
    try {
      // Resolve current location_id first - ensure exact match
      const locationResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/backend/Api'}/sales_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get_locations' })
      });
      const locationData = await locationResponse.json().catch(() => ({}));

      // Find exact location match
      const currentLocation = Array.isArray(locationData?.data)
        ? locationData.data.find(loc => {
            const dbLocationName = String(loc.location_name || '').trim();
            const selectedLocationName = String(locationName || '').trim();
            // Exact match or contains match for convenience/pharmacy
            return dbLocationName === selectedLocationName || 
                   (selectedLocationName.toLowerCase().includes('convenience') && dbLocationName.toLowerCase().includes('convenience')) ||
                   (selectedLocationName.toLowerCase().includes('pharmacy') && dbLocationName.toLowerCase().includes('pharmacy'));
          })
        : null;

      if (!currentLocation?.location_id) {
        console.warn(`⚠️ Cannot resolve location_id for ${locationName}. Available locations:`, locationData?.data?.map(l => l.location_name));
        setProducts([]);
        return;
      }

      // Query inventory with search term - only for this specific location using convenience store API
      
      const productResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/backend/Api'}/convenience_store_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_pos_products_fifo',
          location_name: currentLocation.location_name, // Pass exact location name
          search: query
        })
      });

      const productData = await productResponse.json().catch((err) => {
        console.error('❌ JSON Parse Error:', err);
        return {};
      });

      if (productData?.success && Array.isArray(productData.data)) {

        const normalized = normalizeProducts(productData.data);

        // Additional client-side filtering to ensure products are from correct location
        const filteredProducts = normalized.filter(product => {
          // If product has location info, verify it matches
          if (product.location_name) {
            return product.location_name === currentLocation.location_name;
          }
          // If no location info, assume it's from the queried location
          return true;
        });
        
        // No additional client-side filtering needed - API already handles search correctly
        // Just use the filtered products directly
        const preciseFilteredProducts = filteredProducts;
        
        setProducts(preciseFilteredProducts);
        setBarcodeScannedProduct(null);
        setSelectedIndex(0);
        setNavigationIndex(1);

        // Focus qty input of first result for quick entry
        const firstId = preciseFilteredProducts[0]?.id;
        setTimeout(() => {
          if (firstId) {
            const el = document.getElementById(`qty-input-${firstId}`);
            el?.focus?.();
            el?.select?.();
          }
        }, 120);
      } else {
        console.warn(`⚠️ API returned unexpected response:`, productData);

        if (productData?.message) {
          console.error('❌ API Error Message:', productData.message);
        }
        setProducts([]);
      }
    } catch (err) {
      console.error('❌ Search failed:', err);
      console.error('❌ Error details:', {
        message: err.message,
        stack: err.stack
      });
      setProducts([]);
    }
  };

  // Check if a product exists in the current location
  const checkProductInLocation = (productId, locationName) => {
    return products.find(p => 
      (p.id === productId || p.id === productId) && 
      p.location_name === locationName
    );
  };

  // Update product stock in local state
  const updateLocalStock = (productId, quantityChange) => {
    setProducts(prevProducts => 
      prevProducts.map(product => 
        product.id === productId 
          ? { ...product, quantity: Math.max(0, product.quantity + quantityChange) }
          : product
      )
    );
  };

  // Refresh inventory - clear products (user must manually reload)
  const refreshInventory = async () => {
    try {

      // Clear products - user must manually load
      setProducts([]);
      
      try {
        const barcodeInput = document.getElementById('barcode-scanner');
        barcodeInput?.focus?.();
      } catch (_) {}
      
      if (typeof window !== 'undefined' && window.toast) {
        window.toast.success('Inventory cleared - please reload products manually');
      }
    } catch (error) {
      console.error('Error clearing inventory:', error);
      if (typeof window !== 'undefined' && window.toast) {
        window.toast.error('Failed to clear inventory');
      }
    }
  };

  // Automatic barcode scanning
  const handleAutoScan = (char) => {
    // Clear previous timeout
    if (autoScanTimeoutRef.current) {
      clearTimeout(autoScanTimeoutRef.current);
    }
    
         // Add character to buffer using functional update
     setAutoScanBuffer(prev => {
       const newBuffer = prev + char;
       
       // Set timeout to process barcode after 200ms of no input
      autoScanTimeoutRef.current = setTimeout(() => {
        if (newBuffer.length >= 4) { // Minimum barcode length

          // Validate barcode format (basic check)
          if (/^\d+$/.test(newBuffer)) {
            handleBarcodeScan(newBuffer);
          } else {

            // Still try to scan in case it's a valid format we don&apos;t recognize
            handleBarcodeScan(newBuffer);
          }
          
          // Clear the buffer after processing to prepare for next scan
          setAutoScanBuffer('');
        }
      }, 200);
      
      return newBuffer;
    });
  };



  // Initialize data
  useEffect(() => {
    const boot = async () => {
      try {
        if (typeof window !== 'undefined') {
          // Clear any previously cached mock/sample products
          localStorage.removeItem('pos-products-source');
          localStorage.removeItem('pos-products');
        }
      } 
      catch (_) {}
      const savedCart = JSON.parse(localStorage.getItem('pos-cart'));
      if (savedCart) setCart(savedCart);
      const savedHistory = JSON.parse(localStorage.getItem('pos-sales-history')) || [];
      setSalesHistory(savedHistory);
    };
    boot();
  }, []);

  // Load terminal name from localStorage after component mounts
  useEffect(() => {
    const savedTerminal = localStorage.getItem('pos-terminal');
    if (savedTerminal) {
      setTerminalName(savedTerminal);
    }
  }, []);

  // Update time every second
  useEffect(() => {
    // Initialize time on client side only to prevent hydration mismatch
    setCurrentTime(new Date());
    
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Generate search suggestions when search term changes
  useEffect(() => {
    generateSearchSuggestions(searchTerm);
  }, [searchTerm, products]);

  // Handle search term clearing - clear products when search is empty (no auto-reload)
  useEffect(() => {
    if (!searchTerm || searchTerm.trim() === '') {
      // Clear products when search is empty - user must manually load products

      setProducts([]);
    }
  }, [searchTerm]);

  // Removed sample data restore; using real data from database

  // Auto-update location when terminal changes
  useEffect(() => {
    const newLocation = getLocationFromTerminal(terminalName);
    if (newLocation !== locationName) {
      setLocationName(newLocation);

    }
  }, [terminalName]);

  // On store location change, clear products and cart; reload products for new location
  useEffect(() => {
    try { localStorage.removeItem('pos-cart'); } catch (_) {}
    setCart([]);
    setSelectedIndex(0);
    setProducts([]);
    try { localStorage.removeItem('pos-products'); } catch (_) {}
    
    // Clear barcode scanned product indicator when location changes
    setBarcodeScannedProduct(null);
    
    // Show location change notification
    if (typeof window !== 'undefined') {

    }
    
    // ❌ REMOVED: Auto-load products for the new location
    // Products will only load when user searches or scans a barcode
    // loadAllProducts();
  }, [locationName]);

  // Calculate total
  useEffect(() => {
    const newTotal = cart.reduce(
      (acc, item) => acc + (item.product.price * item.quantity),
      0
    );
    setTotal(newTotal);
    localStorage.setItem('pos-cart', JSON.stringify(cart));
  }, [cart]);


  // Add to cart with custom quantity (fallback for direct add)
  const addToCart = (product, quantity) => {
    if (quantity <= 0 || quantity > product.quantity) {
      toast.warning(`Please enter a valid quantity (1–${product.quantity})`);
      return;
    }
    
    // Update local stock immediately
    updateLocalStock(product.id, -quantity);
    
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [...prevCart, { product, quantity }];
      }
    });
    setQuantityInputs(prev => ({
      ...prev,
      [product.id]: 1
    }));
    
    // Show success message
    toast.success(`Added to cart: ${product.name} x${quantity}`);
    
    // Check if coming from barcode scan before clearing it
    const wasFromBarcode = !!barcodeScannedProduct;
    
    // If adding from barcode scan, clear products list and barcode state so next scan will work properly
    if (wasFromBarcode) {
      // Clear the barcode scanned product state immediately
      setBarcodeScannedProduct(null);
      
      // Clear the products list so next scan replaces it cleanly
      setTimeout(() => {
        setProducts([]);
      }, 200);
    }
    
    // Always auto-navigate to checkout section and focus Amount Paid after adding to cart
    // User can press Alt+D to open discount modal if needed
    // User can press Alt+A to go back to products if they want to add more items
    setNavigationIndex(2);
    setCheckoutFocusIndex(0);
    setTimeout(() => {
      try { amountPaidRef.current?.focus?.(); } catch (_) {}
    }, 100);

  };

  // Remove item from cart and restore stock
  const removeFromCart = (productId, quantity) => {
    // Restore stock
    updateLocalStock(productId, quantity);
    
    // Remove from cart
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));

  };

  // Clear cart and restore all stock
  const clearCart = () => {
    // Restore stock for all items
    cart.forEach(item => {
      updateLocalStock(item.product.id, item.quantity);
    });
    
    // Clear cart
    setCart([]);
    setTotal(0);
    setPayableTotal(0);
    setDiscountAmount(0);
    setDiscountType(null);

  };

  // Filter products based on search term, then sort by EXPIRATION DATE (FIFO)
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const sortedFilteredProducts = [...filteredProducts].sort((a, b) => {
    // Sort by expiration date first (FIFO - earliest expiry first)
    const aDate = a.expiration_date ? new Date(a.expiration_date) : new Date('9999-12-31');
    const bDate = b.expiration_date ? new Date(b.expiration_date) : new Date('9999-12-31');
    
    if (aDate.getTime() !== bDate.getTime()) {
      return aDate - bDate; // Earlier expiration first
    }
    // Then sort alphabetically by name
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });

  // Update quantity input when navigating
  useEffect(() => {
    if (sortedFilteredProducts[selectedIndex]) {
      const product = sortedFilteredProducts[selectedIndex];
      if (!quantityInputs[product.id]) {
        setQuantityInputs(prev => ({ ...prev, [product.id]: 1 }));
      }
    }
    // Auto-scroll selected product fully into view (account for bottom action bar)
    if (navigationIndex === 1 && productItemRefs.current[selectedIndex] && productListRef.current) {
      try {
        const list = productListRef.current;
        const el = productItemRefs.current[selectedIndex];
        const bottomOverlayPx = 72; // approx. bottom bar height

        const elTop = el.offsetTop - list.offsetTop;
        const elBottom = elTop + el.offsetHeight;
        const visibleTop = list.scrollTop;
        const visibleBottom = list.scrollTop + list.clientHeight - bottomOverlayPx;

        if (elBottom > visibleBottom) {
          list.scrollTop = elBottom - list.clientHeight + bottomOverlayPx;
        } else if (elTop < visibleTop) {
          list.scrollTop = elTop;
        }
      } catch (_) {}
    }
  }, [selectedIndex, products, searchTerm]);

  // Keyboard Navigation (Search, Products, Checkout)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Handle keys inside Credentials Modal
      if (showCredentialsModal) {
        if (e.key === 'Escape') {
          e.preventDefault();
          closeCredentialsModal();
          return;
        }
        switch (e.key) {
          case 'Tab':
            e.preventDefault();
            setCredentialsFocusIndex(prev => (prev + 1) % 7);
            break;
          case 'Enter':
            e.preventDefault();
            if (credentialsFocusIndex === 5) { // Save button
              saveCredentials();
            } else if (credentialsFocusIndex === 6) { // Cancel button
              closeCredentialsModal();
            }
            break;
          case 'Escape':
            e.preventDefault();
            closeCredentialsModal();
            break;
          case 'ArrowUp':
            e.preventDefault();
            setCredentialsFocusIndex(prev => prev > 0 ? prev - 1 : 6);
            break;
          case 'ArrowDown':
            e.preventDefault();
            setCredentialsFocusIndex(prev => (prev + 1) % 7);
            break;
        }
        return;
      }
      // F1: New Transaction
      if (e.key === 'F1') {
        e.preventDefault();
        startNewTransaction();
        return;
      }

      // F2: Focus Search Product
      if (e.key === 'F2') {
        e.preventDefault();
        setNavigationIndex(0);
        setTimeout(() => document.getElementById('search-input')?.focus(), 0);
        return;
      }

      // F3: Focus Quantity of selected product
      if (e.key === 'F3') {
        e.preventDefault();
        setNavigationIndex(1);
        setTimeout(() => {
          const filteredProducts = products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase())
          );
          const sortedFilteredProducts = [...filteredProducts].sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
          );
          const selected = sortedFilteredProducts[selectedIndex];
          if (selected) {
            const input = document.querySelector('td input[type="number"]');
            input?.focus();
            input?.select?.();
          }
        }, 0);
        return;
      }

      // F4: Discount modal
      if (e.key === 'F4') {
        e.preventDefault();
        setDiscountSelection(discountType || 'PWD');
        setShowDiscountModal(true);
        return;
      }

      // F5: Suspend / Resume Transaction
      if (e.key === 'F5') {
        e.preventDefault();
        if (suspendedCartRef.current) {
          // Resume
          const { cart: savedCart } = suspendedCartRef.current;
          setCart(savedCart || []);
          suspendedCartRef.current = null;
          if (typeof window !== 'undefined' && window.toast) window.toast.info('Transaction resumed');
        } else {
          // Suspend
          suspendedCartRef.current = { cart: [...cart] };
          clearCart();
          if (typeof window !== 'undefined' && window.toast) window.toast.info('Transaction suspended');
        }
        return;
      }

      // F10 or Enter at Product/Checkout: Payment / Checkout
      if (e.key === 'F10') {
        e.preventDefault();
        handleCheckout();
        return;
      }

      // Global toggle for history modal via Alt+H (works even when focused inside inputs)
      if (e.altKey && (e.key === 'h' || e.key === 'H')) {
        e.preventDefault();
        setShowHistoryModal(prev => !prev);
        setHistoryMode('sales');
        setHistoryItemSelectedIndex(0);
        return;
      }

      // Global toggle for Discount modal via Alt+D
      if (e.altKey && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        setDiscountSelection(discountType || 'PWD');
        setShowDiscountModal(prev => !prev);
        return;
      }

      // Global toggle for Split Payment via Alt+S
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        // Only toggle if there are items in cart
        if (cart.length > 0 && navigationIndex === 2) {
          setUseSplitPayment(prev => {
            const newValue = !prev;
            if (newValue) {
              // Switching to split payment
              setAmountPaid('');
              setCashAmount('');
              setGcashAmount('');
              setPaymentMethod('split');
            } else {
              // Switching back to single payment
              setCashAmount('');
              setGcashAmount('');
              setPaymentMethod('');
            }
            return newValue;
          });
        }
        return;
      }

      // Global shortcut to go back to products/add items via Alt+A
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setNavigationIndex(1); // Go to products section
        setSelectedIndex(0); // Reset to first product
        // Clear products to allow fresh scan
        setProducts([]);
        // Focus barcode scanner for quick scanning
        setTimeout(() => {
          const barcodeInput = document.getElementById('barcode-scanner');
          if (barcodeInput) {
            barcodeInput.focus();
          }
        }, 100);
        return;
      }

      // Global toggle for Customer Return modal via Alt+R
      if (e.altKey && (e.key === 'r' || e.key === 'R')) {
        e.preventDefault();
        setShowCustomerReturnModal(prev => !prev);
        return;
      }

      // Global logout via Alt+L
      if (e.altKey && (e.key === 'l' || e.key === 'L')) {
        e.preventDefault();
        handleLogout();
        return;
      }

      // Global credentials update via Alt+C
      if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        openCredentialsModal();
        return;
      }

      // Global toggle for Today's Total Sales modal via Alt+T
      if (e.altKey && (e.key === 't' || e.key === 'T')) {
        e.preventDefault();
        setShowTotalSalesModal(prev => {
          if (!prev) {
            // Opening modal - fetch data
            fetchTodaySales();
          }
          return !prev;
        });
        return;
      }

      // Global: open Product Adjustment modal via Alt+A for selected product
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        const filteredProducts = products.filter(product =>
          product.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const sortedFilteredProducts = [...filteredProducts].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
        );
        const product = sortedFilteredProducts[selectedIndex];
        if (product) {
          openAdjustmentModal(product.id);
        } else {
          toast.warning('No product selected to adjust.');
        }
        return;
      }

      // Quick add barcode scanned product to cart with 'B' key
      if (e.key === 'b' || e.key === 'B'){
        if (barcodeScannedProduct && navigationIndex === 1) {
          e.preventDefault();
          const product = products.find(p => p.id === barcodeScannedProduct.id || p.id === barcodeScannedProduct.product_id);
          if (product) {
            const quantity = quantityInputs[product.id] || 1;
            addToCart(product, quantity);
            // Clear the barcode indicator after adding to cart
            setBarcodeScannedProduct(null);
            return;
          }
        }
      }

      // If Return Quantity modal is open, capture keys
      if (showReturnQtyModal) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowReturnQtyModal(false);
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          const max = Number(returnModal.max || 0);
          const current = Math.min(Math.max(1, Number(returnQtyInput || 0)), max) || 1;
          const next = Math.min(max, current + 1);
          setReturnQtyInput(String(next));
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          const max = Number(returnModal.max || 0);
          const current = Math.min(Math.max(1, Number(returnQtyInput || 0)), max) || 1;
          const next = Math.max(1, current - 1);
          setReturnQtyInput(String(next));
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          const qty = Number(returnQtyInput);
          if (Number.isFinite(qty) && qty >= 1 && qty <= Number(returnModal.max || 0)) {
            handleReturnItem(returnModal.transactionId, returnModal.productId, qty);
            setShowReturnQtyModal(false);
          }
          return;
        }
        return; // block other shortcuts while qty modal open
      }

      // Handle keys inside Product Adjustment Modal
      if (showAdjustmentModal) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowAdjustmentModal(false);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          confirmAdjustment();
          return;
        }
        return; // block other shortcuts while adjustment modal open
      }

      // Handle keys inside Sales History Modal
      if (showHistoryModal) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowHistoryModal(false);
          return;
        }
        if (["ArrowDown", "s", "S"].includes(e.key)) {
          e.preventDefault();
          if (historyMode === 'sales') {
            setHistorySelectedIndex(prev => (prev + 1) % Math.max(salesHistory.length, 1));
          } else {
            const itemsLen = salesHistory[historySelectedIndex]?.items?.length || 0;
            if (itemsLen > 0) setHistoryItemSelectedIndex(prev => (prev + 1) % itemsLen);
          }
          return;
        }
        if (["ArrowUp", "w", "W"].includes(e.key)) {
          e.preventDefault();
          if (historyMode === 'sales') {
            setHistorySelectedIndex(prev => (prev - 1 + Math.max(salesHistory.length, 1)) % Math.max(salesHistory.length, 1));
          } else {
            const itemsLen = salesHistory[historySelectedIndex]?.items?.length || 0;
            if (itemsLen > 0) setHistoryItemSelectedIndex(prev => (prev - 1 + itemsLen) % itemsLen);
          }
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (historyMode === 'sales') {
            setHistoryMode('items');
            setHistoryItemSelectedIndex(0);
          } else {
            // Return selected item
            const sale = salesHistory[historySelectedIndex];
            const item = sale?.items?.[historyItemSelectedIndex];
            if (sale && item) openReturnQtyModal(sale.transactionId, item.id);
          }
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          if (historyMode === 'items') {
            setHistoryMode('sales');
          } else {
            setShowHistoryModal(false);
          }
          return;
        }
        return; // Block other shortcuts while modal is open
      }

      // Handle keys inside Customer Return Modal
      if (showCustomerReturnModal) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowCustomerReturnModal(false);
          return;
        }
        if (e.key === 'Enter' && e.altKey) {
          e.preventDefault();
          processCustomerReturn();
          return;
        }
        return; // block other shortcuts while customer return modal open
      }

      // Handle keys inside Today's Total Sales Modal
      if (showTotalSalesModal) {

        if (e.key === 'Escape') {

          e.preventDefault();
          setShowTotalSalesModal(false);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          fetchTodaySales(); // Refresh data
          return;
        }
        return; // block other shortcuts while total sales modal open
      }

      // Handle keys inside Logout Confirmation Modal
      if (showLogoutConfirm) {
        if (e.key === 'Escape') {
          e.preventDefault();
          cancelLogout();
          return;
        }
        return; // Block other shortcuts while logout modal is open
      }

      // Handle keys inside Clear Cart Modal
      if (showClearCartModal) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowClearCartModal(false);
          return;
        }
        return; // Block other shortcuts while clear cart modal is open
      }

      // Handle keys inside Return Confirmation Modal
      if (showReturnConfirmModal) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowReturnConfirmModal(false);
          return;
        }
        return; // Block other shortcuts while return confirm modal is open
      }

      // Handle keys inside Thank You Modal
      if (showThankYouModal) {
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowThankYouModal(false);
          return;
        }
        return; // Block other shortcuts while thank you modal is open
      }

      // Handle keys inside Discount Modal
      if (showDiscountModal) {
        // Check if user is typing in Senior ID or Senior Name input fields
        const isTypingInSeniorFields = 
          document.activeElement === seniorIdInputRef.current || 
          document.activeElement === seniorNameInputRef.current;
        
        // If typing in senior fields, allow normal input behavior for arrow keys and Enter
        if (isTypingInSeniorFields) {
          if (e.key === 'Escape') {
            e.preventDefault();
            setShowDiscountModal(false);
            return;
          }
          // Allow all other keys (including arrow keys and Enter) to work normally in input
          // Don't handle them here - let the input's own onKeyDown handle them
          if (e.key === 'Enter' || e.key.includes('Arrow')) {
            return;
          }
        }
        
        if (e.key === 'Escape') {
          e.preventDefault();
          setShowDiscountModal(false);
          return;
        }
        
        // Arrow Up/Down navigation (only if NOT typing in senior input fields)
        if (e.key === "ArrowUp") {
          e.preventDefault();
          const options = [...getDiscountTypesFromDb(), 'None'];
          const idx = options.indexOf(discountSelection);
          const next = (idx - 1 + options.length) % options.length;
          setDiscountSelection(options[next]);
          return;
        }
        if (e.key === "ArrowDown") {
          e.preventDefault();
          const options = [...getDiscountTypesFromDb(), 'None'];
          const idx = options.indexOf(discountSelection);
          const next = (idx + 1) % options.length;
          setDiscountSelection(options[next]);
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          // Check if Senior discount is selected
          const isSeniorDiscount = (discountSelection === 'Senior Citizen' || discountSelection === 'Senior' || String(discountSelection).toLowerCase().includes('senior'));
          
          // Validate senior information if needed
          if (isSeniorDiscount && discountSelection !== 'None') {
            if (!seniorIdNumber.trim()) {
              toast.error('Please enter Senior Citizen ID Number');
              return;
            }
            if (!seniorName.trim()) {
              toast.error('Please enter Senior Citizen Full Name');
              return;
            }
          }
          
          if (discountSelection === 'None') {
            setDiscountType(null);
            setSeniorIdNumber('');
            setSeniorName('');
          } else {
            setDiscountType(discountSelection);
            // Clear senior info if not senior discount
            if (!isSeniorDiscount) {
              setSeniorIdNumber('');
              setSeniorName('');
            }
          }
          setShowDiscountModal(false);
          return;
        }
        return; // block other shortcuts while discount modal open
      }

      // Prevent navigation if user is typing in input
      if (
        ['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement.tagName)
      ) return;

      const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
      );
      const sortedFilteredProducts = [...filteredProducts].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
      );
      const cols = 1; // List view: single column for product list
      const maxIndex = sortedFilteredProducts.length - 1;
      const spacerIndex = sortedFilteredProducts.length; // virtual last row

      // --- Cart adjustment navigation ---
      if (navigationIndex === 2 && checkoutFocusIndex === 'cart' && cart.length > 0) {
        if (["ArrowDown", "s", "S"].includes(e.key)) {
          e.preventDefault();
          if (cartFocusIndex === cart.length - 1) {
            setCheckoutFocusIndex(4); // Move to checkout button
          } else {
            setCartFocusIndex((prev) => prev + 1);
          }
          return;
        }
        if (["ArrowUp", "w", "W"].includes(e.key)) {
          e.preventDefault();
          setCartFocusIndex((prev) => (prev - 1 + cart.length) % cart.length);
          return;
        }
        if (e.altKey && ["ArrowLeft"].includes(e.key)) {
          e.preventDefault();
          updateCartItemQuantity(cart[cartFocusIndex].product.id, cart[cartFocusIndex].quantity - 1);
          return;
        }
        if (e.altKey && ["ArrowRight"].includes(e.key)) {
          e.preventDefault();
          updateCartItemQuantity(cart[cartFocusIndex].product.id, cart[cartFocusIndex].quantity + 1);
          return;
        }
        if (["Tab", "Enter"].includes(e.key)) {
          e.preventDefault();
          setCheckoutFocusIndex(0); // Move to Amount Paid input
          return;
        }
        return;
      }
      // --- End cart adjustment navigation ---

      // --- Checkout navigation ---
      if (navigationIndex === 2) {
        let maxFocus = cart.length > 0 ? 4 : 3; // Always allow access to checkout button (index 4) when cart has items
        if (["ArrowDown", "s", "S"].includes(e.key) && checkoutFocusIndex === 0 && justBlurredAmountPaid.current) {
          e.preventDefault();
          setCheckoutFocusIndex(4); // Move to checkout button
          justBlurredAmountPaid.current = false;
          return;
        }
        if (["Tab", "ArrowDown", "s", "S"].includes(e.key)) {
          e.preventDefault();
          // Sequential navigation flow
          if (checkoutFocusIndex === 0) {
            setCheckoutFocusIndex(1); // Amount Paid → Payment Method
            return;
          }
          if (checkoutFocusIndex === 1 && paymentMethod === 'cash') {
            setCheckoutFocusIndex(4); // Cash → Checkout
            return;
          }
          if (checkoutFocusIndex === 2 && paymentMethod === 'gcash') {
            setCheckoutFocusIndex(3); // GCash → Reference
            return;
          }
          if (checkoutFocusIndex === 3) {
            setCheckoutFocusIndex(4); // Reference → Checkout
            return;
          }
          // If cart is present and not already in cart focus, go to cart first
          if (cart.length > 0 && checkoutFocusIndex !== 'cart') {
            setCheckoutFocusIndex('cart');
            setCartFocusIndex(0);
            return;
          }
          setCheckoutFocusIndex((prev) => {
            if (prev + 1 > maxFocus) {
              return 0;
            } else {
              return prev + 1;
            }
          });
          return;
        }
        if (["ArrowUp", "w", "W"].includes(e.key)) {
          e.preventDefault();
          // Sequential navigation flow (reverse)
          if (checkoutFocusIndex === 4) {
            if (paymentMethod === 'gcash' && showRefInput) {
              setCheckoutFocusIndex(3); // Checkout → GCash Ref
            } else if (paymentMethod === 'cash') {
              setCheckoutFocusIndex(1); // Checkout → Cash
            } else {
              setCheckoutFocusIndex(0); // Checkout → Amount Paid
            }
            return;
          }
          if (checkoutFocusIndex === 3) {
            setCheckoutFocusIndex(2); // GCash Ref → GCash
            return;
          }
          if (checkoutFocusIndex === 2) {
            setCheckoutFocusIndex(1); // GCash → Cash
            return;
          }
          if (checkoutFocusIndex === 1) {
            setCheckoutFocusIndex(0); // Payment Method → Amount Paid
            return;
          }
          setCheckoutFocusIndex((prev) => (prev - 1) < 0 ? maxFocus : prev - 1);
          return;
        }
        // Left/Right arrows handled in main switch statement below
        if (e.key === "Enter") {
          e.preventDefault();
          // Sequential navigation with Enter key
          if (checkoutFocusIndex === 0) {
            // Amount Paid → Check if payment method already selected and amount is valid
            if (paymentMethod && amountPaid && parseFloat(amountPaid) >= payableTotal) {
              // If payment method already selected and amount is valid
              if (paymentMethod === 'gcash' && showRefInput && !referenceNumber.trim()) {
                // GCash needs reference number
                setCheckoutFocusIndex(3);
                setTimeout(() => { try { refNumRef.current?.focus?.(); } catch (_) {} }, 0);
              } else {
                // All conditions met - execute checkout directly
                handleCheckout();
              }
            } else if (paymentMethod) {
              // Payment method selected but amount not valid - go to checkout button
              setCheckoutFocusIndex(4);
              setTimeout(() => { try { checkoutBtnRef.current?.focus?.(); } catch (_) {} }, 0);
            } else {
              // No payment method yet, go to payment selection
              setCheckoutFocusIndex(1);
              setTimeout(() => { try { cashBtnRef.current?.focus?.(); } catch (_) {} }, 0);
            }
          } else if (checkoutFocusIndex === 1) {
            setPaymentMethod('cash'); 
            setShowRefInput(false);
            // Cash → Checkout
            setCheckoutFocusIndex(4);
            setTimeout(() => { try { checkoutBtnRef.current?.focus?.(); } catch (_) {} }, 0);
          } else if (checkoutFocusIndex === 2) {
            setPaymentMethod('gcash'); 
            // Don't auto-set amount for GCash - let user enter it to allow change
            if (!amountPaid) {
              setAmountPaid(payableTotal.toString()); // Only set if empty as a default
            }
            setShowRefInput(true); 
            // GCash → Reference
            setCheckoutFocusIndex(3);
            setTimeout(() => { try { refNumRef.current?.focus?.(); } catch (_) {} }, 0);
          } else if (checkoutFocusIndex === 3) {
            // Reference → Checkout
            if (referenceNumber.trim()) {
              setCheckoutFocusIndex(4);
              setTimeout(() => { try { checkoutBtnRef.current?.focus?.(); } catch (_) {} }, 0);
            }
          } else if (checkoutFocusIndex === 4) {
            handleCheckout();
          }
          return;
        }
        return;
      }
      // --- End checkout navigation ---

      switch (e.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          if (navigationIndex === 1 && selectedIndex - cols >= 0) {
            // Move up in product grid
            setSelectedIndex(prev => prev - cols);
          } else if (navigationIndex === 2) {
            // Move from checkout to products
            setNavigationIndex(1);
          } else {
            // Move to previous section
            setNavigationIndex(prev => Math.max(prev - 1, 0));
          }
          break;

        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          if (navigationIndex === 1 && selectedIndex + cols <= maxIndex) {
            // Move down in product grid
            setSelectedIndex(prev => prev + cols);
          } else if (navigationIndex === 0) {
            // Move from search to products
            setNavigationIndex(1);
          } else if (navigationIndex === 1) {
            // Move from products to checkout
            setNavigationIndex(2);
          }
          break;

        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();

          if (navigationIndex === 2 && (checkoutFocusIndex === 1 || checkoutFocusIndex === 2)) {
            // Handle payment method navigation in checkout

            if (checkoutFocusIndex === 1) {
              setCheckoutFocusIndex(2); // Move to GCash
            } else if (checkoutFocusIndex === 2) {
              setCheckoutFocusIndex(1); // Move to Cash
            }
          } else if (navigationIndex === 1 && selectedIndex > 0) {
            // Move left in product grid
            setSelectedIndex(prev => prev - 1);
          } else if (navigationIndex === 2) {
            // Move from checkout to products
            setNavigationIndex(1);
          }
          break;

        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();

          if (navigationIndex === 2 && (checkoutFocusIndex === 1 || checkoutFocusIndex === 2)) {
            // Handle payment method navigation in checkout

            if (checkoutFocusIndex === 1) {
              setCheckoutFocusIndex(2); // Move to GCash
            } else if (checkoutFocusIndex === 2) {
              setCheckoutFocusIndex(1); // Move to Cash
            }
          } else if (navigationIndex === 1) {
            // Jump directly to checkout amount input
            setNavigationIndex(2);
            setCheckoutFocusIndex(0);
          }
          break;

        case 'Enter':
          e.preventDefault();

          if (navigationIndex === 0) {
            // Focus search bar
            document.getElementById('search-input')?.focus();
          } else if (navigationIndex === 1 && sortedFilteredProducts[selectedIndex]) {
            // Add selected product to cart with quantity from input field
            const product = sortedFilteredProducts[selectedIndex];
            const qty = quantityInputs[product.id] || 1;
            addToCart(product, qty);
            
            // Move to checkout and focus on first cart item's Quick Add dropdown
            setNavigationIndex(2);
            setCheckoutFocusIndex('cart');
            setCartFocusIndex(0);
            
            // Focus the Quick Add dropdown after cart update
            setTimeout(() => {
              const quickAddDropdown = document.querySelector('.quick-add-dropdown');
              if (quickAddDropdown) {
                quickAddDropdown.focus();
              }
            }, 100);
          } else if (navigationIndex === 2) {
            // Trigger checkout
            handleCheckout();
          }
          break;

        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigationIndex, selectedIndex, products, searchTerm, quantityInputs, cart, cartFocusIndex, showHistoryModal, salesHistory, historySelectedIndex, showDiscountModal, discountSelection, discountType, payableTotal, barcodeScannedProduct, showCustomerReturnModal, customerReturnData, returnQuantities, recentTransactions, showRecentTransactions, showCredentialsModal, showLogoutConfirm, showClearCartModal, showReturnConfirmModal, showThankYouModal]);

  // Cart functions
  const updateCartItemQuantity = (productId, newQuantity) => {
    // Enforce minimum quantity of 1
    if (newQuantity < 1) {
      newQuantity = 1;
    }
    
    // Find the current item to calculate stock difference
    const currentItem = cart.find(item => item.product.id === productId);
    if (currentItem) {
      const quantityDifference = newQuantity - currentItem.quantity;
      if (quantityDifference !== 0) {
        // Update stock based on quantity difference
        updateLocalStock(productId, -quantityDifference);
      }
    }
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  // Generate HTML receipt for browser printing
  const generateHTMLReceipt = (data) => {
    const receiptWidth = 48;
    
    const formatPriceLine = (label, amount) => {
      const amountStr = parseFloat(amount).toFixed(2);
      // Use padding to align the amount to the right
      const paddingNeeded = Math.max(0, receiptWidth - label.length - amountStr.length);
      // Create a string with spaces for padding
      const padding = ' '.repeat(paddingNeeded);
      return `${label}${padding}${amountStr}`;
    };
    
    let content = '';
    
    // Header - centered
    content += '='.repeat(receiptWidth) + '\n';
    const storeName = data.storeName || "ENGUIO'S CONVENIENCE STORE";
    
    // Always center store name - add markdown to indicate it should be centered by CSS
    content += 'CENTER:' + storeName + '\n';
    
    
    content += 'CENTER:Z1 Lumbia, Cagayan De Oro\n';
    content += '='.repeat(receiptWidth) + '\n';
    // Receipt info
    content += `Date: ${data.date || new Date().toLocaleDateString()}\n`;
    content += `Time: ${data.time || new Date().toLocaleTimeString()}\n`;
    content += `TXN ID: ${data.transactionId || 'N/A'}\n`;
    content += `Cashier: ${data.cashier || 'Admin'}\n`;
    content += `Terminal: ${data.terminalName || 'POS'}\n`;
    content += '-'.repeat(receiptWidth) + '\n';
    
    // Items header - Removed to make it cleaner
    content += '-'.repeat(receiptWidth) + '\n';
    
    // Items
    if (data.items && data.items.length > 0) {
      data.items.forEach(item => {
        const qty = String(item.quantity || 1);
        const name = String(item.name || 'Unknown');
        const srp = parseFloat(item.srp || item.price || 0).toFixed(2);
        const total = (parseInt(qty) * parseFloat(item.price || 0)).toFixed(2);
        
        // Format: Product name on first line, qty srp total on second line
        content += `${name}\n`;
        content += `qty:${qty} srp:${srp} total:${total}\n`;
      });
    }
    
    content += '-'.repeat(receiptWidth) + '\n';
    
    // Calculate total quantity and number of items
    if (data.items && data.items.length > 0) {
      const totalQty = data.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0);
      const totalItems = data.items.length;
      content += `TOTAL : ${totalQty} items (${totalItems} ${totalItems === 1 ? 'item' : 'items'})\n`;
    }
    
    // Subtotal - simplified for debugging
    const subtotalValue = parseFloat(data.subtotal || data.total || 0).toFixed(2);
    content += `SUBTOTAL: ${subtotalValue}\n`;
    
    // Discount
    if (data.discountType && parseFloat(data.discountAmount) > 0) {
      const discountPercent = data.discountPercent || 0;
      const discountAmt = parseFloat(data.discountAmount || 0).toFixed(2);
      content += `Discount: ${data.discountType}${discountPercent > 0 ? ` (${discountPercent.toFixed(0)}%)` : ''}\n`;
      content += `Discount Amt: -${discountAmt}\n`;
      
      // Senior Citizen Information
      const isSeniorDiscount = data.discountType && (
        data.discountType.toLowerCase().includes('senior') || 
        String(data.discountType).toLowerCase() === 'senior citizen'
      );
      if (isSeniorDiscount && (data.seniorIdNumber || data.seniorName)) {
        content += '-'.repeat(receiptWidth) + '\n';
        content += 'SENIOR CITIZEN INFO:\n';
        if (data.seniorIdNumber) {
          content += `ID Number: ${data.seniorIdNumber}\n`;
        }
        if (data.seniorName) {
          content += `Name: ${data.seniorName}\n`;
        }
      }
    }
    
    content += '-'.repeat(receiptWidth) + '\n';
    
    // Grand total
    content += 'GRAND TOTAL: ' + parseFloat(data.grandTotal || data.total || 0).toFixed(2) + '\n';
    content += '-'.repeat(receiptWidth) + '\n';
    
    // Payment info
    if (data.paymentMethod?.toLowerCase() === 'split') {
      // Split payment: show cash + gcash breakdown
      content += 'PAYMENT BREAKDOWN:\n';
      const cashAmt = parseFloat(data.cashAmount || 0);
      const gcashAmt = parseFloat(data.gcashAmount || 0);
      const totalPaid = cashAmt + gcashAmt;
      content += `  CASH: ${cashAmt.toFixed(2)}\n`;
      content += `  GCASH: ${gcashAmt.toFixed(2)}\n`;
      if (data.gcashRef) {
        content += `  GCASH REF: ${data.gcashRef}\n`;
      }
      content += `TOTAL PAID: ${totalPaid.toFixed(2)}\n`;
      content += `CHANGE: ${parseFloat(data.change || 0).toFixed(2)}\n`;
    } else if (data.paymentMethod?.toLowerCase() === 'cash') {
      content += `${(data.paymentMethod || 'CASH').toUpperCase()}: ${parseFloat(data.amountPaid || 0).toFixed(2)}\n`;
      content += `CHANGE: ${parseFloat(data.change || 0).toFixed(2)}\n`;
    } else if (data.paymentMethod?.toLowerCase() === 'gcash') {
      content += `${(data.paymentMethod || 'GCASH').toUpperCase()}: ${parseFloat(data.amountPaid || 0).toFixed(2)}\n`;
      if (data.gcashRef) {
        content += `GCASH REF: ${data.gcashRef}\n`;
      }
      content += `CHANGE: ${parseFloat(data.change || 0).toFixed(2)}\n`;
    } else {
      content += `${(data.paymentMethod || 'UNKNOWN').toUpperCase()}: ${parseFloat(data.amountPaid || 0).toFixed(2)}\n`;
      content += `CHANGE: ${parseFloat(data.change || 0).toFixed(2)}\n`;
    }
    
    // VAT Breakdown (BIR Compliance)
    content += '-'.repeat(receiptWidth) + '\n';
    const VAT_RATE = 0.12;
    const grandTotal = parseFloat(data.grandTotal || 0);
    const isSeniorOrPWD = data.discountType && (
      data.discountType.toLowerCase().includes('senior') ||
      data.discountType.toLowerCase().includes('pwd')
    );
    
    if (isSeniorOrPWD) {
      // Senior/PWD sales are VAT-exempt
      const vatExemptSale = grandTotal;
      content += `VATable Sale: 0.00\n`;
      content += `VAT Exempt Sale: ${vatExemptSale.toFixed(2)}\n`;
      content += `VAT Zero-Rated: 0.00\n`;
      content += `VAT 12%: 0.00\n`;
    } else {
      // Regular sales: Calculate VAT (VAT is embedded in price)
      // Formula: VATable Sale = Total / 1.12, VAT = Total - VATable Sale
      const vatableSale = grandTotal / 1.12;
      const vatAmount = grandTotal - vatableSale;
      content += `VATable Sale: ${vatableSale.toFixed(2)}\n`;
      content += `VAT Exempt Sale: 0.00\n`;
      content += `VAT Zero-Rated: 0.00\n`;
      content += `VAT 12%: ${vatAmount.toFixed(2)}\n`;
    }
    
    // Footer - Force update to ensure correct text
    content += '='.repeat(receiptWidth) + '\n';
    content += 'Thank you!\n';
    content += 'Please come again\n';
    // IMPORTANT: This must be "THIS IS NOT AN OFFICIAL RECEIPT" (not "This is your official receipt")
    content += 'THIS IS NOT AN OFFICIAL RECEIPT\n';
    content += '='.repeat(receiptWidth) + '\n';
    
    return `<!DOCTYPE html>
<html>
<head>
  <title>Receipt</title>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    @media print {
      @page { size: 80mm auto; margin: 0; }
      body { margin: 0; padding: 3mm; }
    }
    
    body {
      font-family: 'Courier New', monospace;
      font-size: 16px;
      font-weight: 700;
      line-height: 1.6;
      width: 75mm;
      margin: 0 auto;
      padding: 3mm;
      color: #000;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      overflow: visible;
      min-height: 100vh;
    }
    
    .line { 
      white-space: pre;
      font-family: 'Courier New', monospace; 
      font-weight: 700;
      color: #000;
      text-align: left;
      margin: 0;
      padding: 0;
      display: block;
    }
    
    .line.text-center {
      text-align: center;
    }
    
    .header-line {
      text-align: center !important;
      white-space: pre;
      display: block;
    }
    
    .receipt {
      width: 100%;
      overflow: visible;
    }
  </style>
</head>
<body>
  <div class="receipt">
    ${content.split('\n').map((line, index) => {
      const trimmed = line.trim();
      
      // Find the first and last separator lines (===)
      const lines = content.split('\n');
      let firstSeparatorIndex = -1;
      let lastSeparatorIndex = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim() === '='.repeat(receiptWidth)) {
          if (firstSeparatorIndex === -1) firstSeparatorIndex = i;
          lastSeparatorIndex = i;
        }
      }
      
      // Header section is between first separator and last separator
      const isStoreName = trimmed.includes("ENGUIO") && (trimmed.includes("STORE") || trimmed.includes("PHARMACY"));
      const isAddress = trimmed.includes("Lumbia") || trimmed.includes("Cagayan") || trimmed.includes("Z1");
      const isHeaderContent = firstSeparatorIndex >= 0 && lastSeparatorIndex >= 0 && 
                              index > firstSeparatorIndex && index < lastSeparatorIndex;
      const hasLeadingSpaces = line.length > trimmed.length && line.startsWith(' ');
      
      // Check if line should be centered (has CENTER: prefix or is header content)
      const shouldCenter = trimmed.startsWith('CENTER:') || trimmed.length > 0 && (isHeaderContent || isStoreName || isAddress || hasLeadingSpaces);
      const className = shouldCenter ? 'line header-line' : 'line';
      
      // Remove CENTER: prefix if present, otherwise use trimmed line
      const displayLine = trimmed.startsWith('CENTER:') ? trimmed.substring(7) : trimmed;
      
      return `<div class="${className}">${displayLine || ' '}</div>`;
    }).join('')}
  </div>
</body>
</html>`;
  };

  const printReceipt = async () => {
    // Get current date and time
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();
    const transactionId = `TXN${now.getTime().toString().slice(-6)}`;

    // Prepare receipt data
    const sessionUser = (typeof window !== 'undefined') ? JSON.parse(sessionStorage.getItem('user_data') || '{}') : {};
    
    // Determine store name based on locationName or terminalName
    let storeName = "ENGUIO'S CONVENIENCE STORE";
    
    // Check if it's pharmacy based on terminal name or location
    if (terminalName.toLowerCase().includes('pharmacy') || 
        locationName.toLowerCase().includes('pharmacy')) {
      storeName = "ENGUIO'S PHARMACY";
    } else if (terminalName.toLowerCase().includes('convenience') || 
               locationName.toLowerCase().includes('convenience')) {
      storeName = "ENGUIO'S CONVENIENCE STORE";
    }
    
    // Ensure change is calculated correctly
    const finalChange = change || 0;
    
    // Calculate discount percentage and amount
    let discountPercent = 0;
    let calculatedDiscountAmount = discountAmount || 0;
    
    // Always recalculate discount if discountType is set to ensure accuracy
    if (discountType && total > 0) {
      let rate = 0;
      const dbOption = discountOptions.find(o => String(o.type).toLowerCase() === String(discountType).toLowerCase());
      if (dbOption && Number.isFinite(dbOption.rate)) {
        rate = dbOption.rate;
        if (rate > 1) rate = rate / 100;
        discountPercent = rate * 100;
      } else {
        rate = 0.20; // Fallback: 20% for PWD or Senior
        discountPercent = 20;
      }
      calculatedDiscountAmount = Number((total * rate).toFixed(2));
    }
    
    const receiptData = {
      storeName: storeName,
      date: dateStr,
      time: timeStr,
      transactionId: transactionId,
      cashier: (sessionUser.username || (typeof window !== 'undefined' && (localStorage.getItem('pos-cashier') || localStorage.getItem('currentUser') || localStorage.getItem('user') || 'Admin'))),
      terminalName,
      items: cart.map(item => ({
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        srp: item.product.srp || item.product.price,
        total: item.product.price * item.quantity
      })),
      subtotal: total,
      discountType: discountType || null,
      discountAmount: calculatedDiscountAmount,
      discountPercent: discountPercent,
      grandTotal: payableTotal,
      paymentMethod: useSplitPayment ? 'split' : paymentMethod.toLowerCase(), // 'split', 'cash', or 'gcash'
      amountPaid: parseFloat(amountPaid),
      change: finalChange,
      gcashRef: (useSplitPayment && referenceNumber) || (paymentMethod.toLowerCase() === 'gcash' ? referenceNumber : null),
      seniorIdNumber: (discountType && String(discountType).toLowerCase().includes('senior')) ? seniorIdNumber : null,
      seniorName: (discountType && String(discountType).toLowerCase().includes('senior')) ? seniorName : null,
      // Split payment info
      cashAmount: useSplitPayment ? parseFloat(cashAmount) || 0 : null,
      gcashAmount: useSplitPayment ? parseFloat(gcashAmount) || 0 : null
    };

    try {

      // Try automatic network printing first
      const printerIP = localStorage.getItem('printerIP'); // Store printer IP in localStorage
      const printerPort = localStorage.getItem('printerPort') || '9100'; // Default TCP/IP port
      
      if (printerIP) {

        try {
          // Send to backend for TCP/IP printing
          const printResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/backend/Api'}/print_direct.php`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              printerIP,
              printerPort,
              receiptData
            })
          });
          
          const printResult = await printResponse.json();
          
          if (printResult.success) {
            toast.success('✅ Receipt printed automatically!');
            return { success: true, message: 'Printed automatically', transactionId, method: 'direct' };
          }
        } catch (e) {

        }
      }
      
      // Fallback: Browser print dialog

      // Generate HTML receipt
      const htmlReceipt = generateHTMLReceipt(receiptData);
      
      
      // Create print window
      const printWindow = window.open('', '_blank', 'width=400,height=600');
      
      if (!printWindow) {
        toast.error('Popup blocked. Please allow popups for this site.');
        return { success: false, message: 'Popup blocked', transactionId };
      }
      
      // Write HTML content
      printWindow.document.write(htmlReceipt);
      printWindow.document.close();
      
      // Wait for content to load then trigger print dialog
      printWindow.onload = function() {
        setTimeout(() => {
          printWindow.print();
          setTimeout(() => {
            try {
              printWindow.focus();
            } catch (e) {
              // Ignore focus errors
            }
          }, 100);
        }, 200);
      };

      return { success: true, message: 'Print dialog opened', transactionId, method: 'browser' };
      
    } catch (error) {
      console.error('❌ Print error:', error);
      toast.error('Print failed: ' + error.message);
      return { success: false, message: error.message, transactionId };
    }
  };

  // Test printer function
  const testPrinter = async () => {
    setIsTestingPrinter(true);
    
    try {

      // Test data for receipt
      const testData = {
        storeName: "ENGUIO'S PHARMACY",
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        transactionId: 'TEST-' + Date.now(),
        cashier: 'Test User',
        terminalName: locationName || 'POS Terminal',
        items: [
          { name: 'Test Item 1', quantity: 1, price: 25.00, total: 25.00 },
          { name: 'Test Item 2 - Long Name Test', quantity: 2, price: 15.50, total: 31.00 }
        ],
        subtotal: 56.00,
        grandTotal: 56.00,
        paymentMethod: 'CASH',
        amountPaid: 60.00,
        change: 4.00
      };
      
      // Try to print using the regular print function

      const result = await printReceipt(testData);
      
      if (result && result.success) {
        toast.success('✅ Test print successful! Check your printer.');

      } else {
        toast.error('❌ Test print failed: ' + (result?.message || 'Unknown error'));
        console.error('❌ Test print failed:', result);
      }
    } catch (error) {
      toast.error(`Test failed: ${error.message}`);
      console.error('❌ Test error:', error);
    } finally {
      setIsTestingPrinter(false);
    }
  };

  // Manual connect to printer (not needed for browser print)
  const connectPrinter = async () => {
    toast.info('Browser print is always ready!');
  };

  // Persist sale to backend (always called, even if printing fails)
  const persistSale = async ({ transactionId, payableTotal, referenceNumber, terminalName, cart, paymentMethod, discountType, discountAmount }) => {
    try {
      const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
      const empId = userData.emp_id || userData.user_id || null;
      const username = userData.username || null;
      const terminalToUse = (String(locationName || '').toLowerCase().includes('convenience')) ? 'Convenience POS' : (terminalName || 'Convenience POS');
      
      // Determine which API to use based on location/terminal
      const isPharmacy = String(locationName || '').toLowerCase().includes('pharmacy') || 
                        String(terminalName || '').toLowerCase().includes('pharmacy');
      
      const apiUrl = isPharmacy 
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/backend/Api'}/pharmacy_api.php`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/backend/Api'}/convenience_store_api.php`;
      
      const action = isPharmacy 
        ? 'process_pharmacy_sale'
        : 'process_convenience_sale';

      // Use appropriate API based on location/terminal
      const res1 = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action,
          transaction_id: transactionId,
          total_amount: payableTotal,
          reference_number: paymentMethod === 'gcash' ? referenceNumber : null,
          terminal_name: terminalToUse,
          payment_method: paymentMethod,
          location_name: locationName,
          emp_id: empId,
          username,
          discount_type: discountType || null,
          discount_amount: discountAmount || 0,
          items: cart.map(it => ({ product_id: it.product.id, quantity: it.quantity, price: it.product.price }))
        })
      });
      const json1 = await res1.json().catch(() => ({}));

      if (!json1.success) {
        console.error(`❌ ${isPharmacy ? 'Pharmacy' : 'Convenience'} sale failed:`, json1.message);
        throw new Error(json1.message || 'Sale processing failed');
      }

      // Now save the sale to POS sales tables

      // Use the empId already declared above, or get from localStorage as fallback
      const finalEmpId = empId || localStorage.getItem('pos-emp-id') || '1';

      const salesRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/backend/Api'}/sales_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_pos_sale',
          transactionId: transactionId,
          totalAmount: payableTotal,
          referenceNumber: paymentMethod === 'gcash' ? referenceNumber : null,
          terminalName: terminalToUse,
          paymentMethod: paymentMethod,
          discountType: discountType || null,
          discountAmount: discountAmount || 0,
          emp_id: parseInt(finalEmpId), // Pass employee ID
          seniorIdNumber: (discountType && (String(discountType).toLowerCase().includes('senior'))) ? seniorIdNumber : null,
          seniorName: (discountType && (String(discountType).toLowerCase().includes('senior'))) ? seniorName : null,
          items: cart.map(it => ({ 
            product_id: it.product.id, 
            quantity: it.quantity, 
            price: it.product.price 
          }))
        })
      });
      const salesJson = await salesRes.json().catch(() => ({}));

      if (!salesJson.success) {
        console.error('❌ Failed to save POS sale:', salesJson.message);
        throw new Error(salesJson.message || 'Failed to save POS sale record');
      }

      // Log activity
      try {
        const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/backend/Api'}/sales_api.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'log_activity',
            activity_type: 'POS_SALE_SAVED',
            description: `POS Sale completed: Transaction ${transactionId} - ₱${payableTotal} (${paymentMethod.toUpperCase()}, ${cart.length} items) at ${terminalName}`,
            table_name: 'tbl_pos_sales',
            record_id: null,
            user_id: userData.user_id || userData.emp_id,
            username: userData.username,
            role: userData.role,
          }),
        });
      } catch (_) {}
    } catch (e) {
      console.warn('save_pos_sale failed:', e);
      try {
        await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/backend/Api'}/sales_api.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'log_activity',
            activity_type: 'POS_SALE_ERROR',
            description: `Failed to save sale ${transactionId}: ${String(e && e.message ? e.message : e)}`,
            table_name: 'tbl_pos_sales',
            record_id: null,
          }),
        });
      } catch (_) {}
    }

    // Note: save_pos_transaction is now handled automatically in save_pos_sale
  };

  // Save sale to history (localStorage)
  const saveSaleToHistory = (saleRecord) => {
    try {
      const existing = JSON.parse(localStorage.getItem('pos-sales-history')) || [];
      const updated = [saleRecord, ...existing].slice(0, 200); // keep latest 200
      localStorage.setItem('pos-sales-history', JSON.stringify(updated));
      setSalesHistory(updated);
    } catch (err) {
      console.error('Failed to save sale history:', err);
    }
  };

  // Mark sale as returned by transactionId
  const handleReturnSale = (transactionId) => {
    if (!transactionId) return;
    const confirmReturn = window.confirm('Mark this sale as returned?');
    if (!confirmReturn) return;
    setSalesHistory(prev => {
      const updated = prev.map(sale => (
        sale.transactionId === transactionId
          ? { ...sale, status: 'returned', returnedAt: new Date().toISOString() }
          : sale
      ));
      localStorage.setItem('pos-sales-history', JSON.stringify(updated));
      return updated;
    });
    setShowHistoryModal(false);
  };

  // Adjust product stock and persist to localStorage
  const adjustProductStock = (productId, delta) => {
    setProducts(prevProducts => {
      const updated = prevProducts.map(p => {
        if (p.id === productId) {
          const newQuantity = Math.max(0, (p.quantity || 0) + delta);
          return { ...p, quantity: newQuantity };
        }
        return p;
      });
      localStorage.setItem('pos-products', JSON.stringify(updated));
      return updated;
    });
  };

  // Open modal to return item quantity
  const openReturnQtyModal = (transactionId, productId) => {
    if (!transactionId || !productId) return;
    const sale = salesHistory.find(s => s.transactionId === transactionId);
    if (!sale) return;
    const item = sale.items?.find(i => i.id === productId);
    if (!item) return;
    const alreadyReturned = Number(item.returnedQuantity || 0);
    const maxReturnable = Math.max(0, Number(item.quantity || 0) - alreadyReturned);
    if (maxReturnable <= 0) {
      toast.warning('Nothing left to return for this item.');
      return;
    }
    setReturnModal({ transactionId, productId, max: maxReturnable });
    setReturnQtyInput(String(maxReturnable));
    setShowReturnQtyModal(true);
  };

  // Return a specific item from a sale (by transactionId and productId) with explicit quantity
  const handleReturnItem = (transactionId, productId, qty) => {
    if (!transactionId || !productId) return;
    const sale = salesHistory.find(s => s.transactionId === transactionId);
    if (!sale) return;
    const item = sale.items?.find(i => i.id === productId);
    if (!item) return;
    const alreadyReturned = Number(item.returnedQuantity || 0);
    const maxReturnable = Math.max(0, Number(item.quantity || 0) - alreadyReturned);
    const quantityToReturn = Number(qty);
    if (!Number.isFinite(quantityToReturn) || quantityToReturn <= 0 || quantityToReturn > maxReturnable) {
      toast.warning('Invalid quantity.');
      return;
    }
    // Update history record
    setSalesHistory(prev => {
      const updated = prev.map(saleRec => {
        if (saleRec.transactionId !== transactionId) return saleRec;
        const updatedItems = saleRec.items.map(it => it.id === productId ? { ...it, returnedQuantity: (Number(it.returnedQuantity || 0) + qty) } : it);
        const allReturned = updatedItems.every(it => Number(it.returnedQuantity || 0) >= Number(it.quantity || 0));
        const newStatus = allReturned ? 'returned' : 'partially-returned';
        return { ...saleRec, items: updatedItems, status: newStatus, updatedAt: new Date().toISOString(), returnedAt: allReturned ? new Date().toISOString() : saleRec.returnedAt };
      });
      localStorage.setItem('pos-sales-history', JSON.stringify(updated));
      return updated;
    });
    // Restock the product
    adjustProductStock(productId, quantityToReturn);
  };

  // Open adjustment modal for a given product
  const openAdjustmentModal = (productId) => {
    setAdjustmentProductId(productId);
    setAdjustmentQty('1');
    setAdjustmentReason('');
    setShowAdjustmentModal(true);
  };

  // Confirm adjustment: subtract damaged qty from stock with a reason
  const confirmAdjustment = () => {
    if (!adjustmentProductId) return;
    const product = products.find(p => p.id === adjustmentProductId);
    if (!product) return;
    const currentQty = Number(product.quantity || 0);
    const qty = Number(adjustmentQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      toast.warning('Enter a valid damaged quantity.');
      return;
    }
    if (!adjustmentReason.trim()) {
      toast.warning('Please provide a reason for the adjustment.');
      return;
    }
    if (qty > currentQty) {
      toast.warning('Damaged quantity cannot exceed current stock.');
      return;
    }
    adjustProductStock(adjustmentProductId, -qty);
    setShowAdjustmentModal(false);
  };

  // Customer Return Functions
  const openCustomerReturnModal = () => {
    setCustomerReturnData({
      transactionId: '',
      returnReason: '',
      customReason: '',
      items: []
    });
    setReturnQuantities({});
    setShowCustomerReturnModal(true);
    
    // Auto-focus on Transaction ID field after modal opens
    setTimeout(() => {
      if (transactionIdRef.current) {
        transactionIdRef.current.focus();
        transactionIdRef.current.select(); // Select all text for easy replacement
      }
    }, 300); // Increased delay to ensure modal is fully rendered
  };

  const searchTransactionForReturn = async (transactionId) => {
    if (!transactionId.trim()) return;
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/backend/Api'}/pos_return_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_transaction_details',
          transaction_id: transactionId.trim()
        })
      });
      
      const data = await response.json();
      if (data?.success && data?.transaction) {
        const transaction = data.transaction;
        const items = transaction.items || [];
        
        // Initialize return quantities to 0 (user needs to set what they want to return)
        const initialQuantities = {};
        items.forEach(item => {
          initialQuantities[item.product_id] = 0;
        });
        setReturnQuantities(initialQuantities);
        
        setCustomerReturnData(prev => ({
          ...prev,
          transactionId: transactionId.trim(),
          items: items
        }));



        if (items.length > 0) {
          toast.success(`Found ${items.length} item(s) in transaction`);
        } else {
          toast.warning('Transaction found but has no items');
        }
        
        // Now validate location AFTER loading items
        // This allows user to see what they're trying to return
        const validationResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/backend/Api'}/pos_return_api.php`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'validate_return_terminal',
            transaction_id: transactionId.trim(),
            current_location: locationName,
            current_terminal: terminalName
          })
        });
        
        const validationResult = await validationResponse.json();
        
        if (!validationResult.success) {
          // Show warning but don't block - let them see the items
          toast.warning(`⚠️ Location mismatch: This was sold at ${validationResult.data?.original_location || 'another location'}. Returns should be processed there.`, {
            autoClose: false
          });
        }
        
      } else {
        toast.error('Transaction not found. Please check the transaction ID.');
        setCustomerReturnData(prev => ({ ...prev, items: [] }));
      }
    } catch (error) {
      console.error('Error searching transaction:', error);
      toast.error('Error searching transaction. Please try again.');
    }
  };

  const loadRecentTransactions = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/backend/Api'}/pos_return_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_recent_transactions',
          limit: 20,
          location_name: locationName
        })
      });
      
      const data = await response.json();
      if (data?.success && Array.isArray(data.data)) {
        setRecentTransactions(data.data);
        setShowRecentTransactions(true);

      } else {

        setRecentTransactions([]);
      }
    } catch (error) {
      console.error('Error loading recent transactions:', error);
      setRecentTransactions([]);
    }
  };

  const processCustomerReturn = async () => {
    if (!customerReturnData.transactionId || !customerReturnData.returnReason.trim()) {
      toast.warning('Please enter transaction ID and return reason.');
      return;
    }
    
    // Use custom reason if "Other" is selected
    const finalReason = customerReturnData.returnReason === 'Other' 
      ? customerReturnData.customReason.trim() 
      : customerReturnData.returnReason;
    
    if (!finalReason) {
      toast.warning('Please enter a return reason.');
      return;
    }
    
    if (customerReturnData.items.length === 0) {
      toast.warning('No items found for this transaction.');
      return;
    }

    // Check if there are any items with return quantity > 0
    const hasReturnItems = customerReturnData.items.some(item => {
      const returnQty = returnQuantities[item.product_id] || 0;
      return returnQty > 0;
    });

    if (!hasReturnItems) {
      toast.warning('Please specify quantities to return for at least one item.');
      return;
    }

    // VALIDATION: Check if return is being processed at the correct terminal
    try {
      const validationResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/backend/Api'}/pos_return_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'validate_return_terminal',
          transaction_id: customerReturnData.transactionId,
          current_location: locationName,
          current_terminal: terminalName
        })
      });

      const validationResult = await validationResponse.json();
      
      if (!validationResult.success) {
        // Show alert dialog for wrong terminal
        setShowWrongTerminalAlert(true);
        return;
      }
      
      // If validation passes, continue with return processing

    } catch (error) {
      console.error('Error validating return terminal:', error);
      toast.error('Unable to validate return terminal. Please try again.');
      return;
    }

    // Count items with return quantity > 0
    const returnItemsCount = customerReturnData.items.filter(item => {
      const returnQty = returnQuantities[item.product_id] || 0;
      return returnQty > 0;
    }).length;

    // Close the main customer return modal first
    setShowCustomerReturnModal(false);
    
    // Then show the confirmation modal
    setShowReturnConfirmModal(true);
  };

  const confirmProcessReturn = async () => {
    try {
      // Use custom reason if "Other" is selected
      const finalReason = customerReturnData.returnReason === 'Other' 
        ? customerReturnData.customReason.trim() 
        : customerReturnData.returnReason;

      const returnItemsCount = customerReturnData.items.filter(item => {
        const returnQty = returnQuantities[item.product_id] || 0;
        return returnQty > 0;
      }).length;

      const returnNumber = `RET${Date.now().toString().slice(-6)}`;
      const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
      
      const returnData = {
        return_number: returnNumber,
        original_transaction_id: customerReturnData.transactionId,
        return_reason: finalReason,
        location_name: locationName,
        terminal_name: terminalName,
        processed_by: userData.username || 'Admin',
        items: customerReturnData.items.map(item => {
          const returnQty = returnQuantities[item.product_id] || 0;
          return {
            product_id: item.product_id || item.id,
            product_name: item.name || item.product_name,
            return_quantity: returnQty,
            unit_price: item.price,
            total_amount: item.price * returnQty,
            condition: 'good' // Default condition
          };
        }).filter(item => item.return_quantity > 0) // Only include items with return quantity > 0
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/backend/Api'}/pos_return_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'process_customer_return',
          ...returnData
        })
      });

      const result = await response.json();
      if (result.success) {
        toast.success(
          <div>
            <div className="font-bold text-lg">Return Submitted Successfully!</div>
            <div className="mt-2">
              <div><strong>Return Number:</strong> {returnNumber}</div>
              <div><strong>Status:</strong> Pending Admin Approval</div>
            </div>
            <div className="mt-3 text-sm">
              <div>✅ Return request created</div>
              <div>⏳ Waiting for admin approval</div>
              <div>📋 Check Return Management for status</div>
              <div className="mt-2 text-orange-600">Stock will be restored only after admin approval.</div>
            </div>
          </div>,
          { autoClose: 8000 }
        );
        setShowCustomerReturnModal(false);
        setShowReturnConfirmModal(false);
        setCustomerReturnData({ transactionId: '', returnReason: '', customReason: '', items: [] });
        setReturnQuantities({});
        
        // Clear products after return - user must manually reload
        setProducts([]);
        await loadRecentTransactions(); // Refresh recent transactions to show updated data
        
        // Trigger notification event for admin panel
        window.dispatchEvent(new CustomEvent('returnCreated', {
          detail: {
            type: 'new_return',
            returnNumber: returnNumber,
            amount: result.total_amount,
            location: returnData.location_name
          }
        }));
        
        // Update local sales history if it exists
        const localHistory = JSON.parse(localStorage.getItem('pos-sales-history') || '[]');
        const updatedHistory = localHistory.map(sale => {
          if (sale.transactionId === customerReturnData.transactionId) {
            // Mark items as returned in local history
            const updatedItems = sale.items.map(item => {
              const returnQty = returnQuantities[item.id] || 0;
              if (returnQty > 0) {
                return { ...item, returnedQuantity: (item.returnedQuantity || 0) + returnQty };
              }
              return item;
            });
            
            // Check if all items are returned
            const allReturned = updatedItems.every(item => 
              (item.returnedQuantity || 0) >= (item.quantity || 0)
            );
            
            return {
              ...sale,
              items: updatedItems,
              status: allReturned ? 'returned' : 'partially-returned',
              returnedAt: allReturned ? new Date().toISOString() : sale.returnedAt
            };
          }
          return sale;
        });
        
        localStorage.setItem('pos-sales-history', JSON.stringify(updatedHistory));
        setSalesHistory(updatedHistory);
        
      } else {
        toast.error(`Failed to process return: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error processing return:', error);
      toast.error('Error processing return. Please try again.');
    }
  };


  // Fetch today's total sales for current cashier
  const fetchTodaySales = async () => {

    setTodaySalesData(prev => ({ ...prev, loading: true }));
    
    try {
      const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
      const username = 'all'; // Always show all sales for today




      const requestBody = {
        action: 'get_today_sales',
        cashier_username: username,
        location_name: locationName,
        terminal_name: terminalName
      };

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/backend/Api'}/sales_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });


      const data = await response.json();

      if (data?.success && data?.data) {
        const salesData = data.data;

        const newSalesData = {
          totalSales: Number(salesData.total_sales || 0),
          totalTransactions: Number(salesData.total_transactions || 0),
          cashSales: Number(salesData.cash_sales || 0),
          gcashSales: Number(salesData.gcash_sales || 0),
          totalDiscount: Number(salesData.total_discount || 0),
          loading: false
        };

        setTodaySalesData(newSalesData);
      } else {

        // Set default values if no data found
        setTodaySalesData({
          totalSales: 0,
          totalTransactions: 0,
          cashSales: 0,
          gcashSales: 0,
          totalDiscount: 0,
          loading: false
        });
      }
    } catch (error) {
      console.error('❌ Error fetching today sales:', error);
      setTodaySalesData({
        totalSales: 0,
        totalTransactions: 0,
        cashSales: 0,
        gcashSales: 0,
        totalDiscount: 0,
        loading: false
      });
    }
  };

  // Logout functions
  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = async () => {
    try {
      // Get user data from sessionStorage
      const userData = sessionStorage.getItem('user_data');
      const empId = userData ? JSON.parse(userData).user_id : null;


      // Validate empId before attempting logout
      if (!empId) {
        console.warn('No employee ID found, clearing local session only');
        toast.warning('Session expired. Redirecting to login...');
      } else {
        try {
          // Call logout API with credentials to include session cookies
          const logoutUrl = getApiUrl('login.php');

          const response = await fetch(logoutUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include', // Include session cookies
            body: JSON.stringify({ 
              action: 'logout',
              emp_id: empId 
            })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const result = await response.json();

          if (result.success) {

            toast.success('Logged out successfully');
          } else {
            console.warn('⚠️ POS logout warning:', result.message);
            toast.warning('Logged out locally');
          }
        } catch (fetchError) {
          console.error('❌ Logout API call failed:', fetchError);

          toast.warning('Logged out locally');
        }
      }
    } catch (error) {
      console.error('❌ POS logout error:', error);
      toast.warning('Logged out locally');
    } finally {
      // Always clear session and redirect regardless of API call result

      sessionStorage.removeItem('user_data');
      localStorage.clear(); // Clear any other stored data

      router.push('/');
    }
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  // ============= CREDENTIALS UPDATE FUNCTIONS =============
  
  const openCredentialsModal = async () => {
    try {
      // Fetch current user data
      const response = await apiHandler.getCurrentUser();
       // Debug log
      
      if (response.success && response.data) {
        setCredentialsData({
          fullName: response.data.fullName || '',
          email: response.data.email || '',
          username: response.data.username || '',
          newPassword: '',
          confirmPassword: ''
        });
         // Debug log
      } else {
        // If API fails, use fallback data
        setCredentialsData({
          fullName: 'Junel Cajoles',
          email: 'baternajunel089@gmail.com',
          username: 'jepox',
          newPassword: '',
          confirmPassword: ''
        });
         // Debug log
      }
      setShowCredentialsModal(true);
      setCredentialsFocusIndex(0);
    } catch (error) {
      console.error('Error fetching user data:', error);
      // Set real cashier data as fallback placeholder
      setCredentialsData({
        fullName: 'Junel Cajoles',
        email: 'baternajunel089@gmail.com',
        username: 'jepox',
        newPassword: '',
        confirmPassword: ''
      });
      setShowCredentialsModal(true);
      setCredentialsFocusIndex(0);
    }
  };

  const closeCredentialsModal = () => {
    setShowCredentialsModal(false);
    setCredentialsData({
      fullName: '',
      email: '',
      username: '',
      newPassword: '',
      confirmPassword: ''
    });
    setCredentialsFocusIndex(0);
    setIsUpdatingCredentials(false);
  };

  const updateCredentialsField = (field, value) => {
    setCredentialsData(prev => {
      const newData = {
        ...prev,
        [field]: value
      };
       // Debug log
      return newData;
    });
  };

  const validateCredentialsForm = () => {
    const { fullName, email, username, newPassword, confirmPassword } = credentialsData;
    
    if (!fullName.trim()) {
      return 'Full name is required';
    }
    
    if (!email.trim()) {
      return 'Email is required';
    }
    
    if (!email.includes('@')) {
      return 'Please enter a valid email address';
    }
    
    if (!username.trim()) {
      return 'Username is required';
    }
    
    if (username.length < 3 || username.length > 20) {
      return 'Username must be 3-20 characters long';
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      return 'Username can only contain letters, numbers, and underscores';
    }
    
    if (newPassword && newPassword.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    
    if (newPassword && newPassword !== confirmPassword) {
      return 'Passwords do not match';
    }
    
    return null;
  };

  const saveCredentials = async () => {
    const validationError = validateCredentialsForm();
    if (validationError) {
      toast.warning(validationError);
      return;
    }
    
    setIsUpdatingCredentials(true);
    
    try {
      // Update current user's info (name, email, username)
      const userData = {
        fullName: credentialsData.fullName.trim(),
        email: credentialsData.email.trim(),
        username: credentialsData.username.trim()
      };
      
      const userResponse = await apiHandler.updateCurrentUserInfo(userData);
      
      if (!userResponse.success) {
        throw new Error(userResponse.message || 'Failed to update your information');
      }
      
      // Update password if provided
      if (credentialsData.newPassword.trim()) {
        const passwordData = {
          newPassword: credentialsData.newPassword.trim()
        };
        
        const passwordResponse = await apiHandler.changeCurrentUserPassword(passwordData);
        
        if (!passwordResponse.success) {
          throw new Error(passwordResponse.message || 'Failed to update password');
        }
      }
      
      toast.success('Your credentials updated successfully!');
      closeCredentialsModal();
      
    } catch (error) {
      console.error('Error updating credentials:', error);
      toast.error('Error updating credentials: ' + error.message);
    } finally {
      setIsUpdatingCredentials(false);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    
    // Show payment modal if payment method not selected yet
    if (!paymentMethod) {
      setShowPaymentModal(true);
      setPaymentModalFocusIndex(0);
      return;
    }
    
    // Prevent multiple simultaneous executions
    if (isCheckoutProcessing) return;
    setIsCheckoutProcessing(true);
    
    // Validate payment - Split payment or single payment
    if (useSplitPayment || paymentMethod === 'split') {
      // Split payment validation
      const cash = parseFloat(cashAmount) || 0;
      const gcash = parseFloat(gcashAmount) || 0;
      const totalPaid = cash + gcash;
      
      if (totalPaid < payableTotal) {
        toast.warning(`Insufficient payment! Total needed: ₱${payableTotal.toFixed(2)}, Paid: ₱${totalPaid.toFixed(2)}`);
        setIsCheckoutProcessing(false);
        return;
      }
      
      if (gcash > 0 && !referenceNumber.trim()) {
        toast.warning('Please enter GCash reference number for GCash payment.');
        setIsCheckoutProcessing(false);
        return;
      }
    } else {
      // Single payment validation
      if (!amountPaid || isNaN(amountPaid) || parseFloat(amountPaid) < payableTotal) {
        toast.warning('Please enter a valid amount that covers the total cost.');
        setIsCheckoutProcessing(false);
        return;
      }
      
      if (paymentMethod === 'gcash' && !referenceNumber.trim()) {
        toast.warning('Please enter GCash reference number.');
        setIsCheckoutProcessing(false);
        return;
      }
    }
    
    // Calculate discount amount to ensure it's accurate BEFORE printing
    let finalDiscountAmount = discountAmount || 0;
    if (discountType && finalDiscountAmount === 0 && total > 0) {
      let rate = 0;
      const dbOption = discountOptions.find(o => String(o.type).toLowerCase() === String(discountType).toLowerCase());
      if (dbOption && Number.isFinite(dbOption.rate) && dbOption.rate > 0 && dbOption.rate < 1.01) {
        rate = dbOption.rate;
        if (rate > 1) rate = rate / 100;
      } else {
        rate = 0.20; // Fallback: 20% for PWD or Senior
      }
      finalDiscountAmount = Number((total * rate).toFixed(2));
    }
    
    // Try to print receipt (but don&apos;t block checkout if it fails)
    const printResult = await printReceipt();

    // Persist this sale in local history regardless of print success
    const saleRecord = {
      transactionId: printResult?.transactionId,
      date: new Date().toLocaleDateString('en-CA'), // Use consistent YYYY-MM-DD format
      time: new Date().toLocaleTimeString(),
      items: cart.map(item => ({
        id: item.product.id,
        name: item.product.name,
        quantity: item.quantity,
        price: item.product.price,
        total: item.product.price * item.quantity,
        returnedQuantity: 0,
      })),
      subtotal: total,
      discountType: discountType || null,
      discountAmount: finalDiscountAmount,
      grandTotal: payableTotal,
      paymentMethod: useSplitPayment ? 'SPLIT' : (paymentMethod?.toUpperCase?.() || ''),
      amountPaid: parseFloat(amountPaid),
      change: change,
      gcashRef: (useSplitPayment && referenceNumber) || (paymentMethod === 'gcash' ? referenceNumber : null),
      seniorIdNumber: (discountType && String(discountType).toLowerCase().includes('senior')) ? seniorIdNumber : null,
      seniorName: (discountType && String(discountType).toLowerCase().includes('senior')) ? seniorName : null,
      // Split payment info
      cashAmount: useSplitPayment ? (parseFloat(cashAmount) || 0) : null,
      gcashAmount: useSplitPayment ? (parseFloat(gcashAmount) || 0) : null,
      printStatus: printResult?.success ? 'success' : 'failed',
      status: 'completed',
      createdAt: new Date().toISOString(),
    };
    saveSaleToHistory(saleRecord);

    // Persist to backend regardless of print success
    try {
      await persistSale({ 
        transactionId: printResult?.transactionId, 
        payableTotal, 
        referenceNumber, 
        terminalName, 
        cart, 
        paymentMethod: useSplitPayment ? 'split' : paymentMethod, 
        discountType, 
        discountAmount: finalDiscountAmount,
        // Split payment data
        useSplitPayment,
        cashAmount: useSplitPayment ? (parseFloat(cashAmount) || 0) : null,
        gcashAmount: useSplitPayment ? (parseFloat(gcashAmount) || 0) : null
      });
      
      // Update local product quantities after successful sale

      for (const item of cart) {
        const quantity = Number(item.quantity || 0);

        // Update local product quantity
        updateLocalStock(item.product.id, -quantity);

      }

    } catch (error) {
      console.error('❌ Failed to persist sale:', error);
      toast.warning('Sale completed but failed to update inventory. Please check stock levels manually.');
    }
    
    // Always proceed with checkout regardless of print success
    // Clear cart and reset state
    setCart([]);
    localStorage.removeItem('pos-cart');
    setAmountPaid('');
    setReferenceNumber('');
    setPaymentMethod('');
    setShowRefInput(false);
    // Clear split payment state
    setUseSplitPayment(false);
    setCashAmount('');
    setGcashAmount('');
    setShowThankYouModal(true);
    
    // Reset discount after checkout
    setDiscountAmount(0);
    setDiscountType(null);
    setDiscountSelection('PWD');
    
    // Refresh product list to show updated quantities
    if (barcodeScannedProduct) {
      // If we had a barcode scan, refresh that product's data
      handleBarcodeScan(barcodeScannedProduct.barcode || barcodeScannedProduct.product_id);
    } else {
      // Clear products after checkout - user must manually reload

      setProducts([]);
    }
    
    // Show success notification for stock update
    const totalItems = cart.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    if (typeof window !== 'undefined' && window.toast) {
      window.toast.success(`Checkout complete! ${totalItems} items sold, inventory updated.`);
    }
    
    // Show appropriate message based on print success
    if (printResult.success) {

    } else {

      // Optionally show a warning to the user about printing failure
      setTimeout(() => {
        toast.warning(
          <div>
            <div className="font-bold">Transaction completed but printing failed</div>
            <div className="mt-1 text-sm">{printResult.message}</div>
            <div className="mt-1 text-sm">Check the receipts folder for saved receipt.</div>
          </div>,
          { autoClose: 6000 }
        );
      }, 2500); // Show after thank you modal
    }
    
    // Reset processing state
    setIsCheckoutProcessing(false);
  };

  useEffect(() => {
    if (showThankYouModal) {
      setTimeout(() => {
        setShowThankYouModal(false);
      }, 2000);
    }
  }, [showThankYouModal]);

  // Keep barcode scanner focused
  useEffect(() => {
    const barcodeInput = document.getElementById('barcode-scanner');
    if (barcodeInput) {
      barcodeInput.focus();
    }
  }, [products, locationName]);

  return (
    <>
      <style jsx>{`
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        /* Set main container zoom to 80% */
        .pos-main-container {
          transform: scale(0.80);
          transform-origin: top left;
          width: 125%; /* Compensate for the scale reduction */
          height: 125%; /* Compensate for the scale reduction */
        }
        /* Ensure proper scaling for all elements */
        * {
          box-sizing: border-box;
        }
      `}</style>
      <div className="flex h-screen bg-gray-50 pos-main-container">
        {/* Printer Status Indicator */}
        <div className="fixed top-4 right-4 z-50 flex gap-2">
          <button
            onClick={() => {
              const ip = prompt('Enter Printer IP Address:', localStorage.getItem('printerIP') || '');
              if (ip) {
                localStorage.setItem('printerIP', ip);
                const port = prompt('Enter Printer Port (default: 9100):', localStorage.getItem('printerPort') || '9100');
                if (port) localStorage.setItem('printerPort', port);
                toast.success(`Printer configured: ${ip}:${port}`);
              }
            }}
            className="px-3 py-2 bg-purple-100 text-purple-800 border border-purple-300 hover:bg-purple-200 rounded-lg text-sm font-medium shadow-lg cursor-pointer transition-all duration-200"
            title="Configure printer IP"
          >
            ⚙️ Setup
          </button>
          <div 
            className={`px-3 py-2 rounded-lg text-sm font-medium shadow-lg cursor-pointer transition-all duration-200 hover:shadow-xl ${
              printerStatus === 'ready' ? 'bg-blue-100 text-blue-800 border border-blue-300 hover:bg-blue-200' :
              'bg-gray-100 text-gray-800 border border-gray-300 hover:bg-gray-200'
            } ${isTestingPrinter ? 'animate-pulse' : ''}`}
            onClick={() => {
              // Test printer (browser print)
                testPrinter();
            }}
            title="Click to test printer"
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">
                {isTestingPrinter ? '⏳' : '🖨️'}
              </span>
              <span>
                {isTestingPrinter ? 'Testing...' : 'Print Ready'}
              </span>
            </div>
          </div>
        </div>
        
        <main className="flex-1 p-8 pb-24 overflow-y-auto bg-white transition-all duration-300 ease-in-out">
          {/* Layout */}
          <div className="flex flex-col md:flex-row flex-1">
            {/* Left Side - Product Search & Selection */}
            <div className="md:w-[85%] p-4 border-r">
              {/* Section 0: Search Bar */}
              <div className="mb-4">
                <div className="relative">
                  <div className="flex gap-2 mb-2">
                    <div className="flex-1 relative">
                      <input
                        id="search-input"
                        type="text"
                        placeholder={`Search products in ${locationName}...`}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setShowSuggestions(searchSuggestions.length > 0)}
                        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                        onKeyDown={e => { 
                          if (e.key === 'Enter') { 
                            const v = (e.currentTarget.value || '').trim();
                            const isBarcode = /^\d{4,}$/.test(v);
                            if (isBarcode) {
                              e.preventDefault();
                              handleBarcodeScan(v);
                              return;
                            }
                            // Name search (for products without barcodes)
                            e.preventDefault();
                            searchProductsByName(v);
                            setShowSuggestions(false);
                            return;
                          } 
                          if (e.key === 'ArrowUp') { 
                            e.target.blur(); 
                            setNavigationIndex(1); 
                          } 
                        }}
                        className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base font-medium transition-all duration-200 text-gray-900 placeholder-gray-500 ${
                          navigationIndex === 0 ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
                        }`}
                      />
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                          title="Clear search"
                        >
                          ✕
                        </button>
                      )}
                      
                      {/* Search Suggestions Dropdown */}
                      {showSuggestions && searchSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border-2 border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                          {searchSuggestions.map((suggestion, index) => (
                            <div
                              key={suggestion.id}
                              className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                              onClick={() => {
                                setSearchTerm(suggestion.name);
                                setShowSuggestions(false);
                                // Auto-search the selected product
                                searchProductsByName(suggestion.name);
                              }}
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <div className="font-semibold text-gray-800 text-sm">
                                    {suggestion.name}
                                  </div>
                                  {suggestion.description && (
                                    <div className="text-xs text-gray-600 mt-1 line-clamp-2">
                                      {suggestion.description}
                                    </div>
                                  )}
                                  <div className="text-xs text-blue-600 mt-1">
                                    {suggestion.category} • ₱{suggestion.price.toFixed(2)} • Stock: {suggestion.quantity}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  <button
                    onClick={() => {
                      const v = (searchTerm || '').trim();
                      if (v) {
                        if (/^\d{4,}$/.test(v)) {
                          handleBarcodeScan(v);
                        } else {
                          searchProductsByName(v);
                        }
                      } else {
                        // Load all products when search is empty
                        loadAllProducts();
                      }
                    }}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-bold shadow-lg hover:shadow-xl"
                    title="Search (Enter) or scan barcode; empty to load all products"
                  >
                    🔍 Search
                  </button>
                  </div>
                </div>
                
                {searchTerm && /^\d{4,}$/.test(searchTerm) && (
                  <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded-lg text-sm font-medium text-green-800 flex items-center gap-2">
                    <span className="text-lg">📱</span>
                    <span>Barcode detected in search - Press Enter to scan</span>
                  </div>
                )}
              </div>

              {/* Hidden barcode scanner input */}
              <input
                type="text"
                id="barcode-scanner"
                className="absolute -top-9999 left-0 opacity-0"
                autoFocus
                onKeyDown={(e) => {
                  // Only process printable characters - barcode scanner doesn't send Enter
                  if (e.key.length === 1 && e.key.charCodeAt(0) >= 32) {
                    handleAutoScan(e.key);
                  }
                }}
                onInput={(e) => {
                  // This fires after barcode is scanned and handleAutoScan processes it
                  setTimeout(() => {
                    const product = products.find(p => p.id === barcodeScannedProduct?.id || p.id === barcodeScannedProduct?.product_id);
                    if (product) {
                      const input = document.getElementById(`qty-input-${product.id}`);
                      if (input) {
                        const currentValue = parseInt(input.value) || 1;
                        const newValue = Math.max(1, currentValue + 1);
                        input.value = newValue;
                        // Update state
                        setQuantityInputs(prev => ({
                          ...prev,
                          [product.id]: newValue
                        }));
                      }
                    }
                  }, 100);
                }}
                placeholder="Barcode scanner input"
              />

              {/* Terminal Selection */}
              <div className="mb-4">
                <div className="mb-3 flex items-center gap-3">
                  <label className="text-base font-semibold text-gray-800">Terminal:</label>
                  <select
                    value={terminalName}
                    onChange={(e) => { 
                      setTerminalName(e.target.value); 
                      if (typeof window !== 'undefined') localStorage.setItem('pos-terminal', e.target.value);
                    }}
                    className="px-3 py-2 border-2 border-gray-300 rounded-lg text-base font-medium bg-white hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 w-64"
                  >
                    <option value="Convenience POS">Convenience POS</option>
                    <option value="Pharmacy POS">Pharmacy POS</option>
                  </select>
                </div>
                <div className="mb-3 flex items-center gap-3">
                  <label className="text-base font-semibold text-gray-800">Location:</label>
                  <span className="px-4 py-2 bg-green-500 text-white rounded-lg text-base font-bold shadow-md">
                    {locationName} (Auto-detected)
                  </span>
                </div>
              </div>

              {/* Barcode Scan Success Banner */}
              {barcodeScannedProduct && (
                <div className="mb-4 p-3 bg-gray-100 border border-gray-300 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">✅</span>
                      <div>
                        <div className="font-semibold text-gray-800">
                          Product Found via Barcode Scan
                        </div>
                        <div className="text-sm text-gray-700">
                          {barcodeScannedProduct.name || barcodeScannedProduct.product_name} - 
                          Stock: {barcodeScannedProduct.quantity || barcodeScannedProduct.available_quantity || barcodeScannedProduct.stock} - 
                          Price: ₱{(() => {
                            const unitPrice = Number(barcodeScannedProduct.unit_price) || 0;
                            const srp = Number(barcodeScannedProduct.srp) || 0;
                            const price = (unitPrice > 0) ? unitPrice : (srp > 0 ? srp : (Number(barcodeScannedProduct.price) || 0));
                            return price.toFixed(2);
                          })()}
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          💡 Press <kbd className="px-1 py-0.5 bg-white rounded border text-xs">B</kbd> to quickly add to cart, or use the Add button
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setBarcodeScannedProduct(null)}
                      className="text-gray-500 hover:text-gray-700 text-xl"
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}

              {/* Terminal & Location Indicator */}
              <div className="mb-4 p-4 bg-gradient-to-r from-blue-100 to-blue-200 border-2 border-blue-400 rounded-xl shadow-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🖥️</span>
                  <div>
                    <div className="text-lg font-bold text-blue-900">
                      Terminal: <span className="text-blue-700">{terminalName}</span> → Location: <span className="text-green-700">{locationName}</span>
                    </div>
                    <div className="text-sm font-medium text-blue-800 mt-1">
                      🔍 Search and barcode scanning will only show products from <strong>{locationName}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* FIFO Notice Banner */}
              <div className="mb-4 p-3 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-400 rounded-xl shadow-md">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📅</span>
                  <div>
                    <div className="text-base font-bold text-green-900">
                      FIFO System Active - Products Sorted by Expiration Date
                    </div>
                    <div className="text-sm font-medium text-green-800 mt-1">
                      ⚠️ <strong>Products expiring soonest appear first</strong> - This ensures older stock is sold before newer stock to minimize waste
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 1: Product List (A-Z) */}
              <div ref={productListRef} className="overflow-y-auto flex-1 scrollbar-hide" style={{ maxHeight: '400px' }}>
                <table className="w-full min-w-max">
                  <thead className="sticky top-0 z-10">
                    <tr className="text-xs font-semibold text-gray-700 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200 shadow-sm">
                      <th className="px-4 py-3 text-left">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">📦</span>
                          Product name
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-gray-500">📅</span>
                          Expiration
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-gray-500">📊</span>
                          Stock
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-gray-500">💰</span>
                          Price
                        </div>
                      </th>
                      <th className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-gray-500">💊</span>
                          Prescription
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right">Qty</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedFilteredProducts.map((product, index) => (
                      <tr
                        ref={el => productItemRefs.current[index] = el}
                        key={`${product.id}-${index}`}
                        className={`transition-all duration-200 hover:bg-gray-50 ${
                          navigationIndex === 1 && selectedIndex === index ? 'ring-2 ring-gray-500 bg-gray-50 shadow-sm' : ''
                        } ${
                          barcodeScannedProduct && (barcodeScannedProduct.id === product.id || barcodeScannedProduct.product_id === product.id) 
                            ? 'bg-blue-50 border-l-4 border-l-blue-500 shadow-sm' 
                            : ''
                        }`}
                      >
                        <td className="px-4 py-4">
                          <div className="min-w-0 truncate font-medium flex items-center gap-2">
                            {barcodeScannedProduct && (barcodeScannedProduct.id === product.id || barcodeScannedProduct.product_id === product.id) && (
                              <span className="text-blue-600 text-sm">📱</span>
                            )}
                            <span className="text-gray-800">{product.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center text-gray-700">
                          {(() => {
                            if (!product.expiration_date) return <span className="text-gray-400 text-xs">N/A</span>;
                            
                            const expiryDate = new Date(product.expiration_date);
                            const today = new Date();
                            const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                            
                            // Format date
                            const formattedDate = expiryDate.toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric', 
                              year: 'numeric' 
                            });
                            
                            // Color coding based on days until expiry
                            let colorClass = 'bg-green-100 text-green-800 border-green-300';
                            let warningIcon = '✅';
                            
                            if (daysUntilExpiry < 0) {
                              colorClass = 'bg-red-200 text-red-900 border-red-400';
                              warningIcon = '⚠️';
                            } else if (daysUntilExpiry <= 7) {
                              colorClass = 'bg-red-100 text-red-800 border-red-300';
                              warningIcon = '🔴';
                            } else if (daysUntilExpiry <= 30) {
                              colorClass = 'bg-orange-100 text-orange-800 border-orange-300';
                              warningIcon = '⚠️';
                            } else if (daysUntilExpiry <= 60) {
                              colorClass = 'bg-yellow-100 text-yellow-800 border-yellow-300';
                              warningIcon = '⏰';
                            }
                            
                            return (
                              <div className="flex flex-col items-center gap-1">
                                <span className={`px-2 py-1 rounded-full text-xs font-bold border ${colorClass}`}>
                                  {warningIcon} {formattedDate}
                                </span>
                                <span className="text-xs text-gray-600">
                                  {daysUntilExpiry < 0 
                                    ? `Expired ${Math.abs(daysUntilExpiry)}d ago` 
                                    : `${daysUntilExpiry}d left`}
                                </span>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-4 text-right text-gray-700 font-medium">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            (product.quantity || 0) > 10 ? 'bg-gray-200 text-gray-800' :
                            (product.quantity || 0) > 5 ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {product.quantity || 0}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right text-gray-800 font-semibold text-lg">
                          ₱{(product.price || 0).toFixed(2)}
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            product.requires_prescription ? 'bg-red-100 text-red-800 border border-red-300' : 'bg-green-100 text-green-800 border border-green-300'
                          }`}>
                            {product.requires_prescription ? 'YES' : 'NO'}
                          </span>
                          {product.is_bulk && (
                            <div className="text-xs text-blue-600 font-medium mt-1">
                              📦 Bulk Product
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                const currentQty = quantityInputs[product.id] || 1;
                                if (currentQty > 1) {
                                  setQuantityInputs(prev => ({ ...prev, [product.id]: currentQty - 1 }));
                                }
                              }}
                              className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-l flex items-center justify-center text-base font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-200"
                              disabled={(quantityInputs[product.id] || 1) <= 1}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min="1"
                              max={product.quantity || 9999}
                              id={`qty-input-${product.id}`}
                              value={quantityInputs[product.id] !== undefined ? Math.max(1, quantityInputs[product.id]) : 1}
                              onChange={(e) => {
                                const rawValue = e.target.value;
                                // If empty, set to 1
                                if (rawValue === '' || rawValue === null || rawValue === undefined) {
                                  setQuantityInputs(prev => ({ ...prev, [product.id]: 1 }));
                                  return;
                                }
                                const value = parseInt(rawValue);
                                if (isNaN(value) || value < 1) {
                                  setQuantityInputs(prev => ({ ...prev, [product.id]: 1 }));
                                  return;
                                }
                                const clampedValue = Math.max(1, Math.min(value, product.quantity || 9999));
                                setQuantityInputs(prev => ({ ...prev, [product.id]: clampedValue }));
                              }}
                              onBlur={(e) => {
                                // On blur, ensure there's always a valid value
                                const value = parseInt(e.target.value);
                                if (isNaN(value) || value < 1) {
                                  setQuantityInputs(prev => ({ ...prev, [product.id]: 1 }));
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  e.stopPropagation(); // Prevent global handler from firing
                                  addToCart(product, quantityInputs[product.id] || 1);
                                }
                              }}
                              className="w-20 px-2 py-1 border-2 border-gray-300 rounded-none text-center text-gray-900 font-bold text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                            />
                            <button
                              onClick={() => {
                                const currentQty = quantityInputs[product.id] || 1;
                                if (currentQty < (product.quantity || 9999)) {
                                  setQuantityInputs(prev => ({ ...prev, [product.id]: currentQty + 1 }));
                                }
                              }}
                              className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-r flex items-center justify-center text-base font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-200"
                              disabled={(quantityInputs[product.id] || 1) >= (product.quantity || 9999)}
                            >
                              +
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <button
                            onClick={() => {
                              const qty = quantityInputs[product.id] || 1;
                              addToCart(product, qty);
                            }}
                            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-5 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
                          >
                            ➕ Add
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
                             {/* No Products Message */}
               {sortedFilteredProducts.length === 0 && (
                 <div className="text-center py-12 bg-gray-50 border-2 border-gray-300 rounded-xl">
                   <div className="text-8xl mb-6">📦</div>
                   <h3 className="text-2xl font-bold text-gray-800 mb-4">No Products Available</h3>
                   <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
                     {searchTerm 
                       ? `No products match your search "${searchTerm}" in ${locationName}.` 
                       : `No products loaded yet for ${locationName}.`
                     }
                   </p>
                   <div className="text-base font-medium text-gray-600 mb-4">
                     💡 Click the <strong>🔍 Search</strong> button (with empty search) to load all products, or scan a barcode to find specific items.
                   </div>
                   <div className="inline-block px-4 py-2 bg-blue-100 text-blue-800 rounded-lg text-base font-bold border border-blue-300">
                     🖥️ Terminal: <strong>{terminalName}</strong> → Location: <strong>{locationName}</strong>
                   </div>
                 </div>
               )}
            </div>

            {/* Right Side - Cart & Checkout */}
            <div className="md:w-[40%] p-4">
              {/* Cart Display */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-xl p-6 mb-4 shadow-lg">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-800">🛒 Cart ({cart.length} items)</h2>
                  {cart.length > 0 && (
                    <button
                      onClick={() => setShowClearCartModal(true)}
                      className="px-4 py-2 bg-red-600 text-white text-base font-bold rounded-lg hover:bg-red-700 transition-colors shadow-md hover:shadow-lg"
                      title="Clear cart and restore stock"
                    >
                      🗑️ Clear Cart
                    </button>
                  )}
                </div>
                {cart.length === 0 ? (
                  <div className="text-center py-12 bg-white border-2 border-gray-200 rounded-lg">
                    <div className="text-6xl mb-4">🛒</div>
                    <p className="text-xl font-semibold text-gray-600">Your cart is empty</p>
                    <p className="text-sm text-gray-500 mt-2">Add products to get started</p>
                  </div>
                ) : (
                  <ul ref={cartListRef} className="mb-6 max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg">
                    {cart.map((item, idx) => (
                      <li ref={el => cartItemRefs.current[idx] = el} key={item.product.id} className={`p-4 border-b border-gray-200 ${checkoutFocusIndex === 'cart' && cartFocusIndex === idx ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'}`}>
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="text-base font-semibold text-gray-800 mb-2">
                              {item.product.name}
                            </div>
                            
                            {/* Quick Unit Converter */}
                            <div className="flex items-center gap-2 mb-2">
                              <select
                                className="quick-add-dropdown text-xs px-2 py-1 border border-blue-300 rounded bg-blue-50 font-semibold text-blue-700 hover:bg-blue-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                                onChange={(e) => {
                                  const unit = e.target.value;
                                  const currentQty = item.quantity || 1;
                                  let newQty = currentQty;
                                  
                                  if (unit === 'box') {
                                    const isPharmacy = String(terminalName || '').toLowerCase().includes('pharmacy');
                                    if (isPharmacy) {
                                      // Medicine: 1 box = 10 strips × 10 tablets = 100
                                      newQty = currentQty + 100;
                                    } else {
                                      // Convenience: 1 box = 12 pieces
                                      newQty = currentQty + 12;
                                    }
                                  } else if (unit === 'strip') {
                                    // Pharmacy only: 1 strip = 10 tablets
                                    newQty = currentQty + 10;
                                  } else if (unit === '1pc') {
                                    newQty = currentQty + 1;
                                  }
                                  
                                  updateCartItemQuantity(item.product.id, newQty);
                                  e.target.value = ''; // Reset dropdown
                                }}
                                onKeyDown={(e) => {
                                  const isPharmacy = String(terminalName || '').toLowerCase().includes('pharmacy');
                                  if (e.key.toLowerCase() === 'b') {
                                    e.preventDefault();
                                    e.target.value = 'box';
                                    e.target.dispatchEvent(new Event('change', { bubbles: true }));
                                  } else if (e.key.toLowerCase() === 's' && isPharmacy) {
                                    e.preventDefault();
                                    e.target.value = 'strip';
                                    e.target.dispatchEvent(new Event('change', { bubbles: true }));
                                  } else if (e.key.toLowerCase() === 'p') {
                                    e.preventDefault();
                                    e.target.value = '1pc';
                                    e.target.dispatchEvent(new Event('change', { bubbles: true }));
                                  } else if (e.key === 'Tab') {
                                    // Move to Amount Paid field
                                    e.preventDefault();
                                    setCheckoutFocusIndex(0);
                                    setTimeout(() => {
                                      amountPaidRef.current?.focus();
                                    }, 50);
                                  } else if (e.key === 'Enter') {
                                    // Move to Amount Paid field
                                    e.preventDefault();
                                    setCheckoutFocusIndex(0);
                                    setTimeout(() => {
                                      amountPaidRef.current?.focus();
                                    }, 50);
                                  }
                                }}
                                defaultValue=""
                              >
                                <option value="">➕ Quick Add</option>
                                <option value="box">📦 +1 Box (B)</option>
                                {String(terminalName || '').toLowerCase().includes('pharmacy') && (
                                  <option value="strip">📋 +1 Strip (S)</option>
                                )}
                                <option value="1pc">🔢 +1 Piece (P)</option>
                              </select>
                              <span className="text-xs text-gray-500">
                                {String(terminalName || '').toLowerCase().includes('pharmacy') 
                                  ? '(Box=100, Strip=10)' 
                                  : '(Box=12)'}
                              </span>
                            </div>
                            
                            <div className="text-sm text-gray-600">
                              Quantity: <span className="font-bold text-blue-600">x{item.quantity || 1} pcs</span>
                            </div>
                            <div className="text-sm text-gray-600">
                              Total: <span className="font-bold text-green-600">₱{((item.product.price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              className="w-8 h-8 bg-gray-200 rounded-full hover:bg-gray-300 text-gray-700 font-bold text-lg flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-gray-200"
                              onClick={() => updateCartItemQuantity(item.product.id, (item.quantity || 1) - 1)}
                              disabled={(item.quantity || 1) <= 1}
                            >
                              −
                            </button>
                            <span className="text-lg font-bold text-blue-600 min-w-[60px] text-center">
                              x{item.quantity || 1}
                            </span>
                            <button
                              className="w-8 h-8 bg-gray-200 rounded-full hover:bg-gray-300 text-gray-700 font-bold text-lg flex items-center justify-center"
                              onClick={() => updateCartItemQuantity(item.product.id, (item.quantity || 1) + 1)}
                            >
                              +
                            </button>
                            <button
                              className="w-8 h-8 bg-red-200 rounded-full hover:bg-red-300 text-red-700 font-bold text-lg flex items-center justify-center"
                              onClick={() => removeFromCart(item.product.id, item.quantity || 1)}
                              title="Remove item"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                {/* Cart Total & Discount */}
                <div className="bg-white border-2 border-gray-200 rounded-lg p-4 mb-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-lg font-semibold text-gray-700">
                      <span>Subtotal:</span>
                      <span className="text-gray-800">₱{total.toFixed(2)}</span>
                    </div>
                    {discountType && (
                      <div className="flex justify-between items-center text-base font-medium text-orange-700 bg-orange-50 p-2 rounded">
                        <span>Discount ({discountType} {getDiscountRatePercent()}%):</span>
                        <span className="font-bold text-orange-800">-₱{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-xl font-bold text-gray-800 bg-gray-100 p-3 rounded-lg border-2 border-gray-300">
                      <span>Payable Total:</span>
                      <span className="text-green-600">₱{payableTotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
                {/* Payment Form */}
                {cart.length > 0 && (
                  <div className="bg-white border-2 border-gray-200 rounded-lg p-4 space-y-4">
                    <div className="flex gap-3">
                      <button
                        ref={discountBtnRef}
                        type="button"
                        className="px-4 py-2 rounded-lg bg-purple-600 text-white text-base font-bold hover:bg-purple-700 transition-colors shadow-md"
                        onClick={() => { setDiscountSelection(discountType || 'PWD'); setShowDiscountModal(true); }}
                      >
                        💰 Discount (Alt+D)
                      </button>
                      <button
                        type="button"
                        className={`px-4 py-2 rounded-lg text-base font-bold transition-colors shadow-md ${
                          useSplitPayment 
                            ? 'bg-blue-600 text-white hover:bg-blue-700' 
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        onClick={() => {
                          setUseSplitPayment(!useSplitPayment);
                          if (!useSplitPayment) {
                            // Switching to split payment
                            setAmountPaid('');
                            setCashAmount('');
                            setGcashAmount('');
                            setPaymentMethod('split');
                          } else {
                            // Switching back to single payment
                            setCashAmount('');
                            setGcashAmount('');
                            setPaymentMethod('');
                          }
                        }}
                      >
                        {useSplitPayment ? '✓ Split Payment (Alt+S)' : '💳 Split Payment (Alt+S)'}
                      </button>
                    </div>
                    
                    {/* Split Payment Mode */}
                    {useSplitPayment ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">Cash Amount:</label>
                          <input
                            ref={cashAmountRef}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Enter cash amount..."
                            value={cashAmount}
                            onChange={e => setCashAmount(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base font-medium text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">GCash Amount:</label>
                          <input
                            ref={gcashAmountRef}
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Enter GCash amount..."
                            value={gcashAmount}
                            onChange={e => setGcashAmount(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base font-medium text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">GCash Reference (Optional):</label>
                          <input
                            type="text"
                            placeholder="Enter GCash reference..."
                            value={referenceNumber}
                            onChange={e => setReferenceNumber(e.target.value)}
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base font-medium text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                          />
                        </div>
                        {/* Split Payment Summary */}
                        {(cashAmount || gcashAmount) && (
                          <div className={`border-2 rounded-lg p-3 ${
                            (parseFloat(cashAmount) || 0) + (parseFloat(gcashAmount) || 0) < payableTotal 
                              ? 'bg-red-50 border-red-300' 
                              : 'bg-blue-50 border-blue-300'
                          }`}>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm font-medium text-gray-700">
                                <span>Cash:</span>
                                <span>₱{(parseFloat(cashAmount) || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between text-sm font-medium text-gray-700">
                                <span>GCash:</span>
                                <span>₱{(parseFloat(gcashAmount) || 0).toFixed(2)}</span>
                              </div>
                              <div className="border-t-2 border-gray-300 my-2"></div>
                              <div className="flex justify-between text-base font-bold">
                                <span className={(parseFloat(cashAmount) || 0) + (parseFloat(gcashAmount) || 0) < payableTotal ? 'text-red-600' : 'text-blue-700'}>
                                  Total Paid:
                                </span>
                                <span className={(parseFloat(cashAmount) || 0) + (parseFloat(gcashAmount) || 0) < payableTotal ? 'text-red-600' : 'text-blue-700'}>
                                  ₱{((parseFloat(cashAmount) || 0) + (parseFloat(gcashAmount) || 0)).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between text-lg font-bold">
                                <span className={(parseFloat(cashAmount) || 0) + (parseFloat(gcashAmount) || 0) < payableTotal ? 'text-red-600' : 'text-green-600'}>
                                  {(parseFloat(cashAmount) || 0) + (parseFloat(gcashAmount) || 0) < payableTotal ? 'Still Needed:' : 'Change:'}
                                </span>
                                <span className={(parseFloat(cashAmount) || 0) + (parseFloat(gcashAmount) || 0) < payableTotal ? 'text-red-600' : 'text-green-600'}>
                                  ₱{((parseFloat(cashAmount) || 0) + (parseFloat(gcashAmount) || 0) < payableTotal 
                                    ? payableTotal - ((parseFloat(cashAmount) || 0) + (parseFloat(gcashAmount) || 0))
                                    : change
                                  ).toFixed(2)}
                                </span>
                              </div>
                            </div>
                            {(parseFloat(cashAmount) || 0) + (parseFloat(gcashAmount) || 0) < payableTotal && (
                              <div className="text-sm text-red-600 mt-2 font-medium">
                                ⚠️ Insufficient payment! Need ₱{payableTotal.toFixed(2)} total.
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                    <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Amount Paid:</label>
                      <input
                        ref={amountPaidRef}
                        type="text"
                        min="0"
                        placeholder="Enter amount paid..."
                        value={amountPaid}
                        onChange={e => setAmountPaid(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                            // Check if payment method already selected and amount is valid
                            if (paymentMethod && amountPaid && parseFloat(amountPaid) >= payableTotal) {
                              // If payment method already selected and amount is valid
                              if (paymentMethod === 'gcash' && showRefInput && !referenceNumber.trim()) {
                                // GCash needs reference number
                                setCheckoutFocusIndex(3);
                                setTimeout(() => { try { refNumRef.current?.focus?.(); } catch (_) {} }, 0);
                              } else {
                                // All conditions met - execute checkout directly
                                handleCheckout();
                              }
                            } else if (paymentMethod) {
                              // Payment method selected but amount not valid - go to checkout button
                              setCheckoutFocusIndex(4);
                              setTimeout(() => { try { checkoutBtnRef.current?.focus?.(); } catch (_) {} }, 0);
                            } else {
                              // No payment method yet, go to payment selection
                              setCheckoutFocusIndex(1);
                              setTimeout(() => { try { cashBtnRef.current?.focus?.(); } catch (_) {} }, 0);
                            }
                          }
                        }}
                        onBlur={() => { justBlurredAmountPaid.current = true; }}
                        className={`w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base font-medium text-gray-900 placeholder-gray-500 ${checkoutFocusIndex === 0 ? 'ring-2 ring-blue-500 border-blue-500' : 'hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'}`}
                      />
                    </div>
                    
                    {/* Change Display */}
                    {amountPaid && !isNaN(amountPaid) && (
                      <div className={`border-2 rounded-lg p-3 ${
                        parseFloat(amountPaid) < payableTotal 
                          ? 'bg-red-50 border-red-300' 
                          : 'bg-gray-100 border-gray-300'
                      }`}>
                        <div className="flex justify-between items-center text-lg font-bold">
                          <span className={parseFloat(amountPaid) < payableTotal ? 'text-red-600' : 'text-gray-700'}>
                            {parseFloat(amountPaid) < payableTotal ? 'Amount Needed:' : 'Change:'}
                          </span>
                          <span className={parseFloat(amountPaid) < payableTotal ? 'text-red-600' : 'text-green-600'}>
                            ₱{parseFloat(amountPaid) < payableTotal 
                              ? (payableTotal - parseFloat(amountPaid)).toFixed(2)
                              : change.toFixed(2)
                            }
                          </span>
                        </div>
                        {parseFloat(amountPaid) < payableTotal && (
                          <div className="text-sm text-red-600 mt-1 font-medium">
                            ⚠️ Insufficient payment! Please enter at least ₱{payableTotal.toFixed(2)}
                          </div>
                        )}
                      </div>
                    )}
                    </>
                    )}
                  </div>
                )}
              </div>
              {/* Section 2: Checkout Button */}
              <button
                ref={checkoutBtnRef}
                id="checkout-button"
                onClick={handleCheckout}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCheckout();
                  }
                }}
                className={`w-full py-4 rounded-xl text-white text-xl font-bold shadow-lg hover:shadow-xl transition-all duration-200 ${
                  checkoutFocusIndex === 4 ? 'bg-gray-900 ring-4 ring-blue-500' : 'bg-gradient-to-r from-gray-800 to-gray-900 hover:from-gray-900 hover:to-black'
                }`}
              >
                🛒 CHECKOUT - ₱{payableTotal.toFixed(2)}
              </button>
              
              {/* Date and Time Display */}
              <div className="mt-6 flex justify-end">
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-800">
                    {currentTime ? currentTime.toLocaleTimeString('en-US', { 
                      hour12: true, 
                      hour: '2-digit', 
                      minute: '2-digit', 
                      second: '2-digit' 
                    }) : '--:--:--'}
                  </div>
                  <div className="text-sm font-medium text-gray-600">
                    {currentTime ? currentTime.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : 'Loading...'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
      {/* Fixed Bottom Action Bar */}
      <div className="fixed left-0 right-0 bottom-0 z-40">
        <div className="w-full px-0 py-2">
          <div className="flex gap-4 justify-start pl-2">
            <button
              type="button"
              className="px-3 py-1.5 rounded bg-gray-800 text-white hover:bg-gray-900 text-sm"
              onClick={() => { setShowHistoryModal(true); setHistoryMode('sales'); }}
            >
              History (Alt+H)
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded bg-purple-600 text-white hover:bg-purple-700 text-sm"
              onClick={() => { setDiscountSelection(discountType || 'PWD'); setShowDiscountModal(true); }}
            >
              Discount (Alt+D)
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded bg-red-600 text-white hover:bg-red-700 text-sm"
              onClick={handleLogout}
            >
              Logout (Alt+L)
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 text-sm"
              onClick={openCredentialsModal}
            >
              Update My Credentials (Alt+C)
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 text-sm"
              onClick={openCustomerReturnModal}
            >
              Customer Return (Alt+R)
            </button>
            <button
              type="button"
              className="px-3 py-1.5 rounded bg-green-600 text-white hover:bg-green-700 text-sm"
              onClick={() => {
                setShowTotalSalesModal(true);
                fetchTodaySales();
              }}
            >
              Today&apos;s Sales (Alt+T)
            </button>
          </div>
        </div>
      </div>
      {showHistoryModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-transparent backdrop-blur-sm z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden border-2 border-gray-300">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h3 className="text-xl font-bold">Sales History</h3>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={showTodayOnly}
                    onChange={(e) => setShowTodayOnly(e.target.checked)}
                    className="rounded"
                  />
                  Today Only
                </label>
                <button
                  onClick={clearOldSalesHistory}
                  className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                  title="Clear old sales with wrong date format"
                >
                  Clear Old Data
                </button>
              </div>
            </div>
            <div className="flex">
              <div className="w-1/2 border-r max-h-[70vh] overflow-y-auto">
                {(() => {
                  // Filter sales based on today only checkbox
                  const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format

                  const filteredSales = showTodayOnly 
                    ? salesHistory.filter(sale => {
                        const matches = sale.date === today;

                        return matches;
                      })
                    : salesHistory;

                  if (filteredSales.length === 0) {
                    return (
                      <div className="p-6 text-gray-500 text-center">
                        {showTodayOnly ? "No sales today" : "No sales yet"}
                      </div>
                    );
                  }
                  
                  return (
                    <ul>
                      {filteredSales.map((sale, idx) => (
                      <li
                        key={`${sale.transactionId}-${idx}`}
                        className={`px-4 py-3 border-b cursor-pointer ${historySelectedIndex === idx && historyMode === 'sales' ? 'bg-blue-50 ring-2 ring-blue-300' : ''}`}
                      >
                        <div className="flex justify-between">
                          <div>
                            <div className="font-semibold">{sale.transactionId}</div>
                            <div className="text-xs text-gray-500">{sale.date} {sale.time}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">₱{Number(sale.subtotal || 0).toFixed(2)}</div>
                            <div className={`text-xs ${sale.status === 'returned' ? 'text-red-600' : sale.status === 'partially-returned' ? 'text-orange-600' : 'text-gray-600'}`}>{sale.status || 'completed'}</div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{sale.paymentMethod}</div>
                      </li>
                      ))}
                    </ul>
                  );
                })()}
              </div>
              <div className="w-1/2 max-h-[70vh] overflow-y-auto">
                {(() => {
                  // Get filtered sales for the right panel
                  const filteredSales = showTodayOnly 
                    ? salesHistory.filter(sale => {
                        const today = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD format
                        return sale.date === today;
                      })
                    : salesHistory;
                  
                  return filteredSales[historySelectedIndex] ? (
                  <div className="p-4">
                    <div className="mb-2">
                      <div className="text-sm text-gray-600">Transaction</div>
                      <div className="font-semibold">{filteredSales[historySelectedIndex].transactionId}</div>
                    </div>
                    <div className="mb-2 grid grid-cols-3 gap-2 text-sm text-gray-700">
                      <div>Date: {filteredSales[historySelectedIndex].date}</div>
                      <div>Time: {filteredSales[historySelectedIndex].time}</div>
                      <div>Payment: {filteredSales[historySelectedIndex].paymentMethod}</div>
                    </div>
                    <div className="border rounded-lg">
                      <div className="px-3 py-2 font-semibold bg-gray-50">Items</div>
                      <ul>
                        {filteredSales[historySelectedIndex].items?.map((it, i) => {
                          const returnedQty = Number(it.returnedQuantity || 0);
                          const remaining = Math.max(0, Number(it.quantity || 0) - returnedQty);
                          return (
                            <li key={i} className={`px-3 py-2 border-t text-sm flex items-center justify-between ${historyMode === 'items' && historyItemSelectedIndex === i ? 'bg-blue-50 ring-2 ring-blue-300' : ''}`}>
                              <div>
                                <div className="font-medium">{it.name} x{it.quantity}</div>
                                <div className="text-xs text-gray-500">Returned: {returnedQty} | Remaining: {remaining}</div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span>₱{Number(it.total || (it.price * it.quantity)).toFixed(2)}</span>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <div className="flex justify-between items-center mt-3 font-semibold">
                      <span>Total</span>
                      <span>₱{Number(filteredSales[historySelectedIndex].subtotal || 0).toFixed(2)}</span>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        className="px-4 py-2 rounded bg-gray-200"
                        onClick={() => setShowHistoryModal(false)}
                      >
                        Close
                      </button>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">Use Up/Down to navigate. Enter: select sale. ESC: close.</div>
                  </div>
                  ) : (
                    <div className="p-6 text-gray-500">Select a sale to view details</div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
      {showDiscountModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-transparent z-[65]">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md border-4 border-gray-800 bg-opacity-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-xl font-bold text-gray-900">Apply Discount</h4>
            </div>
            <div className="space-y-3 mb-6">
              {discountOptions.length > 0 ? (
                discountOptions.map(opt => (
                      <button
                        key={opt.id}
                        className={`w-full py-3 px-4 rounded-lg border-2 font-bold text-lg ${discountSelection === opt.type ? 'bg-purple-600 border-purple-800 text-white' : 'bg-white border-gray-400 text-gray-800 hover:bg-gray-50'}`}
                        onClick={() => {
                          setDiscountSelection(opt.type);
                        }}
                      >
                    {opt.type || (String(opt.type).toLowerCase() === 'senior' ? 'Senior Citizen' : opt.type)} - {((opt.rate > 1 ? opt.rate : opt.rate * 100) || 20).toFixed(0)}%
                      </button>
                    ))
                  ) : (
                    <>
              <button
                className={`w-full py-3 px-4 rounded-lg border-2 font-bold text-lg ${discountSelection === 'PWD' ? 'bg-purple-600 border-purple-800 text-white' : 'bg-white border-gray-400 text-gray-800 hover:bg-gray-50'}`}
                onClick={() => {
                  setDiscountSelection('PWD');
                }}
              >
                PWD - 20%
              </button>
              <button
                    className={`w-full py-3 px-4 rounded-lg border-2 font-bold text-lg ${discountSelection === 'Senior Citizen' ? 'bg-purple-600 border-purple-800 text-white' : 'bg-white border-gray-400 text-gray-800 hover:bg-gray-50'}`}
                    onClick={() => {
                      setDiscountSelection('Senior Citizen');
                    }}
              >
                Senior Citizen - 20%
              </button>
                    </>
                  )}
              <button
                className={`w-full py-3 px-4 rounded-lg border-2 font-bold text-lg ${discountSelection === 'None' ? 'bg-purple-600 border-purple-800 text-white' : 'bg-white border-gray-400 text-gray-800 hover:bg-gray-50'}`}
                onClick={() => {
                  setDiscountSelection('None');
                  // Clear senior info when removing discount
                  setSeniorIdNumber('');
                  setSeniorName('');
                }}
              >
                Remove Discount
              </button>
            </div>

            {/* Senior Citizen Information Fields - Show when Senior is selected */}
            {(discountSelection === 'Senior Citizen' || discountSelection === 'Senior' || String(discountSelection).toLowerCase().includes('senior')) && (
              <div className="mb-4 p-4 bg-yellow-50 border-2 border-yellow-400 rounded-lg">
                <h5 className="text-sm font-bold text-gray-800 mb-3">Senior Citizen Information (Required)</h5>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ID Number *</label>
                    <input
                      ref={seniorIdInputRef}
                      type="text"
                      placeholder="Enter Senior Citizen ID Number"
                      value={seniorIdNumber}
                      onChange={(e) => setSeniorIdNumber(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          seniorNameInputRef.current?.focus();
                        }
                      }}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                    <input
                      ref={seniorNameInputRef}
                      type="text"
                      placeholder="Enter Senior Citizen Full Name"
                      value={seniorName}
                      onChange={(e) => setSeniorName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          // Trigger Apply button action
                          const isSeniorDiscount = (discountSelection === 'Senior Citizen' || discountSelection === 'Senior' || String(discountSelection).toLowerCase().includes('senior'));
                          if (isSeniorDiscount && seniorIdNumber.trim() && seniorName.trim()) {
                            setDiscountType(discountSelection);
                            setShowDiscountModal(false);
                          }
                        }
                      }}
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      required
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button className="px-6 py-3 rounded-lg bg-gray-300 border-2 border-gray-500 text-gray-800 font-bold hover:bg-gray-400" onClick={() => {
                setShowDiscountModal(false);
                // Clear senior info when canceling
                if (discountSelection !== discountType) {
                  setSeniorIdNumber('');
                  setSeniorName('');
                }
              }}>Cancel (Esc)</button>
              <button
                className="px-6 py-3 rounded-lg bg-gray-900 text-white font-bold border-2 border-gray-800 hover:bg-black"
                onClick={() => { 
                  // Check if Senior discount is selected
                  const isSeniorDiscount = (discountSelection === 'Senior Citizen' || discountSelection === 'Senior' || String(discountSelection).toLowerCase().includes('senior'));
                  
                  // Validate senior information if needed
                  if (isSeniorDiscount && discountSelection !== 'None') {
                    if (!seniorIdNumber.trim()) {
                      toast.error('Please enter Senior Citizen ID Number');
                      return;
                    }
                    if (!seniorName.trim()) {
                      toast.error('Please enter Senior Citizen Full Name');
                      return;
                    }
                  }
                  
                  // Apply discount
                  if (discountSelection === 'None') {
                    setDiscountType(null);
                    setSeniorIdNumber('');
                    setSeniorName('');
                  } else {
                    setDiscountType(discountSelection);
                    // Clear senior info if not senior discount
                    if (!isSeniorDiscount) {
                      setSeniorIdNumber('');
                      setSeniorName('');
                    }
                  }
                  setShowDiscountModal(false); 
                }}
              >
                Apply (Enter)
              </button>
            </div>
                <div className="text-sm text-gray-700 mt-3 font-medium">Alt+D to open. Arrow ↑/↓ to navigate. Click to select. Enter to apply. Esc to close.</div>
          </div>
        </div>
      )}
      {showReturnQtyModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-[60]">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md border-2 border-gray-300">
            <h4 className="text-lg font-bold mb-2">Return Quantity</h4>
            <p className="text-sm text-gray-600 mb-4">Enter the quantity to return. Max {returnModal.max}.</p>
            <input
              type="number"
              min={1}
              max={Number(returnModal.max || 0)}
              value={returnQtyInput}
              onChange={(e) => {
                const max = Number(returnModal.max || 0);
                const v = e.target.value;
                if (v === '') { setReturnQtyInput(''); return; }
                const n = Number(v);
                if (!Number.isFinite(n)) return;
                const clamped = Math.max(1, Math.min(max, n));
                setReturnQtyInput(String(clamped));
              }}
              className="w-full px-3 py-2 border rounded mb-4"
            />
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 rounded bg-gray-200" onClick={() => setShowReturnQtyModal(false)}>Cancel</button>
              <button
                className="px-4 py-2 rounded bg-orange-600 text-white"
                onClick={() => {
                  setReturnQtyInput(String(returnModal.max));
                  handleReturnItem(returnModal.transactionId, returnModal.productId, Number(returnModal.max || 0));
                  setShowReturnQtyModal(false);
                }}
              >
                Return All
              </button>
              <button
                className="px-4 py-2 rounded bg-gray-800 text-white disabled:opacity-50"
                disabled={!Number.isFinite(Number(returnQtyInput)) || Number(returnQtyInput) < 1 || Number(returnQtyInput) > Number(returnModal.max || 0)}
                onClick={() => {
                  const qty = Number(returnQtyInput);
                  if (Number.isFinite(qty) && qty >= 1 && qty <= Number(returnModal.max || 0)) {
                    handleReturnItem(returnModal.transactionId, returnModal.productId, qty);
                    setShowReturnQtyModal(false);
                  }
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      {showAdjustmentModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-[70]">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md border-2 border-gray-300">
            <h4 className="text-lg font-bold mb-2">Product Adjustment (Damaged)</h4>
            {(() => {
              const product = products.find(p => p.id === adjustmentProductId);
              const currentQty = Number(product?.quantity || 0);
              return (
                <div>
                  <div className="mb-2">
                    <div className="text-sm text-gray-600">Product</div>
                    <div className="font-semibold">{product?.name || '—'}</div>
                  </div>
                  <div className="mb-3 text-sm text-gray-700">Current Stock: {currentQty}</div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Damaged Quantity</label>
                    <input
                      type="number"
                      min={1}
                      max={currentQty || 9999}
                      value={adjustmentQty}
                      onChange={e => setAdjustmentQty(e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                    <textarea
                      rows={3}
                      value={adjustmentReason}
                      onChange={e => setAdjustmentReason(e.target.value)}
                      placeholder="e.g., Damaged during transport"
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button className="px-4 py-2 rounded bg-gray-200" onClick={() => setShowAdjustmentModal(false)}>Cancel (Esc)</button>
                    <button className="px-4 py-2 rounded bg-gray-800 text-white" onClick={confirmAdjustment}>Confirm</button>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">Alt+A from product list to open. Enter to confirm. Esc to close.</div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {showCustomerReturnModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[95vh] flex flex-col border-2 border-gray-300">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gray-50 flex-shrink-0">
              <h3 className="text-xl font-bold text-gray-900">Customer Return Processing</h3>
              <div className="text-sm text-gray-500">Alt+R to close</div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Transaction ID Search */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Transaction ID:
                </label>
                <div className="flex gap-3">
                  <input
                    ref={transactionIdRef}
                    type="text"
                    placeholder="Enter transaction ID (e.g., TXN123456)"
                    value={customerReturnData.transactionId}
                    onChange={(e) => setCustomerReturnData(prev => ({ ...prev, transactionId: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        // Auto-search transaction first
                        if (customerReturnData.transactionId.trim()) {
                          searchTransactionForReturn(customerReturnData.transactionId.trim());
                        }
                        // Auto-focus on Return Reason dropdown after Enter
                        setTimeout(() => {
                          if (returnReasonRef.current) {
                            returnReasonRef.current.focus();
                          }
                        }, 100);
                      }
                    }}
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg text-base font-medium text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  />
                  <button
                    onClick={() => searchTransactionForReturn(customerReturnData.transactionId)}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-base font-bold"
                  >
                    🔍 Search
                  </button>
                  <button
                    onClick={loadRecentTransactions}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-base font-bold"
                  >
                    📋 Recent
                  </button>
                </div>
              </div>

              {/* Return Reason */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Return Reason:
                </label>
                <div className="space-y-3">
                  {/* Simple Dropdown with Keyboard Shortcuts */}
                  <div>
                    <select
                      ref={returnReasonRef}
                      value={customerReturnData.returnReason}
                      onChange={(e) => setCustomerReturnData(prev => ({ ...prev, returnReason: e.target.value }))}
                      onKeyDown={(e) => {
                        // Keyboard shortcuts
                        if (e.key.toLowerCase() === 'd') {
                          e.preventDefault();
                          setCustomerReturnData(prev => ({ ...prev, returnReason: 'Product damaged/defective' }));
                        } else if (e.key.toLowerCase() === 'w') {
                          e.preventDefault();
                          setCustomerReturnData(prev => ({ ...prev, returnReason: 'Wrong item received' }));
                        } else if (e.key.toLowerCase() === 'c') {
                          e.preventDefault();
                          setCustomerReturnData(prev => ({ ...prev, returnReason: 'Customer changed Item' }));
                        } else if (e.key === 'ArrowDown') {
                          e.preventDefault();
                          // Go to first quantity input field
                          setTimeout(() => {
                            const firstQtyInput = document.querySelector('input[type="number"]');
                            if (firstQtyInput) {
                              firstQtyInput.focus();
                            } else {
                              // If no quantity fields yet, go to Process Return button
                              const processBtn = document.querySelector('button[onClick*="processCustomerReturn"]');
                              if (processBtn) {
                                processBtn.focus();
                              }
                            }
                          }, 100);
                        } else if (e.key === 'Enter') {
                          e.preventDefault();
                          // Auto-focus on first quantity input field
                          setTimeout(() => {
                            const firstQtyInput = document.querySelector('input[type="number"]');
                            if (firstQtyInput) {
                              firstQtyInput.focus();
                            } else {
                              // If no quantity fields yet, go to Process Return button
                              const processBtn = document.querySelector('button[onClick*="processCustomerReturn"]');
                              if (processBtn) {
                                processBtn.focus();
                              }
                            }
                          }, 100);
                        }
                      }}
                      className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base font-medium text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 bg-white"
                    >
                      <option value="">Select return reason...</option>
                      <option value="Product damaged/defective">🚫 Product damaged/defective</option>
                      <option value="Wrong item received">❌ Wrong item received</option>
                      <option value="Customer changed Item">💭 Customer changed Item</option>
                    </select>
                   
                    {/* Keyboard shortcuts */}
                    <div className="mt-2 text-xs text-gray-500">
                      Quick shortcuts: Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">D</kbd> for damaged, 
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">W</kbd> for wrong item, 
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">C</kbd> for change mind, 
                      <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↓</kbd> for quantity fields
                    </div>
                  </div>
                  
                  {/* Custom Reason Input - Show only if "Other" is selected */}
                  {customerReturnData.returnReason === 'Other' && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">
                        Please specify the reason:
                      </label>
                      <textarea
                        placeholder="Enter specific reason for return..."
                        value={customerReturnData.customReason || ''}
                        onChange={(e) => setCustomerReturnData(prev => ({ ...prev, customReason: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.altKey) {
                            e.preventDefault();
                            // Auto-focus on Process Return button
                            setTimeout(() => {
                              const processBtn = document.querySelector('button[onClick*="processCustomerReturn"]');
                              if (processBtn) {
                                processBtn.focus();
                              }
                            }, 100);
                          }
                        }}
                        rows={2}
                        className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg text-sm font-medium text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Recent Transactions */}
              {showRecentTransactions && (
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-lg font-semibold text-gray-800">Recent Transactions:</h4>
                    <button
                      onClick={() => setShowRecentTransactions(false)}
                      className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                    >
                      ✕ Close
                    </button>
                  </div>
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4 max-h-60 overflow-y-auto">
                    {recentTransactions.length > 0 ? (
                      <div className="space-y-2">
                        {recentTransactions.map((transaction, index) => (
                          <div 
                            key={index} 
                            className="flex justify-between items-center p-3 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 cursor-pointer"
                            onClick={() => {
                              setCustomerReturnData(prev => ({ ...prev, transactionId: transaction.transaction_id }));
                              setShowRecentTransactions(false);
                            }}
                          >
                            <div className="flex-1">
                              <div className="font-semibold text-gray-800">{transaction.transaction_id}</div>
                              <div className="text-sm text-gray-600">
                                {transaction.date} {transaction.time} • {transaction.payment_type} • {transaction.cashier_name || 'Unknown'}
                              </div>
                              <div className="text-sm text-gray-600">
                                Location: {transaction.location_name} • Terminal: {transaction.terminal_name}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-gray-800">₱{Number(transaction.total_amount || 0).toFixed(2)}</div>
                              {transaction.reference_number && (
                                <div className="text-xs text-gray-500">Ref: {transaction.reference_number}</div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-4xl mb-2">📋</div>
                        <div>No recent transactions found</div>
                        <div className="text-sm mt-1">Make some sales first to see transaction history</div>
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mt-2 bg-blue-50 p-2 rounded">
                    💡 Click on any transaction to use its ID for return processing
                  </div>
                </div>
              )}

              {/* Transaction Items */}
              {customerReturnData.items.length > 0 && (
                <div>
                  <h4 className="text-lg font-semibold text-gray-800 mb-3">Transaction Items:</h4>
                  <div className="bg-gray-50 border-2 border-gray-200 rounded-lg p-4">
                    <div className="space-y-3">
                      {customerReturnData.items.map((item, index) => {
                        const returnQty = returnQuantities[item.product_id] || 0;
                        const maxQty = Number(item.quantity) || 0;
                        const itemPrice = Number(item.price || item.unit_price);
                        const returnAmount = itemPrice * returnQty;
                        
                        return (
                          <div key={index} className="p-3 bg-white border border-gray-200 rounded-lg">
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1">
                                <div className="font-semibold text-gray-800">{item.name || item.product_name}</div>
                                <div className="text-sm text-gray-600">
                                  Original: {maxQty} × ₱{itemPrice.toFixed(2)} = ₱{(itemPrice * maxQty).toFixed(2)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-3 mt-2">
                              <label className="text-sm font-medium text-gray-700">Return Qty:</label>
                              <div className="text-xs text-gray-500">
                                Press <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">M</kbd> for max, 
                                <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">Enter</kbd> for next, 
                                <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs">↑</kbd> for return reason
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    const current = returnQuantities[item.product_id] || 0;
                                    if (current > 0) {
                                      setReturnQuantities(prev => ({
                                        ...prev,
                                        [item.product_id]: current - 1
                                      }));
                                    }
                                  }}
                                  className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-l flex items-center justify-center text-base font-bold transition-colors"
                                  disabled={(returnQuantities[item.product_id] || 0) <= 0}
                                >
                                  −
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  max={maxQty}
                                  value={returnQty}
                                  onChange={(e) => {
                                    const value = Math.max(0, Math.min(maxQty, parseInt(e.target.value) || 0));
                                    setReturnQuantities(prev => ({
                                      ...prev,
                                      [item.product_id]: value
                                    }));
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key.toLowerCase() === 'm') {
                                      e.preventDefault();
                                      // Set max quantity
                                      setReturnQuantities(prev => ({
                                        ...prev,
                                        [item.product_id]: maxQty
                                      }));
                                    } else if (e.key === 'ArrowUp') {
                                      e.preventDefault();
                                      // Go back to Return Reason dropdown
                                      if (returnReasonRef.current) {
                                        returnReasonRef.current.focus();
                                      }
                                    } else if (e.key === 'ArrowDown') {
                                      e.preventDefault();
                                      // Go to next quantity input or Process Return button
                                      const inputs = document.querySelectorAll('input[type="number"]');
                                      const currentIndex = Array.from(inputs).indexOf(e.target);
                                      const nextInput = inputs[currentIndex + 1];
                                      
                                      if (nextInput) {
                                        nextInput.focus();
                                      } else {
                                        // Go to Process Return button (last quantity field)
                                        setTimeout(() => {
                                          const processBtn = document.querySelector('button[onClick*="processCustomerReturn"]');
                                          if (processBtn) {
                                            processBtn.focus();
                                          }
                                        }, 100);
                                      }
                                    } else if (e.key === 'Enter') {
                                      e.preventDefault();
                                      // Go to next quantity input or Process Return button
                                      const inputs = document.querySelectorAll('input[type="number"]');
                                      const currentIndex = Array.from(inputs).indexOf(e.target);
                                      const nextInput = inputs[currentIndex + 1];
                                      
                                      if (nextInput) {
                                        nextInput.focus();
                                      } else {
                                        // Go to Process Return button (last quantity field)
                                        setTimeout(() => {
                                          const processBtn = document.querySelector('button[onClick*="processCustomerReturn"]');
                                          if (processBtn) {
                                            processBtn.focus();
                                          }
                                        }, 100);
                                      }
                                    }
                                  }}
                                  className="w-20 px-2 py-1 border-2 border-gray-300 rounded-none text-center text-gray-900 font-bold text-base focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                                />
                                <button
                                  onClick={() => {
                                    const current = returnQuantities[item.product_id] || 0;
                                    if (current < maxQty) {
                                      setReturnQuantities(prev => ({
                                        ...prev,
                                        [item.product_id]: current + 1
                                      }));
                                    }
                                  }}
                                  className="w-8 h-8 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-r flex items-center justify-center text-base font-bold transition-colors"
                                  disabled={(returnQuantities[item.product_id] || 0) >= maxQty}
                                >
                                  +
                                </button>
                                <button
                                  onClick={() => {
                                    setReturnQuantities(prev => ({
                                      ...prev,
                                      [item.product_id]: maxQty
                                    }));
                                  }}
                                  className="px-3 py-1 bg-blue-600 text-white text-sm font-bold rounded hover:bg-blue-700 transition-colors"
                                >
                                  MAX
                                </button>
                              </div>
                              <div className="ml-auto text-right">
                                <div className="text-sm text-gray-600">Return Amount:</div>
                                <div className="font-bold text-red-600">
                                  ₱{returnAmount.toFixed(2)}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="mt-4 pt-3 border-t-2 border-gray-400 bg-yellow-50 p-4 rounded-lg">
                      <div className="flex justify-between items-center text-xl font-bold">
                        <span className="text-gray-800">TOTAL RETURN AMOUNT:</span>
                        <span className="text-red-600 text-2xl">
                          ₱{customerReturnData.items.reduce((sum, item) => {
                            const returnQty = returnQuantities[item.product_id] || 0;
                            const itemPrice = Number(item.price || item.unit_price);
                            return sum + (itemPrice * returnQty);
                          }, 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
            
            {/* Action Buttons - Fixed at bottom */}
            <div className="flex-shrink-0 border-t border-gray-200 bg-gray-50 p-6">
              <div className="flex gap-3 justify-end mb-4">
                <button
                  className="px-6 py-3 rounded-lg bg-gray-300 border-2 border-gray-500 text-gray-800 font-bold hover:bg-gray-400"
                  onClick={() => setShowCustomerReturnModal(false)}
                >
                  Cancel (Esc)
                </button>
                <button
                  className="px-6 py-3 rounded-lg bg-red-600 text-white font-bold border-2 border-red-700 hover:bg-red-700 disabled:opacity-50"
                  disabled={!customerReturnData.transactionId || !customerReturnData.returnReason.trim() || customerReturnData.items.length === 0}
                  onClick={processCustomerReturn}
                >
                  Process Return
                </button>
              </div>
              
              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <strong>Instructions:</strong><br/>
                • Enter the transaction ID from the original sale<br/>
                • Select a return reason (D=damaged, W=wrong, C=change mind)<br/>
                • Set quantities to return for each item (M=max quantity)<br/>
                • Stock will be automatically updated after processing
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 flex items-center justify-center z-[80]">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md border-2 border-gray-300">
            <h3 className="text-2xl font-bold mb-4 text-gray-800">Select Payment Method</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Grand Total:</label>
              <div className="text-3xl font-bold text-green-600">₱{payableTotal.toFixed(2)}</div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Choose Payment Method:</label>
              <div className="flex gap-3">
                <button
                  ref={paymentCashBtnRef}
                  type="button"
                  className={`flex-1 py-4 rounded-lg text-lg font-bold transition-colors ${paymentMethod === 'cash' ? 'bg-gray-800 text-white shadow-lg ring-2 ring-blue-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  onClick={() => { 
                    setPaymentMethod('cash'); 
                    setShowRefInput(false); 
                    setPaymentModalFocusIndex(0);
                    // Auto-set amount for cash if empty
                    if (!amountPaid) {
                      setAmountPaid(payableTotal.toString());
                    }
                    // Move focus to amount input
                    setTimeout(() => paymentAmountInputRef.current?.focus(), 100);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setPaymentMethod('cash');
                      setShowRefInput(false);
                      if (!amountPaid) {
                        setAmountPaid(payableTotal.toString());
                      }
                      // Move to amount input
                      setTimeout(() => paymentAmountInputRef.current?.focus(), 100);
                    } else if (e.key === 'Tab' && !e.shiftKey) {
                      // Tab moves to amount input
                      e.preventDefault();
                      setTimeout(() => paymentAmountInputRef.current?.focus(), 0);
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      // Move to GCash button
                      paymentModalRefs.current[1]?.focus();
                    }
                  }}
                >
                  💵 Cash
                </button>
                <button
                  ref={el => paymentModalRefs.current[1] = el}
                  type="button"
                  className={`flex-1 py-4 rounded-lg text-lg font-bold transition-colors ${paymentMethod === 'gcash' ? 'bg-blue-600 text-white shadow-lg ring-2 ring-blue-500' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                  onClick={() => { 
                    setPaymentMethod('gcash'); 
                    setShowRefInput(true);
                    setPaymentModalFocusIndex(1);
                    // Auto-set exact amount for GCash
                    setAmountPaid(payableTotal.toString());
                    // Move focus to amount input
                    setTimeout(() => paymentAmountInputRef.current?.focus(), 100);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      setPaymentMethod('gcash');
                      setShowRefInput(true);
                      setAmountPaid(payableTotal.toString());
                      // Move to amount input
                      setTimeout(() => paymentAmountInputRef.current?.focus(), 100);
                    } else if (e.key === 'Tab' && !e.shiftKey) {
                      // Tab moves to amount input
                      e.preventDefault();
                      setTimeout(() => paymentAmountInputRef.current?.focus(), 0);
                    } else if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      // Move to Cash button
                      paymentCashBtnRef.current?.focus();
                    }
                  }}
                >
                  📱 GCash
                </button>
              </div>
            </div>

            {/* Amount Paid Input */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Amount Paid:</label>
              <input
                ref={paymentAmountInputRef}
                type="number"
                placeholder="Enter amount..."
                value={amountPaid}
                onChange={e => setAmountPaid(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    // If GCash and no reference, move to ref input
                    if (paymentMethod === 'gcash' && !referenceNumber.trim()) {
                      paymentModalRefs.current[3]?.focus();
                    } else if (amountPaid && parseFloat(amountPaid) >= payableTotal && 
                               paymentMethod && (paymentMethod !== 'gcash' || referenceNumber.trim())) {
                      // All valid, trigger confirm
                      setShowPaymentModal(false);
                      setTimeout(() => handleCheckout(), 100);
                    }
                  }
                }}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base font-medium text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
              />
              {amountPaid && !isNaN(amountPaid) && parseFloat(amountPaid) >= payableTotal && (
                <div className="mt-2 text-sm">
                  <span className="text-gray-600">Change: </span>
                  <span className="font-bold text-green-600">₱{(parseFloat(amountPaid) - payableTotal).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* GCash Reference Number */}
            {paymentMethod === 'gcash' && showRefInput && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 mb-2">GCash Reference Number:</label>
                <input
                  ref={el => paymentModalRefs.current[3] = el}
                  type="text"
                  placeholder="Enter reference number..."
                  value={referenceNumber}
                  onChange={e => setReferenceNumber(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      // If all valid, trigger confirm
                      if (referenceNumber.trim() && amountPaid && parseFloat(amountPaid) >= payableTotal) {
                        setShowPaymentModal(false);
                        setTimeout(() => handleCheckout(), 100);
                      }
                    }
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-base font-medium text-gray-900 placeholder-gray-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                />
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                className="flex-1 px-4 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 font-semibold"
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentMethod('');
                  setAmountPaid('');
                  setReferenceNumber('');
                  setShowRefInput(false);
                }}
              >
                Cancel
              </button>
              <button
                ref={el => paymentModalRefs.current[4] = el}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={() => {
                  setShowPaymentModal(false);
                  // Trigger checkout after modal closes
                  setTimeout(() => handleCheckout(), 100);
                }}
                disabled={!paymentMethod || !amountPaid || parseFloat(amountPaid) < payableTotal || (paymentMethod === 'gcash' && !referenceNumber.trim())}
              >
                Confirm & Pay
              </button>
            </div>
          </div>
        </div>
      )}

      {showThankYouModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl text-center border-2 border-gray-300">
            <h2 className="text-3xl font-bold mb-4 text-gray-700">Thank you for purchasing!</h2>
            <p className="text-gray-600 text-lg">Transaction completed successfully.</p>
            <p className="text-sm text-gray-500 mt-2">Receipt data sent to printer successfully.</p>
            <p className="text-xs text-orange-500 mt-2 font-semibold">📋 If paper doesnt feed automatically, press the manual feed button on your printer.</p>
            <p className="text-xs text-gray-400 mt-1">Receipt is also saved in the receipts folder.</p>
            <button
              className="mt-6 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
              onClick={() => setShowThankYouModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Wrong Terminal Alert Modal */}
      {showWrongTerminalAlert && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl text-center border-2 border-red-300 max-w-md mx-4">
            <div className="text-red-500 text-6xl mb-4">⚠️</div>
            <h2 className="text-2xl font-bold mb-4 text-red-600">Wrong Terminal!</h2>
            <div className="text-gray-700 text-lg mb-4">
              <p className="mb-2">This return cannot be processed at this terminal.</p>
              <p className="font-semibold text-red-600">
                Transaction #{customerReturnData.transactionId}
              </p>
              <p className="text-sm text-gray-600 mt-2">
                Please process this return at the <strong>original store location</strong> where the purchase was made.
              </p>
            </div>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Returns must be processed at the same location where the original sale occurred.
              </p>
            </div>
            <button
              className="px-8 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors"
              onClick={() => {
                setShowWrongTerminalAlert(false);
                setShowCustomerReturnModal(true); // Reopen the return modal
              }}
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {showTotalSalesModal && (
        <div 
          className="fixed inset-0 flex items-center justify-center bg-transparent backdrop-blur-sm z-[90]"
          data-modal="sales-modal"
          onKeyDown={(e) => {

            if (e.key === 'Escape') {

              e.preventDefault();
              setShowTotalSalesModal(false);
            }
          }}
          tabIndex={-1}
        >
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl border-2 border-gray-300">
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-green-50 to-green-100">
              <h3 className="text-2xl font-bold text-gray-900">📊 Today&apos;s Sales Summary</h3>
              <div className="text-sm text-gray-500">Alt+T to close • Enter to refresh</div>
            </div>
            
            <div className="p-6">
              {/* Cashier Info */}
              <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">👤</span>
                  <div>
                    <div className="text-lg font-bold text-blue-900">
                      Cashier: <span className="text-blue-700">
                        {(() => {
                          try {
                            const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
                            return userData.username || 'Admin';
                          } catch {
                            return 'Admin';
                          }
                        })()}
                      </span>
                    </div>
                    <div className="text-sm font-medium text-blue-800 mt-1">
                      📍 Location: <strong>{locationName}</strong> • 🖥️ Terminal: <strong>{terminalName}</strong>
                    </div>
                    <div className="text-sm font-medium text-blue-800">
                      📅 Date: <strong>{new Date().toLocaleDateString('en-US', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Loading State */}
              {todaySalesData.loading && (
                <div className="text-center py-8">
                  <div className="text-4xl mb-4">⏳</div>
                  <div className="text-lg font-semibold text-gray-600">Loading sales data...</div>
                </div>
              )}

              {/* Sales Data */}
              {!todaySalesData.loading && (
                <div className="space-y-4">
                  {/* Total Sales */}
                  <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">💰</span>
                        <div>
                          <div className="text-lg font-semibold text-green-800">Total Sales</div>
                          <div className="text-sm text-green-700">All transactions today</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-green-600">
                          ₱{todaySalesData.totalSales.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Transactions */}
                  <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">📋</span>
                        <div>
                          <div className="text-lg font-semibold text-blue-800">Total Transactions</div>
                          <div className="text-sm text-blue-700">Number of sales today</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-blue-600">
                          {todaySalesData.totalTransactions}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Methods Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Cash Sales */}
                    <div className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-300 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">💵</span>
                          <div>
                            <div className="text-base font-semibold text-gray-800">Cash Sales</div>
                            <div className="text-sm text-gray-700">Cash payments</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-gray-600">
                            ₱{todaySalesData.cashSales.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* GCash Sales */}
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">📱</span>
                          <div>
                            <div className="text-base font-semibold text-blue-800">GCash Sales</div>
                            <div className="text-sm text-blue-700">Digital payments</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-blue-600">
                            ₱{todaySalesData.gcashSales.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Total Discounts */}
                  <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 border-2 border-orange-300 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">🎫</span>
                        <div>
                          <div className="text-lg font-semibold text-orange-800">Total Discounts</div>
                          <div className="text-sm text-orange-700">PWD & Senior Citizen discounts</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-orange-600">
                          ₱{todaySalesData.totalDiscount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Average Transaction */}
                  {todaySalesData.totalTransactions > 0 && (
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">📊</span>
                          <div>
                            <div className="text-lg font-semibold text-purple-800">Average Transaction</div>
                            <div className="text-sm text-purple-700">Per transaction today</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-purple-600">
                            ₱{(todaySalesData.totalSales / todaySalesData.totalTransactions).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end pt-6 border-t border-gray-200 mt-6">
                <button
                  className="px-6 py-3 rounded-lg bg-gray-300 border-2 border-gray-500 text-gray-800 font-bold hover:bg-gray-400"
                  onClick={() => setShowTotalSalesModal(false)}
                >
                  Close (Esc)
                </button>
                <button
                  className="px-6 py-3 rounded-lg bg-green-600 text-white font-bold border-2 border-green-700 hover:bg-green-700"
                  onClick={fetchTodaySales}
                >
                  🔄 Refresh (Enter)
                </button>
              </div>

              <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg mt-4">
                <strong>Instructions:</strong><br/>
                • Press <kbd className="px-1 py-0.5 bg-white rounded border text-xs">Alt+T</kbd> to open this modal<br/>
                • Press <kbd className="px-1 py-0.5 bg-white rounded border text-xs">Enter</kbd> to refresh data<br/>
                • Press <kbd className="px-1 py-0.5 bg-white rounded border text-xs">Esc</kbd> to close<br/>
                • Data shows sales for current cashier at current location today
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Return Confirmation Modal */}
      {showReturnConfirmModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl border-4 border-red-500">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">
                Confirm Return Processing
              </h3>
              
              <div className="text-left mb-6 space-y-2">
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700">Transaction:</span>
                  <span className="text-gray-900">{customerReturnData.transactionId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700">Reason:</span>
                  <span className="text-gray-900">
                    {customerReturnData.returnReason === 'Other' 
                      ? customerReturnData.customReason.trim() 
                      : customerReturnData.returnReason}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-gray-700">Items to return:</span>
                  <span className="text-gray-900">
                    {customerReturnData.items.filter(item => {
                      const returnQty = returnQuantities[item.product_id] || 0;
                      return returnQty > 0;
                    }).length}
                  </span>
                </div>
              </div>
              
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => {
                    setShowReturnConfirmModal(false);
                    setShowCustomerReturnModal(true);
                  }}
                  className="px-6 py-3 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmProcessReturn}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold transition-colors"
                >
                  Process Return
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear Cart Confirmation Modal */}
      {showClearCartModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
          <div className="bg-white p-8 rounded-xl shadow-2xl text-center border-2 border-gray-300 max-w-md">
            <div className="text-6xl mb-4">🗑️</div>
            <h2 className="text-2xl font-bold mb-4 text-gray-800">Clear Cart?</h2>
            <p className="text-gray-600 mb-6">
              Are you sure you want to clear all items from the cart? 
              <br />
              <span className="text-sm text-gray-500">This will restore stock for all items.</span>
            </p>
            <div className="flex gap-4 justify-center">
              <button
                className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 font-semibold transition-colors"
                onClick={() => setShowClearCartModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold transition-colors"
                onClick={() => {
                  clearCart();
                  setShowClearCartModal(false);
                }}
              >
                Clear Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/60 max-w-md w-full mx-4 transform transition-all duration-300 scale-100 animate-fade-in-up">
            {/* Header */}
            <div className="relative p-6 border-b border-slate-200/60 bg-gradient-to-r from-red-50 to-orange-50 rounded-t-2xl">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/25">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-center text-slate-800 mb-2">
                Confirm Logout
              </h3>
              
              <p className="text-slate-600 text-center font-medium">
                Are you sure you want to logout?
              </p>
            </div>

            {/* Warning Message */}
            <div className="p-6">
              <div className="flex items-start space-x-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <svg className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <p className="text-sm text-amber-800 font-medium">
                    Unsaved Changes Warning
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Any unsaved changes will be lost when you logout.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 pt-0 space-y-3">
              <button
                onClick={confirmLogout}
                className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-semibold rounded-xl shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/30 transform hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Yes, Logout
              </button>
              
              <button
                onClick={cancelLogout}
                className="w-full px-6 py-3 bg-white border-2 border-slate-300 hover:border-slate-400 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transform hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={cancelLogout}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all duration-200"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Credentials Update Modal */}
      {showCredentialsModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/60 max-w-lg w-full mx-4 transform transition-all duration-300 scale-100 animate-fade-in-up">
            {/* Header */}
            <div className="relative p-6 border-b border-slate-200/60 bg-gradient-to-r from-green-50 to-blue-50 rounded-t-2xl">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-green-500/25">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              
              <h3 className="text-2xl font-bold text-center text-slate-800 mb-2">
                Update Your Credentials
              </h3>
              
              <p className="text-slate-600 text-center font-medium">
                Update your account information and password
              </p>
            </div>

            {/* Form */}
            <div className="p-6 space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name
                </label>
                <input
                  ref={el => credentialsRefs.current[0] = el}
                  type="text"
                  value={credentialsData.fullName}
                  onChange={(e) => updateCredentialsField('fullName', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                    credentialsFocusIndex === 0 
                      ? 'border-green-500 focus:ring-green-500 bg-green-50' 
                      : 'border-slate-300 focus:ring-slate-500 hover:border-slate-400'
                  }`}
                  placeholder="Enter your full name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  ref={el => credentialsRefs.current[1] = el}
                  type="email"
                  value={credentialsData.email}
                  onChange={(e) => updateCredentialsField('email', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                    credentialsFocusIndex === 1 
                      ? 'border-green-500 focus:ring-green-500 bg-green-50' 
                      : 'border-slate-300 focus:ring-slate-500 hover:border-slate-400'
                  }`}
                  placeholder="Enter your email address"
                />
              </div>

              {/* Username */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Username
                </label>
                <input
                  ref={el => credentialsRefs.current[2] = el}
                  type="text"
                  value={credentialsData.username}
                  onChange={(e) => updateCredentialsField('username', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                    credentialsFocusIndex === 2 
                      ? 'border-green-500 focus:ring-green-500 bg-green-50' 
                      : 'border-slate-300 focus:ring-slate-500 hover:border-slate-400'
                  }`}
                  placeholder="Enter your username"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  New Password (Optional)
                </label>
                <input
                  ref={el => credentialsRefs.current[3] = el}
                  type="password"
                  value={credentialsData.newPassword}
                  onChange={(e) => updateCredentialsField('newPassword', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                    credentialsFocusIndex === 3 
                      ? 'border-green-500 focus:ring-green-500 bg-green-50' 
                      : 'border-slate-300 focus:ring-slate-500 hover:border-slate-400'
                  }`}
                  placeholder="Enter new password (leave blank to keep current)"
                />
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Confirm Password
                </label>
                <input
                  ref={el => credentialsRefs.current[4] = el}
                  type="password"
                  value={credentialsData.confirmPassword}
                  onChange={(e) => updateCredentialsField('confirmPassword', e.target.value)}
                  className={`w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 ${
                    credentialsFocusIndex === 4 
                      ? 'border-green-500 focus:ring-green-500 bg-green-50' 
                      : 'border-slate-300 focus:ring-slate-500 hover:border-slate-400'
                  }`}
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="p-6 pt-0 space-y-3">
              <button
                ref={el => credentialsRefs.current[5] = el}
                onClick={saveCredentials}
                disabled={isUpdatingCredentials}
                className={`w-full px-6 py-3 font-semibold rounded-xl shadow-lg transform hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  isUpdatingCredentials
                    ? 'bg-slate-400 text-slate-200 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white hover:shadow-xl hover:shadow-green-500/30 focus:ring-green-500'
                }`}
              >
                {isUpdatingCredentials ? 'Updating...' : 'Save Changes'}
              </button>
              
              <button
                ref={el => credentialsRefs.current[6] = el}
                onClick={closeCredentialsModal}
                disabled={isUpdatingCredentials}
                className="w-full px-6 py-3 bg-white border-2 border-slate-300 hover:border-slate-400 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transform hover:scale-[1.02] transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
              >
                Cancel
              </button>
            </div>

            {/* Close Button */}
            <button
              onClick={closeCredentialsModal}
              disabled={isUpdatingCredentials}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

    </>
  );
}

               

               
