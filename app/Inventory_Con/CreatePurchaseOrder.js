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
const API_BASE_SIMPLE = getApiUrl("purchase_order_api_simple.php");
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

  // Purchase Order List functions
  const fetchPurchaseOrders = async (status = null) => {
    try {
      let url = `${API_BASE_SIMPLE}?action=purchase_orders`;
      if (status) {
        url += `&status=${status}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        console.log('Fetched Purchase Orders:', {
          status: status,
          count: data.data.length,
          sampleData: data.data.slice(0, 3).map(po => ({ 
            id: po.purchase_header_id, 
            status: po.status, 
            po_number: po.po_number 
          }))
        });
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
  
  // Fetch all purchase orders for counting (without status filter)
  const fetchAllPurchaseOrders = async () => {
    try {
      const response = await fetch(`${API_BASE_SIMPLE}?action=purchase_orders`);
      const data = await response.json();
      if (data.success) {
        console.log('Fetched All Purchase Orders:', {
          count: data.data.length,
          statuses: data.data.map(po => po.status),
          uniqueStatuses: [...new Set(data.data.map(po => po.status))]
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
    const counts = {
      delivered: normalizedOrders.filter((po) => po.status === 'delivered').length,
      partial_delivery: normalizedOrders.filter((po) => po.status === 'partial_delivery').length,
      complete: normalizedOrders.filter((po) => po.status === 'complete').length,
      return: normalizedOrders.filter((po) => po.status === 'return').length,
    };
    
    // Debug logging
    console.log('PO Counts Debug:', {
      totalOrders: normalizedOrders.length,
      counts,
      sampleStatuses: normalizedOrders.slice(0, 5).map(po => ({ id: po.purchase_header_id, status: po.status }))
    });
    
    return counts;
  }, [normalizedOrders]);

  // Removed activeMenuPO memo (no 3-dots menu)

  // Auto-receive all items when PO is approved
  const autoReceiveAllItems = async (poId, fromCompleteStatus = false) => {
    try {
      // Get PO details first
      const response = await fetch(`${API_BASE_SIMPLE}?action=purchase_order_details&po_id=${poId}`);
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
        
        const fbRes = await fetch(`${API_BASE_SIMPLE}?action=update_received_quantities`, {
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
          await fetch(`${API_BASE_SIMPLE}?action=update_po_status`, {
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
          await fetch(`${API_BASE_SIMPLE}?action=update_po_status`, {
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
      
      const response = await fetch(`${API_BASE_SIMPLE}?action=update_po_status`, {
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
      const response = await fetch(`${API_BASE_SIMPLE}?action=approve_purchase_order`, {
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
      const response = await fetch(`${API_BASE_SIMPLE}?action=update_delivery_status`, {
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
      const response = await fetch(`${API_BASE_SIMPLE}?action=purchase_order_details&po_id=${poId}`);
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

  // Receive Items functions
  const fetchReceivingList = async () => {
    try {
      const response = await fetch(`${API_BASE_SIMPLE}?action=receiving_list`);
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
            await fetch(`${API_BASE_SIMPLE}?action=update_receiving_status&receiving_id=${item.receiving_id}&status=completed`);
          } catch (error) {
            console.warn(`Failed to update status for receiving ID ${item.receiving_id}:`, error);
          }
        }
        
        // Refresh the list after status updates
        if (pendingItems.length > 0) {
          const refreshResponse = await fetch(`${API_BASE_SIMPLE}?action=receiving_list`);
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
      const response = await fetch(`${API_BASE_SIMPLE}?action=received_items_details&receiving_id=${receivingId}`);
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
      let response = await fetch(`${API_BASE_SIMPLE}?action=purchase_order_details&po_id=${poId}`);
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
        const fbRes = await fetch(`${API_BASE_SIMPLE}?action=update_received_quantities`, {
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
          await fetchPurchaseOrders(poFilter);
          await fetchAllPurchaseOrders();
          toast.success('Purchase order moved to Received tab!');
        } catch (err) {
          console.warn('Could not update PO status after receiving:', err);
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
      const response = await fetch(`${API_BASE_SIMPLE}?action=purchase_order_details&po_id=${poId}`);
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
      const response = await fetch(`${API_BASE_SIMPLE}?action=purchase_order_details&po_id=${poId}`);
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





  // Handle Complete Items submit (NO DATABASE SAVE)
  const handleSubmitCompleteItems = async (e) => {
    e.preventDefault();
    
    try {
      // Calculate if delivery is complete or partial
      let isComplete = true;
      let hasPartial = false;
      
      selectedPOForReceive.details.forEach(item => {
        const receivedQty = parseInt(receiveItemsFormData[item.purchase_dtl_id]) || 0;
        const orderedQty = parseInt(item.quantity) || 0;
        
        if (receivedQty < orderedQty) {
          isComplete = false;
          if (receivedQty > 0) {
            hasPartial = true;
          }
        }
      });
      
      const currentStatus = selectedPOForReceive.header.status;
      let newStatus = 'delivered';

      if (isComplete) {
        newStatus = 'complete';
        toast.success('✅ Items marked as complete! Ready for final receiving.');
      } else if (hasPartial) {
        newStatus = 'partial_delivery';
        toast.warning('⚠️ Partial delivery! Some items received, some missing.');
      } else {
        toast.info('📦 No items received yet.');
      }

      // Update PO status only if it changes (NO DATABASE SAVE)
      if (newStatus !== currentStatus) {
        console.log('Completing items - updating status from', currentStatus, 'to', newStatus, '(NO DATABASE SAVE)');
        await updatePOStatus(selectedPOForReceive.header.purchase_header_id, newStatus);
      }
      
      toast.success('Items marked as complete! Moved to Complete table.');
      setShowReceiveItemsForm(false);
      setSelectedPOForReceive(null);
      setReceiveItemsFormData({});
      await fetchPurchaseOrders(poFilter);
      await fetchAllPurchaseOrders();
    } catch (error) {
      console.error('Error completing items:', error);
      toast.error('Error completing items');
    }
  };

  // Handle Receive Items submit (WITH DATABASE SAVE)
  const handleSubmitReceiveItems = async (e) => {
    e.preventDefault();
    
    try {
      // Calculate if delivery is complete or partial
      let isComplete = true;
      let hasPartial = false;
      
      selectedPOForReceive.details.forEach(item => {
        const receivedQty = parseInt(receiveItemsFormData[item.purchase_dtl_id]) || 0;
        const orderedQty = parseInt(item.quantity) || 0;
        
        if (receivedQty < orderedQty) {
          isComplete = false;
          if (receivedQty > 0) {
            hasPartial = true;
          }
        }
      });
      
      // Prepare the data to send
      const receiveData = {
        purchase_header_id: selectedPOForReceive.header.purchase_header_id,
        items: selectedPOForReceive.details.map(item => ({
          purchase_dtl_id: item.purchase_dtl_id,
          received_qty: parseInt(receiveItemsFormData[item.purchase_dtl_id]) || 0,
          missing_qty: Math.max(0, (parseInt(item.quantity) || 0) - (parseInt(receiveItemsFormData[item.purchase_dtl_id]) || 0))
        }))
      };
      
      const currentStatus = selectedPOForReceive.header.status;
      
      // Only save to database if coming from Complete status (final receiving)
      // If coming from Delivered status, just update quantities locally and change status
      if (currentStatus === 'complete') {
        // Final receiving - save to database
        const response = await fetch(`${API_BASE_SIMPLE}?action=update_received_quantities`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(receiveData)
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Update status to received for final receiving
          await updatePOStatus(selectedPOForReceive.header.purchase_header_id, 'received');
          toast.success('Items received and saved to database!');
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
        let newStatus = 'delivered';

        if (isComplete) {
          newStatus = 'complete';
          toast.success('✅ Items marked as complete! Ready for final receiving.');
        } else if (hasPartial) {
          newStatus = 'partial_delivery';
          toast.warning('⚠️ Partial delivery! Some items received, some missing.');
        } else {
          toast.info('📦 No items received yet.');
        }

        // Update PO status only if it changes
        if (newStatus !== currentStatus) {
          console.log('Updating PO status from', currentStatus, 'to', newStatus, '(NO DATABASE SAVE)');
          await updatePOStatus(selectedPOForReceive.header.purchase_header_id, newStatus);
        }
        
        toast.success('Quantities updated locally! Items moved to Complete table.');
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
  const handleUpdatePartialDelivery = async (poId) => {
    try {
      // Get PO details for partial delivery update
      const response = await fetch(`${API_BASE_SIMPLE}?action=purchase_order_details&po_id=${poId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedPOForPartialDelivery(data);
        setPartialDeliveryFormData({
          items: data.details.map(detail => ({
            purchase_dtl_id: detail.purchase_dtl_id,
            product_name: detail.product_name,
            ordered_qty: detail.quantity,
            received_qty: detail.received_qty || 0,
            missing_qty: detail.missing_qty || detail.quantity
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
      const partialDeliveryData = {
        purchase_header_id: selectedPOForPartialDelivery.header.purchase_header_id,
        items: partialDeliveryFormData.items
      };

      const response = await fetch(`${API_BASE_SIMPLE}?action=update_partial_delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(partialDeliveryData)
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success(`Partial delivery updated successfully! New status: ${result.new_status}`);
        setShowPartialDeliveryForm(false);
        setSelectedPOForPartialDelivery(null);
        setPartialDeliveryFormData({ items: [] });
        fetchPurchaseOrders(poFilter); // Refresh the current filter
        fetchAllPurchaseOrders(); // Refresh all orders for counts
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
                    onMouseEnter={(e) => handleMouseEnter(e, "Add new supplier")}
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
                  Expected Delivery
                </label>
                <input
                  type="date"
                  name="expectedDelivery"
                  value={formData.expectedDelivery}
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
                onMouseEnter={(e) => handleMouseEnter(e, "Add a new product to the purchase order")}
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
                         onMouseEnter={(e) => handleMouseEnter(e, "Remove this product from the order")}
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
              onMouseEnter={(e) => handleMouseEnter(e, "Clear all form data and start over")}
              onMouseLeave={handleMouseLeave}
            >
              <FaTimes className="h-4 w-4" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              onMouseEnter={(e) => handleMouseEnter(e, loading ? "Creating purchase order..." : "Create and submit the purchase order")}
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
                { key: 'delivered', label: 'Delivered' },
                { key: 'partial_delivery', label: 'Partial Delivery' },
                { key: 'complete', label: 'Complete' },
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
                      Supplier
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--inventory-text-primary)' }}>
                      Date
                    </th>
                                         {/* Total Amount column removed as requested */}
                                         <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--inventory-text-primary)' }}>
                       Status
                     </th>
                     <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--inventory-text-primary)' }}>
                       Actions
                     </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {filteredPurchaseOrders.map((po) => (
                    <tr
                      key={`po-${po.purchase_header_id}`}
                      className="hover:bg-gray-50 cursor-pointer group transition-all duration-200 hover:shadow-sm"
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
                          <span className="group-hover:!text-gray-900">{po.supplier_name}</span>
                          {po.products_summary && (
                            <span className="text-xs inventory-muted truncate max-w-xs group-hover:!text-gray-600">{po.products_summary}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm group-hover:!text-gray-900" style={{ color: 'var(--inventory-text-primary)' }}>
                        <span className="group-hover:!text-gray-900">{new Date(po.date).toLocaleDateString()}</span>
                      </td>
                                             {/* Total Amount display removed as requested */}
                                             <td className="px-6 py-4 whitespace-nowrap">
                         {getStatusBadge(po.status)}
                       </td>
                       <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {/* Actions menu with multiple options */}
                        <div className="flex items-center gap-2">
                          {/* View Details Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              viewDetails(po.purchase_header_id);
                            }}
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-blue-100 text-blue-600 hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                            onMouseEnter={(e) => handleMouseEnter(e, "View Details")}
                            onMouseLeave={handleMouseLeave}
                          >
                            <FaEye className="h-3 w-3" />
                          </button>
                                                                                {/* Dynamic Actions */}
                            {(() => { 
                              if (po.status === 'delivered') {
                                return (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); removePoFromList(po.purchase_header_id); handleCompleteItems(po.purchase_header_id); }}
                                      className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                                      onMouseEnter={(e) => handleMouseEnter(e, "Complete items (no database save yet)")}
                                      onMouseLeave={handleMouseLeave}
                                    >
                                      Complete
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); removePoFromList(po.purchase_header_id); updatePOStatus(po.purchase_header_id, 'return'); }}
                                      className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 text-xs"
                                      onMouseEnter={(e) => handleMouseEnter(e, "Cancel PO (Problem with delivery)")}
                                      onMouseLeave={handleMouseLeave}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                );
                              } else if (po.status === 'approved') {
                                // After approval, proceed with final receiving into inventory
                                return (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleReceive(po.purchase_header_id); }}
                                      className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-xs"
                                      onMouseEnter={(e) => handleMouseEnter(e, "Receive to inventory (with DR, batch, expiry)")}
                                      onMouseLeave={handleMouseLeave}
                                    >
                                      Received
                                    </button>
                                  </div>
                                );
                              } else if (po.status === 'partial_delivery') {
                                return (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); removePoFromList(po.purchase_header_id); handleUpdatePartialDelivery(po.purchase_header_id); }}
                                      className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs"
                                      onMouseEnter={(e) => handleMouseEnter(e, "Update when missing items arrive")}
                                      onMouseLeave={handleMouseLeave}
                                    >
                                      Update Delivery
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); removePoFromList(po.purchase_header_id); updatePOStatus(po.purchase_header_id, 'return'); }}
                                      className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-xs"
                                      onMouseEnter={(e) => handleMouseEnter(e, "Cancel PO (Supplier failed to deliver)")}
                                      onMouseLeave={handleMouseLeave}
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                );
                              } else if (po.status === 'complete') {
                                return (
                                  <div className="flex gap-2">
                                    <button
                                      onClick={(e) => { e.stopPropagation(); removePoFromList(po.purchase_header_id); updatePOStatus(po.purchase_header_id, 'return'); }}
                                      className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-xs"
                                      onMouseEnter={(e) => handleMouseEnter(e, "Return PO (Problem with delivery)")}
                                      onMouseLeave={handleMouseLeave}
                                    >
                                      Return
                                    </button>
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleReceive(po.purchase_header_id); }}
                                      className="inline-flex items-center gap-2 h-8 px-2 rounded-md bg-yellow-600 text-white hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 text-xs"
                                      onMouseEnter={(e) => handleMouseEnter(e, "Mark as Received and move to Received tab")}
                                      onMouseLeave={handleMouseLeave}
                                    >
                                      Received
                                    </button>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                        </div>
                      </td>
                    </tr>
                  ))}
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
                  {receivingList.map((item) => (
                    <tr key={item.receiving_id || item.purchase_header_id} className="hover:bg-gray-50 group transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium group-hover:!text-gray-900" style={{ color: 'var(--inventory-text-primary)' }}>
                        <span className="group-hover:!text-gray-900">
                          {item.receiving_id ? 
                            `RCV-${item.receiving_id.toString().padStart(6, '0')}` : 
                            `PO-${item.purchase_header_id.toString().padStart(6, '0')}`
                          }
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm group-hover:!text-gray-900" style={{ color: 'var(--inventory-text-primary)' }}>
                        <span className="group-hover:!text-gray-900">{item.po_number || `PO-${item.purchase_header_id}`}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm group-hover:!text-gray-900" style={{ color: 'var(--inventory-text-primary)' }}>
                        <span className="group-hover:!text-gray-900">{item.supplier_name}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm group-hover:!text-gray-900" style={{ color: 'var(--inventory-text-primary)' }}>
                        <div className="group-hover:!text-gray-900">
                          {item.receiving_date ? 
                            new Date(item.receiving_date).toLocaleDateString() : 
                            new Date(item.po_date).toLocaleDateString()}
                          {item.receiving_time && (
                            <div className="text-xs inventory-muted group-hover:!text-gray-600">
                              {item.receiving_time}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm max-w-xs group-hover:!text-gray-900" style={{ color: 'var(--inventory-text-primary)' }}>
                        <button
                          onClick={() => {
                            if (item.receiving_id) {
                              // Show received items details for items that have been received
                              fetchReceivedItemsDetails(item.receiving_id);
                            } else {
                              // Fallback to PO details for items without receiving_id
                              fetch(`${API_BASE_SIMPLE}?action=purchase_order_details&po_id=${item.purchase_header_id}`)
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
                          item.display_status === 'Complete' ? 'bg-green-100 text-green-800' :
                          item.display_status === 'Partial' ? 'bg-orange-100 text-orange-800' :
                          item.display_status === 'Ready' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.display_status || 'Received'}
                        </span>
                      </td>
                      
                    </tr>
                  ))}
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
                           <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>{item.missing_qty || item.quantity}</td>
                           <td className="px-4 py-2 text-sm" style={{color: 'var(--inventory-text-primary)'}}>
                             {item.missing_qty === 0 ? (
                               <span className="px-2 py-1 rounded-full text-xs font-medium" style={{backgroundColor: 'var(--inventory-success)', color: 'white'}}>
                                 Complete
                               </span>
                             ) : item.received_qty > 0 ? (
                               <span className="px-2 py-1 rounded-full text-xs font-medium" style={{backgroundColor: 'var(--inventory-warning)', color: 'white'}}>
                                 Partial
                               </span>
                             ) : (
                               <span className="px-2 py-1 rounded-full text-xs font-medium" style={{backgroundColor: 'var(--inventory-info)', color: 'white'}}>
                                 Pending
                               </span>
                             )}
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
  );
}

export default CreatePurchaseOrder; 