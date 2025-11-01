"use client";

import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { 
  FaPlus, 
  FaTrash, 
  FaEye, 
  FaCheck, 
  FaTimes, 
  FaTruck, 
  FaBox, 
  FaFileAlt
} from "react-icons/fa";
import { 
  ShoppingCart, 
  FileText, 
  Package, 
  CheckCircle, 
  DollarSign
} from "lucide-react";
import { getApiUrl } from "../lib/apiConfig";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Define API URLs using centralized configuration
// All functionality now merged into single purchase_order_api.php
const API_BASE = getApiUrl("purchase_order_api.php");
const CREATE_PO_API = getApiUrl("create_purchase_order_api.php");

// NOTE: Purchase Orders are automatically created with 'delivered' status
// and moved to the delivered table upon creation for immediate processing

function CreatePurchaseOrder() {
  // Tab stateasy
  const [activeTab, setActiveTab] = useState('create');
  
  // Tooltip state
  const [hoveredButton, setHoveredButton] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  
  // Tooltip helper functions
  const handleMouseEnter = (e, tooltipText) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: rect.left + rect.width / 2,
      y: rect.top - 10
    });
    setHoveredButton(tooltipText);
  };
  
  const handleMouseLeave = () => {
    setHoveredButton(null);
  };
  
  // Create Purchase Order states
  const [formData, setFormData] = useState({
    supplier: "",
    orderDate: new Date().toISOString().split('T')[0],
    expectedDeliveryStart: "",
    expectedDeliveryEnd: "",
    notes: ""
  });
     const [selectedProducts, setSelectedProducts] = useState([]);
   const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState({ emp_id: null, full_name: '' });

  // Supplier Modal states
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierFormData, setSupplierFormData] = useState({
    supplier_name: "",
    supplier_address: "",
    supplier_contact: "",
    supplier_email: "",
    primary_phone: "",
    primary_email: "",
    contact_person: "",
    contact_title: "",
    notes: "",
  });

  // Purchase Order List states
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [poLoading, setPoLoading] = useState(true);
  const [selectedPO, setSelectedPO] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [poFilter, setPoFilter] = useState('delivered');
  // Removed 3-dots status menu; using inline dynamic action instead

  // Compute the next actionable step for a PO based on its current status
  const getNextPoAction = (po) => {
    if (!po) return null;
    const poId = po.purchase_header_id;
    
    // delivered -> approve (if all items complete) or request missing items
    if (po.status === 'delivered') {
      return {
        label: 'Approve',
        onClick: () => updatePOStatus(poId, 'approved')
      };
    }
    // partial_delivery -> update delivery when missing items arrive
    if (po.status === 'partial_delivery') {
      return {
        label: 'Update Delivery',
        onClick: () => handleUpdatePartialDelivery(poId)
      };
    }
    // complete -> approve
    if (po.status === 'complete') {
      return {
        label: 'Approve',
        onClick: () => updatePOStatus(poId, 'approved')
      };
    }
    // No further automatic action
    return null;
  };

  // Removed Escape handler previously used for 3-dots menu

  // Receive Items states
  const [receivingList, setReceivingList] = useState([]);
  const [receiveLoading, setReceiveLoading] = useState(true);
  const [showReceiveForm, setShowReceiveForm] = useState(false);
  const [receiveFormData, setReceiveFormData] = useState({
    delivery_receipt_no: "",
    notes: "",
    items: []
  });
  const [showReceivedItemsModal, setShowReceivedItemsModal] = useState(false);
  const [selectedReceivedItems, setSelectedReceivedItems] = useState(null);



  // Receive Items states
  const [showReceiveItemsForm, setShowReceiveItemsForm] = useState(false);
  const [selectedPOForReceive, setSelectedPOForReceive] = useState(null);
  const [receiveItemsFormData, setReceiveItemsFormData] = useState({});

  // Partial Delivery Management states
  const [showPartialDeliveryForm, setShowPartialDeliveryForm] = useState(false);
  const [selectedPOForPartialDelivery, setSelectedPOForPartialDelivery] = useState(null);
  const [partialDeliveryFormData, setPartialDeliveryFormData] = useState({
    items: []
  });

  // Critical Products for PO suggestions
  const [criticalProducts, setCriticalProducts] = useState([]);
  const [loadingCriticalProducts, setLoadingCriticalProducts] = useState(false);
  const [showCriticalProducts, setShowCriticalProducts] = useState(true);

  // Previously Ordered Products by Supplier
  const [selectedSupplierForHistory, setSelectedSupplierForHistory] = useState("");
  const [previousOrderProducts, setPreviousOrderProducts] = useState([]);
  const [loadingPreviousProducts, setLoadingPreviousProducts] = useState(false);

  // Simple PO Modal states
  const [showSimplePOModal, setShowSimplePOModal] = useState(false);
  const [simplePOData, setSimplePOData] = useState({
    productName: "",
    quantity: 1,
    unitType: "pieces",
    srp: ""
  });
  const [modalProducts, setModalProducts] = useState([]);

  // Load current user from session on component mount
  useEffect(() => {
    const userSession = sessionStorage.getItem('user_data');
    if (userSession) {
      try {
        const userData = JSON.parse(userSession);
        setCurrentUser({
          emp_id: userData.user_id || 1, // Fallback to 1 if not found
          full_name: userData.full_name || userData.username || 'Unknown User'
        });
      } catch (error) {
        console.error('❌ Error parsing user session:', error);
        // Set default fallback user
        setCurrentUser({ emp_id: 1, full_name: 'Default User' });
        toast.warning('Could not load user session. Using default user.');
      }
    } else {
      // No session found - use fallback
      console.warn('⚠️ No user session found. Using default user.');
      setCurrentUser({ emp_id: 1, full_name: 'Default User' });
      toast.warning('No active session found. Please login again.');
    }
  }, []);

     useEffect(() => {
    if (activeTab === 'create') {
      fetchSuppliers();
      fetchCriticalProducts(); // Fetch critical products when opening create tab
    } else if (activeTab === 'list') {
      fetchPurchaseOrders(poFilter);
      fetchAllPurchaseOrders(); // Refresh counts when switching to list tab
    } else if (activeTab === 'receive') {
      fetchReceivingList();
    }
  }, [activeTab, poFilter]);

  // Simple PO handlers
  const openSimplePOModal = () => {
    setSimplePOData({
      productName: "",
      quantity: 1,
      unitType: "pieces",
      srp: ""
    });
    setModalProducts([]);
    setShowSimplePOModal(true);
    // Fetch critical products when modal opens
    fetchCriticalProducts();
  };

  const closeSimplePOModal = () => {
    setShowSimplePOModal(false);
    setSimplePOData({
      productName: "",
      quantity: 1,
      unitType: "pieces",
      srp: ""
    });
    setModalProducts([]);
  };

  const addProductToModalList = () => {
    if (!simplePOData.productName.trim()) {
      toast.error("Please enter a product name");
      return;
    }

    if (!simplePOData.quantity || simplePOData.quantity <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (!simplePOData.srp || parseFloat(simplePOData.srp) <= 0) {
      toast.error("Please enter a valid SRP (Suggested Retail Price)");
      return;
    }

    // Check if product already exists in list
    const exists = modalProducts.some(p => p.productName === simplePOData.productName);
    if (exists) {
      toast.warning(`${simplePOData.productName} is already in the list`);
      return;
    }

    // Add product to list
    const newProduct = {
      id: Date.now(),
      productName: simplePOData.productName,
      productId: null, // Will be found by backend from product_name
      quantity: parseInt(simplePOData.quantity),
      unitType: simplePOData.unitType,
      srp: parseFloat(simplePOData.srp) || 0
    };

    setModalProducts([...modalProducts, newProduct]);
    
    // Reset form
    setSimplePOData({
      productName: "",
      quantity: 1,
      unitType: "pieces",
      srp: ""
    });

    toast.success(`"${newProduct.productName}" added to order list`);
  };

  const handleDownloadProductsPdf = async (opts = {}) => {
    try {
      const sourceItems = (modalProducts && modalProducts.length > 0)
        ? modalProducts
        : (selectedProducts || []).map(p => ({
            productName: p.searchTerm,
            quantity: p.quantity,
            unitType: p.unitType || 'pieces',
            srp: p.srp || 0
          }));

      if (!sourceItems || sourceItems.length === 0) {
        toast.warning("No products to export");
        return;
      }

      const doc = new jsPDF();
      const marginLeft = 10;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let cursorY = 20;

      // Colors (minimal)
      const accent = [230, 240, 248]; // very light blue
      const textGray = [60, 60, 60];
      const lineGray = [200, 200, 200];

      // Header - three-column layout (Address | Title | PO number)
      const headerTop = cursorY;
      const colPadding = 4;
      const colW = (pageWidth - marginLeft * 2) / 3;

      // Left: Address block
      doc.setFontSize(10);
      doc.setTextColor(200, 85, 30); // soft orange for section title
      doc.text("Address", marginLeft, headerTop);
      doc.setTextColor(...textGray);
      doc.setFontSize(9);
      const addressLines = [
        "Lumbia",
        "Cagayan de Oro City",
        "Misamis Oriental"
      ];
      // Render a faint address placeholder; user can replace later
      addressLines.forEach((line, idx) => {
        if (line) doc.text(line, marginLeft, headerTop + 6 + idx * 5);
      });


      
      // Try to resolve a PO number (if available)
      let poNumber = opts.poNumber || null;
      try {
        if (selectedPO?.header?.po_number) {
          poNumber = selectedPO.header.po_number;
        } else if (selectedPOForReceive?.header?.po_number) {
          poNumber = selectedPOForReceive.header.po_number;
        } else if (!opts.poNumber) {
          const guessEndpoints = [
            `${CREATE_PO_API}?action=next_po_number`,
            `${API_BASE}?action=next_po_number`,
            `${API_BASE}?action=latest_po_number`,
          ];
          for (const url of guessEndpoints) {
            try {
              const res = await fetch(url);
              if (!res.ok) continue;
              const json = await res.json();
              const pn = json?.po_number || json?.next_po_number || json?.data?.po_number || json?.data?.next_po_number;
              if (pn) { poNumber = pn; break; }
            } catch (e) { /* ignore */ }
          }
        }
      } catch (e) { /* ignore */ }

      // Center: Title
      const titleCenterX = marginLeft + colW * 1.5;
      doc.setFontSize(16);
      doc.setTextColor(245, 85, 34); // accent similar to sample but minimal
      doc.text("PURCHASE ORDER", titleCenterX, headerTop, { align: "center" });
      doc.setFontSize(9);
      doc.setTextColor(120);
      // Removed PO number line per request

      cursorY += 18;

      // Info box
      const boxX = marginLeft;
      const boxW = pageWidth - marginLeft * 2;
      const boxH = 44;
      doc.setDrawColor(...lineGray);
      doc.setFillColor(...accent);
      doc.roundedRect(boxX, cursorY, boxW, boxH, 2, 2, "F");

      const supplierId = selectedSupplierForHistory || formData.supplier || "";
      let supplierName = suppliers.find(s => String(s.supplier_id) === String(supplierId))?.supplier_name || "-";
      const createdDate = formData.orderDate ? new Date(formData.orderDate).toLocaleDateString() : new Date().toLocaleDateString();
      // Show ONLY the End Date from the Expected Delivery Date Range
      const deliveryEndRaw = formData.expectedDeliveryEnd || "";
      const deliveryStr = deliveryEndRaw ? new Date(deliveryEndRaw).toLocaleDateString() : "-";

      doc.setTextColor(...textGray);
      doc.setFontSize(10);
      const leftColX = boxX + 6;
      const rightColX = boxX + boxW / 2 + 6;
      let boxY = cursorY + 8;
      doc.text("Supplier:", leftColX, boxY);
      doc.setFontSize(11);
      doc.text(supplierName, leftColX + 35, boxY);
      // Supplier address under the supplier name (left column)
      const supplierObj = suppliers.find(s => String(s.supplier_id) === String(supplierId));
      // Try several possible fields and compose a readable address
      const addressParts = [];
      if (supplierObj) {
        const candidates = [
          supplierObj.supplier_address,
          supplierObj.address,
          supplierObj.street,
          supplierObj.barangay || supplierObj.brgy,
          supplierObj.city || supplierObj.municipality,
          supplierObj.province,
          supplierObj.zip || supplierObj.postal_code
        ];
        candidates.forEach(p => {
          if (p && String(p).trim()) addressParts.push(String(p).trim());
        });
      }
      // If still empty, try fetching supplier details from backend using common endpoints
      if (addressParts.length === 0 && supplierId) {
        const endpoints = [
          `${CREATE_PO_API}?action=supplier_details&supplier_id=${supplierId}`,
          `${CREATE_PO_API}?action=get_supplier&supplier_id=${supplierId}`,
          `${CREATE_PO_API}?action=get_supplier_by_id&supplier_id=${supplierId}`,
          `${API_BASE}?action=supplier_details&supplier_id=${supplierId}`,
          `${API_BASE}?action=get_supplier_by_id&supplier_id=${supplierId}`
        ];
        for (const url of endpoints) {
          try {
            const res = await fetch(url);
            if (res.ok) {
              const json = await res.json();
              const data = json.data || json.supplier || json.result || json;
              if (data) {
                if (!supplierName || supplierName === '-') {
                  supplierName = data.supplier_name || supplierName;
                }
                const candidates = [
                  data.supplier_address,
                  data.address,
                  data.street,
                  data.barangay || data.brgy,
                  data.city || data.municipality,
                  data.province,
                  data.zip || data.postal_code
                ];
                candidates.forEach(p => {
                  if (p && String(p).trim()) addressParts.push(String(p).trim());
                });
                if (addressParts.length > 0) break;
              }
            }
          } catch (e) {
            // ignore fetch failures, continue
          }
        }
      }
      // Fallback to the address typed in the Add Supplier modal (if recently added)
      if (addressParts.length === 0 && supplierFormData && supplierFormData.supplier_address) {
        addressParts.push(String(supplierFormData.supplier_address).trim());
      }
      const supplierAddress = addressParts.join(", ");
      // Address label line
      doc.setFontSize(10);
      doc.setTextColor(...textGray);
      doc.text("Address:", leftColX, boxY + 6);
      if (supplierAddress) {
        doc.setFontSize(9);
        doc.setTextColor(120);
        const addrLines = doc.splitTextToSize(String(supplierAddress), (boxW / 2) - 45);
        doc.text(addrLines, leftColX + 35, boxY + 6);
        doc.setTextColor(...textGray);
      } else {
        doc.setFontSize(9);
        doc.setTextColor(150);
        doc.text("-", leftColX + 35, boxY + 6);
        doc.setTextColor(...textGray);
      }
      doc.setFontSize(10);
      doc.text("Order date:", rightColX, boxY);
      doc.text(createdDate, rightColX + 32, boxY);
      boxY += 6;
      doc.setFontSize(10);
      doc.text("Delivery date:", rightColX, boxY);
      doc.text(deliveryStr, rightColX + 32, boxY);

      cursorY += boxH + 8;

      // Table data
      const body = sourceItems.map((p, i) => {
        const qty = parseInt(p.quantity) || 0;
        const rate = Number(p.srp) || 0;
        const amount = qty * rate;
        return [
          String(i + 1),
          p.productName || "",
          String(qty),
          p.unitType || "pcs",
          rate > 0 ? `PHP ${rate.toFixed(2)}` : "-",
          rate > 0 ? `PHP ${amount.toFixed(2)}` : "-",
        ];
      });

      autoTable(doc, {
        startY: cursorY,
        head: [["SR.NO", "Item Description", "Qty", "Unit", "Old Rate", "Amount"]],
        body,
        styles: { fontSize: 10, textColor: textGray },
        headStyles: { fillColor: [245, 247, 250], textColor: [40, 40, 40], lineWidth: 0.2, lineColor: lineGray },
        bodyStyles: { lineWidth: 0.2, lineColor: lineGray },
        alternateRowStyles: { fillColor: [252, 252, 252] },
        columnStyles: {
          0: { cellWidth: 16 },
          1: { cellWidth: 60, overflow: "linebreak" },
          2: { cellWidth: 16, halign: "linebreak" },
          3: { cellWidth: 18 },
          4: { cellWidth: 30, halign: "linebreak" },
          5: { cellWidth: 26, halign: "linebreak" },
        },
        margin: { left: marginLeft, right: marginLeft },
      });

      const tableBottomY = (doc.lastAutoTable && doc.lastAutoTable.finalY) || cursorY;

      // Totals bar
      const subtotal = modalProducts.reduce((sum, p) => sum + ((parseInt(p.quantity) || 0) * (Number(p.srp) || 0)), 0);
      const totalLabelW = 28;
      const totalBarY = tableBottomY + 6;
      const totalBarX = pageWidth - marginLeft - 28 - 26 - 2; // align with Amount col
      doc.setFillColor(245, 85, 34); // minimal soft orange accent for total label
      doc.setTextColor(255);
      doc.rect(totalBarX, totalBarY, totalLabelW, 8, "F");
      doc.setFontSize(10);
      doc.text("Total", totalBarX + totalLabelW / 2, totalBarY + 5.5, { align: "center" });
      doc.setTextColor(...textGray);
      doc.setFontSize(11);
      doc.text(`PHP ${subtotal.toFixed(2)}`, totalBarX + totalLabelW + 8, totalBarY + 5.5, { align: "left" });

      // Notes
      const notesY = totalBarY + 16;
      if (formData.notes) {
        doc.setFontSize(10);
        doc.setTextColor(120);
        doc.text("Notes", marginLeft, notesY);
        doc.setTextColor(...textGray);
        doc.setFontSize(10);
        doc.text(String(formData.notes), marginLeft, notesY + 6, { maxWidth: pageWidth - marginLeft * 2 });
      }

      // Signature lines at the bottom
      const lineLength = 70;
      const gapFromBottom = 28;
      const leftX = marginLeft;
      const rightX = pageWidth - marginLeft - lineLength;
      const lineY = pageHeight - gapFromBottom;

      doc.setDrawColor(...lineGray);
      doc.setLineWidth(0.4);
      doc.line(leftX, lineY, leftX + lineLength, lineY);
      doc.line(rightX, lineY, rightX + lineLength, lineY);

      doc.setFontSize(10);
      doc.setTextColor(...textGray);
      doc.text("Supplier Signature", leftX, lineY + 6);
      doc.text("Admin / Inventory Signature", rightX, lineY + 6);

      const filename = `PO_Products_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error("PDF export error:", err);
      toast.error("Failed to generate PDF");
    }
  };

  const removeProductFromModalList = (id) => {
    setModalProducts(modalProducts.filter(p => p.id !== id));
    toast.info("Product removed from list");
  };

  const handleSimplePOInputChange = (field, value) => {
    setSimplePOData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSimplePOSubmit = async (e) => {
    e.preventDefault();
    
    // Validate user is logged in
    if (!currentUser.emp_id) {
      toast.error("No active user session. Please login again.");
      return;
    }

    // Check if there are products in the list
    if (modalProducts.length === 0) {
      toast.error("Please add at least one product to the order");
      return;
    }

    // Get supplier from Previous Orders section or check if set
    const supplierId = selectedSupplierForHistory || formData.supplier;
    
    if (!supplierId) {
      toast.error("Please select a supplier from Previous Orders section first");
      return;
    }

    if (!formData.expectedDeliveryStart || !formData.expectedDeliveryEnd) {
      toast.error("Please enter expected delivery date range first");
      return;
    }

    if (new Date(formData.expectedDeliveryStart) > new Date(formData.expectedDeliveryEnd)) {
      toast.error("Start date cannot be later than end date");
      return;
    }

    setLoading(true);

    try {
      const purchaseOrderData = {
        supplier_id: parseInt(selectedSupplierForHistory || formData.supplier),
        expected_delivery_date: formData.expectedDeliveryEnd, // Use end date for backward compatibility
        expected_delivery_start: formData.expectedDeliveryStart,
        expected_delivery_end: formData.expectedDeliveryEnd,
        created_by: currentUser.emp_id,
        products: modalProducts.map(product => ({
          productName: product.productName,
          product_id: product.productId || null, // Include product_id if available
          searchTerm: product.productName, // Keep for backward compatibility
          quantity: parseInt(product.quantity),
          unit_type: product.unitType,
          srp: parseFloat(product.srp) || 0
        }))
      };

      const response = await fetch(`${CREATE_PO_API}?action=create_purchase_order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(purchaseOrderData)
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`Purchase Order ${result.po_number} created successfully with ${modalProducts.length} product(s)!`);
        // Generate PDF immediately with the actual PO number
        try { await handleDownloadProductsPdf({ poNumber: result.po_number }); } catch (_) {}
        closeSimplePOModal();
        await movePOToDeliveredTable(result.po_number, result.purchase_header_id);
      } else {
        toast.error(result.error || "Error creating purchase order");
      }
    } catch (error) {
      toast.error("Error creating purchase order");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

     // No dropdown functionality needed

  // Debug: Monitor selectedProducts changes
  useEffect(() => {
  }, [selectedProducts]);

  // Create Purchase Order functions
  const fetchSuppliers = async () => {
    try {
      const response = await fetch(`${CREATE_PO_API}?action=suppliers`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.success) {
        setSuppliers(data.data || []);
      } else {
        console.warn('No suppliers found or error loading suppliers');
        setSuppliers([]);
      }
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      setSuppliers([]);
      if (error.message.includes('Failed to fetch')) {
        toast.error('Cannot connect to server. Please check if the backend is running.');
      }
    }
  };

  // Fetch previous order products by supplier
  const fetchPreviousOrderProducts = async (supplierId) => {
    if (!supplierId || supplierId <= 0) {
      setPreviousOrderProducts([]);
      return;
    }
    
    try {
      setLoadingPreviousProducts(true);
      const response = await fetch(`${API_BASE}?action=get_previous_orders_by_supplier&supplier_id=${supplierId}&_t=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.success) {
        setPreviousOrderProducts(data.data || []);
      } else {
        setPreviousOrderProducts([]);
        console.error('Error fetching previous orders:', data.error);
      }
    } catch (error) {
      console.error('Error fetching previous order products:', error);
      setPreviousOrderProducts([]);
    } finally {
      setLoadingPreviousProducts(false);
    }
  };

  // Handle supplier change for history
  const handleSupplierHistoryChange = (supplierId) => {
    setSelectedSupplierForHistory(supplierId);
    fetchPreviousOrderProducts(supplierId);
  };

  // Fetch critical products for PO suggestions
  const fetchCriticalProducts = async () => {
    try {
      setLoadingCriticalProducts(true);
      const response = await fetch(`${API_BASE}?action=get_critical_products_for_po&_t=${Date.now()}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      console.log('Critical Products API Response:', data);
      
      if (data.success) {
        const products = data.data || [];
        console.log(`✅ Found ${products.length} critical products from warehouse`);
        setCriticalProducts(products);
        
        if (products.length === 0) {
          console.warn('⚠️ No critical products found in warehouse. Checking if there are any products with stock <= 10...');
        }
      } else {
        console.warn('❌ API returned error:', data.error);
        setCriticalProducts([]);
        toast.warning('Could not load critical products: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('❌ Error fetching critical products:', error);
      setCriticalProducts([]);
      toast.error('Failed to load critical products from warehouse');
    } finally {
      setLoadingCriticalProducts(false);
    }
  };

  // Add critical product to selected products
  const addCriticalProductToPO = (product) => {
    // Check if product already exists in selectedProducts
    const exists = selectedProducts.some(p => p.searchTerm === product.product_name);
    if (exists) {
      toast.warning(`${product.product_name} is already in your purchase order.`);
      return;
    }

    // Add product with suggested quantity
    const newProduct = {
      id: Date.now(),
      searchTerm: product.product_name,
      quantity: product.suggested_quantity || 20,
      unitType: "pieces" // Default to pieces
    };
    
    setSelectedProducts([...selectedProducts, newProduct]);
    toast.success(`Added ${product.product_name} to purchase order with suggested quantity of ${newProduct.quantity}`);
  };

  

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Supplier form handlers
  const handleSupplierInputChange = (field, value) => {
    setSupplierFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const clearSupplierForm = () => {
    setSupplierFormData({
      supplier_name: "",
      supplier_address: "",
      supplier_contact: "",
      supplier_email: "",
      primary_phone: "",
      primary_email: "",
      contact_person: "",
      contact_title: "",
      notes: "",
    });
  };

  const openSupplierModal = () => {
    setShowSupplierModal(true);
  };

  const closeSupplierModal = () => {
    setShowSupplierModal(false);
  };

  const handleAddSupplier = async (e) => {
    e.preventDefault();
    
    if (
      !supplierFormData.supplier_name ||
      !supplierFormData.supplier_contact ||
      !supplierFormData.supplier_email
    ) {
      toast.error("Supplier name, contact, and email are required");
      return;
    }

    const supplierData = { ...supplierFormData };

    setLoading(true);

    try {
      const response = await fetch(`${CREATE_PO_API}?action=add_supplier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(supplierData)
      });

      const result = await response.json();

      if (result.success) {
        toast.success(result.message || "Supplier added successfully");
        setShowSupplierModal(false);
        fetchSuppliers(); // Refresh supplier list
      } else {
        toast.error(result.message || result.error || "Failed to add supplier");
      }
    } catch (error) {
      toast.error("Failed to add supplier: " + (error?.response?.data?.message || error.message));
      console.error("Error adding supplier:", error);
    } finally {
      setLoading(false);
    }
  };

     const addProduct = () => {
     const newProduct = {
       id: Date.now(),
       searchTerm: "",
       quantity: 1,
       unitType: "pieces" // Default to pieces
     };
     setSelectedProducts([...selectedProducts, newProduct]);
   };

  const removeProduct = (index) => {
    setSelectedProducts(selectedProducts.filter((_, i) => i !== index));
  };

  const safeNumber = (val) => {
    const num = typeof val === 'string' && val.trim() === '' ? 0 : Number(val);
    return Number.isNaN(num) ? 0 : num;
  };

  const updateProduct = (index, field, value) => {
     // Debug log
    const updatedProducts = [...selectedProducts];
    let safeValue = value;

    if (field === 'quantity') {
      safeValue = safeNumber(value);
    }

    updatedProducts[index] = {
      ...updatedProducts[index],
      [field]: safeValue
    };

    // Total calculation removed as requested

         // No complex logic needed - just update the field

    setSelectedProducts(updatedProducts);
  };

  // Total calculation removed as requested

  // Payment method functionality removed as requested

  // Note: PO creation automatically sets status to 'delivered' in backend

  // Function to automatically move PO to delivered table after creation
  const movePOToDeliveredTable = async (poNumber, poId) => {
    try {
      // Switch to the Purchase Orders tab immediately
      setActiveTab('list');
      setPoFilter('delivered'); // Show the delivered tab where the new PO should appear
      
      // Refresh data after switching tabs
      await fetchAllPurchaseOrders();
      
      // Force refresh the delivered tab data multiple times to ensure it loads
      await fetchPurchaseOrders('delivered');
      
      // Additional refreshes to ensure data is loaded
      setTimeout(async () => {
        await fetchPurchaseOrders('delivered');
      }, 200);
      
      setTimeout(async () => {
        await fetchPurchaseOrders('delivered');
      }, 1000);
      
      // Verify the PO appears in delivered table
      setTimeout(async () => {
        await fetchPurchaseOrders('delivered');
        
        // Check if PO is in the delivered list - use the updated filtering logic
        const allPOs = await fetch(`${API_BASE}?action=purchase_orders_with_products&_t=${Date.now()}&_r=${Math.random()}`);
        const allPOsData = await allPOs.json();
        
        if (allPOsData.success) {
          const deliveredPOs = allPOsData.data.filter(po => {
            // Include POs that have 'delivered' status in the header
            if (po.status === 'delivered') {
              return true;
            }
            
            // Also include POs that have products with delivered status
            const hasDeliveredProducts = po.products?.some(product => {
              let itemStatus = product.item_status;
              
              // If item_status is null, undefined, or empty, calculate it
              if (!itemStatus || itemStatus === 'null' || itemStatus === '') {
                const receivedQty = parseInt(product.received_qty) || 0;
                const quantity = parseInt(product.quantity) || 0;
                
                if (receivedQty >= quantity && quantity > 0) {
                  itemStatus = 'complete';
                } else if (receivedQty > 0) {
                  itemStatus = 'partial';
                } else {
                  itemStatus = 'delivered';
                }
              }
              
              return itemStatus === 'delivered';
            });
            
            return hasDeliveredProducts;
          });
          
          const foundPO = deliveredPOs.find(po => po.po_number === poNumber);
          
          if (foundPO) {
            toast.success(`✅ PO ${poNumber} is now visible in the delivered table!`);
          } else {
            // Retry one more time
            setTimeout(async () => {
              await fetchPurchaseOrders('delivered');
              const retryPOs = purchaseOrders.filter(po => po.status === 'delivered');
              const retryFoundPO = retryPOs.find(po => po.po_number === poNumber);
              if (retryFoundPO) {
                toast.success(`✅ PO ${poNumber} is now visible in the delivered table!`);
              } else {
                toast.warning(`⚠️ PO ${poNumber} created but may take a moment to appear in delivered table`);
              }
            }, 2000);
          }
        }
      }, 1500);
      
    } catch (error) {
      console.error('Error moving PO to delivered table:', error);
      toast.error('PO created but there was an issue updating the view');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate user is logged in
    if (!currentUser.emp_id) {
      toast.error("No active user session. Please login again.");
      return;
    }

    if (!formData.supplier) {
      toast.error("Please select a supplier");
      return;
    }

    // Validate expected delivery date is required
    if (!formData.expectedDeliveryStart || !formData.expectedDeliveryEnd) {
      toast.error("Please enter an expected delivery date");
      return;
    }

    // Validate expected delivery date is not earlier than order date
    const orderDate = new Date(formData.orderDate);
    const expectedDeliveryStartDate = new Date(formData.expectedDeliveryStart);
    
    if (expectedDeliveryStartDate < orderDate) {
      toast.error("Expected delivery date cannot be earlier than the order date");
      return;
    }

    if (selectedProducts.length === 0) {
      toast.error("Please add at least one product");
      return;
    }

         // Validate that each product has searchTerm and quantity
     for (let i = 0; i < selectedProducts.length; i++) {
       const product = selectedProducts[i];
       if (!product.searchTerm) {
         toast.error(`Product ${i + 1}: Please enter a product name`);
         return;
       }

       // Validate product name length (prevent truncation)
       if (product.searchTerm.length > 255) {
         toast.error(`Product ${i + 1}: Product name is too long (maximum 255 characters)`);
         return;
       }

       if (!product.quantity || product.quantity <= 0) {
         toast.error(`Product ${i + 1}: Please enter a valid quantity`);
         return;
       }
     }



    setLoading(true);

    try {
                   const purchaseOrderData = {
         supplier_id: parseInt(formData.supplier),
         expected_delivery_date: formData.expectedDeliveryEnd,
         expected_delivery_start: formData.expectedDeliveryStart,
         expected_delivery_end: formData.expectedDeliveryEnd,
         created_by: currentUser.emp_id,
         products: selectedProducts.map(product => ({
           searchTerm: product.searchTerm,
           quantity: parseInt(product.quantity),
           unit_type: product.unitType
         }))
       };

      const response = await fetch(`${CREATE_PO_API}?action=create_purchase_order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(purchaseOrderData)
      });

      const result = await response.json();
      if (result.success) {
        toast.success(`Purchase Order ${result.po_number} created successfully!`);
        // PO is automatically created with 'delivered' status in backend
        toast.info(`📦 Purchase Order ${result.po_number} created and automatically moved to delivered table!`);
        // Generate PDF immediately with the actual PO number
        try { await handleDownloadProductsPdf({ poNumber: result.po_number }); } catch (_) {}
        
        // Automatically move PO to delivered table
        await movePOToDeliveredTable(result.po_number, result.purchase_header_id);
      } else {
        toast.error(result.error || "Error creating purchase order");
      }
      
    } catch (error) {
      toast.error("Error creating purchase order");
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Purchase Order List functions - Modified to fetch individual products
  const fetchPurchaseOrders = async (status = null) => {
    try {
      // Always fetch ALL purchase orders and products, then filter on frontend
      let url = `${API_BASE}?action=purchase_orders_with_products&_t=${Date.now()}&_r=${Math.random()}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        // Debug: Log ALL delivered POs specifically
        const deliveredPOs = data.data.filter(po => po.status === 'delivered');
        // SIMPLIFIED: Just show all data for now
        setPurchaseOrders(data.data);
      } else {
        toast.error('Failed to load purchase orders');
      }
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
      toast.error('Error loading purchase orders');
    } finally {
      setPoLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      // New partial delivery status system
      delivered: { bgColor: 'var(--inventory-success)', textColor: 'white', text: 'Pending' },
      partial_delivery: { bgColor: 'var(--inventory-warning)', textColor: 'white', text: 'Partial Delivery' },
      complete: { bgColor: 'var(--inventory-accent)', textColor: 'white', text: 'Complete' },
      return: { bgColor: 'var(--inventory-danger)', textColor: 'white', text: 'Return' },
    };
    
    const config = statusConfig[status] || { bgColor: 'var(--inventory-success)', textColor: 'white', text: 'Complete' };
    return (
      <span 
        className="px-2 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: config.bgColor, color: config.textColor }}
      >
        {config.text}
      </span>
    );
  };



  // Normalize orders and get counts for all statuses
  const [allPurchaseOrders, setAllPurchaseOrders] = useState([]);
  
  // Fetch all purchase orders for counting (without status filter) - Updated to use products endpoint
  const fetchAllPurchaseOrders = async () => {
    try {
      const url = `${API_BASE}?action=purchase_orders_with_products`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setAllPurchaseOrders(data.data);
      } else {
        console.error('❌ fetchAllPurchaseOrders - API returned error:', data.error);
      }
    } catch (error) {
      console.error('❌ fetchAllPurchaseOrders - Error:', error);
    }
  };

  // Optimistically remove a PO from the current list view
  const removePoFromList = (poId) => {
    setPurchaseOrders((prev) => prev.filter((p) => p.purchase_header_id !== poId));
  };

  // Fetch all orders when component mounts to get counts
  useEffect(() => {
    fetchAllPurchaseOrders();
  }, []);

  const normalizedOrders = useMemo(() => {
    const seen = new Set();
    const rows = [];
    for (const po of allPurchaseOrders || []) {
      if (seen.has(po.purchase_header_id)) continue;
      seen.add(po.purchase_header_id);
      rows.push({
        ...po,
        delivery_status: po.delivery_status || 'pending',
        status: po.status || 'delivered',
      });
    }
    return rows;
  }, [allPurchaseOrders]);

  // Use the filtered purchase orders from API
  const filteredPurchaseOrders = useMemo(() => {
    const seen = new Set();
    const rows = [];
    for (const po of purchaseOrders || []) {
      if (seen.has(po.purchase_header_id)) continue;
      seen.add(po.purchase_header_id);
      
      // Exclude POs with 'received' status from all tabs
      if (po.status === 'received') {
        continue;
      }
      
      // If there's a poFilter active, filter products within the PO based on their individual status
      if (poFilter) {
        const products = po.products || [];
        
        // NEW LOGIC: Check if ANY product in the PO has missing items
        let hasAnyMissingItems = false;
        let hasAnyReceivedItems = false;
        
        products.forEach(product => {
          const receivedQty = parseInt(product.received_qty) || 0;
          const quantity = parseInt(product.quantity) || 0;
          const missingQty = Math.max(0, quantity - receivedQty);
          
          if (missingQty > 0) {
            hasAnyMissingItems = true;
          }
          if (receivedQty > 0) {
            hasAnyReceivedItems = true;
          }
        });
        
        // If ANY product has missing items, treat fully received products as "received" instead of "complete"
        // Products with missing quantities should remain in "partial"
        const filteredProducts = products.filter(product => {
          let itemStatus = product.item_status;
          
          // Calculate status if not available based on received quantities
          if (!itemStatus) {
            const receivedQty = parseInt(product.received_qty) || 0;
            const quantity = parseInt(product.quantity) || 0;
            const missingQty = Math.max(0, quantity - receivedQty);
            
            if (missingQty === 0 && quantity > 0) {
              // If ANY product in the PO has missing items, treat fully received products as "received" instead of "complete"
              itemStatus = hasAnyMissingItems ? 'received' : 'complete';
            } else if (receivedQty > 0) {
              // Products with missing quantities stay as "partial"
              itemStatus = 'partial';
            } else {
              itemStatus = 'delivered';
             }
          }
          
          // Map database statuses to frontend filter statuses
          if (itemStatus === 'pending') {
            itemStatus = 'delivered'; // Map 'pending' to 'delivered'
          } else if (itemStatus === 'partial_delivery') {
            itemStatus = 'partial'; // Map 'partial_delivery' to 'partial'
          }
          
          // Check if status matches the current filter
          if (poFilter === 'delivered' && itemStatus === 'delivered') return true;
          if (poFilter === 'partial' && itemStatus === 'partial') return true;
          if (poFilter === 'complete' && itemStatus === 'complete') return true;
          if (poFilter === 'received' && itemStatus === 'received') return true;
          if (poFilter === 'return' && itemStatus === 'returned') return true;
          
          return false;
        });
        
        // Only include this PO if it has at least one product matching the filter
        if (filteredProducts.length === 0) continue;
        
        // Create a modified PO with only the filtered products
        rows.push({
          ...po,
          products: filteredProducts, // Only include products that match the current filter
          delivery_status: po.delivery_status || 'pending',
          status: po.status || 'delivered',
        });
      } else {
        // No filter active, include the PO as-is
        rows.push({
          ...po,
          delivery_status: po.delivery_status || 'pending',
          status: po.status || 'delivered',
        });
      }
    }
    return rows;
  }, [purchaseOrders, poFilter]);

  const poCounts = useMemo(() => {
    // Count POs by status, checking individual product statuses
    const counts = {
      delivered: new Set(),
      partial: new Set(),
      complete: new Set(),
      received: new Set(),
      return: new Set(),
    };
    
    // Count POs from all purchase orders based on their individual product statuses
    allPurchaseOrders.forEach(po => {
      // Skip received POs - they should not appear in any tab
      if (po.status === 'received') {
        return;
      }
      
      const products = po.products || [];
      
      // Check if PO has any returned products
      const hasReturnedProducts = products.some(product => product.item_status === 'returned');
      
      // Check if PO has any products with specific statuses
      const hasCompleteProducts = products.some(product => product.item_status === 'complete');
      const hasPartialProducts = products.some(product => product.item_status === 'partial' || product.item_status === 'partial_delivery');
      const hasDeliveredProducts = products.some(product => {
        const status = product.item_status;
        return !status || status === 'pending' || status === 'delivered';
      });
      
      if (hasReturnedProducts) {
        counts['return'].add(po.purchase_header_id);
      } else if (hasCompleteProducts && !hasPartialProducts) {
        counts['complete'].add(po.purchase_header_id);
      } else if (hasPartialProducts) {
        counts['partial'].add(po.purchase_header_id);
      } else if (hasDeliveredProducts) {
        counts['delivered'].add(po.purchase_header_id);
      }
    });
    
    // Convert Sets to counts
    const result = {
      delivered: counts.delivered.size,
      partial: counts.partial.size,
      complete: counts.complete.size,
      received: counts.received.size,
      return: counts.return.size,
    };
    
    // Debug logging
    return result;
  }, [allPurchaseOrders]);

  // Removed activeMenuPO memo (no 3-dots menu)

  // Auto-receive all items when PO is approved
  const autoReceiveAllItems = async (poId, fromCompleteStatus = false) => {
    try {
      // Get PO details first
      const response = await fetch(`${API_BASE}?action=purchase_order_details&po_id=${poId}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error('Failed to load purchase order details');
      }

      // Map items for auto-receive (receive full quantities)
      const mapItems = (details = []) =>
        details.map((detail) => ({
          purchase_dtl_id: detail.purchase_dtl_id,
          product_id: detail.product_id,
          product_name: detail.product_name,
          ordered_qty: Number(detail.quantity) || 0,
          received_qty: Number(detail.quantity) || 0 // Auto-receive full quantity
        }));

      const normalizedDetails = (data.details || []).map((d) => ({
        ...d,
        product_name: d.product_name || d.item_name || d.name || d.searchTerm || d.product || 'Unknown Item'
      }));

      // Prepare auto-receive data
      const receiveData = {
        purchase_header_id: data.header.purchase_header_id,
        received_by: currentUser.emp_id,
        delivery_receipt_no: `AUTO-${Date.now()}`, // Auto-generated receipt number
        notes: 'Automatically received upon approval',
        items: mapItems(normalizedDetails)
          .filter(item => (parseInt(item.received_qty) || 0) > 0)
          .map(item => ({
            purchase_dtl_id: item.purchase_dtl_id,
            product_id: item.product_id,
            received_qty: parseInt(item.received_qty) || 0
          }))
      };

      // Send to receive_items API
      const receiveResponse = await fetch(`${API_BASE}?action=receive_items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(receiveData)
      });

      // Try to parse JSON; if it fails, use fallback
      let result;
      try {
        result = await receiveResponse.clone().json();
      } catch (parseErr) {
        const raw = await receiveResponse.text();
        console.warn('Non-JSON response from receive_items. Using fallback. Raw:', raw);
        
        // Fallback: use simplified endpoint
        const fallback = {
          purchase_header_id: receiveData.purchase_header_id,
          items: receiveData.items.map(i => ({
            purchase_dtl_id: i.purchase_dtl_id,
            received_qty: i.received_qty,
            missing_qty: 0 // No missing items since we're receiving full quantities
          }))
        };
        
        const fbRes = await fetch(`${API_BASE}?action=update_received_quantities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fallback)
        });
        
        let fbJson;
        try {
          fbJson = await fbRes.json();
        } catch (e) {
          fbJson = { success: false };
        }
        
        if (!fbJson.success) {
          throw new Error('Fallback receive failed');
        }
        
        result = { success: true, receiving_id: fbJson.receiving_id || 0 };
      }

      if (!result.success) {
        throw new Error(result.error || 'Auto-receive failed');
      }

      // Update PO status directly to 'received' for all cases
      try {
        await fetch(`${API_BASE}?action=update_po_status`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            purchase_header_id: poId,
            status: 'received'
          })
        });
      } catch (statusError) {
        console.warn('Could not update PO status to received:', statusError);
      }
      return result;
      
    } catch (error) {
      console.error('Auto-receive error:', error);
      throw error;
    }
  };

  const updatePOStatus = async (poId, nextStatus) => {
    try {
      // Get current PO details to check the current status
      const currentPO = purchaseOrders.find(po => po.purchase_header_id === poId);
      const currentStatus = currentPO ? currentPO.status : null;
      
      const requestBody = { 
        purchase_header_id: poId, 
        status: nextStatus 
      };
      
      // Add approval details if status is 'approved'
      if (nextStatus === 'approved') {
        requestBody.approved_by = currentUser.emp_id || 1; // Use current user's emp_id
        requestBody.approval_notes = `Purchase order approved by ${currentUser.full_name}`;
      }
      
      const response = await fetch(`${API_BASE}?action=update_po_status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Status updated successfully');
        
        // If approved, automatically receive all items
        if (nextStatus === 'approved') {
          try {
            await autoReceiveAllItems(poId, currentStatus === 'complete');
            
            // Special handling for PO coming from 'complete' status
            if (currentStatus === 'complete') {
              toast.success('Purchase order moved from Complete to Received status!');
              // Remove from current list immediately since it's no longer in 'complete' status
              setPurchaseOrders((prev) => prev.filter((po) => po.purchase_header_id !== poId));
            } else {
              // For other statuses, move directly to 'received' instead of 'complete'
              toast.success('Purchase order approved and moved to Received status!');
            }
          } catch (receiveError) {
            console.error('Auto-receive error:', receiveError);
            toast.warning('Purchase order approved but auto-receive failed. Please manually receive items.');
          }
        }
        
        await fetchPurchaseOrders(poFilter);
        await fetchAllPurchaseOrders();
        
        // Refresh the receiving list
        if (nextStatus === 'approved') {
          await fetchReceivingList();
        }
      } else {
        toast.error(data.error || 'Failed to update status');
      }
    } catch (e) {
      console.error('Update status error:', e);
      toast.error('Error updating status');
    } finally {
      // no-op; 3-dots menu removed
    }
  };

  const handleApprove = async (poId, action) => {
    try {
      const response = await fetch(`${API_BASE}?action=approve_purchase_order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purchase_header_id: poId,
          approved_by: currentUser.emp_id,
          approval_status: action,
          approval_notes: action === 'approved' ? 'Approved by admin' : 'Rejected by admin'
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Purchase Order ${action === 'approved' ? 'approved' : 'rejected'} successfully!`);
        fetchPurchaseOrders(); // Refresh the list
      } else {
        toast.error(result.error || `Error ${action}ing purchase order`);
      }
    } catch (error) {
      toast.error(`Error ${action}ing purchase order`);
      console.error('Error:', error);
    }
  };

  const handleUpdateDelivery = async (poId, status) => {
    try {
      const response = await fetch(`${API_BASE}?action=update_delivery_status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          purchase_header_id: poId,
          delivery_status: status,
          actual_delivery_date: status === 'delivered' ? new Date().toISOString().split('T')[0] : null
        })
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Delivery status updated to ${status}!`);
        fetchPurchaseOrders(); // Refresh the list
      } else {
        toast.error(result.error || 'Error updating delivery status');
      }
    } catch (error) {
      toast.error('Error updating delivery status');
      console.error('Error:', error);
    }
  };

  const viewDetails = async (poId) => {
    try {
      const response = await fetch(`${API_BASE}?action=purchase_order_details&po_id=${poId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedPO(data);
        setShowDetails(true);
      } else {
        toast.error('Failed to load purchase order details');
      }
    } catch (error) {
      console.error('Error fetching PO details:', error);
      toast.error('Error loading purchase order details');
    }
  };

  // New function to view individual product details
  const viewProductDetails = async (poId, productId) => {
    try {
      const response = await fetch(`${API_BASE}?action=purchase_order_details&po_id=${poId}`);
      const data = await response.json();
      if (data.success) {
        // Filter to show only the specific product
        const filteredData = {
          ...data,
          details: data.details.filter(detail => detail.product_id === productId)
        };
        setSelectedPO(filteredData);
        setShowDetails(true);
      } else {
        toast.error('Failed to load product details');
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
      toast.error('Error loading product details');
    }
  };

  // Function to receive all complete items in a PO
  const handleReceiveCompleteItems = async (poId) => {
    try {
      // Get PO details first
      const response = await fetch(`${API_BASE}?action=purchase_order_details&po_id=${poId}`);
      const data = await response.json();
      
      if (data.success) {
        // Filter to only show complete products (missing quantity = 0)
        const completeProducts = data.details.filter(detail => {
          const receivedQty = parseInt(detail.received_qty) || 0;
          const quantity = parseInt(detail.quantity) || 0;
          const missingQty = Math.max(0, quantity - receivedQty);
          return missingQty === 0 && quantity > 0;
        });

        if (completeProducts.length === 0) {
          toast.warning("No complete products found in this PO to receive.");
          return;
        }

        // Auto-receive complete products directly without showing form
        const receiveData = {
          purchase_header_id: poId,
          received_by: currentUser.emp_id,
          delivery_receipt_no: `AUTO-RECEIVE-${Date.now()}`,
          notes: 'Automatically received complete products',
          items: completeProducts.map(item => ({
            purchase_dtl_id: item.purchase_dtl_id,
            product_id: item.product_id,
            received_qty: parseInt(item.quantity) || 0,
            missing_qty: 0
          }))
        };

        // Send to receive_items API
        const receiveResponse = await fetch(`${API_BASE}?action=receive_items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(receiveData)
        });

        const result = await receiveResponse.json();
        
        if (result.success) {
          // Check if there are still partial products in the PO after receiving complete ones
          const remainingResponse = await fetch(`${API_BASE}?action=purchase_order_details&po_id=${poId}`);
          const remainingData = await remainingResponse.json();
          
          let poStatus = 'received'; // Default to received
          
          if (remainingData.success) {
            // Check if there are any products with missing quantities
            const hasPartialProducts = remainingData.details.some(detail => {
              const receivedQty = parseInt(detail.received_qty) || 0;
              const quantity = parseInt(detail.quantity) || 0;
              const missingQty = Math.max(0, quantity - receivedQty);
              return missingQty > 0;
            });
            
            if (hasPartialProducts) {
              poStatus = 'partial_delivery';
            }
          }
          
          // Update PO status based on remaining products
          await updatePOStatus(poId, poStatus);
          
          // Remove from current list immediately since it's no longer in 'complete' status
          setPurchaseOrders((prev) => prev.filter((po) => po.purchase_header_id !== poId));
          
          if (poStatus === 'partial_delivery') {
            toast.success(`✅ ${completeProducts.length} complete product(s) received! PO remains in Partial Products tab due to missing items.`);
          } else {
            toast.success(`✅ ${completeProducts.length} complete product(s) received! PO moved to received status.`);
          }
          
          // Refresh all lists
          await fetchPurchaseOrders(poFilter);
          await fetchAllPurchaseOrders();
        } else {
          toast.error('Failed to receive complete products');
        }
      } else {
        toast.error('Failed to load PO details');
      }
    } catch (error) {
      console.error('Error receiving complete products:', error);
      toast.error('Error receiving complete products');
    }
  };


  // Simple confirmation functions - now using toastify instead of window.confirm
  const confirmReturn = (productCount, poNumber) => {
    toast.info(`Returning ${productCount} complete product(s) from PO ${poNumber}...`);
    return true; // Always proceed since we're using toastify for feedback
  };

  const confirmCancelDelivery = (productCount, poNumber) => {
    toast.info(`Moving ${productCount} partial product(s) from PO ${poNumber} to Complete...`);
    return true; // Always proceed since we're using toastify for feedback
  };

  // Function to return delivery for a PO - updates backend status to return
  const handleReturnDelivery = async (poId) => {
    try {
      // Get PO details first
      const url = `${API_BASE}?action=purchase_order_details&po_id=${poId}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (data.success) {
        // Filter only delivered products (products that haven't been received yet)
        const deliveredProducts = data.details.filter(detail => {
          const receivedQty = parseInt(detail.received_qty) || 0;
          const quantity = parseInt(detail.quantity) || 0;
          return receivedQty === 0 && quantity > 0;
        });

        if (deliveredProducts.length === 0) {
          toast.warning('No delivered products found to return.');
          return;
        }

        const poNumber = data.header.po_number || `PO-${poId}`;
        const productCount = deliveredProducts.length;
        
        // Show confirmation
        const confirmed = window.confirm(
          `Are you sure you want to return delivery for ${productCount} product(s) from PO ${poNumber}?\n\nThis will permanently return the delivery and it won't appear in future lists.`
        );
        
        if (!confirmed) {
          toast.info('Return delivery operation cancelled.');
          return;
        }
        
        toast.info(`Returning delivery for ${productCount} product(s) from PO ${poNumber}...`);
        
        // Update product statuses to 'returned' in the backend
        let successCount = 0;
        let errorCount = 0;
        
        for (const product of deliveredProducts) {
          try {
            const updateResponse = await fetch(`${API_BASE}?action=update_product_status`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                purchase_dtl_id: product.purchase_dtl_id,
                item_status: 'returned'
              })
            });
            
            const updateResult = await updateResponse.json();
            
            if (updateResult.success) {
              successCount++;
            } else {
              errorCount++;
              console.error(`Failed to update ${product.product_name}:`, updateResult.error);
            }
          } catch (error) {
            errorCount++;
            console.error(`Error updating product ${product.product_name} status:`, error);
          }
        }
        
        // Refresh data from backend
        await fetchPurchaseOrders(poFilter);
        await fetchAllPurchaseOrders();
        
        toast.success(`Successfully returned ${successCount} product(s) from PO ${poNumber}. Check Returns tab.`);
        
      } else {
        throw new Error(data.message || 'Failed to fetch PO details');
      }
    } catch (error) {
      console.error('Error returning delivery:', error);
      toast.error(`Error returning delivery: ${error.message}`);
    }
  };

  // Function to return all complete items in a PO
  const handleReturnCompleteItems = async (poId) => {
    try {
      // Get PO details first
      const url = `${API_BASE}?action=purchase_order_details&po_id=${poId}`;
      // Add timeout and better error handling for fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        // Filter only complete products
        const completeProducts = data.details.filter(detail => {
          const missingQty = detail.missing_qty ?? (detail.quantity - (detail.received_qty || 0));
          return missingQty === 0;
        });

        if (completeProducts.length === 0) {
          toast.warning("No complete products found in this PO to return.");
          return;
        }

        // Confirm return action
        const shouldReturn = confirmReturn(completeProducts.length, data.header.po_number);
        
        if (!shouldReturn) {
          return;
        }

        // Update all complete products to 'returned' status
        let successCount = 0;
        let errorCount = 0;
        
        for (const product of completeProducts) {
          try {
            const updateResponse = await fetch(`${API_BASE}?action=update_product_status`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                purchase_dtl_id: product.purchase_dtl_id,
                item_status: 'returned'
              })
            });
            
            const updateResult = await updateResponse.json();
            
            if (updateResult.success) {
              successCount++;
            } else {
              errorCount++;
              console.error(`Failed to update ${product.product_name}:`, updateResult.error);
            }
          } catch (error) {
            errorCount++;
            console.error(`Error updating product ${product.product_name} status:`, error);
          }
        }

        // Refresh data
        await fetchPurchaseOrders(poFilter);
        await fetchAllPurchaseOrders();
        
        if (successCount > 0) {
          toast.success(`✅ ${successCount} product(s) returned successfully!`);
        }
        if (errorCount > 0) {
          toast.warning(`⚠️ ${errorCount} product(s) failed to return.`);
        }
      } else {
        toast.error('Failed to load PO details: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error returning complete items:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Provide more specific error messages
      if (error.message.includes('Failed to fetch') || error.name === 'AbortError') {
        toast.error('❌ Cannot connect to server. Please check if XAMPP is running and the backend is accessible.');
        console.error('🔧 Troubleshooting steps:');
        console.error('1. Make sure XAMPP is running');
        console.error('2. Check if Apache is started');
        console.error('3. Verify the URL:', API_BASE);
        console.error('4. Try accessing the URL directly in browser');
        console.error('5. Check if the backend file exists:', `${API_BASE}`);
        
        // Offer to test the URL manually
        const testUrl = `${API_BASE}?action=purchase_order_details&po_id=${poId}`;
        console.error('6. Test this URL in browser:', testUrl);
        
      } else if (error.message.includes('HTTP error')) {
        toast.error('❌ Server error: ' + error.message);
      } else {
        toast.error('❌ Error returning items: ' + error.message);
      }
    }
  };

  // Function to return partial products from a PO
  const handleReturnPartialProducts = async (poId) => {
    try {
      // Get PO details first
      const response = await fetch(`${API_BASE}?action=purchase_order_details&po_id=${poId}`);
      const data = await response.json();
      
      if (data.success) {
        // Filter only partial products (products that have missing quantities)
        const partialProducts = data.details.filter(detail => {
          const receivedQty = parseInt(detail.received_qty) || 0;
          const quantity = parseInt(detail.quantity) || 0;
          const missingQty = Math.max(0, quantity - receivedQty);
          return missingQty > 0;
        });

        if (partialProducts.length === 0) {
          toast.warning('No partial products found to return.');
          return;
        }

        const poNumber = data.header.po_number || `PO-${poId}`;
        const productCount = partialProducts.length;
        
        // Show confirmation
        const confirmed = window.confirm(
          `Are you sure you want to return ${productCount} partial product(s) from PO ${poNumber}?\n\nThis will mark these products as returned and move the PO to received status.`
        );
        
        if (!confirmed) {
          toast.info('Return operation cancelled.');
          return;
        }
        
        toast.info(`Returning ${productCount} partial product(s) from PO ${poNumber}...`);
        
        // Update product statuses to 'returned' in the backend
        let successCount = 0;
        let errorCount = 0;
        
        for (const product of partialProducts) {
          try {
            const updateResponse = await fetch(`${API_BASE}?action=update_product_status`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                purchase_dtl_id: product.purchase_dtl_id,
                item_status: 'returned',
                notes: `Product returned from partial delivery - PO ${poNumber}`
              })
            });
            
            const updateData = await updateResponse.json();
            if (updateData.success) {
              successCount++;
            } else {
              errorCount++;
              console.error('Failed to update product status:', updateData.error);
            }
          } catch (error) {
            errorCount++;
            console.error('Error updating product status:', error);
          }
        }
        
        if (successCount > 0) {
          // Update receiving record status to "Cancel" since we returned partial products
          try {
            const receivingResponse = await fetch(`${API_BASE}?action=update_receiving_status`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                po_id: poId,
                status: 'cancel',
                notes: 'Partial products returned - receiving cancelled'
              })
            });
            
            if (receivingResponse.ok) {
              const receivingData = await receivingResponse.json();
              if (receivingData.success) {
              }
            }
          } catch (receivingError) {
            console.warn('Could not update receiving status:', receivingError);
          }
          
          // Check if all remaining products are complete (no missing quantities)
          const remainingProducts = data.details.filter(detail => {
            const receivedQty = parseInt(detail.received_qty) || 0;
            const quantity = parseInt(detail.quantity) || 0;
            const missingQty = Math.max(0, quantity - receivedQty);
            return missingQty === 0 && quantity > 0; // Only complete products
          });
          
          // If all remaining products are complete, move PO to received status
          if (remainingProducts.length > 0 && remainingProducts.length === (data.details.length - partialProducts.length)) {
            try {
              await updatePOStatus(poId, 'received');
              toast.success(`✅ ${successCount} partial product(s) returned! PO moved to received status with Cancel status.`);
            } catch (statusError) {
              console.warn('Could not update PO status:', statusError);
              toast.success(`✅ ${successCount} partial product(s) returned! Receiving marked as cancelled.`);
            }
          } else {
            toast.success(`✅ ${successCount} partial product(s) returned! Receiving marked as cancelled.`);
          }
          
          // Remove from current list and refresh
          setPurchaseOrders((prev) => prev.filter((po) => po.purchase_header_id !== poId));
          await fetchPurchaseOrders(poFilter);
          await fetchAllPurchaseOrders();
          await fetchReceivingList(); // Refresh receiving list to show updated status
        } else {
          toast.error('Failed to return any products.');
        }
        
        if (errorCount > 0) {
          toast.warning(`${errorCount} product(s) failed to return.`);
        }
      } else {
        toast.error('Failed to load PO details');
      }
    } catch (error) {
      console.error('Error returning partial products:', error);
      toast.error('Error returning partial products');
    }
  };

  // Receive Items functions
  const fetchReceivingList = async () => {
    try {
      const response = await fetch(`${API_BASE}?action=receiving_list`);
      const data = await response.json();
      if (data.success) {
        // Auto-update pending statuses to completed for items that have been received
        const pendingItems = data.data.filter(item => 
          item.display_status === 'Ready' || item.status === 'pending'
        );
        
        for (const item of pendingItems) {
          try {
            await fetch(`${API_BASE}?action=update_receiving_status&receiving_id=${item.receiving_id}&status=completed`);
          } catch (error) {
            console.warn(`Failed to update status for receiving ID ${item.receiving_id}:`, error);
          }
        }
        
        // Refresh the list after status updates
        if (pendingItems.length > 0) {
          const refreshResponse = await fetch(`${API_BASE}?action=receiving_list`);
          const refreshData = await refreshResponse.json();
          if (refreshData.success) {
            setReceivingList(refreshData.data);
            return;
          }
        }
        
        setReceivingList(data.data);
      } else {
        toast.error('Failed to load receiving list');
      }
    } catch (error) {
      console.error('Error fetching receiving list:', error);
      toast.error('Error loading receiving list');
    } finally {
      setReceiveLoading(false);
    }
  };

  const fetchReceivedItemsDetails = async (receivingId) => {
    try {
      const response = await fetch(`${API_BASE}?action=received_items_details&receiving_id=${receivingId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedReceivedItems(data.data);
        setShowReceivedItemsModal(true);
      } else {
        toast.error('Failed to load received items details');
      }
    } catch (error) {
      console.error('Error fetching received items details:', error);
      toast.error('Error loading received items details');
    }
  };

  const handleReceive = async (poId) => {
    const mapItems = (details = []) =>
      details.map((detail) => ({
        purchase_dtl_id: detail.purchase_dtl_id,
        product_id: detail.product_id,
        product_name: detail.product_name,
        ordered_qty: Number(detail.quantity) || 0,
        received_qty: Number(detail.quantity) || 0
      }));

    try {
      // Try the simple API first
      let response = await fetch(`${API_BASE}?action=purchase_order_details&po_id=${poId}`);
      let data = await response.json();

      if (!data?.success) {
        // Fallback to full API if simple fails
        response = await fetch(`${API_BASE}?action=purchase_order_details&po_id=${poId}`);
        data = await response.json();
      }

      if (data?.success) {
        const normalizedDetails = (data.details || []).map((d) => ({
          ...d,
          product_name: d.product_name || d.item_name || d.name || d.searchTerm || d.product || 'Unknown Item'
        }));
        setSelectedPO({ ...data, details: normalizedDetails });
        setReceiveFormData({
          delivery_receipt_no: "",
          notes: "",
          items: mapItems(normalizedDetails),
        });
        setShowReceiveForm(true);
      } else {
        toast.error('Failed to load purchase order details');
      }
    } catch (error) {
      console.error('Error fetching PO details:', error);
      toast.error('Error loading purchase order details');
    }
  };

  // Handle receiving complete products - Auto-receive without form
  const handleReceiveCompleteProduct = async (poId, product) => {
    try {
      // Validate user is logged in
      if (!currentUser.emp_id) {
        toast.error("No active user session. Please login again.");
        return;
      }

      // Prepare receive data for this specific product
      const receiveData = {
        purchase_header_id: poId,
        received_by: currentUser.emp_id,
        delivery_receipt_no: `AUTO-${Date.now()}`,
        notes: `Auto-received complete product: ${product.product_name}`,
        items: [{
          purchase_dtl_id: product.purchase_dtl_id,
          product_id: product.product_id,
          received_qty: parseInt(product.received_qty) || 0,
          missing_qty: 0 // Complete products have no missing items
        }]
      };
      // Call the receive items API
      const response = await fetch(`${API_BASE}?action=receive_items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(receiveData)
      });

      let result;
      try {
        result = await response.clone().json();
      } catch (parseErr) {
        const raw = await response.text();
        console.warn('Non-JSON response from receive_items. Using fallback. Raw:', raw);
        
        // Fallback: use simplified endpoint
        const fallback = {
          purchase_header_id: receiveData.purchase_header_id,
          items: receiveData.items.map(i => ({
            purchase_dtl_id: i.purchase_dtl_id,
            received_qty: i.received_qty,
            missing_qty: 0
          }))
        };
        
        const fbRes = await fetch(`${API_BASE}?action=update_received_quantities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fallback)
        });
        
        let fbJson;
        try {
          fbJson = await fbRes.json();
        } catch (e) {
          fbJson = { success: false };
        }
        
        if (!fbJson.success) {
          throw new Error('Fallback receive failed');
        }
        
        result = { success: true, receiving_id: fbJson.receiving_id || 0 };
      }

      if (result.success) {
        toast.success(`✅ ${product.product_name} received successfully! Check Receive Items tab.`);
        
        // Update the product status to 'received' in the backend
        try {
          await fetch(`${API_BASE}?action=update_product_status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              purchase_dtl_id: product.purchase_dtl_id,
              item_status: 'received'
            })
          });
        } catch (statusError) {
          console.warn('Could not update product status to received:', statusError);
        }

        // Refresh all data to update the UI
        await fetchPurchaseOrders(poFilter);
        await fetchAllPurchaseOrders();
        await fetchReceivingList();
        
        // Switch to Receive Items tab to show the newly received item
        setActiveTab('receive');
        
      } else {
        toast.error(result.error || "Failed to receive product");
      }
      
    } catch (error) {
      console.error('Error receiving complete product:', error);
      toast.error("Error receiving product");
    }
  };

  const handleReceiveInputChange = (e) => {
    const { name, value } = e.target;
    setReceiveFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleItemChange = (index, field, value) => {
    const updatedItems = [...receiveFormData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value
    };
    setReceiveFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const handleSubmitReceive = async (e) => {
    e.preventDefault();
    
    if (!receiveFormData.delivery_receipt_no.trim()) {
      toast.error("Please enter delivery receipt number");
      return;
    }

    // Validate delivery receipt number length (prevent truncation)
    if (receiveFormData.delivery_receipt_no.length > 100) {
      toast.error("Delivery receipt number is too long (maximum 100 characters)");
      return;
    }

    // Validate notes length (prevent truncation)
    if (receiveFormData.notes && receiveFormData.notes.length > 500) {
      toast.error("Notes are too long (maximum 500 characters)");
      return;
    }

    const hasItems = receiveFormData.items.some(item => item.received_qty > 0);
    if (!hasItems) {
      toast.error("Please enter received quantities for at least one item");
      return;
    }

    try {
      const receiveData = {
        purchase_header_id: selectedPO.header.purchase_header_id,
        received_by: currentUser.emp_id,
        delivery_receipt_no: receiveFormData.delivery_receipt_no,
        notes: receiveFormData.notes,
        items: receiveFormData.items
          .filter(item => (parseInt(item.received_qty) || 0) > 0)
          .map(item => ({
            purchase_dtl_id: item.purchase_dtl_id,
            product_id: item.product_id,
            received_qty: parseInt(item.received_qty) || 0
          }))
      };

      const response = await fetch(`${API_BASE}?action=receive_items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(receiveData)
      });

      // Try to parse JSON; if it fails (even if content-type says JSON), fallback
      let result;
      try {
        result = await response.clone().json();
      } catch (parseErr) {
        const raw = await response.text();
        console.warn('Non-JSON response from receive_items. Falling back. Raw:', raw);
        // Fallback: use simplified endpoint to at least record quantities
        const fallback = {
          purchase_header_id: receiveData.purchase_header_id,
          items: receiveData.items.map(i => ({
            purchase_dtl_id: i.purchase_dtl_id,
            received_qty: i.received_qty,
            missing_qty: 0
          }))
        };
        const fbRes = await fetch(`${API_BASE}?action=update_received_quantities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fallback)
        });
        let fbJson;
        try {
          fbJson = await fbRes.json();
        } catch (e) {
          fbJson = { success: false };
        }
        if (!fbJson.success) throw new Error('Fallback receive failed');
        result = { success: true, receiving_id: fbJson.receiving_id || 0 };
      }
      
      if (result.success) {
        toast.success(`Items received successfully! Receiving ID: ${result.receiving_id}`);
        setShowReceiveForm(false);
        setSelectedPO(null);
        setReceiveFormData({
          delivery_receipt_no: "",
          notes: "",
          items: []
        });
        
        // Update PO status to 'received' and remove from Complete list
        try {
          await updatePOStatus(receiveData.purchase_header_id, 'received');
          // Optimistically remove from the current Complete list
          setPurchaseOrders((prev) => prev.filter((po) => po.purchase_header_id !== receiveData.purchase_header_id));
          
          // Force refresh all lists
          await fetchPurchaseOrders(poFilter);
          await fetchAllPurchaseOrders();
          
          // If we're on the Complete tab, force refresh it specifically
          if (poFilter === 'complete') {
            await fetchPurchaseOrders('complete');
          }
          
          toast.success('Purchase order moved to Received tab!');
        } catch (err) {
          console.warn('Could not update PO status after receiving:', err);
          // Still refresh the lists even if status update fails
          await fetchPurchaseOrders(poFilter);
          await fetchAllPurchaseOrders();
        }
        
        // Move to Receive Items page and refresh lists
        setActiveTab('receive');
        fetchReceivingList();
      } else {
        toast.error(result.error || "Error receiving items");
      }
    } catch (error) {
      toast.error("Error receiving items");
      console.error('Error:', error);
    }
  };



  // Handle Complete action from Delivered table (NO DATABASE SAVE)
  const handleCompleteItems = async (poId) => {
    try {
      // Get PO details for complete items
      const response = await fetch(`${API_BASE}?action=purchase_order_details&po_id=${poId}`);
      const data = await response.json();
      if (data.success) {
        // Filter to only show complete products (missing quantity = 0)
        const completeProducts = data.details.filter(detail => {
          const receivedQty = parseInt(detail.received_qty) || 0;
          const quantity = parseInt(detail.quantity) || 0;
          const missingQty = Math.max(0, quantity - receivedQty);
          return missingQty === 0 && quantity > 0;
        });

        if (completeProducts.length === 0) {
          toast.warning("No complete products found in this PO to process.");
          return;
        }

        // Create modified data with only complete products
        const modifiedData = {
          ...data,
          details: completeProducts
        };

        setSelectedPOForReceive(modifiedData);
        
        // Initialize form data with current received quantities
        const initialFormData = {};
        completeProducts.forEach(item => {
          initialFormData[item.purchase_dtl_id] = item.received_qty || 0;
        });
        setReceiveItemsFormData(initialFormData);
        setShowReceiveItemsForm(true);
      } else {
        toast.error('Failed to load purchase order details');
      }
    } catch (error) {
      console.error('Error fetching PO details:', error);
      toast.error('Error loading purchase order details');
    }
  };

  // Handle Receive Items action (with database save)
  const handleReceiveItems = async (poId) => {
    try {
      // Get PO details for receive items
      const response = await fetch(`${API_BASE}?action=purchase_order_details&po_id=${poId}`);
      const data = await response.json();
      if (data.success) {
        // Determine which products to show based on current filter
        let filteredProducts;
        
        if (poFilter === 'delivered') {
          // For delivered table, show products that haven't been received yet
          filteredProducts = data.details.filter(detail => {
            const receivedQty = parseInt(detail.received_qty) || 0;
            const quantity = parseInt(detail.quantity) || 0;
            return receivedQty === 0 && quantity > 0;
          });
        } else {
          // For partial table, show products that are partially received
          filteredProducts = data.details.filter(detail => {
            const receivedQty = parseInt(detail.received_qty) || 0;
            const quantity = parseInt(detail.quantity) || 0;
            const missingQty = Math.max(0, quantity - receivedQty);
            return receivedQty > 0 && missingQty > 0;
          });
        }

        if (filteredProducts.length === 0) {
          const message = poFilter === 'delivered' 
            ? "No delivered products found in this PO to receive." 
            : "No partial products found in this PO to receive.";
          toast.warning(message);
          return;
        }

        // Create modified data with filtered products
        const modifiedData = {
          ...data,
          details: filteredProducts
        };

        setSelectedPOForReceive(modifiedData);
        
        // Initialize form data with current received quantities
        const initialFormData = {};
        filteredProducts.forEach(item => {
          initialFormData[item.purchase_dtl_id] = item.received_qty || 0;
        });
        setReceiveItemsFormData(initialFormData);
        setShowReceiveItemsForm(true);
      } else {
        toast.error('Failed to load purchase order details');
      }
    } catch (error) {
      console.error('Error fetching PO details:', error);
      toast.error('Error loading purchase order details');
    }
  };





  // NEW FUNCTION: Process individual product status based on received quantities
  const processIndividualProductStatus = (items) => {
    const categorizedProducts = {
      complete: [],
      partial: [],
      delivered: []
    };

    items.forEach(item => {
      const orderedQty = parseInt(item.ordered_qty || item.quantity) || 0;
      const receivedQty = parseInt(item.received_qty) || 0;
      const missingQty = Math.max(0, orderedQty - receivedQty);

      if (receivedQty === 0) {
        // No items received - delivered
        categorizedProducts.delivered.push({
          ...item,
          status: 'delivered',
          missing_qty: missingQty
        });
      } else if (missingQty === 0) {
        // All items received - complete
        categorizedProducts.complete.push({
          ...item,
          status: 'complete',
          missing_qty: 0
        });
      } else {
        // Some items received - partial
        categorizedProducts.partial.push({
          ...item,
          status: 'partial_delivery',
          missing_qty: missingQty
        });
      }
    });

    return categorizedProducts;
  };

  // Handle Complete Items submit - Updates product-level item_status INDIVIDUALLY
  const handleSubmitCompleteItems = async (e) => {
    e.preventDefault();
    
    try {
      // Prepare items with received quantities
      const itemsWithQuantities = selectedPOForReceive.details.map(item => ({
        purchase_dtl_id: item.purchase_dtl_id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        ordered_qty: parseInt(item.quantity) || 0,
        received_qty: parseInt(receiveItemsFormData[item.purchase_dtl_id]) || 0,
        missing_qty: Math.max(0, (parseInt(item.quantity) || 0) - (parseInt(receiveItemsFormData[item.purchase_dtl_id]) || 0))
      }));

      // Categorize products individually
      const categorized = processIndividualProductStatus(itemsWithQuantities);
      // Prepare data for updating received quantities (this will update item_status per product)
      const receiveData = {
        purchase_header_id: selectedPOForReceive.header.purchase_header_id,
        delivery_receipt_no: `TEMP-${Date.now()}`, // Temporary receipt for tracking
        notes: 'Items marked with individual status from Delivered tab',
        items: itemsWithQuantities.map(item => ({
          purchase_dtl_id: item.purchase_dtl_id,
          product_id: item.product_id,
          received_qty: item.received_qty,
          missing_qty: item.missing_qty,
          // Add individual product status
          item_status: item.missing_qty === 0 ? 'complete' : 
                      item.received_qty > 0 ? 'partial_delivery' : 'delivered'
        }))
      };
      
      // Call API to update product-level status (item_status)
      const response = await fetch(`${API_BASE}?action=update_received_quantities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(receiveData)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Show detailed toast based on categorization
        if (categorized.complete.length > 0 && categorized.partial.length > 0) {
          toast.success(`✅ ${categorized.complete.length} product(s) marked as Complete, ${categorized.partial.length} as Partial!`);
        } else if (categorized.complete.length > 0) {
          toast.success(`✅ All ${categorized.complete.length} product(s) marked as Complete!`);
        } else if (categorized.partial.length > 0) {
          toast.warning(`⚠️ ${categorized.partial.length} product(s) marked as Partial Delivery!`);
        }
        
        // Determine overall PO status based on product mix
        let overallStatus = 'complete'; // Changed back to 'complete' - should go to Complete tab first
        if (categorized.partial.length > 0 || categorized.delivered.length > 0) {
          overallStatus = 'partial_delivery';
        }
        
        // Update PO status based on individual product statuses
        try {
          await updatePOStatus(receiveData.purchase_header_id, overallStatus);
        } catch (statusError) {
          console.warn('Could not update PO status:', statusError);
        }
        
        // Close form and refresh lists
        setShowReceiveItemsForm(false);
        setSelectedPOForReceive(null);
        setReceiveItemsFormData({});
        
        // Remove PO from current view optimistically (it will re-appear in correct tab after refresh)
        setPurchaseOrders((prev) => prev.filter((po) => po.purchase_header_id !== receiveData.purchase_header_id));
        
        // Also remove from allPurchaseOrders to ensure proper tab updates
        setAllPurchaseOrders(prev => prev.filter(po => po.purchase_header_id !== receiveData.purchase_header_id));
        
        // Refresh all purchase orders to update tab counts and visibility
        await fetchPurchaseOrders(poFilter);
        await fetchAllPurchaseOrders();
        
        // AUTO-SWITCH TO COMPLETE TAB if all items are complete
        if (categorized.complete.length > 0 && categorized.partial.length === 0 && categorized.delivered.length === 0) {
          toast.info(`📦 Purchase Order moved to Complete tab! Ready for final receiving.`);
          
          // Switch to Complete tab to show the completed PO
          setPoFilter('complete');
          
          // Refresh the Complete tab data
          setTimeout(async () => {
            await fetchPurchaseOrders('complete');
          }, 300);
        }
      } else {
        toast.error(result.error || 'Failed to update items');
      }
      
    } catch (error) {
      console.error('Error completing items:', error);
      toast.error('Error completing items');
    }
  };

  // Handle Receive Items submit (WITH DATABASE SAVE) - Individual Product Status
  const handleSubmitReceiveItems = async (e) => {
    e.preventDefault();
    
    try {
      // Prepare items with received quantities
      const itemsWithQuantities = selectedPOForReceive.details.map(item => ({
        purchase_dtl_id: item.purchase_dtl_id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        ordered_qty: parseInt(item.quantity) || 0,
        received_qty: parseInt(receiveItemsFormData[item.purchase_dtl_id]) || 0,
        missing_qty: Math.max(0, (parseInt(item.quantity) || 0) - (parseInt(receiveItemsFormData[item.purchase_dtl_id]) || 0))
      }));

      // Categorize products individually
      const categorized = processIndividualProductStatus(itemsWithQuantities);
      // Prepare the data to send with individual product status
      const receiveData = {
        purchase_header_id: selectedPOForReceive.header.purchase_header_id,
        items: itemsWithQuantities.map(item => ({
          purchase_dtl_id: item.purchase_dtl_id,
          product_id: item.product_id,
          received_qty: item.received_qty,
          missing_qty: item.missing_qty,
          // Add individual product status
          item_status: item.missing_qty === 0 ? 'complete' : 
                      item.received_qty > 0 ? 'partial_delivery' : 'delivered'
        }))
      };
      
      const currentStatus = selectedPOForReceive.header.status;
      
      // Check if any products were actually received (received_qty > 0)
      const hasReceivedProducts = itemsWithQuantities.some(item => item.received_qty > 0);
      
      // Only save to database if coming from Complete status (final receiving)
      // If coming from Delivered status, just update quantities locally and change status
      if (currentStatus === 'complete') {
        // Final receiving - save to database
        const response = await fetch(`${API_BASE}?action=update_received_quantities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(receiveData)
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Check if there are still partial products after receiving
          const categorized = processIndividualProductStatus(itemsWithQuantities);
          let finalStatus = 'received';
          
          if (categorized.partial.length > 0 || categorized.delivered.length > 0) {
            finalStatus = 'partial_delivery';
          }
          
          // Update status based on remaining products
          await updatePOStatus(selectedPOForReceive.header.purchase_header_id, finalStatus);
          
          // Show detailed toast based on individual product categorization
          if (categorized.complete.length > 0 && categorized.partial.length > 0) {
            toast.success(`✅ ${categorized.complete.length} complete, ${categorized.partial.length} partial product(s) saved to database!`);
          } else if (finalStatus === 'partial_delivery') {
            toast.success(`✅ Items received! PO remains in Partial Products tab due to missing items.`);
          } else {
            toast.success('Items received and saved to database!');
          }
          
          setShowReceiveItemsForm(false);
          setSelectedPOForReceive(null);
          setReceiveItemsFormData({});
          
          // Show success message
          toast.success('Purchase Order received successfully! Data will be removed from table.');
          
          // ALWAYS remove from current list when received - even if there are missing quantities
          // This is the requested behavior: remove data from table upon receiving
          setPurchaseOrders(prev => prev.filter(po => po.purchase_header_id !== selectedPOForReceive.header.purchase_header_id));
          
          // Also remove from allPurchaseOrders to ensure it doesn't reappear in any tab
          setAllPurchaseOrders(prev => prev.filter(po => po.purchase_header_id !== selectedPOForReceive.header.purchase_header_id));
          
          // Force refresh all tabs
          setTimeout(async () => {
            await fetchPurchaseOrders('complete');
            await fetchPurchaseOrders('partial');
            await fetchPurchaseOrders('delivered');
            await fetchAllPurchaseOrders();
            fetchReceivingList();
          }, 100);
        } else {
          toast.error(result.error || 'Failed to update received quantities');
        }
      } else {
        // Initial receiving from Delivered - just update quantities locally, don't save to database yet
        // Determine overall PO status based on individual product statuses
        let overallStatus = 'complete';
        
        if (categorized.partial.length > 0 || categorized.delivered.length > 0) {
          overallStatus = 'partial_delivery';
        }

        // Show detailed toast based on categorization
        if (overallStatus === 'complete') {
          toast.success(`✅ All ${categorized.complete.length} product(s) marked as complete! Ready for final receiving.`);
        } else if (categorized.partial.length > 0) {
          toast.warning(`⚠️ Mixed delivery! ${categorized.complete.length} complete, ${categorized.partial.length} partial product(s).`);
        } else {
          toast.info('📦 No items received yet.');
        }

        // For non-final receiving, update individual product statuses but DON'T update PO header status
        // The PO header status should remain as 'delivered' until ALL products are received
        // Individual product statuses are tracked via item_status column
        
        toast.success('Individual product statuses updated! Check Complete/Partial tabs.');
        setShowReceiveItemsForm(false);
        setSelectedPOForReceive(null);
        setReceiveItemsFormData({});
        
        // Update current view - refresh all data to ensure partial products don't reappear
        await fetchPurchaseOrders(poFilter);
        await fetchAllPurchaseOrders();
      }
    } catch (error) {
      console.error('Error updating received quantities:', error);
      toast.error('Error updating received quantities');
    }
  };



  // Partial Delivery Management functions

  const handleUpdatePartialDelivery = async (poId) => {
    try {
      // Get PO details for partial delivery update
      const response = await fetch(`${API_BASE}?action=purchase_order_details&po_id=${poId}`);
      const data = await response.json();
      if (data.success) {
        // Filter out complete products (missing_qty = 0) from partial delivery modal
        const incompleteProducts = data.details.filter(detail => {
          const missingQty = detail.missing_qty ?? (detail.quantity - (detail.received_qty || 0));
          return missingQty > 0; // Only show products that still have missing quantities
        });

        if (incompleteProducts.length === 0) {
          toast.info("All products in this PO are already complete. No partial delivery update needed.");
          return;
        }

        setSelectedPOForPartialDelivery(data);
        setPartialDeliveryFormData({
          items: incompleteProducts.map(detail => ({
            purchase_dtl_id: detail.purchase_dtl_id,
            product_name: detail.product_name,
            ordered_qty: detail.quantity,
            received_qty: detail.received_qty || 0,
            missing_qty: detail.missing_qty ?? (detail.quantity - (detail.received_qty || 0))
          }))
        });
        setShowPartialDeliveryForm(true);
      } else {
        toast.error('Failed to load purchase order details');
      }
    } catch (error) {
      console.error('Error fetching PO details:', error);
      toast.error('Error loading purchase order details');
    }
  };

  const handlePartialDeliveryInputChange = (index, field, value) => {
    const updatedItems = [...partialDeliveryFormData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: parseInt(value) || 0
    };
    
    // Recalculate missing quantity
    updatedItems[index].missing_qty = Math.max(0, updatedItems[index].ordered_qty - updatedItems[index].received_qty);
    
    setPartialDeliveryFormData(prev => ({
      ...prev,
      items: updatedItems
    }));
  };

  const handleSubmitPartialDelivery = async (e) => {
    e.preventDefault();
    
    const hasItems = partialDeliveryFormData.items.some(item => item.received_qty > 0);
    if (!hasItems) {
      toast.error("Please enter received quantities for at least one item");
      return;
    }

    try {
      // Categorize products individually based on received quantities
      const categorized = processIndividualProductStatus(partialDeliveryFormData.items);
      const partialDeliveryData = {
        purchase_header_id: selectedPOForPartialDelivery.header.purchase_header_id,
        items: partialDeliveryFormData.items.map(item => ({
          purchase_dtl_id: item.purchase_dtl_id,
          product_id: item.product_id,
          received_qty: item.received_qty,
          missing_qty: item.missing_qty,
          // Add individual product status
          item_status: item.missing_qty === 0 ? 'complete' : 
                      item.received_qty > 0 ? 'partial_delivery' : 'delivered'
        }))
      };

      const response = await fetch(`${API_BASE}?action=update_partial_delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(partialDeliveryData)
      });

      const result = await response.json();
      
      if (result.success) {
        // Use backend overall_status if available, otherwise use frontend categorization
        const overallStatus = result.overall_status || (categorized.complete.length > 0 && categorized.partial.length === 0 && categorized.delivered.length === 0 ? 'complete' : 'partial_delivery');
        
        // Show detailed toast based on individual product categorization
        if (categorized.complete.length > 0 && categorized.partial.length > 0) {
          toast.success(`✅ ${categorized.complete.length} product(s) complete, ${categorized.partial.length} still partial!`);
        } else if (categorized.complete.length > 0) {
          toast.success(`✅ All ${categorized.complete.length} product(s) now complete!`);
        } else if (categorized.partial.length > 0) {
          toast.warning(`⚠️ ${categorized.partial.length} product(s) still have missing items.`);
        }
        
        // Close form
        setShowPartialDeliveryForm(false);
        setSelectedPOForPartialDelivery(null);
        setPartialDeliveryFormData({ items: [] });
        
        // Remove PO from current view optimistically
        setPurchaseOrders((prev) => prev.filter((po) => po.purchase_header_id !== partialDeliveryData.purchase_header_id));
        
        // Refresh all purchase orders
        await fetchPurchaseOrders(poFilter);
        await fetchAllPurchaseOrders();
        
        // AUTO-MOVE TO RECEIVED STATUS if all items are now complete
        if (overallStatus === 'complete') {
          // Update PO status directly to 'received' instead of 'complete'
          try {
            await updatePOStatus(partialDeliveryData.purchase_header_id, 'received');
            toast.success(`📦 All items completed! Purchase Order moved to received status.`);
          } catch (statusError) {
            console.warn('Could not update PO status to received:', statusError);
            toast.warning('Items updated but could not change PO status');
          }
        }
      } else {
        toast.error(result.error || "Error updating partial delivery");
      }
    } catch (error) {
      toast.error("Error updating partial delivery");
      console.error('Error:', error);
    }
  };

  // Loading states
  if ((activeTab === 'create' && loading) || (activeTab === 'list' && poLoading) || (activeTab === 'receive' && receiveLoading)) {
    return (
      <div className="p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 inventory-surface min-h-screen">
      <div style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%', minHeight: '125vh' }}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{color: 'var(--inventory-text-primary)'}}>Purchase Order Management</h1>
          <p className="inventory-muted">Create, manage, and receive purchase orders</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="inventory-card rounded-3xl p-6">
        <div className="flex justify-between items-center">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex items-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'create'
                  ? 'inventory-button-primary text-white'
                  : 'inventory-muted hover:text-blue-600 hover:bg-gray-100'
              }`}
              style={{
                backgroundColor: activeTab === 'create' ? 'var(--inventory-accent)' : 'transparent',
                color: activeTab === 'create' ? 'white' : 'var(--inventory-text-secondary)'
              }}
            >
              <ShoppingCart className="h-4 w-4" />
              Create Purchase Order
            </button>
            <button
              onClick={() => setActiveTab('list')}
              className={`flex items-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'list'
                  ? 'inventory-button-primary text-white'
                  : 'inventory-muted hover:text-blue-600 hover:bg-gray-100'
              }`}
              style={{
                backgroundColor: activeTab === 'list' ? 'var(--inventory-accent)' : 'transparent',
                color: activeTab === 'list' ? 'white' : 'var(--inventory-text-secondary)'
              }}
            >
              <FileText className="h-4 w-4" />
              Purchase Orders
            </button>
            <button
              onClick={() => setActiveTab('receive')}
              className={`flex items-center gap-2 py-2 px-4 rounded-lg font-medium text-sm transition-colors ${
                activeTab === 'receive'
                  ? 'inventory-button-primary text-white'
                  : 'inventory-muted hover:text-blue-600 hover:bg-gray-100'
              }`}
              style={{
                backgroundColor: activeTab === 'receive' ? 'var(--inventory-accent)' : 'transparent',
                color: activeTab === 'receive' ? 'white' : 'var(--inventory-text-secondary)'
              }}
            >
              <Package className="h-4 w-4" />
              Receive Items
            </button>
          </nav>
        </div>
      </div>

      {/* Create Purchase Order Tab */}
      {activeTab === 'create' && (
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="inventory-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-6 w-6" style={{color: 'var(--inventory-accent)'}} />
              <h3 className="text-xl font-semibold" style={{color: 'var(--inventory-text-primary)'}}>Order Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium inventory-muted mb-2">
                  Order Date
                </label>
                <input
                  type="date"
                  name="orderDate"
                  value={formData.orderDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 inventory-input"
                  style={{
                    backgroundColor: 'var(--inventory-bg-secondary)',
                    color: 'var(--inventory-text-primary)',
                    borderColor: 'var(--inventory-border)'
                  }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium inventory-muted mb-2">
                  Expected Delivery Date Range <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs inventory-muted mb-1">Start Date</label>
                    <input
                      type="date"
                      name="expectedDeliveryStart"
                      value={formData.expectedDeliveryStart}
                      onChange={handleInputChange}
                      min={formData.orderDate}
                      max={formData.expectedDeliveryEnd || undefined}
                      required
                      className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 inventory-input"
                      style={{
                        backgroundColor: 'var(--inventory-bg-secondary)',
                        color: 'var(--inventory-text-primary)',
                        borderColor: 'var(--inventory-border)'
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs inventory-muted mb-1">End Date</label>
                    <input
                      type="date"
                      name="expectedDeliveryEnd"
                      value={formData.expectedDeliveryEnd}
                      onChange={handleInputChange}
                      min={formData.expectedDeliveryStart || formData.orderDate}
                      required
                      className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 inventory-input"
                      style={{
                        backgroundColor: 'var(--inventory-bg-secondary)',
                        color: 'var(--inventory-text-primary)',
                        borderColor: 'var(--inventory-border)'
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium inventory-muted mb-2">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows="3"
                  className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 inventory-textarea"
                  placeholder="Additional notes for this order..."
                />
              </div>
            </div>
          </div>


          {/* Create PO Button */}
          <div className="flex justify-center">
                                                                                      <button
                               type="button"
              onClick={openSimplePOModal}
              className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-semibold shadow-lg"
            >
              <ShoppingCart className="h-5 w-5" />
              Create P.O.
                             </button>
                           </div>
              </div>
      )}

      {/* Purchase Orders List Tab */}
      {activeTab === 'list' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8" style={{color: 'var(--inventory-accent)'}} />
              <h2 className="text-2xl font-bold" style={{color: 'var(--inventory-text-primary)'}}>Purchase Orders</h2>
            </div>

          </div>

          {/* PO Filters */}
          <div className="bg-white rounded-3xl shadow p-3">
            <div className="flex overflow-x-auto no-scrollbar gap-6 px-2">
              {[
                { key: 'delivered', label: 'Pending Products' },
                { key: 'partial', label: 'Partial Products' },
                { key: 'complete', label: 'Delivered Products' },
                { key: 'return', label: 'Returns' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => {
                    setPoFilter(f.key);
                  }}
                  className={`relative py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                    poFilter === f.key ? 'text-blue-700' : 'inventory-muted hover:text-blue-600'
                  }`}
                  style={{
                    color: poFilter === f.key ? 'var(--inventory-accent)' : 'var(--inventory-text-secondary)'
                  }}
                >
                  <span>
                    {f.label}
                    <span className="ml-1 text-xs inventory-muted">({poCounts[f.key] ?? 0})</span>
                  </span>
                  {poFilter === f.key && (
                    <span className="absolute left-0 right-0 -bottom-1 h-0.5 bg-blue-600 rounded-full" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Purchase Orders Table */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full min-w-max">
                <thead className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--inventory-text-primary)' }}>
                      PO Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--inventory-text-primary)' }}>
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--inventory-text-primary)' }}>
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--inventory-text-primary)' }}>
                      Ordered Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--inventory-text-primary)' }}>
                      Received Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--inventory-text-primary)' }}>
                      Missing Qty
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--inventory-text-primary)' }}>
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--inventory-text-primary)' }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredPurchaseOrders.map((po) => {
                    // Calculate summary for this PO
                    const products = po.products || [];
                    const totalProducts = products.length;
                    const deliveredProducts = products.filter(p => {
                      const itemStatus = p.item_status || 'delivered';
                      return itemStatus === 'delivered';
                    }).length;
                    const partialProducts = products.filter(p => {
                      const itemStatus = p.item_status || 'delivered';
                      return itemStatus === 'partial';
                    }).length;
                    const completeProducts = products.filter(p => {
                      const itemStatus = p.item_status || 'delivered';
                      return itemStatus === 'complete';
                    }).length;

                    // Determine overall PO status based on product mix
                    let overallStatus = 'complete';
                    if (deliveredProducts > 0 || partialProducts > 0) {
                      overallStatus = partialProducts > 0 ? 'partial' : 'delivered';
                    }

                    return (
                      <tr
                        key={po.purchase_header_id}
                        className="hover:bg-gray-50 group transition-all duration-200 hover:shadow-sm cursor-pointer"
                        onClick={() => viewDetails(po.purchase_header_id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium group-hover:!text-gray-900" style={{ color: 'var(--inventory-text-primary)' }}>
                          <div className="flex items-center gap-2">
                            <span className="group-hover:!text-gray-900">{po.po_number || `PO-${po.purchase_header_id}`}</span>
                            <FaEye className="h-3 w-3 inventory-muted group-hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm group-hover:!text-gray-900" style={{ color: 'var(--inventory-text-primary)' }}>
                          <div className="flex flex-col">
                            <span className="group-hover:!text-gray-900">{totalProducts} product{totalProducts !== 1 ? 's' : ''}</span>
                            <span className="text-xs inventory-muted group-hover:!text-gray-600">
                              {deliveredProducts > 0 && `${deliveredProducts} delivered`}
                              {partialProducts > 0 && `${partialProducts > 0 ? ', ' : ''}${partialProducts} partial`}
                              {completeProducts > 0 && `${completeProducts > 0 ? ', ' : ''}${completeProducts} complete`}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm group-hover:!text-gray-900" style={{ color: 'var(--inventory-text-primary)' }}>
                          <span className="group-hover:!text-gray-900">{po.supplier_name}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm group-hover:!text-gray-900" style={{ color: 'var(--inventory-text-primary)' }}>
                          <span className="group-hover:!text-gray-900">
                            {products.reduce((sum, p) => sum + (p.quantity || 0), 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm group-hover:!text-gray-900" style={{ color: 'var(--inventory-text-primary)' }}>
                          <span className="group-hover:!text-gray-900">
                            {products.reduce((sum, p) => sum + (p.received_qty || 0), 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm group-hover:!text-gray-900" style={{ color: 'var(--inventory-text-primary)' }}>
                          <span className="group-hover:!text-gray-900">
                            {products.reduce((sum, p) => {
                              const missingQty = p.missing_qty ?? (p.quantity - (p.received_qty || 0));
                              return sum + missingQty;
                            }, 0)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {(() => {
                            if (overallStatus === 'complete') {
                              return (
                                <span className="px-2 py-1 rounded-full text-xs font-medium" style={{backgroundColor: 'var(--inventory-accent)', color: 'white'}}>
                                  Complete
                                </span>
                              );
                            } else if (overallStatus === 'partial') {
                              return (
                                <span className="px-2 py-1 rounded-full text-xs font-medium" style={{backgroundColor: 'var(--inventory-warning)', color: 'white'}}>
                                  Partial
                                </span>
                              );
                            } else {
                              return (
                                <span className="px-2 py-1 rounded-full text-xs font-medium" style={{backgroundColor: 'var(--inventory-info)', color: 'white'}}>
                                  Pending
                                </span>
                              );
                            }
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center gap-2">
                            {/* View Details Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                viewDetails(po.purchase_header_id);
                              }}
                              className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                          
                              onMouseLeave={handleMouseLeave}
                            >
                              <FaEye className="h-3 w-3" />
                            </button>
                            
                            {/* PO-level Actions */}
                            {(() => {
                              if (overallStatus === 'complete') {
                                // Check if we're in Returns tab - if so, only show Return button
                                if (poFilter === 'return') {
                                  return (
                                    <button
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleReturnCompleteItems(po.purchase_header_id); 
                                      }}
                                      className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                                      onMouseLeave={handleMouseLeave}
                                    >
                                      Return
                                    </button>
                                  );
                                } else {
                                  // Normal complete products - show both Received and Return buttons
                                  return (
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          handleReceiveCompleteItems(po.purchase_header_id); 
                                        }}
                                        className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-xs"
                                        onMouseLeave={handleMouseLeave}
                                      >
                                        Received
                                      </button>
                                      <button
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          handleReturnCompleteItems(po.purchase_header_id); 
                                        }}
                                        className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                                        onMouseLeave={handleMouseLeave}
                                      >
                                        Return
                                      </button>
                                    </div>
                                  );
                                }
                              } else if (overallStatus === 'partial') {
                                return (
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleUpdatePartialDelivery(po.purchase_header_id); 
                                      }}
                                      className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-yellow-600 text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-xs"
                                      onMouseLeave={handleMouseLeave}
                                    >
                                      Update
                                    </button>
                                    <button
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleReturnPartialProducts(po.purchase_header_id); 
                                      }}
                                      className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                                      onMouseLeave={handleMouseLeave}
                                    >
                                      Return
                                    </button>
                                  </div>
                                );
                              } else {
                                // Check if this PO is in the Returns tab (poFilter === 'return')
                                const isInReturnsTab = poFilter === 'return';
                                
                                // Also check if this PO has any returned products
                                const hasReturnedProducts = products.some(product => product.item_status === 'returned');
                                
                                // Debug: Log the detection
                                // Force hide Received button if we're in Returns tab
                                if (poFilter === 'return') {
                                  // For returned POs or POs in Returns tab, only show Return button (no Received button)
                                  return (
                                    <button
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleReturnDelivery(po.purchase_header_id); 
                                      }}
                                      className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                                      onMouseLeave={handleMouseLeave}
                                    >
                                      Return
                                    </button>
                                  );
                                } else {
                                  // For non-returned POs, show both Complete and Return buttons
                                  return (
                                    <div className="flex items-center gap-2">
                                      <button
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          handleReceiveItems(po.purchase_header_id); 
                                        }}
                                        className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                                        onMouseLeave={handleMouseLeave}
                                      >
                                        Delivered
                                      </button>
                                      <button
                                        onClick={(e) => { 
                                          e.stopPropagation(); 
                                          handleReturnDelivery(po.purchase_header_id); 
                                        }}
                                        className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                                        onMouseLeave={handleMouseLeave}
                                      >
                                        Return
                                      </button>
                                    </div>
                                  );
                                }
                              }
                            })()}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Receive Items Tab */}
      {activeTab === 'receive' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Package className="h-8 w-8" style={{color: 'var(--inventory-success)'}} />
              <h2 className="text-2xl font-bold" style={{color: 'var(--inventory-text-primary)'}}>Receive Items</h2>
            </div>

          </div>

          {/* Receiving List Table */}
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <div className="overflow-x-auto max-h-96">
              <table className="w-full min-w-max">
                <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--inventory-text-primary)' }}>
                      Receiving ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--inventory-text-primary)' }}>
                      PO Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--inventory-text-primary)' }}>
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--inventory-text-primary)' }}>
                      Received Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--inventory-text-primary)' }}>
                      Received Items
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--inventory-text-primary)' }}>
                      Status
                    </th>
                    
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(() => {
                    // Debug: Log the receiving list to see the current status values
                    // Group receiving records by PO number to avoid duplicates
                    const groupedByPO = receivingList.reduce((acc, item) => {
                      const poKey = item.po_number || `PO-${item.purchase_header_id}`;
                      if (!acc[poKey]) {
                        acc[poKey] = [];
                      }
                      acc[poKey].push(item);
                      return acc;
                    }, {});

                    // Convert to array and show only one row per PO with latest receiving info
                    return Object.entries(groupedByPO).map(([poNumber, items]) => {
                      // Sort by receiving_id descending to get the latest one
                      const sortedItems = [...items].sort((a, b) => (b.receiving_id || 0) - (a.receiving_id || 0));
                      const latestItem = sortedItems[0];
                      const totalReceivings = items.length;

                      // Use the most recent status from the latest item (which should have the updated status from backend)
                      const displayStatus = latestItem.display_status;
                      

                      return (
                        <tr key={poNumber} className="hover:bg-gray-50 group transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium group-hover:!text-gray-900" style={{ color: 'var(--inventory-text-primary)' }}>
                            <span className="group-hover:!text-gray-900">
                              {latestItem.receiving_id ? 
                                `RCV-${latestItem.receiving_id.toString().padStart(6, '0')}` : 
                                `PO-${latestItem.purchase_header_id.toString().padStart(6, '0')}`
                              }
                              {totalReceivings > 1 && (
                                <div className="text-xs inventory-muted group-hover:!text-gray-600">
                                  +{totalReceivings - 1} more
                                </div>
                              )}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm group-hover:!text-gray-900" style={{ color: 'var(--inventory-text-primary)' }}>
                            <span className="group-hover:!text-gray-900">{poNumber}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm group-hover:!text-gray-900" style={{ color: 'var(--inventory-text-primary)' }}>
                            <span className="group-hover:!text-gray-900">{latestItem.supplier_name}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm group-hover:!text-gray-900" style={{ color: 'var(--inventory-text-primary)' }}>
                            <div className="group-hover:!text-gray-900">
                              {latestItem.receiving_date ? 
                                new Date(latestItem.receiving_date).toLocaleDateString() : 
                                new Date(latestItem.po_date).toLocaleDateString()}
                              {latestItem.receiving_time && (
                                <div className="text-xs inventory-muted group-hover:!text-gray-600">
                                  {latestItem.receiving_time}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm max-w-xs group-hover:!text-gray-900" style={{ color: 'var(--inventory-text-primary)' }}>
                            <button
                              onClick={() => {
                                if (latestItem.receiving_id) {
                                  fetchReceivedItemsDetails(latestItem.receiving_id);
                                } else {
                                  fetch(`${API_BASE}?action=purchase_order_details&po_id=${latestItem.purchase_header_id}`)
                                    .then(response => response.json())
                                    .then(data => {
                                      if (data.success) {
                                        setSelectedPO(data);
                                        setShowDetails(true);
                                      } else {
                                        toast.error("Failed to fetch purchase order details");
                                      }
                                    })
                                    .catch(error => {
                                      toast.error("Error loading purchase order details");
                                      console.error('Error:', error);
                                    });
                                }
                              }}
                              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md transition-colors text-sm font-medium"
                              title="View received items details"
                            >
                              <FaEye className="h-3.5 w-3.5" />
                              View Details
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              displayStatus === 'Complete' ? 'bg-green-100 text-green-800' :
                              displayStatus === 'Partial' ? 'bg-orange-100 text-orange-800' :
                              displayStatus === 'Ready' ? 'bg-blue-100 text-blue-800' :
                              'bg-yellow-100 text-yellow-800'
                            }`}>
                              {displayStatus || 'Received'}
                            </span>
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Order Details Modal */}
      {showDetails && selectedPO && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold" style={{color: 'var(--inventory-text-primary)'}}>
                  Purchase Order Details - {selectedPO.header.po_number}
                </h3>
                <button
                  onClick={() => setShowDetails(false)}
                  className="inventory-muted hover:text-red-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm inventory-muted">Supplier</p>
                  <p className="font-medium" style={{color: 'var(--inventory-text-primary)'}}>{selectedPO.header.supplier_name}</p>
                </div>
                <div>
                  <p className="text-sm inventory-muted">Order Date</p>
                  <p className="font-medium" style={{color: 'var(--inventory-text-primary)'}}>{new Date(selectedPO.header.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm inventory-muted">Expected Delivery</p>
                  <p className="font-medium" style={{color: 'var(--inventory-text-primary)'}}>
                    {selectedPO.header.expected_delivery_date ? 
                      new Date(selectedPO.header.expected_delivery_date).toLocaleDateString() : 'Not set'}
                  </p>
                </div>
                                 {/* Total Amount display removed as requested */}
              </div>

              <div className="mb-6">
                <h4 className="text-md font-medium mb-3" style={{color: 'var(--inventory-text-primary)'}}>Order Items</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                                         <thead className="bg-gray-50">
                       <tr>
                         <th className="px-4 py-2 text-left text-xs font-medium uppercase inventory-muted">Product</th>
                         <th className="px-4 py-2 text-left text-xs font-medium uppercase inventory-muted">Ordered Qty</th>
                         <th className="px-4 py-2 text-left text-xs font-medium uppercase inventory-muted">Received Qty</th>
                         <th className="px-4 py-2 text-left text-xs font-medium uppercase inventory-muted">Missing Qty</th>
                         <th className="px-4 py-2 text-left text-xs font-medium uppercase inventory-muted">Status</th>
                       </tr>
                     </thead>
                     <tbody className="bg-white divide-y divide-gray-200">
                       {selectedPO.details.map((item, index) => (
                         <tr key={index}>
                           <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>{item.product_name}</td>
                           <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>{item.quantity}</td>
                           <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>{item.received_qty || 0}</td>
                           <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>{item.missing_qty ?? (item.quantity - (item.received_qty || 0))}</td>
                           <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>
                             {(() => {
                               const missingQty = item.missing_qty ?? (item.quantity - (item.received_qty || 0));
                               const receivedQty = item.received_qty || 0;
                               
                               if (missingQty === 0) {
                                 return (
                                   <span className="px-2 py-1 rounded-full text-xs font-medium" style={{backgroundColor: 'var(--inventory-success)', color: 'white'}}>
                                     Complete
                                   </span>
                                 );
                               } else if (receivedQty > 0) {
                                 return (
                                   <span className="px-2 py-1 rounded-full text-xs font-medium" style={{backgroundColor: 'var(--inventory-warning)', color: 'white'}}>
                                     Partial
                                   </span>
                                 );
                               } else {
                                 return (
                                   <span className="px-2 py-1 rounded-full text-xs font-medium" style={{backgroundColor: 'var(--inventory-info)', color: 'white'}}>
                                     Pending
                                   </span>
                                 );
                               }
                             })()}
                           </td>
                         </tr>
                       ))}
                     </tbody>
                  </table>
                </div>
                             </div>

               {/* Missing Items Requests Section */}
               {selectedPO.missing_requests && selectedPO.missing_requests.length > 0 && (
                 <div className="mb-6">
                   <h4 className="text-md font-medium mb-3" style={{color: 'var(--inventory-text-primary)'}}>Missing Items Requests</h4>
                   <div className="space-y-3">
                     {selectedPO.missing_requests.map((request, index) => (
                       <div key={index} className="border rounded-lg p-4" style={{backgroundColor: 'var(--inventory-bg-secondary)', borderColor: 'var(--inventory-warning)'}}>
                         <div className="flex justify-between items-start">
                           <div>
                             <p className="text-sm" style={{color: 'var(--inventory-text-primary)'}}>
                               <strong>Request Date:</strong> {new Date(request.request_date).toLocaleDateString()}
                             </p>
                             <p className="text-sm" style={{color: 'var(--inventory-text-primary)'}}>
                               <strong>Status:</strong> 
                               <span className="ml-2 px-2 py-1 rounded-full text-xs font-medium" style={{
                                 backgroundColor: request.status === 'pending' ? 'var(--inventory-warning)' :
                                 request.status === 'in_progress' ? 'var(--inventory-accent)' :
                                 request.status === 'resolved' ? 'var(--inventory-success)' :
                                 'var(--inventory-danger)',
                                 color: 'white'
                               }}>
                                 {request.status.replace('_', ' ').toUpperCase()}
                               </span>
                             </p>
                             <p className="text-sm mt-2" style={{color: 'var(--inventory-text-primary)'}}>
                               <strong>Notes:</strong> {request.notes}
                             </p>
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

             </div>
             <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50 inventory-button-primary"
                style={{borderColor: 'var(--inventory-border)', color: 'var(--inventory-text-primary)'}}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receive Items Modal */}
      {showReceiveForm && selectedPO && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold" style={{color: 'var(--inventory-text-primary)'}}>
                  Receive Items - {selectedPO.header.po_number}
                </h3>
                <button
                  onClick={() => setShowReceiveForm(false)}
                  className="inventory-muted hover:text-red-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">

              <form id="receiveForm" onSubmit={handleSubmitReceive} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{color: 'var(--inventory-text-primary)'}}>
                      Delivery Receipt No. *
                    </label>
                    <input
                      type="text"
                      name="delivery_receipt_no"
                      value={receiveFormData.delivery_receipt_no}
                      onChange={handleReceiveInputChange}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 inventory-input"
                      style={{borderColor: 'var(--inventory-border)'}}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{color: 'var(--inventory-text-primary)'}}>
                      Notes
                    </label>
                    <input
                      type="text"
                      name="notes"
                      value={receiveFormData.notes}
                      onChange={handleReceiveInputChange}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 inventory-input"
                      style={{borderColor: 'var(--inventory-border)'}}
                    />
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-md font-medium mb-3" style={{color: 'var(--inventory-text-primary)'}}>Items to Receive</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase inventory-muted">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase inventory-muted">Ordered Qty</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase inventory-muted">Received Qty</th>
                          {/* Unit Price column removed as requested */}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {receiveFormData.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>{item.product_name}</td>
                            <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>{item.ordered_qty}</td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min="0"
                                max={item.ordered_qty}
                                value={item.received_qty}
                                onChange={(e) => handleItemChange(index, 'received_qty', parseInt(e.target.value))}
                                className="w-20 px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" style={{borderColor: 'var(--inventory-border)'}}
                              />
                            </td>
                            {/* Unit Price display removed as requested */}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

              </form>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setShowReceiveForm(false)}
                className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
                style={{borderColor: 'var(--inventory-border)', color: 'var(--inventory-text-primary)'}}
              >
                <FaTimes className="h-4 w-4" />
                Cancel
              </button>
              <button
                type="submit"
                form="receiveForm"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <FaCheck className="h-4 w-4" />
                Receive Items
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Receive Items Modal */}
      {showReceiveItemsForm && selectedPOForReceive && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold" style={{color: 'var(--inventory-text-primary)'}}>
                  Receive Items - {selectedPOForReceive.header.po_number}
                </h3>
                <button
                  onClick={() => setShowReceiveItemsForm(false)}
                  className="inventory-muted hover:text-red-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={selectedPOForReceive?.header?.status === 'delivered' ? handleSubmitCompleteItems : handleSubmitReceiveItems} className="space-y-4">
                <div className="mb-4">
                  <p className="text-sm inventory-muted mb-4">
                    {selectedPOForReceive?.header?.status === 'delivered' 
                      ? "Enter the quantities to mark as complete. Items will move to Complete table (no database save yet)."
                      : "Enter the actual quantities received for each item. This will save to database and move to Received table."
                    }
                  </p>
                </div>
                
                <div className="space-y-4">
                  {selectedPOForReceive.details.map((item, index) => (
                    <div key={item.purchase_dtl_id} className="border rounded-lg p-4" style={{borderColor: 'var(--inventory-border)', backgroundColor: 'var(--inventory-bg-secondary)'}}>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{color: 'var(--inventory-text-primary)'}}>
                            Product
                          </label>
                          <p className="text-sm" style={{color: 'var(--inventory-text-primary)'}}>{item.product_name}</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{color: 'var(--inventory-text-primary)'}}>
                            Ordered Qty
                          </label>
                          <p className="text-sm" style={{color: 'var(--inventory-text-primary)'}}>{item.quantity} {item.unit_type}</p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{color: 'var(--inventory-text-primary)'}}>
                            Received Qty *
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={item.quantity}
                            value={receiveItemsFormData[item.purchase_dtl_id] || 0}
                            onChange={(e) => setReceiveItemsFormData({
                              ...receiveItemsFormData,
                              [item.purchase_dtl_id]: parseInt(e.target.value) || 0
                            })}
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" style={{borderColor: 'var(--inventory-border)'}}
                            required
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{color: 'var(--inventory-text-primary)'}}>
                            Status
                          </label>
                          <div className="text-sm">
                            {(() => {
                              const received = parseInt(receiveItemsFormData[item.purchase_dtl_id]) || 0;
                              const ordered = parseInt(item.quantity) || 0;
                              const missing = Math.max(0, ordered - received);
                              
                              if (received === 0) {
                                return <span className="inventory-muted">Not Received</span>;
                              } else if (received === ordered) {
                                return <span className="font-medium" style={{color: 'var(--inventory-success)'}}>✅ Complete</span>;
                              } else if (received > 0) {
                                return <span className="font-medium" style={{color: 'var(--inventory-warning)'}}>⚠️ Partial ({missing} missing)</span>;
                              }
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowReceiveItemsForm(false)}
                    className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50" style={{borderColor: 'var(--inventory-border)', color: 'var(--inventory-text-primary)'}}
                  >
                    <FaTimes className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <FaCheck className="h-4 w-4" />
                    {selectedPOForReceive?.header?.status === 'delivered' ? "Mark as Complete" : "Receive Items"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Partial Delivery Management Modal */}
      {showPartialDeliveryForm && selectedPOForPartialDelivery && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold" style={{color: 'var(--inventory-text-primary)'}}>
                  Partial Delivery Update - {selectedPOForPartialDelivery.header.po_number}
                </h3>
                <button
                  onClick={() => setShowPartialDeliveryForm(false)}
                  className="inventory-muted hover:text-red-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmitPartialDelivery} className="space-y-4">
                <div className="mt-6">
                  <h4 className="text-md font-medium mb-3" style={{color: 'var(--inventory-text-primary)'}}>Items to Update</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase inventory-muted">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase inventory-muted">Ordered Qty</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase inventory-muted">Received Qty</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase inventory-muted">Missing Qty</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {partialDeliveryFormData.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>{item.product_name}</td>
                            <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>{item.ordered_qty}</td>
                            <td className="px-4 py-2">
                              <input
                                type="number"
                                min="0"
                                max={item.ordered_qty}
                                value={item.received_qty}
                                onChange={(e) => handlePartialDeliveryInputChange(index, 'received_qty', parseInt(e.target.value))}
                                className="w-20 px-2 py-1 border rounded-md focus:outline-none focus:ring-2 focus:ring-green-500" style={{borderColor: 'var(--inventory-border)'}}
                              />
                            </td>
                            <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>{item.missing_qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowPartialDeliveryForm(false)}
                    className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50" style={{borderColor: 'var(--inventory-border)', color: 'var(--inventory-text-primary)'}}
                  >
                    <FaTimes className="h-4 w-4" />
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
                  >
                    <FaCheck className="h-4 w-4" />
                    Update Partial Delivery
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Received Items Details Modal */}
      {showReceivedItemsModal && selectedReceivedItems && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold" style={{color: 'var(--inventory-text-primary)'}}>
                  Received Items Details - {selectedReceivedItems.receiving_id ? `RCV-${selectedReceivedItems.receiving_id.toString().padStart(6, '0')}` : 'N/A'}
                </h3>
                <button
                  onClick={() => setShowReceivedItemsModal(false)}
                  className="inventory-muted hover:text-red-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm inventory-muted">Receiving ID</p>
                  <p className="font-medium" style={{color: 'var(--inventory-text-primary)'}}>
                    {selectedReceivedItems.receiving_id ? `RCV-${selectedReceivedItems.receiving_id.toString().padStart(6, '0')}` : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm inventory-muted">PO Number</p>
                  <p className="font-medium" style={{color: 'var(--inventory-text-primary)'}}>
                    {selectedReceivedItems.po_number || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm inventory-muted">Supplier</p>
                  <p className="font-medium" style={{color: 'var(--inventory-text-primary)'}}>
                    {selectedReceivedItems.supplier_name || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm inventory-muted">Received Date</p>
                  <p className="font-medium" style={{color: 'var(--inventory-text-primary)'}}>
                    {selectedReceivedItems.receiving_date ? 
                      new Date(selectedReceivedItems.receiving_date).toLocaleDateString() : 'N/A'}
                    {selectedReceivedItems.receiving_time && (
                      <span className="text-xs inventory-muted ml-2">
                        {selectedReceivedItems.receiving_time}
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-sm inventory-muted">Delivery Receipt No.</p>
                  <p className="font-medium" style={{color: 'var(--inventory-text-primary)'}}>
                    {selectedReceivedItems.delivery_receipt_no || 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-sm inventory-muted">Status</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    selectedReceivedItems.display_status === 'Complete' ? 'bg-green-100 text-green-800' :
                    selectedReceivedItems.display_status === 'Partial' ? 'bg-orange-100 text-orange-800' :
                    selectedReceivedItems.display_status === 'Cancel' ? 'bg-red-100 text-red-800' :
                    selectedReceivedItems.display_status === 'Ready' ? 'bg-blue-100 text-blue-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedReceivedItems.display_status || 'Received'}
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-md font-medium mb-3" style={{color: 'var(--inventory-text-primary)'}}>Received Items</h4>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase inventory-muted">Product</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase inventory-muted">Ordered Qty</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase inventory-muted">Received Qty</th>
                        <th className="px-4 py-2 text-left text-xs font-medium uppercase inventory-muted">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {selectedReceivedItems.details && selectedReceivedItems.details.length > 0 ? (
                        // If we have detailed items array (preferred)
                        selectedReceivedItems.details.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>{item.product_name}</td>
                            <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>{item.total_ordered_qty || item.ordered_qty || '-'}</td>
                            <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>{item.total_received_qty || item.received_qty}</td>
                            <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>
                              {(() => {
                                const orderedQty = parseInt(item.total_ordered_qty || item.ordered_qty || 0);
                                const receivedQty = parseInt(item.total_received_qty || item.received_qty || 0);
                                const missingQty = Math.max(0, orderedQty - receivedQty);
                                
                                if (missingQty > 0) {
                                  return (
                                    <span className="px-2 py-1 rounded-full text-xs font-medium" style={{backgroundColor: 'var(--inventory-warning)', color: 'white'}}>
                                      ⚠️ Partial: {missingQty} missing
                                    </span>
                                  );
                                } else {
                                  return (
                                    <span className="px-2 py-1 rounded-full text-xs font-medium" style={{backgroundColor: 'var(--inventory-success)', color: 'white'}}>
                                      ✅ Complete
                                    </span>
                                  );
                                }
                              })()}
                            </td>
                          </tr>
                        ))
                      ) : selectedReceivedItems.received_items ? (
                        // If received_items is a string, split it (fallback)
                        selectedReceivedItems.received_items.split(', ').map((item, index) => {
                          const match = item.match(/^(.+?) \((\d+)\)$/);
                          if (match) {
                            const [, productName, receivedQty] = match;
                            return (
                              <tr key={index}>
                                <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>{productName}</td>
                                <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>-</td>
                                <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>{receivedQty}</td>
                                <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>
                                  <span className="px-2 py-1 rounded-full text-xs font-medium" style={{backgroundColor: 'var(--inventory-success)', color: 'white'}}>
                                    ✅ Received
                                  </span>
                                </td>
                              </tr>
                            );
                          }
                          return null;
                        })
                      ) : (
                        <tr>
                          <td colSpan="4" className="px-4 py-8 text-center inventory-muted">
                            No received items details available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowReceivedItemsModal(false)}
                className="px-4 py-2 border rounded-md hover:bg-gray-50 inventory-button-primary"
                style={{borderColor: 'var(--inventory-border)', color: 'var(--inventory-text-primary)'}}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Tooltip */}
      {hoveredButton && (
        <div
          className="fixed z-50 px-3 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none"
          style={{
            left: `${tooltipPosition.x}px`,
            top: `${tooltipPosition.y}px`,
            transform: 'translateX(-50%) translateY(-100%)',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            color: 'white',
            fontSize: '12px',
            fontWeight: '500',
            padding: '8px 12px',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(4px)'
          }}
        >
          {hoveredButton}
          <div
            className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent"
            style={{
              borderTopColor: 'rgba(0, 0, 0, 0.9)'
            }}
          />
        </div>
      )}

      {/* Add Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[60]">
          <div className="backdrop-blur-md rounded-xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] border" style={{ backgroundColor: 'white', borderColor: 'var(--inventory-border)' }}>
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10" style={{ borderColor: 'var(--inventory-border)', backgroundColor: 'white' }}>
              <h3 className="text-lg font-semibold" style={{ color: 'var(--inventory-text-primary)' }}>Add New Supplier</h3>
              <button onClick={closeSupplierModal} className="inventory-muted hover:text-red-500">
                <FaTimes className="h-6 w-6" />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
              <form onSubmit={handleAddSupplier} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--inventory-text-secondary)' }}>Supplier Name *</label>
                    <input
                      type="text"
                      required
                      value={supplierFormData.supplier_name || ""}
                      onChange={(e) => handleSupplierInputChange("supplier_name", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 inventory-input"
                      style={{ 
                        borderColor: 'var(--inventory-border)', 
                        backgroundColor: 'var(--inventory-bg-secondary)',
                        color: 'var(--inventory-text-primary)'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--inventory-text-secondary)' }}>Contact Number * (11 digits)</label>
                    <input
                      type="tel"
                      required
                      maxLength={11}
                      pattern="[0-9]{11}"
                      value={supplierFormData.supplier_contact || ""}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
                        handleSupplierInputChange("supplier_contact", value);
                      }}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 inventory-input"
                      style={{ 
                        borderColor: 'var(--inventory-border)', 
                        backgroundColor: 'var(--inventory-bg-secondary)',
                        color: 'var(--inventory-text-primary)'
                      }}
                      placeholder="09123456789"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--inventory-text-secondary)' }}>Email *</label>
                    <input
                      type="email"
                      required
                      value={supplierFormData.supplier_email || ""}
                      onChange={(e) => handleSupplierInputChange("supplier_email", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 inventory-input"
                      style={{ 
                        borderColor: 'var(--inventory-border)', 
                        backgroundColor: 'var(--inventory-bg-secondary)',
                        color: 'var(--inventory-text-primary)'
                      }}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--inventory-text-secondary)' }}>Address</label>
                    <textarea
                      rows={3}
                      value={supplierFormData.supplier_address}
                      onChange={(e) => handleSupplierInputChange("supplier_address", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 inventory-textarea"
                      style={{ 
                        borderColor: 'var(--inventory-border)', 
                        backgroundColor: 'var(--inventory-bg-secondary)',
                        color: 'var(--inventory-text-primary)'
                      }}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--inventory-text-secondary)' }}>Notes</label>
                    <textarea
                      rows={3}
                      value={supplierFormData.notes}
                      onChange={(e) => handleSupplierInputChange("notes", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 inventory-textarea"
                      style={{ 
                        borderColor: 'var(--inventory-border)', 
                        backgroundColor: 'var(--inventory-bg-secondary)',
                        color: 'var(--inventory-text-primary)'
                      }}
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={closeSupplierModal}
                    className="px-4 py-2 border rounded-md hover:opacity-70"
                    style={{ 
                      borderColor: 'var(--inventory-border)', 
                      backgroundColor: 'var(--inventory-bg-secondary)',
                      color: 'var(--inventory-text-primary)'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded-md disabled:opacity-50"
                    style={{ 
                      backgroundColor: 'var(--inventory-accent)',
                      color: '#ffffff'
                    }}
                  >
                    {loading ? "Adding..." : "Add Supplier"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Simple PO Modal */}
      {showSimplePOModal && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-white rounded-3xl shadow-xl max-w-7xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold" style={{color: 'var(--inventory-text-primary)'}}>
                  Create Purchase Order
                </h3>
                <button
                  onClick={closeSimplePOModal}
                  className="inventory-muted hover:text-red-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Form & Product List */}
                <div>
                  {/* Add Product Form */}
                  <div className="mb-6 p-4 border rounded-lg" style={{borderColor: 'var(--inventory-border)', backgroundColor: 'var(--inventory-bg-secondary)'}}>
                    <h4 className="text-md font-semibold mb-4" style={{color: 'var(--inventory-text-primary)'}}>Add Product</h4>
                    <div className="space-y-4">
                {/* Product Name */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--inventory-text-primary)'}}>
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={simplePOData.productName}
                    onChange={(e) => handleSimplePOInputChange('productName', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 inventory-input"
                    style={{borderColor: 'var(--inventory-border)'}}
                    placeholder="Enter product name..."
                    required
                  />
                </div>

                {/* Unit Type Radio Buttons */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--inventory-text-primary)'}}>
                    Unit Type *
                  </label>
                  <div className="flex gap-6">
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="unitType"
                        value="pieces"
                        checked={simplePOData.unitType === "pieces"}
                        onChange={(e) => handleSimplePOInputChange('unitType', e.target.value)}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                        required
                      />
                      <span className="text-sm" style={{color: 'var(--inventory-text-primary)'}}>Pieces</span>
                    </label>
                    <label className="flex items-center">
                      <input
                        type="radio"
                        name="unitType"
                        value="bulk"
                        checked={simplePOData.unitType === "bulk"}
                        onChange={(e) => handleSimplePOInputChange('unitType', e.target.value)}
                        className="mr-2 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm" style={{color: 'var(--inventory-text-primary)'}}>Bulk</span>
                    </label>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--inventory-text-primary)'}}>
                    {simplePOData.unitType === "bulk" ? "Bulk Quantity *" : "Quantity *"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={simplePOData.quantity}
                    onChange={(e) => handleSimplePOInputChange('quantity', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 inventory-input"
                    style={{borderColor: 'var(--inventory-border)'}}
                    placeholder={simplePOData.unitType === "bulk" ? "Enter bulk quantity" : "Enter quantity"}
                    required
                  />
                </div>

                {/* SRP */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{color: 'var(--inventory-text-primary)'}}>
                    SRP (Suggested Retail Price) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={simplePOData.srp}
                    onChange={(e) => handleSimplePOInputChange('srp', e.target.value)}
                    className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 inventory-input"
                    style={{borderColor: 'var(--inventory-border)'}}
                    placeholder="Enter SRP (e.g., 25.00)"
                    required
                  />
                </div>

                {/* Add Product Button */}
                <button
                  type="button"
                  onClick={addProductToModalList}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 mt-4"
                >
                  <FaPlus className="h-4 w-4" />
                  Add to Order List
                </button>
                    </div>
                  </div>

                  {/* Product List */}
                  <div className="mb-6">
                    <h4 className="text-md font-semibold mb-3" style={{color: 'var(--inventory-text-primary)'}}>
                      Products in Order ({modalProducts.length})
                    </h4>
                    {modalProducts.length === 0 ? (
                      <div className="text-center py-8 border rounded-lg inventory-muted" style={{borderColor: 'var(--inventory-border)'}}>
                        <p className="text-sm">No products added yet</p>
                        <p className="text-xs mt-1">Add products using the form above</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {modalProducts.map((product) => (
                          <div
                            key={product.id}
                            className="p-3 border rounded-lg flex items-center justify-between"
                            style={{borderColor: 'var(--inventory-border)', backgroundColor: 'var(--inventory-bg-secondary)'}}
                          >
                            <div className="flex-1">
                              <div className="font-semibold text-sm" style={{color: 'var(--inventory-text-primary)'}}>
                                {product.productName}
                              </div>
                              <div className="flex flex-wrap gap-3 text-xs inventory-muted mt-1">
                                <span>Qty: {product.quantity} {product.unitType === "bulk" ? "bulk" : "pieces"}</span>
                                {product.srp > 0 && (
                                  <span className="font-semibold" style={{color: 'var(--inventory-accent)'}}>
                                    SRP: ₱{parseFloat(product.srp).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeProductFromModalList(product.id)}
                              className="ml-3 p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                            >
                              <FaTrash className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Submit Form */}
                  <form onSubmit={handleSimplePOSubmit}>
                    <div className="flex justify-end space-x-3 pt-4 border-t" style={{borderColor: 'var(--inventory-border)'}}>
                      <button
                        type="button"
                        onClick={closeSimplePOModal}
                        className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-gray-50"
                        style={{borderColor: 'var(--inventory-border)', color: 'var(--inventory-text-primary)'}}
                      >
                        <FaTimes className="h-4 w-4" />
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadProductsPdf}
                        disabled={modalProducts.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FaFileAlt className="h-4 w-4" />
                        Download PDF
                      </button>
                      <button
                        type="submit"
                        disabled={loading || modalProducts.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <FaCheck className="h-4 w-4" />
                        {loading ? "Creating..." : `Create P.O. (${modalProducts.length})`}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Right Column - Suggestions (Side by Side) */}
                <div className="border-l pl-6" style={{borderColor: 'var(--inventory-border)'}}>
                  <div className="flex gap-6">
                    {/* Left Side - Critical Stock Suggestions */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">⚠️</span>
                        <h4 className="text-lg font-semibold" style={{color: 'var(--inventory-text-primary)'}}>
                          Critical Stock
                        </h4>
                      </div>

                      {loadingCriticalProducts ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
                          <p className="mt-2 text-sm inventory-muted">Loading...</p>
                        </div>
                      ) : criticalProducts.length > 0 ? (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                          {criticalProducts.slice(0, 10).map((product, index) => {
                        const alertColor = product.alert_level === 'Out of Stock' ? 'var(--inventory-danger)' :
                                          product.alert_level === 'Critical' ? 'var(--inventory-warning)' :
                                          'var(--inventory-info)';
                        
                        return (
                          <div
                            key={product.product_id || index}
                            className="p-3 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                            style={{
                              borderColor: alertColor + '40',
                              backgroundColor: alertColor + '10'
                            }}
                            onClick={() => {
                              // Check if product already in list
                              const exists = modalProducts.some(p => p.productName === product.product_name);
                              if (exists) {
                                toast.warning(`${product.product_name} is already in the order list`);
                                return;
                              }

                              // Add directly to modal products list
                              const newProduct = {
                                id: Date.now(),
                                productName: product.product_name,
                                productId: product.product_id || null, // Include product_id if available
                                quantity: product.suggested_quantity || 20,
                                unitType: "pieces",
                                srp: parseFloat(product.srp) || 0
                              };
                              
                              setModalProducts([...modalProducts, newProduct]);
                              toast.success(`"${product.product_name}" added to order list`);
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-semibold text-sm" style={{color: 'var(--inventory-text-primary)'}}>
                                {product.product_name}
                              </span>
                              <span 
                                className="px-2 py-1 rounded-full text-xs font-medium text-white"
                                style={{backgroundColor: alertColor}}
                              >
                                {product.alert_level}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs inventory-muted">
                              <span>Stock: <strong style={{color: alertColor}}>{product.current_quantity}</strong></span>
                              <span>Suggest: <strong>{product.suggested_quantity}</strong></span>
                              {product.srp > 0 && (
                                <span className="font-semibold" style={{color: 'var(--inventory-accent)'}}>
                                  SRP: ₱{parseFloat(product.srp).toFixed(2)}
                                </span>
                              )}
                            </div>
                            {product.supplier_name && (
                              <div className="text-xs inventory-muted mt-1">
                                Supplier: {product.supplier_name}
                              </div>
                            )}
                          </div>
                        );
                      })}
                          {criticalProducts.length > 10 && (
                            <p className="text-xs text-center inventory-muted mt-2">
                              +{criticalProducts.length - 10} more
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="text-center py-8 inventory-muted">
                          <p className="text-sm mb-2">✅ Well stocked!</p>
                          <p className="text-xs">No critical products</p>
                        </div>
                      )}
                    </div>

                    {/* Right Side - Previous Orders by Supplier */}
                    <div className="flex-1 min-w-0 border-l pl-6" style={{borderColor: 'var(--inventory-border)'}}>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl">📦</span>
                        <h4 className="text-lg font-semibold" style={{color: 'var(--inventory-text-primary)'}}>
                          Previous Orders by Supplier
                        </h4>
                      </div>

                      {/* Supplier Selector */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium mb-2" style={{color: 'var(--inventory-text-primary)'}}>
                          Select Supplier
                        </label>
                        <div className="flex gap-2">
                          <select
                            value={selectedSupplierForHistory}
                            onChange={(e) => handleSupplierHistoryChange(e.target.value)}
                            className="flex-1 px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 inventory-input text-sm"
                            style={{borderColor: 'var(--inventory-border)'}}
                          >
                            <option value="">-- Select --</option>
                            {suppliers.map((supplier) => (
                              <option key={supplier.supplier_id} value={supplier.supplier_id}>
                                {supplier.supplier_name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={openSupplierModal}
                            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            title="Add Supplier"
                          >
                            <FaPlus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Previous Order Products List */}
                      {loadingPreviousProducts ? (
                        <div className="text-center py-8">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                          <p className="mt-2 text-sm inventory-muted">Loading...</p>
                        </div>
                      ) : selectedSupplierForHistory && previousOrderProducts.length > 0 ? (
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                          {previousOrderProducts.map((product, index) => {
                            const lastOrderDate = product.last_ordered_date 
                              ? new Date(product.last_ordered_date).toLocaleDateString()
                              : 'N/A';
                            
                            return (
                              <div
                                key={product.product_id || product.product_name || index}
                                className="p-3 border rounded-lg hover:shadow-md transition-shadow cursor-pointer"
                                style={{
                                  borderColor: 'var(--inventory-border)',
                                  backgroundColor: 'var(--inventory-bg-secondary)'
                                }}
                                onClick={() => {
                                  // Check if product already in list
                                  const exists = modalProducts.some(p => p.productName === product.product_name);
                                  if (exists) {
                                    toast.warning(`${product.product_name} is already in the order list`);
                                    return;
                                  }

                                  // Add directly to modal products list
                                  const newProduct = {
                                    id: Date.now(),
                                    productName: product.product_name,
                                    productId: product.product_id || null,
                                    quantity: Math.round(product.avg_quantity || product.quantity || 20),
                                    unitType: product.unit_type || "pieces",
                                    srp: parseFloat(product.srp) || 0
                                  };
                                  
                                  setModalProducts([...modalProducts, newProduct]);
                                  toast.success(`"${product.product_name}" added to order list`);
                                }}
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-semibold text-sm" style={{color: 'var(--inventory-text-primary)'}}>
                                    {product.product_name}
                                  </span>
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                    {product.order_count} {product.order_count === 1 ? 'order' : 'orders'}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-3 text-xs inventory-muted">
                                  <span>Last: <strong>{lastOrderDate}</strong></span>
                                  <span>Qty: <strong>{Math.round(product.avg_quantity || product.quantity)}</strong> {product.unit_type || 'pieces'}</span>
                                  {product.srp > 0 && (
                                    <span className="font-semibold" style={{color: 'var(--inventory-accent)'}}>
                                      SRP: ₱{parseFloat(product.srp).toFixed(2)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : selectedSupplierForHistory ? (
                        <div className="text-center py-8 inventory-muted">
                          <p className="text-sm mb-2">📭 No orders</p>
                          <p className="text-xs">No history yet</p>
                        </div>
                      ) : (
                        <div className="text-center py-8 inventory-muted">
                          <p className="text-sm mb-2">👆 Select supplier</p>
                          <p className="text-xs">View order history</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ToastContainer removed; it's provided globally in app/layout.js */}
      </div>
    </div>
  );
}

export default CreatePurchaseOrder; 