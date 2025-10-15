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
  FaFileAlt,
  FaCalendar,
  FaUser,
  FaBuilding
} from "react-icons/fa";
import { 
  ShoppingCart, 
  FileText, 
  Package, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  DollarSign,
  Calendar,
  User,
  Building,
} from "lucide-react";
import { getApiUrl } from "../lib/apiConfig";

// Define API URLs using centralized configuration
// All functionality now merged into single purchase_order_api.php
const API_BASE = getApiUrl("purchase_order_api.php");
const CREATE_PO_API = getApiUrl("create_purchase_order_api.php");

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
    expectedDelivery: "",
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
        console.log('✅ Current user loaded:', userData.full_name, 'ID:', userData.user_id);
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
    } else if (activeTab === 'list') {
      fetchPurchaseOrders(poFilter);
      fetchAllPurchaseOrders(); // Refresh counts when switching to list tab
    } else if (activeTab === 'receive') {
      fetchReceivingList();
    }
  }, [activeTab, poFilter]);

     // No dropdown functionality needed

  // Debug: Monitor selectedProducts changes
  useEffect(() => {
    console.log('selectedProducts changed:', selectedProducts);
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
    clearSupplierForm();
    setShowSupplierModal(true);
  };

  const closeSupplierModal = () => {
    setShowSupplierModal(false);
    clearSupplierForm();
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
        clearSupplierForm();
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
    console.log('updateProduct called:', { index, field, value }); // Debug log
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
    if (!formData.expectedDelivery) {
      toast.error("Please enter an expected delivery date");
      return;
    }

    // Validate expected delivery date is not earlier than order date
    const orderDate = new Date(formData.orderDate);
    const expectedDeliveryDate = new Date(formData.expectedDelivery);
    
    if (expectedDeliveryDate < orderDate) {
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
         expected_delivery_date: formData.expectedDelivery,
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
        
        // Reset form
        setFormData({
          supplier: "",
          orderDate: new Date().toISOString().split('T')[0],
          expectedDelivery: "",
          notes: ""
        });
        setSelectedProducts([]);
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
      const data = await response.json();
      if (data.success) {
        console.log('Fetched All Purchase Orders with Products:', {
          totalPOs: data.data.length,
          sampleData: data.data.slice(0, 2).map(po => ({ 
            id: po.purchase_header_id, 
            status: po.status, 
            po_number: po.po_number,
            products: po.products?.length || 0
          }))
        });
        
        // If status filter is provided, filter products individually
        let filteredData = data.data;
        if (status) {
          filteredData = data.data.map(po => ({
            ...po,
            products: po.products?.filter(product => {
              // Calculate status if not available
              let itemStatus = product.item_status;
              
              if (!itemStatus) {
                const receivedQty = parseInt(product.received_qty) || 0;
                const quantity = parseInt(product.quantity) || 0;
                const missingQty = Math.max(0, quantity - receivedQty);
                
                if (missingQty === 0 && quantity > 0) {
                  itemStatus = 'complete';
                } else if (receivedQty > 0) {
                  itemStatus = 'partial';
                } else {
                  itemStatus = 'pending';
                }
              }
              
              // If item_status is 'received', exclude from all tabs except when explicitly filtering for received
              if (itemStatus === 'received' && status !== 'received') {
                return false;
              }
              
              // Map 'returned' status to 'return' filter
              if (status === 'return') {
                return itemStatus === 'returned';
              }
              
              return itemStatus === status;
            }) || []
          })).filter(po => po.products.length > 0); // Only include POs that have products matching the status
        }
        
        setPurchaseOrders(filteredData);
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
      delivered: { bgColor: 'var(--inventory-success)', textColor: 'white', text: 'Delivered' },
      partial_delivery: { bgColor: 'var(--inventory-warning)', textColor: 'white', text: 'Partial Delivery' },
      complete: { bgColor: 'var(--inventory-accent)', textColor: 'white', text: 'Complete' },
      return: { bgColor: 'var(--inventory-danger)', textColor: 'white', text: 'Return' },
    };
    
    const config = statusConfig[status] || { bgColor: 'var(--inventory-success)', textColor: 'white', text: 'Delivered' };
    return (
      <span 
        className="px-2 py-1 rounded-full text-xs font-medium"
        style={{ backgroundColor: config.bgColor, color: config.textColor }}
      >
        {config.text}
      </span>
    );
  };

  const getDeliveryStatusBadge = (status) => {
    const statusConfig = {
      'pending': { bgColor: 'var(--inventory-warning)', textColor: 'white', text: 'Pending' },
      'in_transit': { bgColor: 'var(--inventory-info)', textColor: 'white', text: 'To ship' },
      'delivered': { bgColor: 'var(--inventory-success)', textColor: 'white', text: 'Shipped' },
      'partial': { bgColor: 'var(--inventory-warning)', textColor: 'white', text: 'Partial' },
      'cancelled': { bgColor: 'var(--inventory-danger)', textColor: 'white', text: 'Cancelled' }
    };
    
    const config = statusConfig[status] || { bgColor: 'var(--inventory-text-secondary)', textColor: 'var(--inventory-bg-primary)', text: status };
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
      const response = await fetch(`${API_BASE}?action=purchase_orders_with_products`);
      const data = await response.json();
      if (data.success) {
        console.log('Fetched All Purchase Orders with Products:', {
          count: data.data.length,
          totalProducts: data.data.reduce((sum, po) => sum + (po.products?.length || 0), 0),
          sampleProducts: data.data.slice(0, 2).map(po => ({
            po_id: po.purchase_header_id,
            products: po.products?.map(p => ({ name: p.product_name, status: p.item_status })) || []
          }))
        });
        setAllPurchaseOrders(data.data);
      }
    } catch (error) {
      console.error('Error fetching all purchase orders:', error);
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
      rows.push({
        ...po,
        delivery_status: po.delivery_status || 'pending',
        status: po.status || 'delivered',
      });
    }
    return rows;
  }, [purchaseOrders]);

  const poCounts = useMemo(() => {
    // Count individual products by status instead of entire POs
    const counts = {
      delivered: 0,
      partial: 0,
      complete: 0,
      received: 0,
      return: 0,
    };
    
    // Count products from all purchase orders
    allPurchaseOrders.forEach(po => {
      if (po.products) {
        po.products.forEach(product => {
          // Calculate status based on received quantities if item_status is not available
          let itemStatus = product.item_status;
          
          if (!itemStatus) {
            const receivedQty = parseInt(product.received_qty) || 0;
            const quantity = parseInt(product.quantity) || 0;
            const missingQty = Math.max(0, quantity - receivedQty);
            
            if (missingQty === 0 && quantity > 0) {
              itemStatus = 'complete';
            } else if (receivedQty > 0) {
              itemStatus = 'partial';
            } else {
              itemStatus = 'delivered';
            }
          }
          
          // Map 'returned' status to 'return' for the filter
          if (itemStatus === 'returned') {
            counts['return']++;
          } else if (counts.hasOwnProperty(itemStatus)) {
            counts[itemStatus]++;
          }
        });
      }
    });
    
    // Debug logging
    console.log('Product Counts Debug:', {
      totalPOs: allPurchaseOrders.length,
      totalProducts: Object.values(counts).reduce((sum, count) => sum + count, 0),
      counts,
      sampleProducts: allPurchaseOrders.slice(0, 2).map(po => ({
        po_id: po.purchase_header_id,
        products: po.products?.map(p => ({ 
          name: p.product_name, 
          status: p.item_status,
          received_qty: p.received_qty,
          quantity: p.quantity
        })) || []
      }))
    });
    
    return counts;
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

      // Update PO status based on source status
      if (fromCompleteStatus) {
        // Coming from complete status - move to received
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
      } else {
        // Coming from other statuses - move to complete first
        try {
          await fetch(`${API_BASE}?action=update_po_status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              purchase_header_id: poId,
              status: 'complete'
            })
          });
        } catch (statusError) {
          console.warn('Could not update PO status to complete:', statusError);
        }
      }

      console.log(`Auto-receive successful for PO ${poId}. Receiving ID: ${result.receiving_id}`);
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
              // For other statuses, move to 'complete' first, not directly to 'received'
              toast.success('Purchase order approved and moved to Complete status!');
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
        // Filter only complete products
        const completeProducts = data.details.filter(detail => {
          const missingQty = detail.missing_qty ?? (detail.quantity - (detail.received_qty || 0));
          return missingQty === 0;
        });

        if (completeProducts.length === 0) {
          toast.warning("No complete products found in this PO to receive.");
          return;
        }

        // Auto-receive all complete products
        for (const product of completeProducts) {
          await handleReceiveCompleteProduct(poId, product);
        }

        toast.success(`✅ ${completeProducts.length} product(s) received successfully!`);
      } else {
        toast.error('Failed to load PO details');
      }
    } catch (error) {
      console.error('Error receiving complete items:', error);
      toast.error('Error receiving items');
    }
  };

  // Function to test backend connectivity
  const testBackendConnectivity = async () => {
    try {
      console.log('🔍 Testing backend connectivity...');
      const testUrl = `${API_BASE}?action=suppliers`;
      console.log('Test URL:', testUrl);
      
      const response = await fetch(testUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(5000)
      });
      
      console.log('✅ Backend is accessible!', response);
      return true;
    } catch (error) {
      console.error('❌ Backend connectivity test failed:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        cause: error.cause
      });
      return false;
    }
  };

  // Function to run comprehensive backend diagnostics
  const runBackendDiagnostics = async () => {
    console.log('🔧 Running Backend Diagnostics...');
    console.log('API_BASE:', API_BASE);
    console.log('Current URL:', window.location.href);
    
    // Test 1: Basic connectivity
    try {
      const response = await fetch(`${API_BASE}?action=suppliers`);
      console.log('✅ Test 1 - Basic connectivity: SUCCESS', response);
    } catch (error) {
      console.error('❌ Test 1 - Basic connectivity: FAILED', error);
    }
    
    // Test 2: Check if file exists
    try {
      const response = await fetch(`${API_BASE}`);
      console.log('✅ Test 2 - File exists: SUCCESS', response);
    } catch (error) {
      console.error('❌ Test 2 - File exists: FAILED', error);
    }
    
    // Test 3: Test with different action
    try {
      const response = await fetch(`${API_BASE}?action=suppliers`);
      console.log('✅ Test 3 - Suppliers action: SUCCESS', response);
    } catch (error) {
      console.error('❌ Test 3 - Suppliers action: FAILED', error);
    }
  };

  // Custom confirmation function using toastify
  const showReturnConfirmation = (productCount, poNumber) => {
    return new Promise((resolve) => {
      // Show confirmation toast with custom buttons
      const toastId = toast(
        <div className="flex flex-col gap-3 p-2">
          <div className="text-sm font-medium text-gray-800">
            Are you sure you want to return {productCount} complete product(s) from PO {poNumber}?
          </div>
          <div className="text-xs text-gray-600">
            This will mark all products as returned.
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                toast.dismiss(toastId);
                resolve(false);
              }}
              className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                toast.dismiss(toastId);
                resolve(true);
              }}
              className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
            >
              Return Products
            </button>
          </div>
        </div>,
        {
          position: "top-center",
          autoClose: false,
          closeOnClick: false,
          draggable: false,
          closeButton: false,
          className: "custom-confirmation-toast"
        }
      );
    });
  };

  // Custom confirmation function for canceling partial delivery
  const showCancelConfirmation = (productCount, poNumber) => {
    return new Promise((resolve) => {
      // Show confirmation toast with custom buttons
      const toastId = toast(
        <div className="flex flex-col gap-3 p-2">
          <div className="text-sm font-medium text-gray-800">
            Are you sure you want to move {productCount} partial product(s) from PO {poNumber} to Complete?
          </div>
          <div className="text-xs text-gray-600">
            This will keep the received quantities and move products to Complete table.
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                toast.dismiss(toastId);
                resolve(false);
              }}
              className="px-3 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
            >
              Keep Partial
            </button>
            <button
              onClick={() => {
                toast.dismiss(toastId);
                resolve(true);
              }}
              className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
            >
              Move to Complete
            </button>
          </div>
        </div>,
        {
          position: "top-center",
          autoClose: false,
          closeOnClick: false,
          draggable: false,
          closeButton: false,
          className: "custom-confirmation-toast"
        }
      );
    });
  };

  // Function to return all complete items in a PO
  const handleReturnCompleteItems = async (poId) => {
    try {
      console.log('Starting return process for PO ID:', poId);
      console.log('API_BASE URL:', API_BASE);
      
      // Test connectivity first
      const isBackendAccessible = await testBackendConnectivity();
      if (!isBackendAccessible) {
        toast.error('❌ Backend server is not accessible. Please check XAMPP and try again.');
        console.log('🔧 Running comprehensive diagnostics...');
        await runBackendDiagnostics();
        return;
      }
      
      // Get PO details first
      const url = `${API_BASE}?action=purchase_order_details&po_id=${poId}`;
      console.log('Fetching URL:', url);
      
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
      console.log('Response received:', response);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Response data:', data);
      
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

        // Confirm return action using custom confirmation
        const confirmReturn = await showReturnConfirmation(completeProducts.length, data.header.po_number);
        
        if (!confirmReturn) {
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

  // Receive Items functions
  const fetchReceivingList = async () => {
    try {
      const response = await fetch(`${API_BASE}?action=receiving_list`);
      const data = await response.json();
      if (data.success) {
        console.log('Receiving List Debug:', {
          count: data.data.length,
          sampleData: data.data.slice(0, 3).map(item => ({
            receiving_id: item.receiving_id,
            po_number: item.po_number,
            status: item.status || item.display_status,
            received_items: item.received_items
          }))
        });
        
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
      console.log('📦 Received Items Details API Response:', {
        success: data.success,
        receivingId,
        data: data.data,
        details: data.data?.details,
        received_items: data.data?.received_items
      });
      
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

      console.log('Auto-receiving complete product:', {
        poId,
        product: product.product_name,
        received_qty: product.received_qty,
        receiveData
      });

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
        setSelectedPOForReceive(data);
        
        // Initialize form data with current received quantities
        const initialFormData = {};
        data.details.forEach(item => {
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
        setSelectedPOForReceive(data);
        
        // Initialize form data with current received quantities
        const initialFormData = {};
        data.details.forEach(item => {
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
      
      console.log('📊 Individual Product Categorization:', {
        complete: categorized.complete.length,
        partial: categorized.partial.length,
        delivered: categorized.delivered.length,
        details: categorized
      });

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
        let overallStatus = 'complete';
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
        
        // Refresh all purchase orders to update tab counts and visibility
        await fetchPurchaseOrders(poFilter);
        await fetchAllPurchaseOrders();
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
      
      console.log('📊 Individual Product Categorization (Receive):', {
        complete: categorized.complete.length,
        partial: categorized.partial.length,
        pending: categorized.pending.length,
        details: categorized
      });
      
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
          // Update status to received for final receiving
          await updatePOStatus(selectedPOForReceive.header.purchase_header_id, 'received');
          
          // Show detailed toast based on individual product categorization
          if (categorized.complete.length > 0 && categorized.partial.length > 0) {
            toast.success(`✅ ${categorized.complete.length} complete, ${categorized.partial.length} partial product(s) saved to database!`);
          } else {
          toast.success('Items received and saved to database!');
          }
          
          setShowReceiveItemsForm(false);
          setSelectedPOForReceive(null);
          setReceiveItemsFormData({});
          await fetchPurchaseOrders(poFilter);
          await fetchAllPurchaseOrders();
          await fetchReceivingList();
        } else {
          toast.error(result.error || 'Failed to update received quantities');
        }
      } else {
        // Initial receiving from Delivered - just update quantities locally, don't save to database yet
        // Determine overall PO status based on individual product statuses
        let overallStatus = 'complete';
        
        if (categorized.partial.length > 0 || categorized.pending.length > 0) {
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

        // Update PO status only if it changes
        if (overallStatus !== currentStatus) {
          console.log('Updating PO status from', currentStatus, 'to', overallStatus, '(with individual product tracking)');
          await updatePOStatus(selectedPOForReceive.header.purchase_header_id, overallStatus);
        }
        
        toast.success('Individual product statuses updated! Check Complete/Partial tabs.');
        setShowReceiveItemsForm(false);
        setSelectedPOForReceive(null);
        setReceiveItemsFormData({});
        await fetchPurchaseOrders(poFilter);
        await fetchAllPurchaseOrders();
      }
    } catch (error) {
      console.error('Error updating received quantities:', error);
      toast.error('Error updating received quantities');
    }
  };



  // Partial Delivery Management functions
  const handleCancelPartialDelivery = async (poId) => {
    try {
      // Get PO details first
      const response = await fetch(`${API_BASE}?action=purchase_order_details&po_id=${poId}`);
      const data = await response.json();
      
      if (data.success) {
        // Filter only partial products (products with some received quantity but not complete)
        const partialProducts = data.details.filter(detail => {
          const receivedQty = detail.received_qty || 0;
          const orderedQty = detail.quantity;
          return receivedQty > 0 && receivedQty < orderedQty;
        });

        if (partialProducts.length === 0) {
          toast.warning("No partial products found in this PO to cancel.");
          return;
        }

        // Show confirmation using custom toastify confirmation
        const confirmCancel = await showCancelConfirmation(partialProducts.length, data.header.po_number);
        
        if (!confirmCancel) {
          return;
        }

        // Move partial products to complete status (keep received_qty as is)
        let successCount = 0;
        let errorCount = 0;
        
        for (const product of partialProducts) {
          try {
            // Update product status to 'complete' while keeping the received_qty
            const updateResponse = await fetch(`${API_BASE}?action=update_product_status`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                purchase_dtl_id: product.purchase_dtl_id,
                item_status: 'complete'
              })
            });
            
            const updateResult = await updateResponse.json();
            
            if (updateResult.success) {
              successCount++;
            } else {
              errorCount++;
              console.error(`Failed to move ${product.product_name} to complete:`, updateResult.error);
            }
          } catch (error) {
            errorCount++;
            console.error(`Error moving product ${product.product_name} to complete:`, error);
          }
        }

        // Refresh data
        await fetchPurchaseOrders(poFilter);
        await fetchAllPurchaseOrders();
        
        if (successCount > 0) {
          toast.success(`✅ ${successCount} partial product(s) moved to Complete table successfully!`);
        }
        if (errorCount > 0) {
          toast.warning(`⚠️ ${errorCount} product(s) failed to move to Complete.`);
        }
      } else {
        toast.error('Failed to load PO details: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error canceling partial delivery:', error);
      toast.error('Error canceling partial delivery: ' + error.message);
    }
  };

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
      
      console.log('📊 Partial Delivery - Individual Product Categorization:', {
        complete: categorized.complete.length,
        partial: categorized.partial.length,
        pending: categorized.pending.length,
        details: categorized
      });

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
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="inventory-card rounded-3xl p-6">
            <div className="flex items-center gap-3 mb-6">
              <FileText className="h-6 w-6" style={{color: 'var(--inventory-accent)'}} />
              <h3 className="text-xl font-semibold" style={{color: 'var(--inventory-text-primary)'}}>Order Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium inventory-muted mb-2">
                  Supplier *
                </label>
                <div className="flex gap-2">
                  <select
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleInputChange}
                    className="flex-1 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 inventory-select"
                    required
                  >
                    <option value="">Select a supplier</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.supplier_id} value={supplier.supplier_id}>
                        {supplier.supplier_name} - {supplier.supplier_contact}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={openSupplierModal}
                    className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                 
                    onMouseLeave={handleMouseLeave}
                  >
                    <FaPlus className="h-4 w-4" />
                  </button>
                </div>
              </div>

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
                  Expected Delivery <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="expectedDelivery"
                  value={formData.expectedDelivery}
                  onChange={handleInputChange}
                  min={formData.orderDate}
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

          {/* Products Section */}
          <div className="bg-white rounded-3xl shadow-xl p-6">
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <Package className="h-6 w-6" style={{color: 'var(--inventory-success)'}} />
                <h3 className="text-xl font-semibold" style={{color: 'var(--inventory-text-primary)'}}>Products</h3>
              </div>
              <button
                type="button"
                onClick={addProduct}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              
                onMouseLeave={handleMouseLeave}
              >
                <FaPlus className="h-4 w-4" />
                Add Product
              </button>
            </div>

            {selectedProducts.length === 0 ? (
              <div className="text-center py-8 inventory-muted">
                No products added yet. Click Add `Product` to get started.
              </div>
            ) : (
              <div className="space-y-4">
                {selectedProducts.map((product, index) => (
                  <div key={product.id} className="border rounded-xl p-6" style={{borderColor: 'var(--inventory-border)', backgroundColor: 'var(--inventory-bg-secondary)'}}>
                                                              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                       <div>
                         <label className="block text-sm font-medium mb-1" style={{color: 'var(--inventory-text-primary)'}}>
                           Unit Type
                         </label>
                         <div className="flex gap-4 mb-3">
                           <label className="flex items-center">
                             <input
                               type="radio"
                               name={`unitType-${product.id}`}
                               value="pieces"
                               checked={product.unitType === "pieces"}
                               onChange={(e) => updateProduct(index, 'unitType', e.target.value)}
                               className="mr-2 text-blue-600 focus:ring-blue-500"
                             />
                             <span className="text-sm" style={{color: 'var(--inventory-text-primary)'}}>Pieces</span>
                           </label>
                           <label className="flex items-center">
                             <input
                               type="radio"
                               name={`unitType-${product.id}`}
                               value="bulk"
                               checked={product.unitType === "bulk"}
                               onChange={(e) => updateProduct(index, 'unitType', e.target.value)}
                               className="mr-2 text-blue-600 focus:ring-blue-500"
                             />
                             <span className="text-sm" style={{color: 'var(--inventory-text-primary)'}}>Bulk</span>
                           </label>
                         </div>
                       </div>

                       <div>
                         <label className="block text-sm font-medium mb-1" style={{color: 'var(--inventory-text-primary)'}}>
                           Product
                         </label>
                         <div className="relative product-dropdown">
                          <div className="relative">
                                                         <input
                               type="text"
                               placeholder="Enter product name..."
                               value={product.searchTerm || ''}
                               onChange={(e) => updateProduct(index, 'searchTerm', e.target.value)}
                               className="w-full px-3 py-2 pr-8 border rounded-md focus:outline-none focus:ring-2 inventory-input"
                               style={{borderColor: 'var(--inventory-border)'}}
                             />
                                                                                      <button
                               type="button"
                               onClick={() => {
                                 updateProduct(index, 'searchTerm', '');
                                 updateProduct(index, 'unitType', 'pieces');
                               }}
                               className="absolute right-2 top-1/2 transform -translate-y-1/2 inventory-muted hover:inventory-muted"
                             >
                               <FaTimes className="h-4 w-4" />
                             </button>
                           </div>
                        </div>
                       </div>

                       <div>
                         <label className="block text-sm font-medium mb-1" style={{color: 'var(--inventory-text-primary)'}}>
                           {product.unitType === "bulk" ? "Bulk Quantity" : "Quantity"}
                         </label>
                         <input
                           type="number"
                           min="1"
                           value={product.quantity || ''}
                           onChange={(e) => updateProduct(index, 'quantity', e.target.value)}
                           className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 inventory-input"
                           style={{borderColor: 'var(--inventory-border)'}}
                           placeholder={product.unitType === "bulk" ? "Enter bulk quantity" : "Enter quantity"}
                         />
                       </div>
                     </div>

                     <div className="flex justify-end mt-4">
                       <button
                         type="button"
                         onClick={() => removeProduct(index)}
                         className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
                       
                         onMouseLeave={handleMouseLeave}
                       >
                         <FaTrash className="h-4 w-4" />
                         Remove
                       </button>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Summary */}
          {selectedProducts.length > 0 && (
            <div className="bg-white rounded-3xl shadow-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <DollarSign className="h-6 w-6" style={{color: 'var(--inventory-success)'}} />
                <h3 className="text-xl font-semibold" style={{color: 'var(--inventory-text-primary)'}}>Order Summary</h3>
              </div>
              <div className="flex justify-between items-center">
                                 <div className="space-y-2">
                   <p className="text-sm inventory-muted">Total Items: {selectedProducts.length}</p>
                   <p className="text-sm inventory-muted">Total Quantity: {selectedProducts.reduce((sum, p) => sum + (p.quantity || 0), 0)}</p>
                   <p className="text-sm inventory-muted">Unit Types: {selectedProducts.map(p => p.unitType).join(', ')}</p>
                   <p className="text-sm inventory-muted">
                     Products: {selectedProducts.map(() => '🆕 Custom').join(', ')}
                   </p>
                 </div>
                                     {/* Total calculation removed as requested */}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  supplier: "",
                  orderDate: "",
                  expectedDelivery: "",
                  notes: "",
       
                });
                setSelectedProducts([]);
              }}
              className="flex items-center gap-2 px-6 py-2 border rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500" style={{borderColor: 'var(--inventory-border)', color: 'var(--inventory-text-primary)'}}
             
              onMouseLeave={handleMouseLeave}
            >
              <FaTimes className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            
              onMouseLeave={handleMouseLeave}
            >
              <FaCheck className="h-4 w-4" />
              {loading ? "Creating..." : "Create Purchase Order"}
            </button>
          </div>
        </form>
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
                { key: 'delivered', label: 'Delivered Products' },
                { key: 'partial', label: 'Partial Products' },
                { key: 'complete', label: 'Complete Products' },
                { key: 'return', label: 'Returns' },
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setPoFilter(f.key)}
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
                    const receivedProducts = products.filter(p => {
                      const itemStatus = p.item_status || 'delivered';
                      return itemStatus === 'received';
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
                              {receivedProducts > 0 && `${receivedProducts > 0 ? ', ' : ''}${receivedProducts} received`}
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
                            if (overallStatus === 'received') {
                              return (
                                <span className="px-2 py-1 rounded-full text-xs font-medium" style={{backgroundColor: 'var(--inventory-success)', color: 'white'}}>
                                  Received
                                </span>
                              );
                            } else if (overallStatus === 'complete') {
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
                                  Delivered
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
                                      Receive
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
                                        handleCancelPartialDelivery(po.purchase_header_id); 
                                      }}
                                      className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-gray-600 text-white hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 text-xs"
                                      onMouseLeave={handleMouseLeave}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                );
                              } else {
                                return (
                                  <button
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      handleCompleteItems(po.purchase_header_id); 
                                    }}
                                    className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                                   
                                    onMouseLeave={handleMouseLeave}
                                  >
                                    Complete
                                  </button>
                                );
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
                    console.log('Current receiving list data:', receivingList);
                    
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
                      
                      // Debug: Log the status for this PO
                      console.log(`PO ${poNumber} (RCV-${latestItem.receiving_id}): display_status = "${displayStatus}"`);

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
                            <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>{item.ordered_qty || '-'}</td>
                            <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>{item.received_qty}</td>
                            <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>
                              <span className="px-2 py-1 rounded-full text-xs font-medium" style={{backgroundColor: 'var(--inventory-success)', color: 'white'}}>
                                ✅ Received
                              </span>
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
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
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

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--inventory-text-secondary)' }}>Primary Phone (11 digits)</label>
                    <input
                      type="tel"
                      maxLength={11}
                      pattern="[0-9]{11}"
                      value={supplierFormData.primary_phone || ""}
                      onChange={(e) => {
                        const value = e.target.value.replace(/[^0-9]/g, '').slice(0, 11);
                        handleSupplierInputChange("primary_phone", value);
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
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--inventory-text-secondary)' }}>Primary Email</label>
                    <input
                      type="email"
                      value={supplierFormData.primary_email || ""}
                      onChange={(e) => handleSupplierInputChange("primary_email", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 inventory-input"
                      style={{ 
                        borderColor: 'var(--inventory-border)', 
                        backgroundColor: 'var(--inventory-bg-secondary)',
                        color: 'var(--inventory-text-primary)'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--inventory-text-secondary)' }}>Contact Person</label>
                    <input
                      type="text"
                      value={supplierFormData.contact_person || ""}
                      onChange={(e) => handleSupplierInputChange("contact_person", e.target.value)}
                      className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 inventory-input"
                      style={{ 
                        borderColor: 'var(--inventory-border)', 
                        backgroundColor: 'var(--inventory-bg-secondary)',
                        color: 'var(--inventory-text-primary)'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--inventory-text-secondary)' }}>Contact Title</label>
                    <input
                      type="text"
                      value={supplierFormData.contact_title || ""}
                      onChange={(e) => handleSupplierInputChange("contact_title", e.target.value)}
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

      {/* ToastContainer removed; it's provided globally in app/layout.js */}
      </div>
    </div>
  );
}

export default CreatePurchaseOrder; 