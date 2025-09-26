import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useTheme } from "./ThemeContext";
import { useSettings } from "./SettingsContext";
import { useNotification } from "./NotificationContext";
import NotificationSystem from "./NotificationSystem";

import {
  ChevronUp,
  ChevronDown,
  Plus,
  X,
  Search,
  MapPin,
  Scan,
  Camera,
  Package,
  User,
  Truck,
  DollarSign,
  Edit,
  Archive,
  RefreshCw,
  Trash2,
  Bell,
  BellRing,
  Clock,
  AlertCircle,
  CheckCircle,
  Calendar,
} from "lucide-react";

// API Configuratio

// Safe toast wrapper function
function safeToast(type, message) {
  try {
    if (type === 'success') {
      toast.success(message);
    } else if (type === 'error') {
      toast.error(message);
    } else if (type === 'warning') {
      toast.warning(message);
    } else if (type === 'info') {
      toast.info(message);
    }
  } catch (error) {
    console.log(`${type.toUpperCase()} notification: ${message}`);
  }
}

// API function
async function handleApiCall(action, data = {}) {
  const API_BASE_URL = "http://localhost/Enguio_Project/Api/backend.php";
  const payload = { action, ...data };
  console.log("🚀 API Call Payload:", payload);

  try {
    console.log("📡 Making API request to:", API_BASE_URL);
    
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("⏰ Request timeout reached, aborting request");
      controller.abort();
    }, 15000); // 15 second timeout
    
    const response = await fetch(API_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    // Clear timeout since request completed successfully
    clearTimeout(timeoutId);

    console.log("📡 HTTP Response Status:", response.status);
    
    // Safely log headers without causing issues
    try {
      console.log("📡 HTTP Response Headers:", Object.fromEntries(response.headers.entries()));
    } catch (headerError) {
      console.log("📡 HTTP Response Headers: [Unable to log headers]");
    }

    // Check if response is ok
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Get response text first to check if it's valid JSON
    const responseText = await response.text();
    console.log("📡 Raw Response Text:", responseText);

    // Check if response is empty or only whitespace
    if (!responseText || responseText.trim() === '') {
      console.error("❌ API returned empty response");
      return {
        success: false,
        message: "Server returned empty response. Please check server status.",
        error: "EMPTY_RESPONSE",
        rawResponse: "Empty response"
      };
    }

    // Check if response starts with HTML tags (indicating PHP error)
    if (responseText.trim().startsWith('<') || responseText.includes('<br />') || responseText.includes('<b>')) {
      console.error("❌ API returned HTML instead of JSON. This usually indicates a PHP error:");
      console.error("❌ Response:", responseText);
      
      // Try to extract error message from HTML
      const errorMatch = responseText.match(/<b>.*?<\/b>/g);
      const errorMessage = errorMatch ? errorMatch.join(', ') : 'Unknown PHP error';
      
      return {
        success: false,
        message: `PHP Error: ${errorMessage}`,
        error: "PHP_ERROR",
        rawResponse: responseText.substring(0, 500) // Include first 500 chars for debugging
      };
    }

    // Try to parse as JSON
    let resData;
    try {
      resData = JSON.parse(responseText);
    } catch (jsonError) {
      console.error("❌ Failed to parse JSON response:", jsonError);
      console.error("❌ Response text:", responseText);
      console.error("❌ Response length:", responseText.length);
      console.error("❌ Response type:", typeof responseText);
      
      // Provide more specific error message based on the error type
      let errorMessage = "Invalid JSON response from server";
      if (jsonError.message.includes("Unexpected end of JSON input")) {
        errorMessage = "Server returned incomplete JSON response. This may indicate a server error or connection issue.";
      } else if (jsonError.message.includes("Unexpected token")) {
        errorMessage = "Server returned malformed JSON response. This may indicate a PHP error.";
      }
      
      return {
        success: false,
        message: errorMessage,
        error: "JSON_PARSE_ERROR",
        rawResponse: responseText.substring(0, 500),
        jsonError: jsonError.message
      };
    }

    console.log("✅ API Response Data:", resData);

    if (resData && typeof resData === "object") {
      if (!resData.success) {
        console.warn("⚠️ API responded with failure:", resData.message || resData);
      } else {
        console.log("✅ API call successful for action:", action);
      }
      return resData;
    } else {
      console.warn("⚠️ Unexpected API response format:", resData);
      return {
        success: false,
        message: "Unexpected response format",
        data: resData,
      };
    }
  } catch (error) {
    // Clear timeout in case of error
    clearTimeout(timeoutId);
    
    console.error("❌ API Call Error:", error);
    console.error("❌ Error details:", {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Enhanced error handling for specific error types
    if (error.name === 'AbortError' || error.message.includes('signal is aborted')) {
      console.error("⏰ Request aborted: Server took too long to respond or request was cancelled");
      return {
        success: false,
        message: "Request timeout: Server took too long to respond. Please try again.",
        error: "TIMEOUT_ERROR",
      };
    }
    
    if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
      console.error("🌐 Network Error: Unable to connect to the server");
      console.error("Check if:");
      console.error("1. XAMPP/Apache is running");
      console.error("2. The API endpoint is accessible");
      console.error("3. There are no CORS issues");
      console.error("4. The server is responding to requests");
      return {
        success: false,
        message: "Network Error: Unable to connect to the server. Please check your connection and server status.",
        error: "NETWORK_ERROR",
      };
    }
    
    return {
      success: false,
      message: error.message,
      error: "REQUEST_ERROR",
    };
  }
}

// New function to check if barcode exists
async function checkBarcodeExists(barcode) {
  try {
    const response = await handleApiCall("check_barcode", { barcode });
    return response;
  } catch (error) {
    console.error("Error checking barcode:", error);
    return { success: false, error: error.message };
  }
}

// New function to update product stock with FIFO tracking
async function updateProductStock(productId, newQuantity, batchReference = "", expirationDate = null, unitCost = 0, newSrp = null, entryBy = "admin") {
  try {
    const response = await handleApiCall("update_product_stock", { 
      product_id: productId, 
      new_quantity: newQuantity,
      batch_reference: batchReference,
      expiration_date: expirationDate,
      unit_cost: unitCost,
      new_srp: newSrp,
      entry_by: entryBy
    });
    
    // Log the stock update activity with user context
    if (response.success) {
      try {
        const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
        await fetch('http://localhost/Enguio_Project/Api/backend.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'log_activity',
            activity_type: 'WAREHOUSE_STOCK_UPDATED',
            description: `Warehouse stock updated: Product ID ${productId}, Quantity: ${newQuantity}, Batch: ${batchReference || 'N/A'}`,
            table_name: 'tbl_products',
            record_id: productId,
            user_id: userData.user_id || userData.emp_id,
            username: userData.username,
            role: userData.role,
          }),
        });
      } catch (error) {
        console.error("Error in session storage:", error);
      }
    }
    
    return response;
  } catch (error) {
    // Log the error
    try {
      await fetch('http://localhost/Enguio_Project/Api/backend.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'log_activity',
          activity_type: 'WAREHOUSE_STOCK_UPDATE_ERROR',
          description: `Failed to update warehouse stock for Product ID ${productId}: ${error.message}`,
          table_name: 'tbl_products',
          record_id: productId,
        }),
      });
    } catch (sessionError) {
      console.error("Error in session storage:", sessionError);
    }
    
    console.error("Error updating product stock:", error);
    return { success: false, error: error.message };
  }
}

// New function to duplicate product for batches
async function duplicateProductBatches(productId, batchIds = [22, 23]) {
  try {
    const response = await handleApiCall("duplicate_product_batches", { 
      product_id: productId,
      batch_ids: batchIds
    });
    return response;
  } catch (error) {
    console.error("Error duplicating product batches:", error);
    return { success: false, error: error.message };
  }
}

function Warehouse() {
  const { theme, isDarkMode } = useTheme();
  const { updateWarehouseNotifications } = useNotification();
  
  // Add CSS for placeholder styling
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      .theme-input::placeholder {
        color: ${isDarkMode ? '#94a3b8' : '#64748b'} !important;
        opacity: 1;
      }
      .theme-input:focus::placeholder {
        color: ${isDarkMode ? '#94a3b8' : '#64748b'} !important;
        opacity: 0.7;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, [isDarkMode]);

  // Global error handler for unhandled AbortErrors
  useEffect(() => {
    const handleUnhandledError = (event) => {
      if (event.error && (event.error.name === 'AbortError' || event.error.message?.includes('signal is aborted'))) {
        console.warn("⚠️ Unhandled AbortError caught globally:", event.error);
        event.preventDefault(); // Prevent the error from being logged to console
        return false;
      }
    };

    const handleUnhandledRejection = (event) => {
      if (event.reason && (event.reason.name === 'AbortError' || event.reason.message?.includes('signal is aborted'))) {
        console.warn("⚠️ Unhandled AbortError promise rejection caught globally:", event.reason);
        event.preventDefault(); // Prevent the error from being logged to console
        return false;
      }
    };

    window.addEventListener('error', handleUnhandledError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleUnhandledError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const { settings, isProductExpiringSoon, isProductExpired, getExpiryStatus, isStockLow } = useSettings();

  // Helper function to calculate stock status based on quantity and settings
  const getStockStatus = (quantity) => {
    const qty = parseInt(quantity || 0);
    if (qty <= 0) {
      return 'out of stock';
    } else if (qty <= settings.lowStockThreshold) {
      return 'low stock';
    } else {
      return 'in stock';
    }
  };
    // State Management
    const [scannerStatusMessage, setScannerStatusMessage] = useState("🔍 Scanner is ready and active - Scan any barcode to continue");
    const [scanTimeout, setScanTimeout] = useState(null);
  
    const [inventoryData, setInventoryData] = useState([])
    const [suppliersData, setSuppliersData] = useState([])
    const [batchData, setBatchData] = useState([])
    const [brandsData, setBrandsData] = useState([])
    const [categoriesData, setCategoriesData] = useState([])
    const [searchTerm, setSearchTerm] = useState("")
    const [loading, setLoading] = useState(false)
    const [showAddModal, setShowAddModal] = useState(false)
    const [showSupplierModal, setShowSupplierModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState(false)
    const [showEditProductModal, setShowEditProductModal] = useState(false)
    const [showDeleteModal, setShowDeleteModal] = useState(false)
    const [activeTab, setActiveTab] = useState("products")
    const [currentLocation, setCurrentLocation] = useState("warehouse")
    const [scannerActive, setScannerActive] = useState(settings.barcodeScanning) // Scanner state based on settings
    const [scannedBarcode, setScannedBarcode] = useState("")
    const [selectedItem, setSelectedItem] = useState(null)
    const [showProductModal, setShowProductModal] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState([]);
    
    // New state for barcode scanning modals
    const [showUpdateStockModal, setShowUpdateStockModal] = useState(false);
    const [showNewProductModal, setShowNewProductModal] = useState(false);
    const [existingProduct, setExistingProduct] = useState(null);
    const [newStockQuantity, setNewStockQuantity] = useState("");
    const [newStockExpiration, setNewStockExpiration] = useState("");
    // Bulk mode fields for stock update
    const [newStockBoxes, setNewStockBoxes] = useState("");
    const [newStockStripsPerBox, setNewStockStripsPerBox] = useState("");
    const [newStockTabletsPerStrip, setNewStockTabletsPerStrip] = useState("");
    const [newStockPiecesPerPack, setNewStockPiecesPerPack] = useState("");
    // Configuration mode for stock update
    const [stockUpdateConfigMode, setStockUpdateConfigMode] = useState("bulk");
    const [editSrpEnabled, setEditSrpEnabled] = useState(false);
    const [newSrp, setNewSrp] = useState("");
    // Batch configuration fields for stock update
    const [newStockBatchReference, setNewStockBatchReference] = useState("");
    const [useSameBatch, setUseSameBatch] = useState(false);
    const [existingBatches, setExistingBatches] = useState([]);
    const [selectedExistingBatch, setSelectedExistingBatch] = useState(null);
    const [showFifoModal, setShowFifoModal] = useState(false);
    
    // Notification states
    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState({
      expiring: [],
      expired: [],
      lowStock: [],
      outOfStock: []
    });
    const [alertCount, setAlertCount] = useState(0);

  // Update warehouse notifications when alert count changes
  useEffect(() => {
    if (inventoryData.length > 0) {
      const lowStock = inventoryData.filter(product => {
        const quantity = parseInt(product.product_quantity || 0);
        return isStockLow(quantity);
      }).length;

      const expiring = inventoryData.filter(product => {
        const expirationDate = product.earliest_expiration || product.expiration;
        return expirationDate && (isProductExpiringSoon(expirationDate) || isProductExpired(expirationDate));
      }).length;

      const outOfStock = inventoryData.filter(product => {
        const quantity = parseInt(product.product_quantity || 0);
        return quantity === 0;
      }).length;

      updateWarehouseNotifications({
        lowStock,
        expiring,
        outOfStock
      });
    }
  }, [inventoryData, isStockLow, isProductExpiringSoon, isProductExpired]);
    const [fifoStockData, setFifoStockData] = useState([]);
    
    // Expiring batch modal states
    const [showExpiringBatchModal, setShowExpiringBatchModal] = useState(false);
    const [selectedExpiringProduct, setSelectedExpiringProduct] = useState(null);
    
    // View batch modal states
    const [showViewBatchModal, setShowViewBatchModal] = useState(false);
    const [viewBatchData, setViewBatchData] = useState(null);
    const [selectedProductForFifo, setSelectedProductForFifo] = useState(null);
    const [showQuantityHistoryModal, setShowQuantityHistoryModal] = useState(false);
    const [selectedProductForHistory, setSelectedProductForHistory] = useState(null);
    const [quantityHistoryData, setQuantityHistoryData] = useState([]);
      const [showCurrentFifoData, setShowCurrentFifoData] = useState(false);
    
    // New state for temporary product storage
    const [temporaryProducts, setTemporaryProducts] = useState([]);
    const [showBatchEntryModal, setShowBatchEntryModal] = useState(false);
    const [currentBatchNumber, setCurrentBatchNumber] = useState(generateBatchRef()); // Generate batch number on component mount
    
    // Update Stock Batch System
    const [updateStockProducts, setUpdateStockProducts] = useState([]);
    const [showUpdateStockBatchModal, setShowUpdateStockBatchModal] = useState(false);
    
    // New state for medicine/non-medicine configuration modal
    const [showProductTypeModal, setShowProductTypeModal] = useState(false);
    const [productTypeForm, setProductTypeForm] = useState({
      product_type: "",
      configMode: "bulk", // Default to bulk mode
      // Medicine fields
      boxes: "",
      strips_per_box: "",
      tablets_per_strip: "",
      total_tablets: "",
      // Non-Medicine fields
      pieces_per_pack: "",
      total_pieces: ""
    });
    
    // Current user/employee information for tracking who created/modified items
    const [currentUser, setCurrentUser] = useState("admin"); // Default user, can be updated

    const [newProductForm, setNewProductForm] = useState({
      product_name: "",
      category: "",
      product_type: "", // Medicine or Non-Medicine
      configMode: "bulk", // Default to bulk mode
      barcode: "",
      description: "",
      srp: "",
      brand_id: "",
      brand_search: "",
      supplier_id: "",
      expiration: "",
      date_added: new Date().toISOString().split('T')[0], // Auto-set current date
      batch: "", // Will be set to currentBatchNumber
      order_number: "",
      prescription: 0,
      bulk: 0,
      // Medicine fields
      boxes: "",
      strips_per_box: "",
      tablets_per_strip: "",
      total_tablets: "",
      // Non-Medicine fields
      pieces_per_pack: "",
      total_pieces: ""
    });
    
    // Get current user from localStorage or session
    useEffect(() => {
      const userSession = localStorage.getItem('user_session');
      if (userSession) {
        try {
          const userData = JSON.parse(userSession);
          if (userData.employee_name || userData.username) {
            setCurrentUser(userData.employee_name || userData.username);
          }
        } catch (error) {
          console.log("Could not parse user session, using default");
        }
      }
      
      // Also check for saved employee name
      const savedEmployee = localStorage.getItem('warehouse_employee');
      if (savedEmployee) {
        setCurrentUser(savedEmployee);
      }
    }, []);

    // Initialize transfer batch details table
    useEffect(() => {
      const initializeTransferBatchTable = async () => {
        try {
          await handleApiCall("create_transfer_batch_details_table");
          console.log("✅ Transfer batch details table initialized");
        } catch (error) {
          console.error("❌ Error initializing transfer batch details table:", error);
        }
      };
      
      initializeTransferBatchTable();
    }, []);

    // Close notifications when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (showNotifications && !event.target.closest('.notification-dropdown')) {
          setShowNotifications(false);
        }
      };

      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [showNotifications]);

    useEffect(() => {
    let buffer = "";
    let timeout;
  
    const handleKeyDown = (e) => {
      if (!scannerActive) return;
  
      console.log("Key pressed:", e.key, "KeyCode:", e.keyCode, "Scanner active:", scannerActive);
  
      if (timeout) clearTimeout(timeout);
  
      // Accept Enter key to complete scan
      if (e.key === "Enter") {
        if (buffer.length > 0) {
          console.log("Barcode scanned:", buffer);
          handleScannerOperation("SCAN_COMPLETE", { barcode: buffer });
          buffer = "";
        }
      } else {
        // Accept all characters (not just numbers) for barcode scanning
        buffer += e.key;
        console.log("Buffer updated:", buffer);
        timeout = setTimeout(() => {
          console.log("Buffer cleared due to timeout");
          buffer = ""; // Clear buffer after inactivity
        }, 1000); // Increased timeout to 1 second
      }
    };
  
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [scannerActive]);
  
  
    const [filterOptions, setFilterOptions] = useState({
      category: "",
      supplier: "",
      status: "",
      prescription: false,
      bulk: false,
      stockStatus: "all",
    })
  
    // Generate batch reference function with sequential numbering
    function generateBatchRef() {
      const now = new Date()
      const yyyy = now.getFullYear()
      const mm = String(now.getMonth() + 1).padStart(2, "0")
      const dd = String(now.getDate()).padStart(2, "0")
      const hh = String(now.getHours()).padStart(2, "0")
      const mi = String(now.getMinutes()).padStart(2, "0")
      const ss = String(now.getSeconds()).padStart(2, "0")
      
      // Add milliseconds for better uniqueness
      const ms = String(now.getMilliseconds()).padStart(3, "0")
      
      // Generate a random 3-digit suffix for additional uniqueness
      const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, "0")
  
      return `BR-${yyyy}${mm}${dd}-${hh}${mi}${ss}${ms}-${randomSuffix}`
    }
  
    // Removed unused form state variables since we're using modals now
  
    const [stats, setStats] = useState({
      totalProducts: 0,
      totalSuppliers: 0,
      warehouseValue: 0,
      totalQuantity: 0,
      lowStockItems: 0,
      expiringSoon: 0,
    })
  
    // Supplier form data
    const [supplierFormData, setSupplierFormData] = useState({
      supplier_name: "",
      supplier_address: "",
      supplier_contact: "",
      supplier_email: "",
      order_level: "",
      primary_phone: "",
      primary_email: "",
      contact_person: "",
      contact_title: "",
      payment_terms: "",
      lead_time_days: "",
      credit_rating: "",
      notes: "",
    });
  
    // Product form data
    const [formData, setFormData] = useState({
      product_name: "",
      barcode: "",
      category: "",
      description: "",
      prescription: 0,
      bulk: 0,
      expiration: "",
      quantity: 0,
      supplier_id: "",
      location_id: "",
      brand: "",
    });
  
  
    // Edit form data
    const [editFormData, setEditFormData] = useState({})
    const [editProductFormData, setEditProductFormData] = useState({
      product_name: "",
      category: "",
      barcode: "",
      description: "",
      srp: "",
      brand_id: "",
      quantity: "",
      supplier_id: "",
      expiration: "",
      prescription: 0,
      bulk: 0
    })
  
  
    // FIXED API Functions with better error handling
    async function handleCrudOperation(operation, data) {
      switch (operation) {
        case "DELETE_PRODUCT":
          setLoading(true);
          try {
            const response = await handleApiCall("delete_product", {
              product_id: data.product_id,
              reason: "Archived from warehouse management",
              archived_by: "admin"
            });
            if (response.success) {
              safeToast("success", "Product archived successfully");
              setShowDeleteModal(false);
              setSelectedItem(null);
              loadData("products");
            } else {
              safeToast("error", response.message || "Failed to delete product");
            }
          } catch (error) {
            console.error("Error deleting product:", error);
            safeToast("error", "Failed to delete product");
          } finally {
            setLoading(false);
          }
          break;
    
        case "CREATE_SUPPLIER":
          setLoading(true);
          if (
            !data.supplier_name ||
            !data.supplier_contact ||
            !data.supplier_email
          ) {
            safeToast("error", "Supplier name, contact, and email are required");
            setLoading(false);
            return;
          }
    
          try {
            const response = await handleApiCall("add_supplier", data);
            if (response.success) {
              safeToast("success", response.message || "Supplier added successfully");
              setShowSupplierModal(false);
              clearSupplierForm();
              loadData("suppliers");
            } else {
              safeToast("error", response.message || "Failed to add supplier");
            }
          } catch (error) {
            safeToast("error",
              "Failed to add supplier: " +
                (error?.response?.data?.message || error.message)
            );
            console.error("Error adding supplier:", error);
          } finally {
            setLoading(false);
          }
          break;
    
        case "UPDATE_SUPPLIER":
          setLoading(true);
          const updateData = {
            ...data,
            supplier_id: selectedItem?.supplier_id,
          };
          try {
            const response = await handleApiCall("update_supplier", updateData);
            if (response.success) {
              safeToast("success", "Supplier updated successfully");
              setShowEditModal(false);
              setSelectedItem(null);
              clearEditForm();
              loadData("suppliers");
            } else {
              safeToast("error", response.message || "Failed to update supplier");
            }
          } catch (error) {
            console.error("Error updating supplier:", error);
            safeToast("error", "Failed to update supplier");
          } finally {
            setLoading(false);
          }
          break;

        case "UPDATE_PRODUCT":
          setLoading(true);
          const updateProductData = {
            ...data,
            product_id: selectedItem?.product_id,
          };
          try {
            const response = await handleApiCall("update_product", updateProductData);
            if (response.success) {
              safeToast("success", "Product updated successfully");
              setShowEditProductModal(false);
              setSelectedItem(null);
              setEditProductFormData({});
              loadData("products");
            } else {
              safeToast("error", response.message || "Failed to update product");
            }
          } catch (error) {
            console.error("Error updating product:", error);
            safeToast("error", "Failed to update product");
          } finally {
            setLoading(false);
          }
          break;
    
        case "DELETE_SUPPLIER":
          setLoading(true);
          try {
            const response = await handleApiCall("delete_supplier", {
              supplier_id: data.supplier_id,
              reason: "Archived from warehouse management",
              archived_by: "admin"
            });
            if (response.success) {
              safeToast("success", "Supplier archived successfully");
              setShowDeleteModal(false);
              setSelectedItem(null);
              loadData("suppliers");
            } else {
              safeToast("error", response.message || "Failed to delete supplier");
            }
          } catch (error) {
            console.error("Error deleting supplier:", error);
            safeToast("error", "Failed to delete supplier");
          } finally {
            setLoading(false);
          }
          break;
    
        case "CREATE_PRODUCT":
          // This case is now handled in the modal handlers
          console.log("CREATE_PRODUCT case is deprecated - use modal handlers instead");
          break;
    
        default:
          console.error("Unknown CRUD operation:", operation);
          safeToast("error", "Unknown operation: " + operation);
      }
    }
    
      // Function to get the earliest expiring batch for a product
  async function getEarliestExpiringBatch(productId) {
    try {
      const fifoResponse = await getFifoStock(productId);
      if (fifoResponse.success && fifoResponse.data && fifoResponse.data.length > 0) {
        // Find the batch with the earliest expiration date
        const earliestBatch = fifoResponse.data.reduce((earliest, current) => {
          const earliestDate = new Date(earliest.expiration_date);
          const currentDate = new Date(current.expiration_date);
          return currentDate < earliestDate ? current : earliest;
        });
        return earliestBatch.expiration_date;
      }
    } catch (error) {
      console.error("Error getting earliest expiring batch:", error);
      // Return null to prevent further errors in the calling function
      return null;
    }
    return null;
  }

  // Calculate notifications for expiring and low stock products
  async function calculateNotifications(productList) {
    const today = new Date();
    console.log("🔔 Calculating notifications for", productList.length, "products");
    console.log("🔔 Expiry alerts enabled:", settings.expiryAlerts);
    console.log("🔔 Expiry warning days:", settings.expiryWarningDays);

    // Get earliest expiring dates for all products
    const productsWithEarliestExpiry = await Promise.all(
      productList.map(async (product) => {
        try {
          const earliestExpiry = await getEarliestExpiringBatch(product.product_id);
          return {
            ...product,
            earliest_expiration: earliestExpiry || product.expiration
          };
        } catch (error) {
          console.error(`Error getting earliest expiry for product ${product.product_id}:`, error);
          // Return product with original expiration if API fails
          return {
            ...product,
            earliest_expiration: product.expiration
          };
        }
      })
    );

    // Debug: Check products with expiration dates
    const productsWithExpiration = productsWithEarliestExpiry.filter(product => product.earliest_expiration);
    console.log("🔔 Products with expiration dates:", productsWithExpiration.length);
    if (productsWithExpiration.length > 0) {
      console.log("🔔 Sample product with earliest expiration:", {
        name: productsWithExpiration[0].product_name,
        expiration: productsWithExpiration[0].earliest_expiration,
        isExpiringSoon: isProductExpiringSoon(productsWithExpiration[0].earliest_expiration),
        isExpired: isProductExpired(productsWithExpiration[0].earliest_expiration)
      });
    }

    const expiring = productsWithEarliestExpiry.filter(product => {
      if (!product.earliest_expiration || !settings.expiryAlerts) return false;
      return isProductExpiringSoon(product.earliest_expiration) || isProductExpired(product.earliest_expiration);
    });
      
      // Separate expired products for better visibility
      const expired = productsWithEarliestExpiry.filter(product => {
        if (!product.earliest_expiration || !settings.expiryAlerts) return false;
        return isProductExpired(product.earliest_expiration);
      });
      
      const lowStock = productList.filter(product => {
        return getStockStatus(product.quantity) === 'low stock' && settings.lowStockAlerts;
      });
      
      const outOfStock = productList.filter(product => {
        return getStockStatus(product.quantity) === 'out of stock';
      });
      
      console.log("🔔 Notification counts:", {
        expiring: expiring.length,
        expired: expired.length,
        lowStock: lowStock.length,
        outOfStock: outOfStock.length
      });

      // Add batch information to expiring products
      const expiringWithBatchInfo = await Promise.all(
        expiring.map(async (product) => {
          try {
            const fifoResponse = await getFifoStock(product.product_id);
            if (fifoResponse.success && fifoResponse.data && fifoResponse.data.length > 0) {
              // Find the batch that matches the earliest expiration
              const expiringBatch = fifoResponse.data.find(batch => 
                batch.expiration_date === product.earliest_expiration
              );
              return {
                ...product,
                expiring_batch: expiringBatch ? {
                  batch_number: expiringBatch.batch_number,
                  batch_reference: expiringBatch.batch_reference,
                  quantity: expiringBatch.available_quantity,
                  days_until_expiry: Math.ceil((new Date(product.earliest_expiration) - new Date()) / (1000 * 60 * 60 * 24))
                } : null
              };
            }
          } catch (error) {
            console.error("Error getting batch info for expiring product:", error);
          }
          return product;
        })
      );

      setNotifications({
        expiring: expiringWithBatchInfo.sort((a, b) => new Date(a.earliest_expiration) - new Date(b.earliest_expiration)),
        expired: expired.sort((a, b) => new Date(a.earliest_expiration) - new Date(b.earliest_expiration)),
        lowStock: lowStock.sort((a, b) => parseInt(a.quantity || 0) - parseInt(b.quantity || 0)),
        outOfStock
      });
    }
  
    // FIXED Data Loading Functions
    function loadData(dataType) {
      switch (dataType) {
        case "suppliers":
          handleApiCall("get_suppliers")
            .then((response) => {
              console.log("Suppliers response:", response.data)
              let suppliersArray = []
  
              if (response.success && Array.isArray(response.data)) {
                suppliersArray = response.data
              } else if (Array.isArray(response.data)) {
                suppliersArray = response.data
              }
  
              setSuppliersData(suppliersArray)
              updateStats("totalSuppliers", suppliersArray.length)
              console.log("Suppliers loaded:", suppliersArray.length)
            })
            .catch((error) => {
              console.error("Error loading suppliers:", error)
              safeToast("error", "Failed to load suppliers")
              setSuppliersData([])
            })
          break
            case "products":
                console.log("🔄 Loading warehouse products with oldest batch info and expiration data...");
                loadProductsWithOldestBatch()
                  .then(async (productsWithBatchInfo) => {
                    console.log("📦 Products with batch info loaded:", productsWithBatchInfo.length);
                    
                    // Filter out archived products
                    const activeProducts = productsWithBatchInfo.filter(
                      (product) => (product.status || "").toLowerCase() !== "archived"
                    );

                    console.log("🔍 Active products after filtering:", activeProducts.length);
                    console.log("🔍 Products with batch info and expiration data loaded");
                    console.log("📅 Sample product expiration data:", activeProducts[0]?.expiration || "No expiration data");

                    setInventoryData(activeProducts);
                    await calculateNotifications(activeProducts);
                    updateStats("totalProducts", activeProducts.length);
                    calculateWarehouseValue(activeProducts);
                    calculateLowStockAndExpiring(activeProducts);
                    console.log("✅ Products with batch info loaded successfully:", activeProducts.length, "products");
                  })
                  .catch((error) => {
                    console.error("❌ Error loading products with batch info:", error);
                    safeToast("error", "Failed to load products with batch and expiration information");
                    setInventoryData([]);
                  });
              break;
  
  
  
        case "batches":
          handleApiCall("get_batches")
            .then((response) => {
              console.log("Batches response:", response.data)
              let batchesArray = []
  
              if (Array.isArray(response.data)) {
                batchesArray = response.data
              } else if (response.data && Array.isArray(response.data.data)) {
                batchesArray = response.data.data
              }
  
              setBatchData(batchesArray)
              console.log("Batches loaded:", batchesArray.length)
            })
            .catch((error) => {
              console.error("Error loading batches:", error)
              safeToast("error", "Failed to load batches")
              setBatchData([])
            })
          break
  
        case "brands":
          // Load brands from your database
          handleApiCall("get_brands")
            .then((response) => {
              console.log("Brands response:", response.data)
              let brandsArray = []
  
              if (Array.isArray(response.data)) {
                brandsArray = response.data
              } else if (response.data && Array.isArray(response.data.data)) {
                brandsArray = response.data.data
              }
  
              setBrandsData(brandsArray)
              console.log("Brands loaded:", brandsArray.length)
            })
            .catch((error) => {
              console.error("Error loading brands:", error)
              // Set default brands if API fails
              setBrandsData([
                { brand_id: 23, brand: "dawdawdaw" },
                { brand_id: 24, brand: "trust" },
                { brand_id: 25, brand: "rightmid" },
                { brand_id: 26, brand: "daw" },
                { brand_id: 27, brand: "dwa" },
                { brand_id: 28, brand: "dawd" },
              ])
            })
          break

        case "categories":
          // Load categories from your database
          console.log("🔄 Loading categories...");
          handleApiCall("get_categories")
            .then((response) => {
              console.log("📦 Categories API response:", response);
              console.log("📦 Categories response.data:", response.data);
              let categoriesArray = []
  
              if (Array.isArray(response.data)) {
                categoriesArray = response.data
                console.log("✅ Categories loaded from response.data array:", categoriesArray);
              } else if (response.data && Array.isArray(response.data.data)) {
                categoriesArray = response.data.data
                console.log("✅ Categories loaded from response.data.data array:", categoriesArray);
              } else {
                console.warn("⚠️ Unexpected categories response format:", response);
              }
  
              console.log("🔍 Final categoriesArray before setting:", categoriesArray);
              console.log("🔍 categoriesArray.length:", categoriesArray.length);
              console.log("🔍 categoriesArray content:", JSON.stringify(categoriesArray, null, 2));
              
              setCategoriesData(categoriesArray)
              console.log("✅ Categories loaded successfully:", categoriesArray.length, "categories");
              console.log("📋 Categories data:", categoriesArray);
            })
            .catch((error) => {
              console.error("❌ Error loading categories:", error)
              safeToast("error", "Failed to load categories from database")
            })
          break
  
        case "all":
          loadData("suppliers")
          loadData("products")
          loadData("batches")
          loadData("brands")
          loadData("categories")
          break
  
        default:
          console.error("Unknown data type:", dataType)
      }
    }
  

    
    function updateStats(statName, value) {
      setStats((prev) => ({
        ...prev,
        [statName]: value,
      }))
    }
  
    function calculateWarehouseValue(products) {
  const totalValue = products.reduce((sum, product) => {
    return sum + (Number.parseFloat(product?.srp) || 0) * (Number.parseFloat(product?.product_quantity || product?.quantity || 0))
  }, 0)
  
  // Calculate total quantity from product quantity
  const totalProductQuantity = products.reduce((sum, product) => sum + (Number(product.product_quantity || product.quantity || 0)), 0);
  
  setStats((prev) => ({
    ...prev,
    totalQuantity: totalProductQuantity,
    totalProductQuantity: totalProductQuantity,
    warehouseValue: totalValue,
  }))
}
  
    // Reset Functions
    function clearSupplierForm() {
      setSupplierFormData({
        supplier_name: "",
        supplier_address: "",
        supplier_contact: "",
        supplier_email: "",
        order_level: "",
        primary_phone: "",
        primary_email: "",
        contact_person: "",
        contact_title: "",
        payment_terms: "",
        lead_time_days: "",
        credit_rating: "",
        notes: "",
      })
    }
  
    function clearEditForm() {
      setEditFormData({})
    }
  
    // Form Handlers
    function handleSupplierInputChange(field, value) {
      setSupplierFormData((prev) => ({
        ...prev,
        [field]: value,
      }))
    }
  
    function handleEditInputChange(field, value) {
      setEditFormData((prev) => ({
        ...prev,
        [field]: value,
      }))
    }

    function handleEditProductInputChange(field, value) {
      setEditProductFormData((prev) => ({
        ...prev,
        [field]: value,
      }))
    }
  
    // Enhanced Scanner Functions with Barcode Checking
  async function handleScannerOperation(operation, data) {
    console.log("Scanner operation:", operation, "Data:", data);
    
    switch (operation) {
      case "SCAN_COMPLETE":
        console.log("Scan complete with barcode:", data.barcode);
        // Keep scanner active after scan
        if (scanTimeout) clearTimeout(scanTimeout);
  
        const scanned = data.barcode;
        setScannedBarcode(scanned);
        setScannerStatusMessage("✅ Barcode received! Checking if product exists...");
  
        try {
          console.log("Checking barcode in database:", scanned);
          
          // First, try to find the product in existing inventory data
          const existingProductInInventory = inventoryData.find(product => product.barcode === scanned);
          
          if (existingProductInInventory) {
            console.log("Product found in inventory data:", existingProductInInventory);
            // Product exists - show update stock modal with proper initialization
            openUpdateStockModal(existingProductInInventory);
            setScannerStatusMessage("✅ Product found! Opening update stock modal.");
          } else {
            // If not in inventory, check API
            const barcodeCheck = await checkBarcodeExists(scanned);
            console.log("Barcode check result:", barcodeCheck);
            
            if (barcodeCheck.success && barcodeCheck.product) {
              console.log("Product found via API, opening update stock modal");
              // Product exists - show update stock modal with proper initialization
              openUpdateStockModal(barcodeCheck.product);
              setScannerStatusMessage("✅ Product found! Opening update stock modal.");
            } else {
              console.log("Product not found, opening new product modal");
              // Product doesn't exist - show new product modal
              openNewProductModal(scanned); // Pass scanned barcode to pre-fill
              setScannerStatusMessage("✅ New product detected! Opening new product modal.");
            }
          }
        } catch (error) {
          console.error("Error checking barcode:", error);
          setScannerStatusMessage("❌ Error checking barcode. Please try again.");
          safeToast("error", "Failed to check barcode");
        }
        
        // Reset scanner status after a delay to show it's ready for next scan
        setTimeout(() => {
          setScannerStatusMessage("🔍 Scanner is ready and active - Scan any barcode to continue");
        }, 3000);
        break;
  
      default:
        console.error("Unknown scanner operation:", operation);
    }
  }
  
  
  
    // Event Handlers
    function handleAddSupplier(e) {
      e.preventDefault()
      console.log("Form submitted with data:", supplierFormData)
      handleCrudOperation("CREATE_SUPPLIER", supplierFormData)
    }
  
    function handleUpdateSupplier(e) {
      e.preventDefault()
      handleCrudOperation("UPDATE_SUPPLIER", editFormData)
    }

    function handleUpdateProduct(e) {
      e.preventDefault()
      handleCrudOperation("UPDATE_PRODUCT", editProductFormData)
    }
  
   function handleDeleteItem() {
    if (activeTab === "products") {
      handleCrudOperation("DELETE_PRODUCT", selectedItem);
    } else {
      handleCrudOperation("DELETE_SUPPLIER", selectedItem);
    }
  }
  
  
  
    // Removed handleSaveEntry since we're using modals now
  
    // Modal Actions
    function openSupplierModal() {
      clearSupplierForm()
      setShowSupplierModal(true)
    }
  
    function closeSupplierModal() {
      setShowSupplierModal(false)
      clearSupplierForm()
    }
  
    function openEditModal(item) {
      setSelectedItem(item)
      setEditFormData(item)
      setShowEditModal(true)
    }

    function openEditProductModal(product) {
      setSelectedItem(product)
      setEditProductFormData({
        product_name: product?.product_name || "",
        category: product?.category || "",
        barcode: product?.barcode || "",
        description: product?.description || "",
        srp: product?.srp || product?.unit_price || "",
        brand_id: product?.brand_id || "",
        quantity: product?.quantity || "",
        supplier_id: product?.supplier_id || "",
        expiration: product?.expiration || "",
        prescription: product?.prescription || 0,
        bulk: product?.bulk || 0
      })
      setShowEditProductModal(true)
    }
  
    function closeEditModal() {
      setShowEditModal(false)
      setSelectedItem(null)
      clearEditForm()
    }

    function closeEditProductModal() {
      setShowEditProductModal(false)
      setSelectedItem(null)
      setEditProductFormData({
        product_name: "",
        category: "",
        barcode: "",
        description: "",
        srp: "",
        brand_id: null,
        quantity: "",
        supplier_id: "",
        expiration: "",
        prescription: 0,
        bulk: 0
      })
    }
  
    function openDeleteModal(item) {
      setSelectedItem(item)
      setShowDeleteModal(true)
    }
  
    function closeDeleteModal() {
      setShowDeleteModal(false)
      setSelectedItem(null)
    }
  
    // New modal handlers for barcode scanning
    function closeUpdateStockModal() {
              setShowUpdateStockModal(false);
        setExistingProduct(null);
        setNewStockQuantity("");
        setNewStockExpiration("");
        // Reset bulk mode fields
        setNewStockBoxes("");
        setNewStockStripsPerBox("");
        setNewStockTabletsPerStrip("");
        setNewStockPiecesPerPack("");
        // Reset configuration mode
        setStockUpdateConfigMode("bulk");
      setEditSrpEnabled(false);
      setNewSrp("");
      // Reset batch fields but keep auto-generation ready
      setNewStockBatchReference(""); // Will be auto-generated when modal opens
      setUseSameBatch(false);
      setExistingBatches([]);
      setSelectedExistingBatch(null);
    }

    async function openUpdateStockModal(product) {
      // Close modal first if it's already open to ensure clean state
      if (showUpdateStockModal) {
        closeUpdateStockModal();
        // Small delay to ensure state is reset
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Handle case when empty object is passed for new product scanning
      if (!product || Object.keys(product).length === 0) {
        // Reset all fields for new product scanning
        setExistingProduct(null);
        setNewStockQuantity("");
        setNewStockBoxes("");
        setNewStockStripsPerBox("");
        setNewStockTabletsPerStrip("");
        setNewStockPiecesPerPack("");
        setNewStockExpiration("");
        setNewSrp("");
        setEditSrpEnabled(false);
        setNewStockBatchReference("");
        setUseSameBatch(false);
        setSelectedExistingBatch(null);
        setExistingBatches([]);
        setStockUpdateConfigMode("pieces");
        setShowUpdateStockModal(true);
        return;
      }

      console.log("🔄 Setting existing product in update stock modal:", product);
      setExistingProduct(product);
      setNewStockQuantity("");
      setNewStockBoxes("");
      setNewStockStripsPerBox("");
      setNewStockTabletsPerStrip("");
      setNewStockPiecesPerPack("");
      setNewStockExpiration("");
      setNewSrp("");
      setEditSrpEnabled(false);
      // Initialize batch fields - ALWAYS auto-generate
      const autoBatchRef = generateBatchRef();
      console.log("🔄 Auto-generating batch reference:", autoBatchRef);
      setNewStockBatchReference(autoBatchRef);
      setUseSameBatch(false);
      setSelectedExistingBatch(null);
      
      // Load existing batches for this product
      try {
        console.log("🔄 Loading existing batches for product:", product.product_id);
        const response = await handleApiCall("get_product_batches", { product_id: product.product_id });
        console.log("📦 Existing batches response:", response);
        if (response.success && response.data && Array.isArray(response.data)) {
          setExistingBatches(response.data);
          console.log("✅ Loaded", response.data.length, "existing batches");
        } else {
          setExistingBatches([]);
          console.log("ℹ️ No existing batches found for this product");
        }
      } catch (error) {
        console.error("❌ Error loading existing batches:", error);
        setExistingBatches([]);
        safeToast("warning", "Could not load existing batches. You can still create a new batch.");
      }
      
      // Set default configuration mode based on product data
      const hasBulkFields = product.boxes || product.strips_per_box || 
                            product.tablets_per_strip || 
                            product.pieces_per_pack;
      
      // Default to pieces mode for easier use and immediate button activation
      setStockUpdateConfigMode("pieces");
      
      setShowUpdateStockModal(true);
    }

    function openNewProductModal(barcode = "") {
      // Auto-generate a new batch reference when opening the modal
      const newBatchRef = generateBatchRef();
      console.log("🔄 Auto-generating batch reference for new product:", newBatchRef);
      setNewProductForm({
        product_name: "",
        category: "",
        product_type: "",
        configMode: "bulk", // Reset to default
        barcode: barcode, // Pre-fill with scanned barcode if provided
        description: "",
        srp: "",
        brand_id: null,
        brand_search: "",
        supplier_id: "",
        expiration: "",
        date_added: new Date().toISOString().split('T')[0], // Auto-set current date
        batch: newBatchRef, // Auto-generated batch reference
        order_number: "",
        prescription: 0,
        bulk: 0,
        // Medicine fields
        boxes: "",
        strips_per_box: "",
        tablets_per_strip: "",
        total_tablets: "",
        // Non-Medicine fields
        pieces_per_pack: "",
        total_pieces: ""
      });
      setCurrentBatchNumber(newBatchRef); // Update current batch number
      setShowNewProductModal(true);
    }

    function closeNewProductModal() {
      setShowNewProductModal(false);
    }

    // Product Type Modal Functions
    function openProductTypeModal() {
      setShowProductTypeModal(true);
      // Pre-fill with existing values if any
      setProductTypeForm({
        product_type: newProductForm.product_type || "",
        configMode: newProductForm.configMode || "bulk", // Default to bulk mode
        boxes: newProductForm.boxes || "",
        strips_per_box: newProductForm.strips_per_box || "",
        tablets_per_strip: newProductForm.tablets_per_strip || "",
        total_tablets: newProductForm.total_tablets || "",
        pieces_per_pack: newProductForm.pieces_per_pack || "",
        total_pieces: newProductForm.total_pieces || ""
      });
    }

    function closeProductTypeModal() {
      setShowProductTypeModal(false);
      setProductTypeForm({
        product_type: "",
        configMode: "bulk", // Reset to default
        boxes: "",
        strips_per_box: "",
        tablets_per_strip: "",
        total_tablets: "",
        pieces_per_pack: "",
        total_pieces: ""
      });
    }

    function handleProductTypeInputChange(field, value) {
      setProductTypeForm(prev => {
        const updated = { ...prev, [field]: value };
        
        // Auto-calculate totals
        if (field === "boxes" || field === "strips_per_box" || field === "tablets_per_strip") {
          const boxes = parseInt(updated.boxes) || 0;
          const stripsPerBox = parseInt(updated.strips_per_box) || 0;
          const tabletsPerStrip = parseInt(updated.tablets_per_strip) || 0;
          updated.total_tablets = (boxes * stripsPerBox * tabletsPerStrip).toString();
        }
        
        if (field === "boxes" || field === "pieces_per_pack") {
          const boxes = parseInt(updated.boxes) || 0;
          const piecesPerPack = parseInt(updated.pieces_per_pack) || 0;
          updated.total_pieces = (boxes * piecesPerPack).toString();
        }
        
        return updated;
      });
    }

    function saveProductTypeConfiguration() {
      // Update the main form with the product type configuration
      setNewProductForm(prev => ({
        ...prev,
        product_type: productTypeForm.product_type,
        configMode: productTypeForm.configMode, // Save the configuration mode
        boxes: productTypeForm.boxes,
        strips_per_box: productTypeForm.strips_per_box,
        tablets_per_strip: productTypeForm.tablets_per_strip,
        total_tablets: productTypeForm.total_tablets,
        pieces_per_pack: productTypeForm.pieces_per_pack,
        total_pieces: productTypeForm.total_pieces
      }));
      
      closeProductTypeModal();
      safeToast("success", "Product type configuration saved!");
    }

    // Form handlers for new product modal
    function handleNewProductInputChange(field, value) {
      setNewProductForm(prev => {
        const updated = {
          ...prev,
          [field]: value
        };
        
        // Auto-calculate totals for bulk mode
        if (field === "boxes" || field === "strips_per_box" || field === "tablets_per_strip") {
          const boxes = parseInt(updated.boxes) || 0;
          const stripsPerBox = parseInt(updated.strips_per_box) || 0;
          const tabletsPerStrip = parseInt(updated.tablets_per_strip) || 0;
          updated.total_tablets = (boxes * stripsPerBox * tabletsPerStrip).toString();
        }
        
        if (field === "boxes" || field === "pieces_per_pack") {
          const boxes = parseInt(updated.boxes) || 0;
          const piecesPerPack = parseInt(updated.pieces_per_pack) || 0;
          updated.total_pieces = (boxes * piecesPerPack).toString();
        }
        
        return updated;
      });
    }

    // FIFO Functions
    async function getFifoStock(productId) {
      try {
        console.log("Calling get_fifo_stock API with product_id:", productId);
        const response = await handleApiCall("get_fifo_stock", { product_id: productId });
        console.log("get_fifo_stock API response:", response);
        
        // Ensure response has the expected structure
        if (response && typeof response === 'object') {
          return response;
        } else {
          console.warn("Unexpected response format from get_fifo_stock:", response);
          return { success: false, data: [], error: "Unexpected response format" };
        }
      } catch (error) {
        console.error("Error getting FIFO stock:", error);
        return { success: false, data: [], error: error.message };
      }
    }

    // New function to load products with their oldest batch information
    async function loadProductsWithOldestBatch() {
      try {
        console.log("🔄 Loading warehouse products with oldest batch info...");
        const response = await handleApiCall("get_products_oldest_batch", { location_id: 2 }); // Warehouse location
        
        if (response.success && Array.isArray(response.data)) {
          console.log("✅ Products with oldest batch loaded:", response.data.length, "products");
          
          // Process the data to ensure proper field mapping for expiration
          const processedProducts = response.data.map(product => {
            // Handle different expiration date formats from backend - prioritize database values
            let expiration = null;
            
            // Priority 1: Check for expiration_date field from tbl_fifo_stock (most accurate)
            if (product.expiration_date && product.expiration_date !== '0000-00-00' && product.expiration_date !== '' && product.expiration_date !== null) {
              expiration = product.expiration_date;
            }
            // Priority 2: Check for oldest_batch_expiration from FIFO query
            else if (product.oldest_batch_expiration && product.oldest_batch_expiration !== '0000-00-00' && product.oldest_batch_expiration !== '' && product.oldest_batch_expiration !== null) {
              expiration = product.oldest_batch_expiration;
            }
            // Priority 3: Fallback to product expiration from tbl_product
            else if (product.expiration && product.expiration !== '0000-00-00' && product.expiration !== '' && product.expiration !== null) {
              expiration = product.expiration;
            }
            
            return {
              ...product,
              // Map expiration_date from database to expiration field expected by frontend
              expiration: expiration,
              // Ensure other batch fields are properly mapped from database
              oldest_batch_reference: product.batch_reference || product.oldest_batch_reference || null,
              oldest_batch_quantity: product.oldest_batch_quantity || 0,
              oldest_batch_expiration: expiration,
              oldest_batch_entry_date: product.entry_date || product.oldest_batch_entry_date || null,
              oldest_batch_unit_cost: product?.unit_cost || product?.oldest_batch_unit_cost || product?.srp || 0,
            };
          });
          
          console.log("📦 Processed", processedProducts.length, "products with batch info");
          return processedProducts;
        } else {
          console.warn("⚠️ Failed to load products with oldest batch, falling back to regular products");
          // Fallback to regular product loading
          const fallbackResponse = await handleApiCall("get_products");
          let productsArray = [];
          
          if (Array.isArray(fallbackResponse.data)) {
            productsArray = fallbackResponse.data;
          } else if (fallbackResponse.data && Array.isArray(fallbackResponse.data.data)) {
            productsArray = fallbackResponse.data.data;
          }
          
          // Filter for warehouse products and enrich with oldest batch info
          const warehouseProducts = productsArray.filter(
            (product) => product.location_id === 2 || product.location_id === 1
          );
          
          // Enrich each product with oldest batch info
          const enrichedProducts = await Promise.all(
            warehouseProducts.map(async (product) => {
              try {
                const fifoResponse = await getFifoStock(product.product_id);
                if (fifoResponse.success && fifoResponse.data && fifoResponse.data.length > 0) {
                  const oldestBatch = fifoResponse.data[0]; // First batch is oldest
                  // Handle expiration date properly - prioritize database values from tbl_fifo_stock
                  let batchExpiration = null;
                  if (oldestBatch.expiration_date && oldestBatch.expiration_date !== '0000-00-00' && oldestBatch.expiration_date !== '' && oldestBatch.expiration_date !== null) {
                    batchExpiration = oldestBatch.expiration_date;
                  } else if (oldestBatch.expiration && oldestBatch.expiration !== '0000-00-00' && oldestBatch.expiration !== '' && oldestBatch.expiration !== null) {
                    batchExpiration = oldestBatch.expiration;
                  }
                  
                  return {
                    ...product,
                    // Map expiration data properly for frontend use
                    expiration: batchExpiration,
                    oldest_batch_reference: oldestBatch.batch_reference,
                    oldest_batch_quantity: oldestBatch.quantity,
                    oldest_batch_expiration: batchExpiration,
                    oldest_batch_entry_date: oldestBatch.entry_date,
                    oldest_batch_unit_cost: oldestBatch.unit_cost,
                    total_fifo_batches: fifoResponse.data.length
                  };
                } else {
                  // Handle expiration from product data
                  let productExpiration = null;
                  if (product.expiration_date && product.expiration_date !== '0000-00-00' && product.expiration_date !== '' && product.expiration_date !== null) {
                    productExpiration = product.expiration_date;
                  } else if (product.expiration && product.expiration !== '0000-00-00' && product.expiration !== '' && product.expiration !== null) {
                    productExpiration = product.expiration;
                  }
                  
                  return {
                    ...product,
                    // Ensure expiration field is set even when no FIFO data
                    expiration: productExpiration,
                    oldest_batch_reference: null,
                    oldest_batch_quantity: 0,
                    oldest_batch_expiration: null,
                    oldest_batch_entry_date: null,
                    oldest_batch_unit_cost: product?.srp || product?.unit_price,
                    total_fifo_batches: 0
                  };
                }
              } catch (error) {
                console.error("Error enriching product", product.product_id, "with FIFO data:", error);
                
                // Handle expiration from product data on error
                let errorExpiration = null;
                if (product.expiration_date && product.expiration_date !== '0000-00-00' && product.expiration_date !== '' && product.expiration_date !== null) {
                  errorExpiration = product.expiration_date;
                } else if (product.expiration && product.expiration !== '0000-00-00' && product.expiration !== '' && product.expiration !== null) {
                  errorExpiration = product.expiration;
                }
                
                return {
                  ...product,
                  // Ensure expiration field is available even on error
                  expiration: errorExpiration
                };
              }
            })
          );
          
          return enrichedProducts;
        }
      } catch (error) {
        console.error("❌ Error loading products with oldest batch:", error);
        return [];
      }
    }

    // Function to refresh oldest batch data after stock changes
    async function refreshOldestBatchData() {
      console.log("🔄 Refreshing oldest batch data after stock changes...");
      try {
        const refreshedProducts = await loadProductsWithOldestBatch();
        const activeProducts = refreshedProducts.filter(
          (product) => (product.status || "").toLowerCase() !== "archived"
        );
        
        setInventoryData(activeProducts);
        updateStats("totalProducts", activeProducts.length);
        calculateWarehouseValue(activeProducts);
        calculateLowStockAndExpiring(activeProducts);
        console.log("✅ Oldest batch data refreshed successfully");
        
        return activeProducts;
      } catch (error) {
        console.error("❌ Error refreshing oldest batch data:", error);
        return [];
      }
    }

    // Function to refresh product quantities
    async function refreshProductQuantities() {
      console.log("🔄 Refreshing product quantities and expiration data...");
      try {
        const refreshedProducts = await loadProductsWithOldestBatch();
        const activeProducts = refreshedProducts.filter(
          (product) => (product.status || "").toLowerCase() !== "archived"
        );
        
        setInventoryData(activeProducts);
        await calculateNotifications(activeProducts);
        updateStats("totalProducts", activeProducts.length);
        calculateWarehouseValue(activeProducts);
        calculateLowStockAndExpiring(activeProducts);
        console.log("✅ Product quantities and expiration data refreshed successfully");
        
        return activeProducts;
      } catch (error) {
        console.error("❌ Error refreshing product quantities:", error);
        return [];
      }
    }

    // Function to load product quantities from tbl_product
    async function loadProductQuantities() {
      try {
        console.log("🔄 Loading product quantities from tbl_product...");
        const response = await handleApiCall("get_product_quantities", { location_id: 2 }); // Warehouse location
        
        if (response.success && Array.isArray(response.data)) {
          console.log("✅ Product quantities loaded:", response.data.length, "products");
          console.log("🔍 Sample product data:", response.data.slice(0, 3));
          return response.data;
        } else {
          console.warn("⚠️ Failed to load product quantities, falling back to regular products");
          console.log("⚠️ Response:", response);
          // Fallback to regular product loading
          const fallbackResponse = await handleApiCall("get_products");
          let productsArray = [];
          
          if (Array.isArray(fallbackResponse.data)) {
            productsArray = fallbackResponse.data;
          } else if (fallbackResponse.data && Array.isArray(fallbackResponse.data.data)) {
            productsArray = fallbackResponse.data.data;
          }
          
          console.log("🔄 Fallback products loaded:", productsArray.length, "products");
          return productsArray;
        }
      } catch (error) {
        console.error("❌ Error loading product quantities:", error);
        return [];
      }
    }

    async function getExpiringProducts(daysThreshold = 30) {
      try {
        const response = await handleApiCall("get_expiring_products", { days_threshold: daysThreshold });
        return response;
      } catch (error) {
        console.error("Error getting expiring products:", error);
        return { success: false, error: error.message };
      }
    }

    async function consumeStockFifo(productId, quantity, referenceNo = "", notes = "") {
      try {
        const response = await handleApiCall("consume_stock_fifo", { 
          product_id: productId, 
          quantity: quantity,
          reference_no: referenceNo,
          notes: notes,
          created_by: currentUser
        });
        return response;
      } catch (error) {
        console.error("Error consuming stock:", error);
        return { success: false, error: error.message };
      }
    }

    function openFifoModal(product) {
      setSelectedProductForFifo(product);
      setShowFifoModal(true);
      loadFifoStock(product.product_id);
    }

    function closeFifoModal() {
      setShowFifoModal(false);
      setSelectedProductForFifo(null);
      setFifoStockData([]);
    }

      // Functions for expiring batch modal
  function openExpiringBatchModal(product) {
    setSelectedExpiringProduct(product);
    setShowExpiringBatchModal(true);
    // Load FIFO data for the product
    loadFifoStock(product.product_id);
  }

  function closeExpiringBatchModal() {
    setShowExpiringBatchModal(false);
    setSelectedExpiringProduct(null);
    setFifoStockData([]);
  }

  // Functions for view batch modal
  function openViewBatchModal(batchData) {
    setViewBatchData(batchData);
    setShowViewBatchModal(true);
  }

  function closeViewBatchModal() {
    setShowViewBatchModal(false);
    setViewBatchData(null);
  }

    function openQuantityHistoryModal(product) {
      setSelectedProductForHistory(product);
      setShowQuantityHistoryModal(true);
      setShowCurrentFifoData(true); // Always start with FIFO view
      refreshProductData(product.product_id); // Load FIFO data
    }

    function closeQuantityHistoryModal() {
      setShowQuantityHistoryModal(false);
      setSelectedProductForHistory(null);
      setQuantityHistoryData([]);
    }

    async function loadQuantityHistory(productId) {
      console.log("Loading quantity history for product ID:", productId);
      const response = await handleApiCall("get_quantity_history", { product_id: productId });
      console.log("Quantity history response:", response);
      if (response.success) {
        setQuantityHistoryData(response.data);
      } else {
        console.error("Quantity history error:", response.message);
        safeToast("error", "Failed to load quantity history: " + (response.message || "Unknown error"));
      }
    }

    // Function to refresh quantity history and FIFO stock data
    async function refreshProductData(productId) {
      console.log("🔄 Refreshing product data for ID:", productId);
      try {
        // Refresh quantity history
        await loadQuantityHistory(productId);
        
        // Refresh FIFO stock data
        await loadFifoStock(productId);
        
        // Also refresh the main product list to update quantities
        await loadData("products");
        
        // Toggle to show current FIFO data instead of history
        setShowCurrentFifoData(true);
        
        console.log("✅ Product data refreshed successfully - Now showing current FIFO batches");
      } catch (error) {
        console.error("❌ Error refreshing product data:", error);
      }
    }





    async function loadFifoStock(productId) {
      console.log("Loading FIFO stock for product ID:", productId);
      const response = await getFifoStock(productId);
      console.log("FIFO stock response:", response);
      if (response.success) {
        setFifoStockData(response.data);
      } else {
        console.error("FIFO stock error:", response.message);
        safeToast("error", "Failed to load FIFO stock data: " + (response.message || "Unknown error"));
      }
    }

    // Handle update stock submission
    async function handleUpdateStock() {
      // Calculate quantity based on configuration mode
      let quantityToAdd = 0;
      
      // Check if user is using bulk mode (boxes and pieces configuration)
      const hasBulkConfiguration = (newStockBoxes && newStockBoxes > 0) || 
                                  (newStockStripsPerBox && newStockStripsPerBox > 0) || 
                                  (newStockTabletsPerStrip && newStockTabletsPerStrip > 0) ||
                                  (newStockPiecesPerPack && newStockPiecesPerPack > 0);
      
      // Check if user is using direct quantity input
      const hasDirectQuantity = newStockQuantity && newStockQuantity > 0;
      
      if (existingProduct?.product_type === "Medicine") {
        // Medicine: calculate from boxes × strips × tablets
        if (stockUpdateConfigMode === "bulk") {
          const boxes = parseInt(newStockBoxes) || 0;
          const stripsPerBox = parseInt(newStockStripsPerBox) || 0;
          const tabletsPerStrip = parseInt(newStockTabletsPerStrip) || 0;
          
          if (boxes <= 0 || stripsPerBox <= 0 || tabletsPerStrip <= 0) {
            safeToast("error", "Please enter valid bulk quantities (boxes, strips per box, tablets per strip)");
            return;
          }
          quantityToAdd = boxes * stripsPerBox * tabletsPerStrip;
        } else {
          // Pieces mode for medicine
          if (!newStockQuantity || newStockQuantity <= 0) {
            safeToast("error", "Please enter a valid quantity of tablets");
            return;
          }
          quantityToAdd = parseInt(newStockQuantity);
        }
      } else if (existingProduct?.product_type === "Non-Medicine") {
        // Non-Medicine: calculate from boxes × pieces per box
        if (stockUpdateConfigMode === "bulk") {
          const boxes = parseInt(newStockBoxes) || 0;
          const piecesPerPack = parseInt(newStockPiecesPerPack) || 0;
          
          if (boxes <= 0 || piecesPerPack <= 0) {
            safeToast("error", "Please enter valid bulk quantities (boxes, pieces per box)");
            return;
          }
          quantityToAdd = boxes * piecesPerPack;
        } else {
          // Pieces mode for non-medicine
          if (!newStockQuantity || newStockQuantity <= 0) {
            safeToast("error", "Please enter a valid quantity of pieces");
            return;
          }
          quantityToAdd = parseInt(newStockQuantity);
        }
      } else {
        // Unknown product type - use configuration mode to determine validation
        if (stockUpdateConfigMode === "bulk") {
          // User is using bulk mode, calculate from boxes and pieces
          if (newStockBoxes && newStockPiecesPerPack) {
            // Non-medicine style bulk configuration
            const boxes = parseInt(newStockBoxes) || 0;
            const piecesPerPack = parseInt(newStockPiecesPerPack) || 0;
            
            if (boxes <= 0 || piecesPerPack <= 0) {
              safeToast("error", "Please enter valid bulk quantities (boxes, pieces per box)");
              return;
            }
            quantityToAdd = boxes * piecesPerPack;
          } else if (newStockBoxes && newStockStripsPerBox && newStockTabletsPerStrip) {
            // Medicine style bulk configuration
            const boxes = parseInt(newStockBoxes) || 0;
            const stripsPerBox = parseInt(newStockStripsPerBox) || 0;
            const tabletsPerStrip = parseInt(newStockTabletsPerStrip) || 0;
            
            if (boxes <= 0 || stripsPerBox <= 0 || tabletsPerStrip <= 0) {
              safeToast("error", "Please enter valid bulk quantities (boxes, strips per box, tablets per strip)");
              return;
            }
            quantityToAdd = boxes * stripsPerBox * tabletsPerStrip;
          } else {
            safeToast("error", "Please fill in all bulk configuration fields");
            return;
          }
        } else if (stockUpdateConfigMode === "pieces") {
          // User is using pieces mode - direct quantity input
          if (!newStockQuantity || newStockQuantity <= 0) {
            safeToast("error", "Please enter a valid quantity");
            return;
          }
          quantityToAdd = parseInt(newStockQuantity);
        } else {
          // Fallback: try to detect configuration mode automatically
          if (hasBulkConfiguration) {
            safeToast("error", "Please fill in all bulk configuration fields");
            return;
          } else if (hasDirectQuantity) {
            quantityToAdd = parseInt(newStockQuantity);
          } else {
            safeToast("error", "Please configure quantity using bulk mode (boxes × pieces) or enter direct quantity");
            return;
          }
        }
      }
      
      if (quantityToAdd <= 0) {
        safeToast("error", "Please enter a valid quantity");
        return;
      }

      // Validate same batch selection
      if (useSameBatch && !selectedExistingBatch) {
        safeToast("error", "Please select an existing batch to add quantity to");
        return;
      }

      // Determine batch reference - automatically generate if not provided
      let batchRef;
      
      if (useSameBatch && selectedExistingBatch) {
        // Use existing batch information
        batchRef = selectedExistingBatch.batch_reference;
        console.log("🔄 Using existing batch:", batchRef);
      } else {
        // Use new batch information - auto-generate if not provided
        batchRef = newStockBatchReference || generateBatchRef();
        console.log("🆕 Creating new batch:", batchRef);
      }
      
      // Use new SRP if edit SRP is enabled, otherwise use null
      const srpValue = editSrpEnabled && newSrp ? parseFloat(newSrp) : null;
      
      // Ensure we use the most accurate expiration date from database
      const expirationDate = newStockExpiration || existingProduct?.expiration || existingProduct?.oldest_batch_expiration;
      
      // Use consistent batch reference for all products in update stock batch
      const consistentBatchRef = updateStockProducts.length > 0 ? updateStockProducts[0]?.batch_reference : batchRef;
      
      // Add product to update stock batch instead of immediate save
      const updateStockProduct = {
        temp_id: Date.now() + Math.random(), // Unique temporary ID
        product_id: existingProduct?.product_id,
        product_name: existingProduct?.product_name,
        category: existingProduct?.category,
        product_type: existingProduct?.product_type,
        brand_search: existingProduct?.brand_search || existingProduct?.brand_id,
        barcode: existingProduct?.barcode,
        srp: srpValue || existingProduct?.srp,
        quantity: quantityToAdd,
        batch_reference: consistentBatchRef, // Use consistent batch reference
        expiration: expirationDate,
        batchType: useSameBatch ? "existing" : "new",
        // Store configuration details
        configMode: stockUpdateConfigMode,
        boxes: newStockBoxes,
        strips_per_box: newStockStripsPerBox,
        tablets_per_strip: newStockTabletsPerStrip,
        pieces_per_pack: newStockPiecesPerPack,
        // Calculate totals for display
        total_tablets: existingProduct?.product_type === "Medicine" ? quantityToAdd : null,
        total_pieces: existingProduct?.product_type === "Non-Medicine" ? quantityToAdd : null,
        prescription: existingProduct?.prescription || 0,
        bulk: existingProduct?.bulk || 0
      };
      
      // Add to update stock products array
      setUpdateStockProducts(prev => [...prev, updateStockProduct]);
      
      // Close update modal and automatically show batch modal
      closeUpdateStockModal();
      setShowUpdateStockBatchModal(true);
      
      safeToast("success", `Product added to update stock batch! Total products: ${updateStockProducts.length + 1}`);
    }

    // Handle new product submission - Now adds to temporary storage
    async function handleAddNewProduct(e) {
      e.preventDefault();
      
      console.log("🔄 Starting add product process...");
      console.log("📝 Form data:", newProductForm);
      console.log("🔍 Brand ID from form:", newProductForm.brand_id);
      console.log("🔍 Brand search from form:", newProductForm.brand_search);
      
      // Basic required fields validation
      if (!newProductForm.product_name || !newProductForm.category || !newProductForm.product_type || !newProductForm.srp) {
        safeToast("error", "Please fill in all required fields (Product Name, Category, Product Type, SRP)");
        console.log("❌ Basic validation failed - missing required fields");
        return;
      }

      // Validate medicine-specific fields based on configuration mode
      if (newProductForm.product_type === "Medicine") {
        if (newProductForm.configMode === "bulk") {
          if (!newProductForm.boxes || !newProductForm.strips_per_box || !newProductForm.tablets_per_strip) {
            safeToast("error", "Please fill in all medicine-specific fields (Boxes, Strips per Box, Tablets per Strip)");
            console.log("❌ Medicine bulk mode validation failed - missing required fields");
            return;
          }
        } else if (newProductForm.configMode === "pieces") {
          if (!newProductForm.total_tablets) {
            safeToast("error", "Please enter the total number of tablets");
            console.log("❌ Medicine pieces mode validation failed - missing total tablets");
            return;
          }
        }
      }

      // Validate non-medicine-specific fields based on configuration mode
      if (newProductForm.product_type === "Non-Medicine") {
        if (newProductForm.configMode === "bulk") {
          if (!newProductForm.boxes || !newProductForm.pieces_per_pack) {
            safeToast("error", "Please fill in all non-medicine-specific fields (Boxes, Pieces per Box)");
            console.log("❌ Non-medicine bulk mode validation failed - missing required fields");
            return;
          }
        } else if (newProductForm.configMode === "pieces") {
          if (!newProductForm.total_pieces) {
            safeToast("error", "Please enter the total number of pieces");
            console.log("❌ Non-medicine pieces mode validation failed - missing total pieces");
            return;
          }
        }
      }

      // Add to temporary storage instead of database
      const tempProduct = {
        ...newProductForm,
        batch: currentBatchNumber, // Use the same batch number for all products
        temp_id: Date.now(), // Unique temporary ID
        status: "pending",
        created_at: new Date().toISOString(),
        brand_id: newProductForm.brand_id || null, // Ensure brand_id is included
        brand_search: newProductForm.brand_search || "" // Ensure brand_search is included
      };

      setTemporaryProducts(prev => [...prev, tempProduct]);
      
      console.log("📦 Added product to temporary storage:", tempProduct);
      console.log("🔍 Brand info in temp product:", {
        brand_id: tempProduct.brand_id,
        brand_search: tempProduct.brand_search
      });
      
      // Reset form for next product (keep same batch number and config mode)
      setNewProductForm({
        product_name: "",
        category: "",
        product_type: "",
        configMode: newProductForm.configMode || "bulk", // Preserve configuration mode
        barcode: "", // No auto-generated barcode
        description: "",
        srp: "",
        brand_id: null,
        brand_search: "",
        supplier_id: "",
        expiration: "",
        date_added: new Date().toISOString().split('T')[0],
        batch: newProductForm.batch || currentBatchNumber, // Keep user's batch input or current batch
        order_number: "",
        prescription: 0,
        bulk: 0,
        // Medicine fields
        boxes: "",
        strips_per_box: "",
        tablets_per_strip: "",
        total_tablets: "",
        // Non-Medicine fields
        pieces_per_pack: "",
        total_pieces: ""
      });

      safeToast("success", "Product added to batch! Add more products or save batch when ready.");
      console.log("✅ Product added to temporary storage:", tempProduct);
    }



    // New function to save batch as single entry
    async function handleSaveBatch() {
      if (temporaryProducts.length === 0) {
        safeToast("error", "No products to save");
        return;
      }

      setLoading(true);

      try {
        // Process products and handle brand creation for new brands
        const processedProducts = [];
        
        for (const product of temporaryProducts) {
          let brandId = product?.brand_id || 1;
          
          // Debug brand information
          console.log("🔍 Product brand info:", {
            brand_search: product?.brand_search,
            brand_id: product?.brand_id,
            brand_id_type: typeof product?.brand_id,
            condition_check: product?.brand_search && (!product?.brand_id || product?.brand_id === "" || product?.brand_id === null)
          });
          
          // If brand_search has a value but no brand_id (null, undefined, or empty string), create a new brand
          if (product?.brand_search && (!product?.brand_id || product?.brand_id === "" || product?.brand_id === null)) {
            console.log("🆕 Creating new brand:", product.brand_search);
            try {
              const brandResponse = await handleApiCall("add_brand", {
                brand_name: product.brand_search
              });
              
              console.log("📡 Brand API Response:", brandResponse);
              
              if (brandResponse.success) {
                brandId = brandResponse.brand_id;
                console.log("✅ New brand created with ID:", brandId);
              } else {
                console.error("❌ Failed to create brand:", brandResponse.message);
                safeToast("error", `Failed to create brand "${product.brand_search}": ${brandResponse.message}`);
                // Continue with default brand_id = 1
              }
            } catch (error) {
              console.error("❌ Error creating brand:", error);
              safeToast("error", `Error creating brand "${product.brand_search}": ${error.message}`);
              // Continue with default brand_id = 1
            }
          } else {
            console.log("ℹ️ Using existing brand_id:", brandId);
          }
          
          processedProducts.push({
            product_name: product?.product_name || "",
            category: product?.category || "",
            product_type: product?.product_type || "",
            configMode: product?.configMode || "bulk", // Store configuration mode
            barcode: product?.barcode || "",
            description: product?.description || "",
            unit_price: parseFloat(product?.srp || 0), // Using SRP as unit_price for backend compatibility
            srp: parseFloat(product?.srp || 0),
            brand_id: brandId, // Use the processed brand_id
            // Store total pieces instead of bulk units
            quantity: product?.product_type === "Medicine" 
              ? parseInt(product?.total_tablets || 0)  // Total tablets for medicine
              : parseInt(product?.total_pieces || 0),  // Total pieces for non-medicine
            supplier_id: product?.supplier_id || 1,
            expiration: product?.expiration || null,
            prescription: product?.prescription || 0,
            bulk: product?.bulk || 0,
            // Medicine fields
            boxes: product?.boxes || null,
            strips_per_box: product?.strips_per_box || null,
            tablets_per_strip: product?.tablets_per_strip || null,
            total_tablets: product?.total_tablets || null,
            // Non-Medicine fields
            pieces_per_pack: product?.pieces_per_pack || null,
            total_pieces: product?.total_pieces || null
          });
        }

        // Create batch summary data
        const batchData = {
          batch_reference: currentBatchNumber,
          batch_date: new Date().toISOString().split('T')[0],
          batch_time: new Date().toLocaleTimeString(),
          total_products: temporaryProducts.length,
          total_quantity: temporaryProducts.reduce((sum, p) => {
            const totalPieces = p?.product_type === "Medicine" 
              ? parseInt(p?.total_tablets || 0)  // Total tablets for medicine
              : parseInt(p?.total_pieces || 0);  // Total pieces for non-medicine
            return sum + totalPieces;
          }, 0),
          total_value: temporaryProducts.reduce((sum, p) => {
            const totalPieces = p?.product_type === "Medicine" 
              ? parseInt(p?.total_tablets || 0)  // Total tablets for medicine
              : parseInt(p?.total_pieces || 0);  // Total pieces for non-medicine
            return sum + ((parseFloat(p?.srp || 0) * totalPieces));
          }, 0),
          location: "Warehouse",
          entry_by: currentUser,
          status: "active",
          products: processedProducts
        };

        console.log("🚀 Saving batch as single entry:", batchData);
        console.log("🔍 Products being saved:", processedProducts);
        console.log("🔍 Brand IDs in processed products:", processedProducts.map(p => ({ name: p.product_name, brand_id: p.brand_id })));

        // Call API to save batch
        const response = await handleApiCall("add_batch_entry", batchData);
        
        if (response.success) {
          safeToast("success", `Batch saved successfully! ${temporaryProducts.length} products in single batch entry`);
          
          // Clear temporary products and close modal
          setTemporaryProducts([]);
          setShowBatchEntryModal(false);
          
          // Generate new batch number for next batch
          const newBatchNumber = generateBatchRef();
          setCurrentBatchNumber(newBatchNumber);
          
          // Reset new product form with new batch number
          setNewProductForm(prev => ({
            ...prev,
            batch: newBatchNumber
          }));
          
          // Reload data to show new batch
          await loadData("products");
          await loadData("all");
          
          console.log("✅ Batch saved successfully, new batch number generated:", newBatchNumber);
        } else {
          safeToast("error", response.message || "Failed to save batch");
        }
      } catch (error) {
        console.error("❌ Error saving batch:", error);
        safeToast("error", "Failed to save batch: " + error.message);
      } finally {
        setLoading(false);
      }
    }

    // New function to remove product from temporary storage
    function removeTemporaryProduct(tempId) {
      setTemporaryProducts(prev => prev.filter(product => product?.temp_id !== tempId));
      safeToast("success", "Product removed from batch");
    }

    // New function to open batch entry modal
    function openBatchEntryModal() {
      setShowBatchEntryModal(true);
    }

    // New function to close batch entry modal
    function closeBatchEntryModal() {
      setShowBatchEntryModal(false);
    }
    
    // Update Stock Batch Modal Functions
    function openUpdateStockBatchModal() {
      setShowUpdateStockBatchModal(true);
    }
    
    function closeUpdateStockBatchModal() {
      setShowUpdateStockBatchModal(false);
    }
    
    function removeUpdateStockProduct(tempId) {
      setUpdateStockProducts(prev => prev.filter(product => product?.temp_id !== tempId));
    }
    
    // Save update stock batch
    async function handleSaveUpdateStockBatch() {
      if (updateStockProducts.length === 0) {
        safeToast("error", "No products to update");
        return;
      }

      setLoading(true);

      try {
        // Process each product in the batch
        for (const product of updateStockProducts) {
          await updateProductStock(
            product?.product_id,
            product?.quantity,
            product?.batch_reference,
            product?.expiration,
            0, // unitCost - not used in update stock
            product?.srp,
            currentUser
          );
        }

        safeToast("success", `Successfully updated stock for ${updateStockProducts.length} products!`);
        
        // Clear update stock products and close modal
        setUpdateStockProducts([]);
        setShowUpdateStockBatchModal(false);
        
        // Reload data to show updated quantities
        await loadData("products");
        await loadData("all");
        
      } catch (error) {
        console.error("❌ Error saving update stock batch:", error);
        safeToast("error", "Failed to save update stock batch: " + error.message);
      } finally {
        setLoading(false);
      }
    }

    // New function to sync FIFO stock with product quantities
    async function syncFifoStock() {
      setLoading(true);
      try {
        console.log("🔄 Syncing FIFO stock with product quantities...");
        
        const response = await handleApiCall("sync_fifo_stock", {});
        
        if (response.success) {
          safeToast("success", response.message || "FIFO stock synced successfully!");
          
          // Refresh data to show updated quantities
          await loadData("products");
          await loadData("all");
          
          console.log("✅ FIFO stock sync completed");
        } else {
          safeToast("error", response.message || "Failed to sync FIFO stock");
        }
      } catch (error) {
        console.error("❌ Error syncing FIFO stock:", error);
        safeToast("error", "Failed to sync FIFO stock: " + error.message);
      } finally {
        setLoading(false);
      }
    }

    // Force sync all products with FIFO stock - fixes existing data inconsistencies
    async function forceSyncAllProducts() {
      setLoading(true);
      try {
        console.log("🔄 Force syncing all products with FIFO stock...");
        
        const response = await handleApiCall("force_sync_all_products", {});
        
        if (response.success) {
          safeToast("success", response.message || "All products force synced successfully!");
          
          // Refresh data to show updated quantities
          await loadData("products");
          await loadData("all");
          
          console.log("✅ Force sync completed");
        } else {
          safeToast("error", response.message || "Failed to force sync all products");
        }
      } catch (error) {
        console.error("❌ Error force syncing all products:", error);
        safeToast("error", "Failed to force sync all products: " + error.message);
      } finally {
        setLoading(false);
      }
    }

    // Clean up duplicate products that were incorrectly created during transfers
    async function cleanupDuplicateTransferProducts() {
      setLoading(true);
      try {
        console.log("🧹 Cleaning up duplicate transfer products...");
        
        const response = await handleApiCall("cleanup_duplicate_transfer_products", {});
        
        if (response.success) {
          safeToast("success", response.message || "Duplicate transfer products cleaned up successfully!");
          
          // Refresh data to show cleaned up products
          await loadData("products");
          await loadData("all");
          
          console.log("✅ Cleanup completed");
        } else {
          safeToast("error", response.message || "Failed to cleanup duplicate transfer products");
        }
      } catch (error) {
        console.error("❌ Error cleaning up duplicate transfer products:", error);
        safeToast("error", "Failed to cleanup duplicate transfer products: " + error.message);
      } finally {
        setLoading(false);
      }
    }

    // New function to start a new batch session
    function startNewBatch() {
      const newBatchNumber = generateBatchRef();
      setCurrentBatchNumber(newBatchNumber);
      setTemporaryProducts([]); // Clear existing products
      setNewProductForm(prev => ({
        ...prev,
        batch: newBatchNumber
      }));
      safeToast("success", "New batch started with number: " + newBatchNumber);
    }

    // New function to handle batch duplication
    async function handleDuplicateBatches(productId, batchIds = [22, 23]) {
      setLoading(true);
      
      try {
        const response = await duplicateProductBatches(productId, batchIds);
        
        if (response && response.success) {
          safeToast("success", response.message || "Product batches duplicated successfully!");
          
          // Refresh the products list to show the new batch entries
          await loadData("products");
          
        } else {
          safeToast("error", response?.message || "Failed to duplicate product batches");
        }
        
      } catch (error) {
        console.error("Error duplicating batches:", error);
        safeToast("error", "An error occurred while duplicating product batches");
      } finally {
        setLoading(false);
      }
    }

    // New function to add quantity to existing product (prevents duplicates)
    async function addQuantityToExistingProduct(productName, category, quantity, unitCost, srp, expiration, batchReference) {
      setLoading(true);
      
      try {
        const productData = {
          product_name: productName,
          category: category,
          quantity: parseInt(quantity),
          unit_cost: parseFloat(unitCost),
          srp: parseFloat(srp || 0),
          expiration: expiration || null,
          batch_reference: batchReference || generateBatchRef(),
          supplier_id: 1, // Default supplier
          location_id: 2  // Warehouse location
        };

        console.log("🔄 Adding quantity to existing product:", productData);

        const response = await handleApiCall("add_quantity_to_product", productData);
        console.log("📡 API Response:", response);
        
        if (response.success) {
          safeToast("success", "Quantity added successfully to existing product!");
          
          // Reload data to show updated quantities
          await loadData("products");
          await loadData("all");
          
        } else {
          safeToast("error", response.message || "Failed to add quantity to product");
        }
      } catch (error) {
        console.error("❌ Error adding quantity:", error);
        safeToast("error", "Failed to add quantity: " + error.message);
      } finally {
        setLoading(false);
      }
    }


  
    // Component Lifecycle
    useEffect(() => {
      // Fetch warehouse KPIs on mount
      async function fetchWarehouseKPIs() {
        try {
          const response = await handleApiCall("get_warehouse_kpis", { location: "warehouse" });
          if (response && response.success !== false && response !== null) {
            setStats((prev) => ({
              ...prev,
              totalProducts: response.totalProducts ?? prev.totalProducts,
              totalSuppliers: response.totalSuppliers ?? prev.totalSuppliers,
              warehouseValue: response.warehouseValue ?? prev.warehouseValue,
              totalQuantity: response.totalQuantity ?? prev.totalQuantity,
              lowStockItems: response.lowStockItems ?? prev.lowStockItems,
              expiringSoon: response.expiringSoon ?? prev.expiringSoon,
            }));
          }
        } catch (error) {
          console.error("Failed to fetch warehouse KPIs", error);
        }
      }
      fetchWarehouseKPIs();
      loadData("all");
      
      // Auto-start scanner when component mounts (if enabled in settings)
      console.log("🚀 Auto-starting scanner...");
      setScannerActive(settings.barcodeScanning);
      setScannerStatusMessage(settings.barcodeScanning ? "🔍 Scanner is ready and active - Scan any barcode to continue" : "🔍 Barcode scanning is disabled in settings");
    }, [])

    // Auto-refresh for notifications (every 30 seconds for warehouse)
    useEffect(() => {
      const interval = setInterval(async () => {
        if (!loading && inventoryData.length > 0 && notifications) {
          console.log("🔄 Auto-refreshing warehouse notifications...");
          const previousExpiringCount = notifications.expiring?.length || 0;
          const previousExpiredCount = notifications.expired?.length || 0;
          const previousLowStockCount = notifications.lowStock?.length || 0;
          
          // Recalculate notifications
          await calculateNotifications(inventoryData);
          
          // Check for new expired products
          if (notifications.expired.length > previousExpiredCount && settings.expiryAlerts) {
            const newExpiredProducts = notifications.expired.length - previousExpiredCount;
            safeToast("error", `🚨 ${newExpiredProducts} product(s) have EXPIRED! Check immediately!`);
          }
          
          // Check for new expiring products
          if (notifications.expiring.length > previousExpiringCount && settings.expiryAlerts) {
            const newExpiringProducts = notifications.expiring.length - previousExpiringCount;
            safeToast("warning", `⚠️ ${newExpiringProducts} product(s) expiring within ${settings.expiryWarningDays} days!`);
          }
          
          // Check for new low stock products
          if (notifications.lowStock.length > previousLowStockCount && settings.lowStockAlerts) {
            const newLowStockProducts = notifications.lowStock.length - previousLowStockCount;
            safeToast("warning", `📦 ${newLowStockProducts} product(s) now have low stock!`);
          }
        }
      }, 30000); // 30 seconds for warehouse

      return () => clearInterval(interval);
    }, [loading, inventoryData.length, notifications?.expiring?.length || 0, notifications?.expired?.length || 0, notifications?.lowStock?.length || 0, settings.expiryAlerts, settings.lowStockAlerts, settings.expiryWarningDays]);

    // Update scanner state when barcode scanning setting changes
    useEffect(() => {
      setScannerActive(settings.barcodeScanning);
      setScannerStatusMessage(settings.barcodeScanning ? "🔍 Scanner is ready and active - Scan any barcode to continue" : "🔍 Barcode scanning is disabled in settings");
    }, [settings.barcodeScanning]);

    // Update form batch number when currentBatchNumber changes
    useEffect(() => {
      setNewProductForm(prev => ({
        ...prev,
        batch: currentBatchNumber
      }));
    }, [currentBatchNumber]);

    // Ensure batch reference is auto-generated when update stock modal opens
    useEffect(() => {
      if (showUpdateStockModal && !newStockBatchReference) {
        const autoBatchRef = generateBatchRef();
        console.log("🔄 useEffect: Auto-generating batch reference for update modal:", autoBatchRef);
        setNewStockBatchReference(autoBatchRef);
      }
    }, [showUpdateStockModal, newStockBatchReference]);

    // Ensure batch reference is auto-generated when new product modal opens
    useEffect(() => {
      if (showNewProductModal && (!newProductForm.batch || newProductForm.batch === "")) {
        const autoBatchRef = generateBatchRef();
        console.log("🔄 useEffect: Auto-generating batch reference for new product modal:", autoBatchRef);
        setNewProductForm(prev => ({
          ...prev,
          batch: autoBatchRef
        }));
        setCurrentBatchNumber(autoBatchRef);
      }
    }, [showNewProductModal, newProductForm.batch]);
  
    // Debug useEffect to track categoriesData changes
    useEffect(() => {
      console.log("🔄 categoriesData changed:", categoriesData);
      console.log("🔄 categoriesData length:", categoriesData.length);
      if (categoriesData.length > 0) {
        console.log("🔄 First category:", categoriesData[0]);
        console.log("🔄 All categories:", categoriesData.map(cat => cat.category_name));
      }
    }, [categoriesData])

    function calculateLowStockAndExpiring(products) {
      // Low stock threshold can also be made dynamic if needed
      const LOW_STOCK_THRESHOLD = 10;

      const now = new Date();

      // Low stock: using settings threshold
      const lowStockCount = products.filter(
        (product) => isStockLow(Number(product.product_quantity || product.quantity))
      ).length;

      // Expiring soon: using settings threshold
      const expiringSoonCount = products.filter((product) => {
        if (!product.expiration || !settings.expiryAlerts) return false;
        return isProductExpiringSoon(product.expiration);
      }).length;

      setStats((prev) => ({
        ...prev,
        lowStockItems: lowStockCount,
        expiringSoon: expiringSoonCount,
      }));

      // Check for auto-reorder if enabled
      checkAutoReorder(products);
    }

    // Auto-reorder functionality
    function checkAutoReorder(products) {
      if (!settings.autoReorder) return;
      
      const lowStockProducts = products.filter(product => {
        const quantity = parseInt(product.quantity || product.product_quantity || 0);
        return isStockLow(quantity);
      });
      
      if (lowStockProducts.length > 0) {
        const productNames = lowStockProducts.map(p => p.product_name).join(', ');
        safeToast("warning", `🔄 Auto-reorder: ${lowStockProducts.length} product(s) need restocking: ${productNames}`);
        
        // Here you could trigger an API call to create purchase orders
        // or send notifications to suppliers
        console.log("Auto-reorder triggered for products:", lowStockProducts);
      }
    }

  

    return (
      <div className="min-h-screen w-full" style={{ backgroundColor: theme.bg.primary }}>
        <NotificationSystem 
          products={inventoryData} 
          onAlertCountChange={setAlertCount}
        />
        {/* Header */}
        <div className="mb-6 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2" style={{ color: theme.text.primary }}>Warehouse</h1>
              <p style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Manage your inventory efficiently and effectively</p>
            </div>
            
            {/* Notification Bell */}
            <div className="relative notification-dropdown">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2 rounded-full hover:bg-opacity-10 transition-colors"
                style={{ 
                  backgroundColor: 'transparent',
                  '--hover-bg': theme.bg.hover
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = theme.bg.hover}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                title="View Notifications"
              >
                {alertCount > 0 ? (
                  <BellRing className="h-6 w-6" style={{ color: theme.colors.warning }} />
                ) : (
                  <Bell className="h-6 w-6" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }} />
                )}
                
                {/* Notification Badge */}
                {alertCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center animate-pulse">
                    {Math.min(alertCount, 99)}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-96 rounded-lg shadow-2xl border z-50 max-h-96 overflow-y-auto" 
                     style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, boxShadow: `0 25px 50px ${theme.shadow}` }}>
                  <div className="p-4 border-b" style={{ borderColor: theme.border.default }}>
                    <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>Notifications</h3>
                    <p className="text-sm" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                      {(notifications?.expiring?.length || 0) + (notifications?.expired?.length || 0) + (notifications?.lowStock?.length || 0) + (notifications?.outOfStock?.length || 0)} alerts
                    </p>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {/* Expired Products */}
                    {(notifications?.expired?.length || 0) > 0 && (
                      <div className="p-4 border-b" style={{ borderColor: theme.border.light }}>
                        <h4 className="font-medium mb-2 flex items-center" style={{ color: theme.colors.danger }}>
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          EXPIRED ({notifications?.expired?.length || 0})
                        </h4>
                        {(notifications?.expired || []).slice(0, 5).map((product, index) => (
                          <div key={index} className="flex justify-between items-center py-1">
                            <span className="text-sm" style={{ color: theme.text.primary }}>{product.product_name}</span>
                            <span className="text-xs px-2 py-1 rounded" style={{ 
                              backgroundColor: theme.colors.danger + '20', 
                              color: theme.colors.danger 
                            }}>
                              EXPIRED {Math.abs(Math.ceil((new Date(product.expiration) - new Date()) / (1000 * 60 * 60 * 24)))} days ago
                            </span>
                          </div>
                        ))}
                        {(notifications?.expired?.length || 0) > 5 && (
                          <p className="text-xs mt-2" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                            +{(notifications?.expired?.length || 0) - 5} more...
                          </p>
                        )}
                      </div>
                    )}

                    {/* Expiring Products */}
                    {(notifications?.expiring?.length || 0) > 0 && (
                      <div className="p-4 border-b" style={{ borderColor: theme.border.light }}>
                        <h4 className="font-medium mb-2 flex items-center" style={{ color: theme.colors.warning }}>
                          <Clock className="h-4 w-4 mr-2" />
                          Expiring Soon ({(notifications?.expiring?.length || 0)})
                        </h4>
                        {(notifications?.expiring || []).slice(0, 5).map((product, index) => (
                          <div 
                            key={index} 
                            className="flex justify-between items-center py-2 cursor-pointer rounded px-3 transition-all duration-200 hover:bg-opacity-10"
                            style={{ 
                              backgroundColor: 'transparent',
                              color: isDarkMode ? '#f8fafc' : '#0f172a'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = theme.colors.warning + '20';
                              e.target.style.color = theme.colors.warning;
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = 'transparent';
                              e.target.style.color = theme.text.primary;
                            }}
                            onClick={() => openExpiringBatchModal(product)}
                          >
                            <div className="flex flex-col">
                              <span className="text-sm" style={{ color: 'inherit' }}>{product.product_name}</span>
                              {product.expiring_batch && (
                                <span className="text-xs" style={{ color: 'inherit', opacity: 0.8 }}>
                                  Batch {product.expiring_batch.batch_number || product.expiring_batch.batch_id} ({product.expiring_batch.quantity} units)
                                </span>
                              )}
                            </div>
                            <span className="text-xs px-2 py-1 rounded" style={{ 
                              backgroundColor: theme.colors.warning + '20', 
                              color: theme.colors.warning 
                            }}>
                              {product.expiring_batch ? product.expiring_batch.days_until_expiry : Math.ceil((new Date(product.earliest_expiration) - new Date()) / (1000 * 60 * 60 * 24))} days (Alert: {settings.expiryWarningDays}d)
                            </span>
                          </div>
                        ))}
                        {(notifications?.expiring?.length || 0) > 5 && (
                          <p className="text-xs mt-2" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                            +{(notifications?.expiring?.length || 0) - 5} more...
                          </p>
                        )}
                      </div>
                    )}

                    {/* Low Stock Products */}
                    {(notifications?.lowStock?.length || 0) > 0 && (
                      <div className="p-4 border-b" style={{ borderColor: theme.border.light }}>
                        <h4 className="font-medium mb-2 flex items-center" style={{ color: theme.colors.warning }}>
                          <AlertCircle className="h-4 w-4 mr-2" />
                          Low Stock ({(notifications?.lowStock?.length || 0)})
                        </h4>
                        {(notifications?.lowStock || []).slice(0, 5).map((product, index) => (
                          <div 
                            key={index} 
                            className="flex justify-between items-center py-2 cursor-pointer rounded px-3 transition-all duration-200"
                            style={{ 
                              backgroundColor: 'transparent',
                              color: isDarkMode ? '#f8fafc' : '#0f172a'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = theme.colors.warning + '20';
                              e.target.style.color = theme.colors.warning;
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = 'transparent';
                              e.target.style.color = theme.text.primary;
                            }}
                            onClick={() => openExpiringBatchModal(product)}
                          >
                            <span className="text-sm" style={{ color: 'inherit' }}>{product.product_name}</span>
                            <span className="text-xs px-2 py-1 rounded" style={{ 
                              backgroundColor: theme.colors.warning + '20', 
                              color: theme.colors.warning 
                            }}>
                              {product.quantity} left
                            </span>
                          </div>
                        ))}
                        {(notifications?.lowStock?.length || 0) > 5 && (
                          <p className="text-xs mt-2" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                            +{(notifications?.lowStock?.length || 0) - 5} more...
                          </p>
                        )}
                      </div>
                    )}

                    {/* Out of Stock Products */}
                    {(notifications?.outOfStock?.length || 0) > 0 && (
                      <div className="p-4">
                        <h4 className="font-medium mb-2 flex items-center" style={{ color: theme.colors.danger }}>
                          <Package className="h-4 w-4 mr-2" />
                          Out of Stock ({(notifications?.outOfStock?.length || 0)})
                        </h4>
                        {(notifications?.outOfStock || []).slice(0, 5).map((product, index) => (
                          <div 
                            key={index} 
                            className="flex justify-between items-center py-2 cursor-pointer rounded px-3 transition-all duration-200"
                            style={{ 
                              backgroundColor: 'transparent',
                              color: isDarkMode ? '#f8fafc' : '#0f172a'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = theme.colors.danger + '20';
                              e.target.style.color = theme.colors.danger;
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = 'transparent';
                              e.target.style.color = theme.text.primary;
                            }}
                            onClick={() => openExpiringBatchModal(product)}
                          >
                            <span className="text-sm" style={{ color: 'inherit' }}>{product.product_name}</span>
                            <span className="text-xs px-2 py-1 rounded" style={{ 
                              backgroundColor: theme.colors.danger + '20', 
                              color: theme.colors.danger 
                            }}>
                              0 stock
                            </span>
                          </div>
                        ))}
                        {(notifications?.outOfStock?.length || 0) > 5 && (
                          <p className="text-xs mt-2" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                            +{(notifications?.outOfStock?.length || 0) - 5} more...
                          </p>
                        )}
                      </div>
                    )}

                    {/* No Notifications */}
                    {((notifications?.expiring?.length || 0) + (notifications?.expired?.length || 0) + (notifications?.lowStock?.length || 0) + (notifications?.outOfStock?.length || 0)) === 0 && (
                      <div className="p-8 text-center">
                        <CheckCircle className="h-12 w-12 mx-auto mb-2" style={{ color: theme.colors.success }} />
                        <p className="text-sm" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>All products are in good condition!</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status Bar */}
        <div className="rounded-xl border-2 mb-6 shadow-sm transition-all duration-200 hover:shadow-md" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4" style={{ color: theme.colors.accent }} />
                  <span className="text-sm font-medium" style={{ color: theme.text.primary }}>Current Location:</span>
                  <span className="inline-block px-2 py-0.5 text-xs font-medium rounded" style={{ backgroundColor: theme.colors.accent + '20', color: theme.colors.accent }}>
                    {currentLocation.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Scan className="h-4 w-4" style={{ color: theme.colors.success }} />
                  <span className="text-sm font-medium" style={{ color: theme.text.primary }}>Scanner:</span>
                  <span
                    className="inline-block px-2 py-0.5 text-xs font-medium rounded"
                    style={{ backgroundColor: theme.colors.success + '20', color: theme.colors.success }}
                  >
                    ACTIVE
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4" style={{ color: theme.colors.info }} />
                  <span className="text-sm font-medium" style={{ color: theme.text.primary }}>Employee:</span>
                  <div className="flex items-center space-x-1">
                    <input
                      type="text"
                      value={currentUser}
                      onChange={(e) => {
                        const newName = e.target.value;
                        setCurrentUser(newName);
                        localStorage.setItem('warehouse_employee', newName);
                      }}
                      placeholder="Enter your name"
                      className="px-2 py-0.5 text-xs border rounded focus:outline-none focus:ring-1 w-24"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a'
                      }}
                      title="Click to edit your name for tracking purposes"
                    />
                    {currentUser !== "admin" && (
                      <button
                        onClick={() => {
                          setCurrentUser("admin");
                          localStorage.removeItem('warehouse_employee');
                        }}
                        className="text-xs px-1"
                        style={{ color: theme.colors.danger }}
                        title="Reset to default"
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2" style={{ color: theme.colors.success }}>
                  <Camera className="h-4 w-4" />
                  <span className="text-sm font-medium">Scanner Active</span>
                </div>
                <div className="text-sm max-w-md" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                  {scannerStatusMessage}
                </div>

                <button
                  onClick={startNewBatch}
                  className="px-4 py-2 rounded-lg flex items-center mr-3 font-medium transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95"
                  style={{ backgroundColor: theme.colors.info, color: 'white' }}
                >
                  <Package className="h-4 w-4 mr-2" />
                  New Batch
                </button>
                <button
                  onClick={openSupplierModal}
                  className="px-4 py-2 rounded-lg flex items-center font-medium transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95"
                  style={{ backgroundColor: theme.colors.accent, color: 'white' }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Supplier
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="px-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { title: "Total Products", value: stats.totalProducts, icon: Package, color: "blue" },
              { title: "Product Qty", value: (stats.totalProductQuantity || 0).toLocaleString(), icon: Package, color: "indigo" },
              { title: "Total Suppliers", value: stats.totalSuppliers, icon: User, color: "orange" },
              {
                title: "Warehouse Value",
                value: `₱${stats.warehouseValue.toLocaleString()}`,
                icon: DollarSign,
                color: "purple",
              },
            ].map((stat, index) => (
              <div key={index} className="rounded-xl border-2 p-6 flex items-center shadow-sm transition-all duration-200 hover:shadow-md hover:scale-105" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                <stat.icon className="h-8 w-8" style={{ color: theme.colors.accent }} />
                <div className="ml-4">
                  <p className="text-sm font-medium" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>{stat.title}</p>
                  <p className="text-xl font-bold" style={{ color: theme.text.primary }}>{stat.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
   
        {/* Search and Filter Bar */}
        <div className="px-6 mb-6">
          <div className="rounded-xl border-2 p-6 shadow-sm transition-all duration-200 hover:shadow-md" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: theme.text.muted }} />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-3 w-full border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80"
                  style={{ 
                    borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                    backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                    color: isDarkMode ? '#f8fafc' : '#0f172a',
                    focusRingColor: '#3b82f6',
                    '::placeholder': {
                      color: isDarkMode ? '#94a3b8' : '#64748b'
                    }
                  }}
                />
              </div>
            </div>
            {activeTab === "products" && (
              <div className="w-full md:w-48">
                <select
                  value={filterOptions.category}
                  onChange={(e) => {
                    const selectedCategory = e.target.value;
                    setFilterOptions((prev) => ({ ...prev, category: selectedCategory }));
                  }}
                  className="w-full px-3 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80"
                  style={{ 
                    borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                    backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                    color: isDarkMode ? '#f8fafc' : '#0f172a',
                    focusRingColor: '#3b82f6'
                  }}
                >
                  <option value="">All Categories</option>
                  {categoriesData.map((category) => (
                    <option key={category.category_id} value={category.category_name}>
                      {category.category_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
        </div>
            
        {/* Tabs for Products and Suppliers */}
        <div className="px-6">
          <div className="border-b" style={{ borderColor: theme.border.default }}>
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab("products")}
                className="py-2 px-4 border-b-2 font-medium text-sm"
                style={{
                  borderColor: activeTab === "products" ? theme.colors.accent : 'transparent',
                  color: activeTab === "products" ? theme.colors.accent : theme.text.muted,
                  borderBottomColor: activeTab === "products" ? theme.colors.accent : 'transparent'
                }}
              >
                Products ({inventoryData.length})
              </button>
              <button
                onClick={() => setActiveTab("suppliers")}
                className="py-2 px-4 border-b-2 font-medium text-sm"
                style={{
                  borderColor: activeTab === "suppliers" ? theme.colors.accent : 'transparent',
                  color: activeTab === "suppliers" ? theme.colors.accent : theme.text.muted,
                  borderBottomColor: activeTab === "suppliers" ? theme.colors.accent : 'transparent'
                }}
              >
                Suppliers ({suppliersData.length})
              </button>
            </nav>
          </div>
  
  <div className="p-2">
    {activeTab === "products" && (
      <div className="rounded-3xl shadow-xl" style={{ backgroundColor: theme.bg.card, boxShadow: `0 25px 50px ${theme.shadow}` }}>
        <div className="px-4 py-3 border-b" style={{ borderColor: theme.border.default }}>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>Products</h3>
            <div className="flex items-center space-x-3">
              <div className="text-sm" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                {inventoryData.length} products found
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setFilterOptions(prev => ({ ...prev, stockStatus: 'all' }))}
                  className="px-3 py-1 text-xs rounded-md transition-colors"
                  style={{
                    backgroundColor: filterOptions.stockStatus === 'all' ? theme.colors.accent + '20' : theme.bg.hover,
                    color: filterOptions.stockStatus === 'all' ? theme.colors.accent : theme.text.secondary
                  }}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterOptions(prev => ({ ...prev, stockStatus: 'low' }))}
                  className="px-3 py-1 text-xs rounded-md transition-colors"
                  style={{
                    backgroundColor: filterOptions.stockStatus === 'low' ? theme.colors.warning + '20' : theme.bg.hover,
                    color: filterOptions.stockStatus === 'low' ? theme.colors.warning : theme.text.secondary
                  }}
                >
                  Low Stock
                </button>
                <button
                  onClick={() => setFilterOptions(prev => ({ ...prev, stockStatus: 'out' }))}
                  className="px-3 py-1 text-xs rounded-md transition-colors"
                  style={{
                    backgroundColor: filterOptions.stockStatus === 'out' ? theme.colors.danger + '20' : theme.bg.hover,
                    color: filterOptions.stockStatus === 'out' ? theme.colors.danger : theme.text.secondary
                  }}
                >
                  Out of Stock
                </button>
              </div>
                <button
                  onClick={syncFifoStock}
                  className="p-2 rounded-md transition-colors"
                  style={{ 
                    color: theme.colors.accent,
                    backgroundColor: 'transparent'
                  }}
                  title="Sync FIFO Stock with Product Quantities"
                >
                  <Package className="h-4 w-4" />
                </button>
                <button
                  onClick={forceSyncAllProducts}
                  className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-md transition-colors"
                  title="Force Sync All Products with FIFO Stock"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
                <button
                  onClick={cleanupDuplicateTransferProducts}
                  className="p-2 text-orange-500 hover:text-orange-700 hover:bg-orange-100 rounded-md transition-colors"
                  title="Clean Up Duplicate Transfer Products"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
            </div>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full min-w-max" style={{ color: theme.text.primary }}>
            <thead className="border-b sticky top-0 z-10" style={{ backgroundColor: theme.bg.secondary, borderColor: theme.border.default }}>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>PRODUCT NAME</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>BARCODE</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>CATEGORY</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>BRAND</th>
                <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  <div className="group relative">
                    PRODUCT QTY
                    <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-800 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">
                      Quantity from tbl_product
                    </div>
                  </div>
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>SRP VALUE</th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>SUPPLIER</th>
                <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>CREATED BY</th>
                <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>TYPE</th>
                <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>STATUS</th>
                <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>STOCK STATUS</th>
                <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>DAYS TO EXPIRY</th>
                <th className="px-3 py-2 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.light }}>
              {inventoryData.length === 0 ? (
                <tr>
                  <td colSpan="13" className="px-3 py-6 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <Package className="h-12 w-12" style={{ color: theme.text.muted }} />
                      <div style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                        <p className="text-lg font-medium">No products found</p>
                        <p className="text-sm">Products will appear here when added to warehouse</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                inventoryData
                  .filter(product => {
                    if (filterOptions.stockStatus === 'all') return true;
                    if (filterOptions.stockStatus === 'low') {
                      const qty = product.product_quantity || product.quantity || 0;
                      return qty > 0 && qty <= 10;
                    }
                    if (filterOptions.stockStatus === 'out') {
                      const qty = product.product_quantity || product.quantity || 0;
                      return qty <= 0;
                    }
                    return true;
                  })
                  .map((product) => {
                    // Check for alert conditions
                    const quantity = product.product_quantity || product.quantity || 0;
                    const isLowStock = settings.lowStockAlerts && isStockLow(quantity);
                    const isOutOfStock = quantity <= 0;
                    const isExpiringSoon = product.earliest_expiration && settings.expiryAlerts && isProductExpiringSoon(product.earliest_expiration);
                    const isExpired = product.earliest_expiration && isProductExpired(product.earliest_expiration);
                    
                    // Determine row styling based on alert conditions
                    let rowStyle = { backgroundColor: 'transparent' };
                    let rowClass = "hover:shadow-md hover:scale-[1.01] transition-all duration-300 cursor-pointer";
                    
                    if (isExpired) {
                      rowStyle.backgroundColor = theme.colors.danger + '10';
                      rowClass += " border-l-4 border-red-500";
                    } else if (isExpiringSoon) {
                      rowStyle.backgroundColor = theme.colors.warning + '10';
                      rowClass += " border-l-4 border-yellow-500";
                    } else if (isLowStock) {
                      rowStyle.backgroundColor = theme.colors.warning + '05';
                      rowClass += " border-l-4 border-orange-500";
                    } else if (isOutOfStock) {
                      rowStyle.backgroundColor = theme.colors.danger + '05';
                      rowClass += " border-l-4 border-red-400";
                    }
                    
                    return (
                  <tr key={product.product_id} className={rowClass} style={rowStyle}>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium" style={{ color: theme.text.primary }}>
                          {product.product_name}
                        </div>
                       
                      </div>
                    </td>
                    <td className="px-3 py-2 text-sm font-mono" style={{ color: theme.text.primary }}>
                      {product.barcode}
                    </td>
                    <td className="px-3 py-2 text-sm">
                      <span className="inline-flex px-3 py-1 text-xs font-medium rounded-full shadow-sm transition-all duration-200 hover:shadow-md" style={{ backgroundColor: theme.bg.secondary, color: theme.text.secondary }}>
                        {product.category}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-sm" style={{ color: theme.text.primary }}>
                      {(() => {
                        console.log("🔍 Brand display debug for product:", product.product_name, {
                          product_brand_id: product.brand_id,
                          product_brand: product.brand,
                          brandsData_length: brandsData.length,
                          brandsData_sample: brandsData.slice(0, 3)
                        });
                        
                        if (product.brand_id && brandsData.length > 0) {
                          const brand = brandsData.find(b => b.brand_id == product.brand_id);
                          console.log("🔍 Found brand:", brand);
                          return brand ? brand.brand : "N/A";
                        }
                        return product.brand || "N/A";
                      })()}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="font-semibold" style={{ 
                        color: (product.product_quantity || product.quantity || 0) <= 0 
                          ? theme.colors.danger 
                          : (product.product_quantity || product.quantity || 0) <= 10 
                            ? theme.colors.warning 
                            : theme.text.primary
                      }}>
                        {product.product_quantity || product.quantity || 0}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-center text-sm" style={{ color: theme.text.primary }}>
                      ₱{((product?.product_quantity || product?.quantity || 0) * (Number.parseFloat(product?.srp || 0))).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-sm" style={{ color: theme.text.primary }}>
                      {product.supplier_name || "N/A"}
                    </td>
                    <td className="px-3 py-2 text-center text-sm" style={{ color: theme.text.primary }}>
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: theme.colors.info + '20', color: theme.colors.info }}>
                        {product.batch_entry_by || "System"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {(() => {
                        const bulk = Number(product.bulk);
                        const prescription = Number(product.prescription);
                        if (bulk && prescription) {
                          return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: theme.colors.warning + '20', color: theme.colors.warning }}>Bulk & Rx</span>;
                        } else if (bulk) {
                          return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: theme.colors.accent + '20', color: theme.colors.accent }}>Bulk</span>;
                        } else if (prescription) {
                          return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: theme.colors.danger + '20', color: theme.colors.danger }}>Rx</span>;
                        } else {
                          return <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: theme.bg.secondary, color: theme.text.secondary }}>Regular</span>;
                        }
                      })()}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full" style={{
                        backgroundColor: product.status === "Available" ? theme.colors.success + '20' : theme.colors.danger + '20',
                        color: product.status === "Available" ? theme.colors.success : theme.colors.danger
                      }}>
                        {product.status || "Available"}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full shadow-sm transition-all duration-200 hover:shadow-md" style={{
                        backgroundColor: getStockStatus(product.quantity) === 'out of stock' ? theme.colors.danger + '20' : 
                                       getStockStatus(product.quantity) === 'low stock' ? theme.colors.warning + '20' : 
                                       theme.colors.success + '20',
                        color: getStockStatus(product.quantity) === 'out of stock' ? theme.colors.danger : 
                               getStockStatus(product.quantity) === 'low stock' ? theme.colors.warning : 
                               theme.colors.success
                      }}>
                        {getStockStatus(product.quantity)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {(() => {
                        if (product.earliest_expiration) {
                          const today = new Date();
                          const expiryDate = new Date(product.earliest_expiration);
                          const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
                          
                          if (daysUntilExpiry < 0) {
                            return (
                              <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full shadow-sm transition-all duration-200 hover:shadow-md" style={{
                                backgroundColor: theme.colors.danger + '20',
                                color: theme.colors.danger
                              }}>
                                EXPIRED
                              </span>
                            );
                          } else if (daysUntilExpiry <= 30) {
                            return (
                              <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full shadow-sm transition-all duration-200 hover:shadow-md" style={{
                                backgroundColor: theme.colors.warning + '20',
                                color: theme.colors.warning
                              }}>
                                {daysUntilExpiry} days
                              </span>
                            );
                          } else {
                            return (
                              <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full shadow-sm transition-all duration-200 hover:shadow-md" style={{
                                backgroundColor: theme.colors.success + '20',
                                color: theme.colors.success
                              }}>
                                {daysUntilExpiry} days
                              </span>
                            );
                          }
                        } else {
                          return (
                            <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full shadow-sm transition-all duration-200 hover:shadow-md" style={{
                              backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                              color: isDarkMode ? '#94a3b8' : '#64748b'
                            }}>
                              N/A
                            </span>
                          );
                        }
                      })()}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => openQuantityHistoryModal(product)} 
                          className="p-2 rounded-lg transition-all duration-200 hover:shadow-md hover:scale-110 active:scale-95" 
                          style={{ 
                            color: theme.colors.success,
                            backgroundColor: theme.colors.success + '10',
                            border: `1px solid ${theme.colors.success}20`
                          }} 
                          title="View Quantity History"
                        >
                          <Package className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => openExpiringBatchModal(product)} 
                          className="p-2 rounded-lg transition-all duration-200 hover:shadow-md hover:scale-110 active:scale-95" 
                          style={{ 
                            color: theme.colors.info,
                            backgroundColor: theme.colors.info + '10',
                            border: `1px solid ${theme.colors.info}20`
                          }} 
                          title="View Batch Details"
                        >
                          <Calendar className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => openEditProductModal(product)} 
                          className="p-2 rounded-lg transition-all duration-200 hover:shadow-md hover:scale-110 active:scale-95" 
                          style={{ 
                            color: theme.colors.accent,
                            backgroundColor: theme.colors.accent + '10',
                            border: `1px solid ${theme.colors.accent}20`
                          }} 
                          title="Edit Product"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => openDeleteModal(product)} 
                          className="p-2 rounded-lg transition-all duration-200 hover:shadow-md hover:scale-110 active:scale-95" 
                          style={{ 
                            color: theme.colors.danger,
                            backgroundColor: theme.colors.danger + '10',
                            border: `1px solid ${theme.colors.danger}20`
                          }} 
                          title="Archive Product"
                        >
                          <Archive className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                    );
                  })
              )}
            </tbody>
          </table>
          

        </div>
      </div>
    )}
  
            {activeTab === "suppliers" && (
              <div className="rounded-3xl shadow-xl" style={{ backgroundColor: theme.bg.card, boxShadow: `0 25px 50px ${theme.shadow}` }}>
                <div className="px-6 py-4 border-b" style={{ borderColor: theme.border.default }}>
                  <div className="flex justify-between items-center">
                    <h3 className="text-xl font-semibold" style={{ color: theme.text.primary }}>Suppliers</h3>
                    <div className="text-sm" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                      {suppliersData.length} suppliers found
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full" style={{ color: theme.text.primary }}>
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>SUPPLIER NAME</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>CONTACT</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>EMAIL</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>CONTACT PERSON</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>PAYMENT TERMS</th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>LEAD TIME</th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>ACTIONS</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.light }}>
                      {suppliersData.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="px-6 py-8 text-center">
                            <div className="flex flex-col items-center space-y-3">
                              <User className="h-12 w-12" style={{ color: theme.text.muted }} />
                              <div style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                                <p className="text-lg font-medium">No suppliers found</p>
                                <p className="text-sm">Suppliers will appear here when added</p>
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        suppliersData.map((supplier) => (
                          <tr key={supplier.supplier_id} className="hover:bg-opacity-50" style={{ backgroundColor: 'transparent', hoverBackgroundColor: theme.bg.hover }}>
                            <td className="px-6 py-4 text-sm font-medium" style={{ color: theme.text.primary }}>{supplier.supplier_name}</td>
                            <td className="px-6 py-4 text-sm" style={{ color: theme.text.primary }}>{supplier.supplier_contact}</td>
                            <td className="px-6 py-4 text-sm" style={{ color: theme.text.primary }}>{supplier.supplier_email}</td>
                            <td className="px-6 py-4 text-sm" style={{ color: theme.text.primary }}>{supplier.contact_person || "-"}</td>
                            <td className="px-6 py-4 text-sm" style={{ color: theme.text.primary }}>{supplier.payment_terms || "-"}</td>
                            <td className="px-6 py-4 text-sm" style={{ color: theme.text.primary }}>{supplier.lead_time_days ? `${supplier.lead_time_days} days` : "-"}</td>
                            <td className="px-6 py-4 text-center">
                              <div className="flex justify-center gap-2">
                                <button onClick={() => openEditModal(supplier)} className="p-1" style={{ color: theme.colors.accent }} title="Edit Supplier">
                                  <Edit className="h-4 w-4" />
                                </button>
                                <button onClick={() => openDeleteModal(supplier)} className="p-1" style={{ color: theme.colors.danger }} title="Archive Supplier">
                                  <Archive className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
  
        {/* SUPPLIER MODAL - ALL FIELDS KEPT */}
        {showSupplierModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 transition-all duration-300" style={{ backgroundColor: 'transparent' }}>
            <div className="rounded-2xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] border-2 transform transition-all duration-300 scale-100" style={{ 
              backgroundColor: isDarkMode ? '#334155' : '#ffffff', 
              borderColor: isDarkMode ? '#475569' : '#e2e8f0',
              boxShadow: isDarkMode ? '0 25px 50px -12px rgba(0, 0, 0, 0.3)' : '0 25px 50px -12px rgba(0, 0, 0, 0.1)'
            }}>
              <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10" style={{ 
                borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                backgroundColor: isDarkMode ? '#334155' : '#ffffff' 
              }}>
                <h3 className="text-lg font-semibold" style={{ color: isDarkMode ? '#f8fafc' : '#0f172a' }}>Add New Supplier</h3>
                <button 
                  onClick={closeSupplierModal} 
                  className="p-2 rounded-lg hover:bg-opacity-10 transition-all duration-200 hover:scale-110 active:scale-95" 
                  style={{ color: isDarkMode ? '#94a3b8' : '#64748b', backgroundColor: (isDarkMode ? '#94a3b8' : '#64748b') + '10' }}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
  
              <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
                <form onSubmit={handleAddSupplier} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Supplier Name *</label>
                    <input
                      type="text"
                      required
                      value={supplierFormData.supplier_name || ""}
                      onChange={(e) => handleSupplierInputChange("supplier_name", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Contact Number *</label>
                    <input
                      type="text"
                      required
                      value={supplierFormData.supplier_contact || ""}
                      onChange={(e) => handleSupplierInputChange("supplier_contact", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Email *</label>
                    <input
                      type="email"
                      required
                      value={supplierFormData.supplier_email || ""}
                      onChange={(e) => handleSupplierInputChange("supplier_email", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Primary Phone</label>
                    <input
                      type="text"
                      value={supplierFormData.primary_phone || ""}
                      onChange={(e) => handleSupplierInputChange("primary_phone", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Primary Email</label>
                    <input
                      type="email"
                      value={supplierFormData.primary_email || ""}
                      onChange={(e) => handleSupplierInputChange("primary_email", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Contact Person</label>
                    <input
                      type="text"
                      value={supplierFormData.contact_person || ""}
                      onChange={(e) => handleSupplierInputChange("contact_person", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Contact Title</label>
                    <input
                      type="text"
                      value={supplierFormData.contact_title || ""}
                      onChange={(e) => handleSupplierInputChange("contact_title", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Payment Terms</label>
                    <input
                      type="text"
                      value={supplierFormData.payment_terms || ""}
                      onChange={(e) => handleSupplierInputChange("payment_terms", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Lead Time (Days)</label>
                    <input
                      type="number"
                      value={supplierFormData.lead_time_days || ""}
                      onChange={(e) => handleSupplierInputChange("lead_time_days", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Order Level</label>
                    <input
                      type="number"
                      value={supplierFormData.order_level || ""}
                      onChange={(e) => handleSupplierInputChange("order_level", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Credit Rating</label>
                    <input
                      type="text"
                      value={supplierFormData.credit_rating || ""}
                      onChange={(e) => handleSupplierInputChange("credit_rating", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>
  
                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Address</label>
                    <textarea
                      rows={3}
                      value={supplierFormData.supplier_address}
                      onChange={(e) => handleSupplierInputChange("supplier_address", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Notes</label>
                    <textarea
                      rows={3}
                      value={supplierFormData.notes}
                      onChange={(e) => handleSupplierInputChange("notes", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>
                </div>
  
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={closeSupplierModal}
                    className="px-6 py-3 border-2 rounded-lg font-medium transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95"
                    style={{ 
                      borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                      backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                      color: isDarkMode ? '#f8fafc' : '#0f172a'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3 rounded-lg font-medium disabled:opacity-50 transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:hover:shadow-none"
                    style={{ 
                      backgroundColor: '#3b82f6',
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
  
        {/* Edit Supplier Modal */}
        {showEditModal && (
          <div className="fixed inset-0 flex items-center justify-center z-50 transition-all duration-300" style={{ backgroundColor: 'transparent' }}>
            <div className="rounded-2xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] border-2 transform transition-all duration-300 scale-100" style={{ 
              backgroundColor: isDarkMode ? '#334155' : '#ffffff', 
              borderColor: isDarkMode ? '#475569' : '#e2e8f0',
              boxShadow: isDarkMode ? '0 25px 50px -12px rgba(0, 0, 0, 0.3)' : '0 25px 50px -12px rgba(0, 0, 0, 0.1)'
            }}>
              <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10" style={{ 
                borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                backgroundColor: isDarkMode ? '#334155' : '#ffffff' 
              }}>
                <h3 className="text-lg font-semibold" style={{ color: isDarkMode ? '#f8fafc' : '#0f172a' }}>Edit Supplier</h3>
                <button 
                  onClick={closeEditModal} 
                  className="p-2 rounded-lg hover:bg-opacity-10 transition-all duration-200 hover:scale-110 active:scale-95" 
                  style={{ color: isDarkMode ? '#94a3b8' : '#64748b', backgroundColor: (isDarkMode ? '#94a3b8' : '#64748b') + '10' }}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
  
              <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
                <form onSubmit={handleUpdateSupplier} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Supplier Name *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.supplier_name || ""}
                      onChange={(e) => handleEditInputChange("supplier_name", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Contact Number *</label>
                    <input
                      type="text"
                      required
                      value={editFormData.supplier_contact || ""}
                      onChange={(e) => handleEditInputChange("supplier_contact", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Email *</label>
                    <input
                      type="email"
                      required
                      value={editFormData.supplier_email || ""}
                      onChange={(e) => handleEditInputChange("supplier_email", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Contact Person</label>
                    <input
                      type="text"
                      value={editFormData.contact_person || ""}
                      onChange={(e) => handleEditInputChange("contact_person", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Payment Terms</label>
                    <input
                      type="text"
                      value={editFormData.payment_terms || ""}
                      onChange={(e) => handleEditInputChange("payment_terms", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Lead Time (Days)</label>
                    <input
                      type="number"
                      value={editFormData.lead_time_days || ""}
                      onChange={(e) => handleEditInputChange("lead_time_days", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>
  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Address</label>
                    <textarea
                      rows={3}
                      value={editFormData.supplier_address || ""}
                      onChange={(e) => handleEditInputChange("supplier_address", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Notes</label>
                    <textarea
                      rows={3}
                      value={editFormData.notes || ""}
                      onChange={(e) => handleEditInputChange("notes", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>
                </div>
  
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    className="px-4 py-2 border rounded-md hover:opacity-70"
                    style={{ 
                      borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
                      backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                      color: isDarkMode ? '#f8fafc' : '#0f172a'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded-md disabled:opacity-50"
                    style={{ 
                      backgroundColor: theme.colors.accent,
                      color: '#ffffff'
                    }}
                  >
                    {loading ? "Updating..." : "Update Supplier"}
                  </button>
                </div>
              </form>
              </div>
            </div>
          </div>
        )}

        {/* Edit Product Modal */}
        {showEditProductModal && (
          <div className="fixed inset-0 backdrop-blur-md bg-black bg-opacity-30 flex items-center justify-center z-50 transition-all duration-300">
            <div className="backdrop-blur-lg rounded-2xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] border transform transition-all duration-300 scale-100" style={{ 
              backgroundColor: theme.bg.card + 'F5', 
              borderColor: theme.border.default,
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}>
              <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10" style={{ 
                backgroundColor: theme.bg.card, 
                borderColor: theme.border.default 
              }}>
                <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>Edit Product</h3>
                <button 
                  onClick={closeEditProductModal} 
                  className="p-2 rounded-lg hover:bg-opacity-10 transition-all duration-200 hover:scale-110 active:scale-95" 
                  style={{ color: theme.text.muted, backgroundColor: theme.text.muted + '10' }}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
  
              <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
                <form onSubmit={handleUpdateProduct} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Product Name *</label>
                    <input
                      type="text"
                      required
                      value={editProductFormData.product_name || ""}
                      onChange={(e) => handleEditProductInputChange("product_name", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>
  
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Barcode</label>
                    <input
                      type="text"
                      value={editProductFormData.barcode || ""}
                      onChange={(e) => handleEditProductInputChange("barcode", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Category *</label>
                    <select
                      required
                      value={editProductFormData.category || ""}
                      onChange={(e) => handleEditProductInputChange("category", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    >
                      <option value="">Select Category</option>
                      {categoriesData.map((category) => (
                        <option key={category.category_id} value={category.category_name}>
                          {category.category_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Suggested Retail Price (SRP)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editProductFormData.srp || ""}
                      onChange={(e) => handleEditProductInputChange("srp", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Quantity *</label>
                    <input
                      type="number"
                      required
                      value={editProductFormData.quantity || ""}
                      onChange={(e) => handleEditProductInputChange("quantity", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Brand</label>
                    <select
                      value={editProductFormData.brand_id || ""}
                      onChange={(e) => handleEditProductInputChange("brand_id", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    >
                      <option value="">Select Brand</option>
                      {brandsData.map((brand) => (
                        <option key={brand.brand_id} value={brand.brand_id}>
                          {brand.brand}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Supplier</label>
                    <select
                      value={editProductFormData.supplier_id || ""}
                      onChange={(e) => handleEditProductInputChange("supplier_id", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    >
                      <option value="">Select Supplier</option>
                      {suppliersData.map((supplier) => (
                        <option key={supplier.supplier_id} value={supplier.supplier_id}>
                          {supplier.supplier_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Expiration Date</label>
                    <input
                      type="date"
                      value={editProductFormData.expiration || ""}
                      onChange={(e) => {
                        const selectedDate = e.target.value;
                        // Validate that the date is not in the past
                        if (selectedDate && new Date(selectedDate) < new Date()) {
                          safeToast("warning", "Expiration date cannot be in the past. Please select a future date.");
                          return;
                        }
                        handleEditProductInputChange("expiration", selectedDate);
                      }}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                    <p className="text-xs mt-1" style={{ color: theme.text.muted }}>
                      Required for proper FIFO inventory tracking
                    </p>
                    {editProductFormData.expiration && (
                      <p className="text-xs mt-1" style={{ color: theme.colors.accent }}>
                        Expires: {new Date(editProductFormData.expiration).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Description</label>
                    <textarea
                      rows={3}
                      value={editProductFormData.description || ""}
                      onChange={(e) => handleEditProductInputChange("description", e.target.value)}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: '#3b82f6'
                      }}
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="editPrescription"
                          checked={editProductFormData.prescription === 1}
                          onChange={(e) => handleEditProductInputChange("prescription", e.target.checked ? 1 : 0)}
                          className="h-4 w-4 rounded focus:ring-2"
                          style={{ 
                            accentColor: theme.colors.accent,
                            borderColor: theme.border.default
                          }}
                        />
                        <label htmlFor="editPrescription" className="text-sm font-medium" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                          Prescription Required
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id="editBulk"
                          checked={editProductFormData.bulk === 1}
                          onChange={(e) => handleEditProductInputChange("bulk", e.target.checked ? 1 : 0)}
                          className="h-4 w-4 rounded focus:ring-2"
                          style={{ 
                            accentColor: theme.colors.accent,
                            borderColor: theme.border.default
                          }}
                        />
                        <label htmlFor="editBulk" className="text-sm font-medium" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                          Bulk Product
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
  
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={closeEditProductModal}
                    className="px-4 py-2 border rounded-md transition-colors"
                    style={{ 
                      borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                      backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                      color: isDarkMode ? '#f8fafc' : '#0f172a'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = theme.bg.hover}
                    onMouseLeave={(e) => e.target.style.backgroundColor = theme.bg.secondary}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded-md transition-colors disabled:opacity-50"
                    style={{ 
                      backgroundColor: theme.colors.accent,
                      color: isDarkMode ? '#f8fafc' : '#0f172a'
                    }}
                    onMouseEnter={(e) => !loading && (e.target.style.backgroundColor = theme.colors.accent + 'dd')}
                    onMouseLeave={(e) => !loading && (e.target.style.backgroundColor = theme.colors.accent)}
                  >
                    {loading ? "Updating..." : "Update Product"}
                  </button>
                </div>
              </form>
              </div>
            </div>
          </div>
        )}
  
  
  {/* Delete Confirmation Modal */}
  {showDeleteModal && (
    <div className="fixed inset-0 backdrop-blur-md bg-black bg-opacity-30 flex items-center justify-center z-50 transition-all duration-300">
      <div className="backdrop-blur-lg rounded-2xl shadow-2xl p-8 border-2 w-96 transform transition-all duration-300 scale-100" style={{ 
        backgroundColor: theme.bg.card + 'F5', 
        borderColor: theme.border.default,
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
      }}>
        <h3 className="text-xl font-semibold mb-6" style={{ color: theme.text.primary }}>Confirm Archive</h3>
        <p className="text-base mb-6" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Are you sure you want to archive this item?</p>
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={closeDeleteModal}
            className="px-6 py-3 border-2 rounded-lg font-medium transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95"
            style={{ 
              borderColor: theme.border.default, 
              backgroundColor: theme.bg.secondary,
              color: theme.text.primary
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDeleteItem}
            className="px-6 py-3 rounded-lg font-medium disabled:opacity-50 transition-all duration-200 hover:shadow-md hover:scale-105 active:scale-95 disabled:hover:scale-100 disabled:hover:shadow-none"
            style={{ 
              backgroundColor: theme.colors.danger,
              color: 'white'
            }}
          >
            {loading ? "Archiving..." : "Archive"}
          </button>
        </div>
      </div>
    </div>
  )}
  

  {showUpdateStockModal && (
    <div className="fixed inset-0 flex items-center justify-center z-50 transition-all duration-300" style={{ 
      backgroundColor: 'transparent' 
    }}>
      <div className="rounded-2xl shadow-2xl max-w-6xl w-full mx-4 max-h-[95vh] border-2 transform transition-all duration-300 scale-100" style={{ 
        backgroundColor: isDarkMode ? '#334155' : '#ffffff', 
        borderColor: isDarkMode ? '#475569' : '#e2e8f0',
        boxShadow: isDarkMode ? '0 25px 50px -12px rgba(0, 0, 0, 0.3)' : '0 25px 50px -12px rgba(0, 0, 0, 0.1)'
      }}>
        <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10" style={{ 
          borderColor: isDarkMode ? '#475569' : '#e2e8f0', 
          backgroundColor: isDarkMode ? '#334155' : '#ffffff' 
        }}>
          <h3 className="text-xl font-semibold" style={{ color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
            {existingProduct ? "Update Product Stock" : "Add New Product Stock"}
          </h3>
          <button 
            onClick={closeUpdateStockModal} 
            className="p-2 rounded-lg hover:bg-opacity-10 transition-all duration-200 hover:scale-110 active:scale-95" 
            style={{ color: theme.text.muted, backgroundColor: theme.text.muted + '10' }}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(95vh-80px)]">
          <div className="p-6">
            {/* Quick Start Guide */}
            <div className="mb-6 p-6 rounded-xl border-2 shadow-sm transition-all duration-200 hover:shadow-md" style={{ 
              backgroundColor: isDarkMode ? '#334155' : '#ffffff', 
              borderColor: isDarkMode ? '#475569' : '#e2e8f0' 
            }}>
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6" style={{ color: '#3b82f6' }} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-base font-semibold" style={{ color: isDarkMode ? '#f8fafc' : '#0f172a' }}>Quick Start Guide</h4>
                  <p className="text-sm mt-2" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                    <strong>For quick stock updates:</strong> Switch to "Pieces Mode" and enter the total quantity directly. 
                    <strong>For detailed tracking:</strong> Use "Bulk Mode" to specify boxes and pieces per box.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Product Details Section */}
            {existingProduct ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Product Name</label>
                <input
                  type="text"
                  value={existingProduct?.product_name || ""}
                  readOnly
                  className="w-full px-4 py-3 border-2 rounded-lg"
                  style={{ 
                    borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                    backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                    color: isDarkMode ? '#94a3b8' : '#64748b'
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Barcode</label>
                <input
                  type="text"
                  value={existingProduct?.barcode || ""}
                  readOnly
                  className="w-full px-4 py-3 border-2 rounded-lg"
                  style={{ 
                    borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                    backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                    color: isDarkMode ? '#94a3b8' : '#64748b'
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Category</label>
                <input
                  type="text"
                  value={existingProduct?.category || ""}
                  readOnly
                  className="w-full px-4 py-3 border-2 rounded-lg"
                  style={{ 
                    borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                    backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                    color: isDarkMode ? '#94a3b8' : '#64748b'
                  }}
                />
              </div>
              </div>
            ) : (
              <div className="mb-6 p-6 rounded-xl border-2 shadow-sm transition-all duration-200 hover:shadow-md" style={{ 
                backgroundColor: isDarkMode ? '#334155' : '#ffffff', 
                borderColor: isDarkMode ? '#475569' : '#e2e8f0' 
              }}>
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-6 w-6" style={{ color: '#10b981' }} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h4 className="text-base font-semibold" style={{ color: isDarkMode ? '#f8fafc' : '#0f172a' }}>Ready for New Product Scan</h4>
                    <p className="text-sm mt-2" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                      Scan a barcode to automatically populate product details, or manually enter product information below.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Additional Product Info - Only show when existingProduct exists */}
            {existingProduct && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Brand</label>
                <input
                  type="text"
                  value={(() => {
                    console.log("🔍 Update modal brand debug:", {
                      existingProduct_brand_id: existingProduct?.brand_id,
                      existingProduct_brand: existingProduct?.brand,
                      brandsData_length: brandsData.length
                    });
                    
                    if (existingProduct?.brand_id && brandsData.length > 0) {
                      const brand = brandsData.find(b => b.brand_id == existingProduct.brand_id);
                      console.log("🔍 Found brand for modal:", brand);
                      return brand ? brand.brand : existingProduct?.brand || "N/A";
                    }
                    return existingProduct?.brand || "N/A";
                  })()}
                  readOnly
                  className="w-full px-4 py-3 border-2 rounded-lg"
                  style={{ 
                    borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                    backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                    color: isDarkMode ? '#94a3b8' : '#64748b'
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Current Stock</label>
                <input
                  type="text"
                  value={existingProduct?.quantity || "0"}
                  readOnly
                  className="w-full px-4 py-3 border-2 rounded-lg"
                  style={{ 
                    borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                    backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                    color: isDarkMode ? '#94a3b8' : '#64748b'
                  }}
                />
              </div>
              </div>
            )}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>SRP</label>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="editSrp"
                      checked={editSrpEnabled}
                      onChange={(e) => {
                        setEditSrpEnabled(e.target.checked);
                        if (e.target.checked) {
                          setNewSrp(existingProduct?.srp || existingProduct?.unit_price || "");
                        } else {
                          setNewSrp("");
                        }
                      }}
                      className="h-4 w-4 rounded"
                      style={{ accentColor: theme.colors.accent }}
                    />
                    <label htmlFor="editSrp" className="ml-2 text-sm cursor-pointer" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                      Edit SRP
                    </label>
                  </div>
                </div>
                {editSrpEnabled ? (
                  <input
                    type="number"
                    step="0.01"
                    value={newSrp || ""}
                    onChange={(e) => setNewSrp(e.target.value)}
                    placeholder="Enter new SRP"
                    className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80"
                    style={{ 
                      borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                      backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                      color: isDarkMode ? '#f8fafc' : '#0f172a',
                      focusRingColor: '#3b82f6'
                    }}
                  />
                ) : (
                  <input
                    type="text"
                    readOnly
                    className="w-full px-4 py-3 border-2 rounded-lg"
                    placeholder="SRP"
                    value={`₱${Number.parseFloat(existingProduct?.srp || existingProduct?.unit_price || 0).toFixed(2)}`}
                    style={{ 
                      borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                      backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                      color: isDarkMode ? '#f8fafc' : '#0f172a'
                    }}
                  />
                )}
              </div>
            </div>

            {/* Description Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Description</label>
              <textarea
                value={existingProduct?.description || ""}
                readOnly
                rows={3}
                className="w-full px-4 py-3 border-2 rounded-lg"
                style={{ 
                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                  backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                  color: isDarkMode ? '#94a3b8' : '#64748b'
                }}
              />
            </div>

            {/* Bulk Configuration Section */}
            <div className="mb-6 p-6 rounded-xl border-2 shadow-sm transition-all duration-200 hover:shadow-md" style={{ 
              backgroundColor: isDarkMode ? '#334155' : '#ffffff', 
              borderColor: isDarkMode ? '#475569' : '#e2e8f0' 
            }}>
              <h4 className="text-base font-semibold mb-4 flex items-center" style={{ color: theme.text.primary }}>
                ⚙️ Configuration Mode
              </h4>
              <p className="text-sm mb-4" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                Choose how you want to configure the product quantity. <strong>Pieces Mode</strong> is recommended for quick stock updates.
              </p>
              
              {/* Status Indicator */}
              <div className="mb-4 p-2 rounded-lg border" style={{
                backgroundColor: (() => {
                  if (stockUpdateConfigMode === "pieces") {
                    return (newStockQuantity && newStockQuantity > 0) 
                      ? 'rgb(240 253 244)' // green-50
                      : 'rgb(254 252 232)'; // yellow-50
                  } else {
                    // Bulk mode validation
                    if (existingProduct?.product_type === "Medicine") {
                      return (newStockBoxes && newStockBoxes > 0 && newStockStripsPerBox && newStockStripsPerBox > 0 && newStockTabletsPerStrip && newStockTabletsPerStrip > 0)
                        ? 'rgb(240 253 244)' // green-50
                        : 'rgb(254 252 232)'; // yellow-50
                    } else if (existingProduct?.product_type === "Non-Medicine") {
                      return (newStockBoxes && newStockBoxes > 0 && newStockPiecesPerPack && newStockPiecesPerPack > 0)
                        ? 'rgb(240 253 244)' // green-50
                        : 'rgb(254 252 232)'; // yellow-50
                    } else {
                      // Unknown product type - check if bulk fields are filled
                      return (newStockBoxes && newStockBoxes > 0 && newStockPiecesPerPack && newStockPiecesPerPack > 0)
                        ? 'rgb(240 253 244)' // green-50
                        : 'rgb(254 252 232)'; // yellow-50
                    }
                  }
                })(),
                borderColor: (() => {
                  if (stockUpdateConfigMode === "pieces") {
                    return (newStockQuantity && newStockQuantity > 0) 
                      ? 'rgb(187 247 208)' // green-200
                      : 'rgb(254 240 138)'; // yellow-200
                  } else {
                    // Bulk mode validation
                    if (existingProduct?.product_type === "Medicine") {
                      return (newStockBoxes && newStockBoxes > 0 && newStockStripsPerBox && newStockStripsPerBox > 0 && newStockTabletsPerStrip && newStockTabletsPerStrip > 0)
                        ? 'rgb(187 247 208)' // green-200
                        : 'rgb(254 240 138)'; // yellow-200
                    } else if (existingProduct?.product_type === "Non-Medicine") {
                      return (newStockBoxes && newStockBoxes > 0 && newStockPiecesPerPack && newStockPiecesPerPack > 0)
                        ? 'rgb(187 247 208)' // green-200
                        : 'rgb(254 240 138)'; // yellow-200
                    } else {
                      // Unknown product type - check if bulk fields are filled
                      return (newStockBoxes && newStockBoxes > 0 && newStockPiecesPerPack && newStockPiecesPerPack > 0)
                        ? 'rgb(187 247 208)' // green-200
                        : 'rgb(254 240 138)'; // yellow-200
                    }
                  }
                })()
              }}>
                <p className="text-xs" style={{
                  color: (() => {
                    if (stockUpdateConfigMode === "pieces") {
                      return (newStockQuantity && newStockQuantity > 0) 
                        ? 'rgb(21 128 61)' // green-700
                        : 'rgb(161 98 7)'; // yellow-700
                    } else {
                      // Bulk mode validation
                      if (existingProduct?.product_type === "Medicine") {
                        return (newStockBoxes && newStockBoxes > 0 && newStockStripsPerBox && newStockStripsPerBox > 0 && newStockTabletsPerStrip && newStockTabletsPerStrip > 0)
                          ? 'rgb(21 128 61)' // green-700
                          : 'rgb(161 98 7)'; // yellow-700
                      } else if (existingProduct?.product_type === "Non-Medicine") {
                        return (newStockBoxes && newStockBoxes > 0 && newStockPiecesPerPack && newStockPiecesPerPack > 0)
                          ? 'rgb(21 128 61)' // green-700
                          : 'rgb(161 98 7)'; // yellow-700
                      } else {
                        // Unknown product type - check if bulk fields are filled
                        return (newStockBoxes && newStockBoxes > 0 && newStockPiecesPerPack && newStockPiecesPerPack > 0)
                          ? 'rgb(21 128 61)' // green-700
                          : 'rgb(161 98 7)'; // yellow-700
                      }
                    }
                  })()
                }}>
                  <strong>Status:</strong> {
                    stockUpdateConfigMode === "pieces" 
                      ? (newStockQuantity && newStockQuantity > 0) 
                        ? "✅ Ready to update stock" 
                        : "⏳ Enter quantity to enable button"
                      : (() => {
                          // Bulk mode status
                          if (existingProduct?.product_type === "Medicine") {
                            return (newStockBoxes && newStockBoxes > 0 && newStockStripsPerBox && newStockStripsPerBox > 0 && newStockTabletsPerStrip && newStockTabletsPerStrip > 0)
                              ? "✅ Ready to update stock (Medicine Bulk Mode)"
                              : "⏳ Fill Medicine fields: Boxes, Strips per Box, Tablets per Strip";
                          } else if (existingProduct?.product_type === "Non-Medicine") {
                            return (newStockBoxes && newStockBoxes > 0 && newStockPiecesPerPack && newStockPiecesPerPack > 0)
                              ? "✅ Ready to update stock (Non-Medicine Bulk Mode)"
                              : "⏳ Fill Non-Medicine fields: Boxes, Pieces per Box";
                          } else {
                            // Unknown product type
                            return (newStockBoxes && newStockBoxes > 0 && newStockPiecesPerPack && newStockPiecesPerPack > 0)
                              ? "✅ Ready to update stock (Bulk Mode)"
                              : "⏳ Fill bulk fields: Boxes, Pieces per Box";
                          }
                        })()
                  }
                </p>
              </div>
              
              <div className="flex items-center space-x-6 mb-4">
                <div className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${stockUpdateConfigMode === "bulk" ? "border-2" : ""}`} style={{
                  backgroundColor: stockUpdateConfigMode === "bulk" ? (isDarkMode ? '#1e40af' : '#dbeafe') : 'transparent',
                  borderColor: stockUpdateConfigMode === "bulk" ? (isDarkMode ? '#3b82f6' : '#3b82f6') : 'transparent'
                }}>
                  <input
                    type="radio"
                    id="bulkMode"
                    name="configMode"
                    value="bulk"
                    checked={stockUpdateConfigMode === "bulk"}
                    onChange={(e) => setStockUpdateConfigMode("bulk")}
                    className="h-4 w-4 focus:ring-blue-500"
                    style={{ 
                      accentColor: '#3b82f6',
                      borderColor: isDarkMode ? '#475569' : '#d1d5db'
                    }}
                  />
                  <label htmlFor="bulkMode" className="text-sm font-medium cursor-pointer" style={{ color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                    📦 Bulk Mode (Boxes × Pieces)
                  </label>
                </div>
                <div className={`flex items-center space-x-2 p-2 rounded-lg transition-colors ${stockUpdateConfigMode === "pieces" ? "border-2" : ""}`} style={{
                  backgroundColor: stockUpdateConfigMode === "pieces" ? (isDarkMode ? '#1e40af' : '#dbeafe') : 'transparent',
                  borderColor: stockUpdateConfigMode === "pieces" ? (isDarkMode ? '#3b82f6' : '#3b82f6') : 'transparent'
                }}>
                  <input
                    type="radio"
                    id="piecesMode"
                    name="configMode"
                    value="pieces"
                    checked={stockUpdateConfigMode === "pieces"}
                    onChange={(e) => setStockUpdateConfigMode("pieces")}
                    className="h-4 w-4 focus:ring-blue-500"
                    style={{ 
                      accentColor: '#3b82f6',
                      borderColor: isDarkMode ? '#475569' : '#d1d5db'
                    }}
                  />
                  <label htmlFor="piecesMode" className="text-sm font-medium cursor-pointer" style={{ color: isDarkMode ? '#f8fafc' : '#0f172a' }}>
                    🔢 Pieces Mode (Direct Total) - <span className="font-semibold" style={{ color: '#10b981' }}>Recommended</span>
                  </label>
                </div>
              </div>

              {/* Show input fields based on configuration mode */}
              {(() => {
                if (existingProduct?.product_type === "Medicine") {
                  // Medicine Configuration
                  if (stockUpdateConfigMode === "bulk") {
                    // Medicine with Bulk Mode (Boxes × Strips × Tablets)
                    return (
                      <div className="p-4 rounded-lg border-2" style={{
                        backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5',
                        borderColor: isDarkMode ? '#10b981' : '#10b981'
                      }}>
                        <h4 className="text-sm font-semibold mb-3 flex items-center" style={{ color: '#10b981' }}>
                          💊 Medicine Configuration (Bulk Mode)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Number of Boxes *</label>
                            <input
                              type="number"
                              min="1"
                              value={newStockBoxes || ""}
                              onChange={(e) => setNewStockBoxes(e.target.value)}
                              placeholder="Enter boxes"
                              className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                              style={{ 
                                borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                                color: isDarkMode ? '#f8fafc' : '#0f172a',
                                focusRingColor: '#3b82f6'
                              }}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Strips per Box *</label>
                            <input
                              type="number"
                              min="1"
                              value={newStockStripsPerBox || ""}
                              onChange={(e) => setNewStockStripsPerBox(e.target.value)}
                              placeholder="Enter strips per box"
                              className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                              style={{ 
                                borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                                color: isDarkMode ? '#f8fafc' : '#0f172a',
                                focusRingColor: '#3b82f6'
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Tablets per Strip *</label>
                            <input
                              type="number"
                              min="1"
                              value={newStockTabletsPerStrip || ""}
                              onChange={(e) => setNewStockTabletsPerStrip(e.target.value)}
                              placeholder="Enter tablets per strip"
                              className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                              style={{ 
                                borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                                color: isDarkMode ? '#f8fafc' : '#0f172a',
                                focusRingColor: '#3b82f6'
                              }}
                            />
                          </div>
                        </div>
                        
                        {/* Auto-computed Total Display */}
                        <div className="mt-4 p-3 rounded border-2" style={{
                          backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                          borderColor: '#10b981'
                        }}>
                          <div className="text-sm" style={{ color: '#10b981' }}>
                            <span className="font-medium">Auto-computed Total: </span>
                            <span className="text-lg font-bold" style={{ color: '#059669' }}>
                              {parseInt(newStockBoxes || 0) * parseInt(newStockStripsPerBox || 0) * parseInt(newStockTabletsPerStrip || 0)} tablets
                            </span>
                          </div>
                          <div className="text-xs mt-1" style={{ color: '#047857' }}>
                            Formula: {newStockBoxes || 0} boxes × {newStockStripsPerBox || 0} strips × {newStockTabletsPerStrip || 0} tablets
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // Medicine with Pieces Mode (Direct Total Input)
                    return (
                      <div className="p-4 rounded-lg border-2" style={{
                        backgroundColor: isDarkMode ? '#1e3a8a' : '#eff6ff',
                        borderColor: isDarkMode ? '#3b82f6' : '#3b82f6'
                      }}>
                        <h4 className="text-sm font-semibold mb-3 flex items-center" style={{ color: '#3b82f6' }}>
                          💊 Medicine Configuration (Pieces Mode)
                        </h4>
                                                 <div>
                           <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Total Tablets to Add *</label>
                           <input
                             type="number"
                             min="1"
                             value={newStockQuantity || ""}
                             onChange={(e) => setNewStockQuantity(e.target.value)}
                             placeholder="Enter total number of tablets"
                             className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                             style={{ 
                               borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                               backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                               color: isDarkMode ? '#f8fafc' : '#0f172a',
                               focusRingColor: '#3b82f6'
                             }}
                           />
                           <p className="text-xs mt-1" style={{ color: isDarkMode ? '#94a3b8' : '#64748b' }}>Direct input of total tablets for this medicine. <strong>Tip:</strong> This is the fastest way to add stock!</p>
                         </div>
                      </div>
                    );
                  }
                          } else if (existingProduct?.product_type === "Non-Medicine") {
                  // Non-Medicine Configuration
                  if (stockUpdateConfigMode === "bulk") {
                    // Non-Medicine with Bulk Mode (Boxes × Pieces per Box)
                    return (
                      <div className="p-4 rounded-lg border-2" style={{
                        backgroundColor: isDarkMode ? '#7c2d12' : '#fff7ed',
                        borderColor: isDarkMode ? '#f59e0b' : '#f59e0b'
                      }}>
                        <h4 className="text-sm font-semibold mb-3 flex items-center" style={{ color: '#f59e0b' }}>
                          📦 Non-Medicine Configuration (Bulk Mode)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Number of Boxes *</label>
                            <input
                              type="number"
                              min="1"
                              value={newStockBoxes || ""}
                              onChange={(e) => setNewStockBoxes(e.target.value)}
                              placeholder="Enter boxes"
                              className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                              style={{ 
                                borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                                color: isDarkMode ? '#f8fafc' : '#0f172a',
                                focusRingColor: '#3b82f6'
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Pieces per Box *</label>
                            <input
                              type="number"
                              min="1"
                              value={newStockPiecesPerPack || ""}
                              onChange={(e) => setNewStockPiecesPerPack(e.target.value)}
                              placeholder="Enter pieces per box"
                              className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                              style={{ 
                                borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                                color: isDarkMode ? '#f8fafc' : '#0f172a',
                                focusRingColor: '#3b82f6'
                              }}
                            />
                          </div>
                        </div>
                        
                        {/* Auto-computed Total Display */}
                        <div className="mt-4 p-3 rounded border-2" style={{
                          backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                          borderColor: '#f59e0b'
                        }}>
                          <div className="text-sm" style={{ color: '#f59e0b' }}>
                            <span className="font-medium">Auto-computed Total: </span>
                            <span className="text-lg font-bold" style={{ color: '#d97706' }}>
                              {parseInt(newStockBoxes || 0) * parseInt(newStockPiecesPerPack || 0)} pieces
                            </span>
                          </div>
                          <div className="text-xs mt-1" style={{ color: '#b45309' }}>
                            Formula: {newStockBoxes || 0} boxes × {newStockPiecesPerPack || 0} pieces
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    // Non-Medicine with Pieces Mode (Direct Total Input)
                    return (
                      <div className="p-4 rounded-lg border-2" style={{
                        backgroundColor: isDarkMode ? '#1e3a8a' : '#eff6ff',
                        borderColor: isDarkMode ? '#3b82f6' : '#3b82f6'
                      }}>
                        <h4 className="text-sm font-semibold mb-3 flex items-center" style={{ color: '#3b82f6' }}>
                          📦 Non-Medicine Configuration (Pieces Mode)
                        </h4>
                        <div>
                          <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Total Pieces to Add *</label>
                          <input
                            type="number"
                            min="1"
                            value={newStockQuantity || ""}
                            onChange={(e) => setNewStockQuantity(e.target.value)}
                            placeholder="Enter total number of pieces"
                            className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                            style={{ 
                              borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                              backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                              color: isDarkMode ? '#f8fafc' : '#0f172a',
                              focusRingColor: '#3b82f6'
                            }}
                          />
                          <p className="text-xs mt-1" style={{ color: theme.text.muted }}>Direct input of total pieces for this product. <strong>Tip:</strong> This is the fastest way to add stock!</p>
                        </div>
                      </div>
                    );
                  }
                } else {
                  // Default Configuration (Unknown Product Type)
                  if (stockUpdateConfigMode === "bulk") {
                    return (
                      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center">
                          📦 Product Configuration (Bulk Mode)
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Number of Boxes *</label>
                            <input
                              type="number"
                              min="1"
                              value={newStockBoxes || ""}
                              onChange={(e) => setNewStockBoxes(e.target.value)}
                              placeholder="Enter boxes"
                              className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                              style={{ 
                                borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                                color: isDarkMode ? '#f8fafc' : '#0f172a',
                                focusRingColor: '#3b82f6'
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Pieces per Box *</label>
                            <input
                              type="number"
                              min="1"
                              value={newStockPiecesPerPack || ""}
                              onChange={(e) => setNewStockPiecesPerPack(e.target.value)}
                              placeholder="Enter pieces per box"
                              className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                              style={{ 
                                borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                                color: isDarkMode ? '#f8fafc' : '#0f172a',
                                focusRingColor: '#3b82f6'
                              }}
                            />
                          </div>
                        </div>
                        
                        {/* Auto-computed Total Display */}
                        <div className="mt-4 p-3 bg-white rounded border border-gray-200">
                          <div className="text-sm text-gray-700">
                            <span className="font-medium">Auto-computed Total: </span>
                            <span className="text-lg font-bold text-gray-800">
                              {parseInt(newStockBoxes || 0) * parseInt(newStockPiecesPerPack || 0)} pieces
                            </span>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            Formula: {newStockBoxes || 0} boxes × {newStockPiecesPerPack || 0} pieces
                          </div>
                        </div>
                      </div>
                    );
                  } else {
                    return (
                      <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <h4 className="text-sm font-semibold text-blue-800 mb-3 flex items-center">
                          📦 Product Configuration (Pieces Mode)
                        </h4>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Total Pieces to Add *</label>
                          <input
                            type="number"
                            min="1"
                            value={newStockQuantity || ""}
                            onChange={(e) => setNewStockQuantity(e.target.value)}
                            placeholder="Enter total number of pieces"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-xs text-gray-500 mt-1">Direct input of total pieces for this product</p>
                        </div>
                      </div>
                    );
                  }
                }
              })()}
            </div>

            {/* Batch Configuration Section - Only show when creating new batch */}
            {!useSameBatch && (
              <div className="mb-6 p-6 rounded-xl border-2 shadow-sm transition-all duration-200 hover:shadow-md" style={{ 
                backgroundColor: theme.bg.card, 
                borderColor: theme.border.default 
              }}>
              <h4 className="text-base font-semibold mb-4 flex items-center" style={{ color: theme.colors.accent }}>
                🏷️ Batch Information
              </h4>
              <p className="text-sm mb-4" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                Configure batch details for proper FIFO tracking and inventory management.
              </p>
              
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Batch Reference *</label>
                  <input
                    type="text"
                    value={newStockBatchReference || ""}
                    onChange={(e) => setNewStockBatchReference(e.target.value)}
                    placeholder="Auto-generated batch reference"
                    className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80"
                    style={{ 
                      borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                      backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                      color: isDarkMode ? '#f8fafc' : '#0f172a',
                      focusRingColor: '#3b82f6'
                    }}
                  />
                  <p className="text-xs mt-1" style={{ color: theme.text.muted }}>Auto-generated unique identifier for this batch</p>
                </div>
                
              </div>
            </div>
            )}

            {/* Same Batch Option Section */}
            {existingBatches.length > 0 ? (
              <div className="mb-6 p-6 rounded-xl border-2 shadow-sm transition-all duration-200 hover:shadow-md" style={{ 
                backgroundColor: theme.bg.card, 
                borderColor: theme.border.default 
              }}>
                <h4 className="text-base font-semibold mb-4 flex items-center" style={{ color: theme.colors.success }}>
                  🔄 Add to Existing Batch
                </h4>
                <p className="text-sm mb-4" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                  Add more quantity to an existing batch instead of creating a new one.
                </p>
                
                <div className="flex items-center space-x-4 mb-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!useSameBatch}
                      onChange={() => setUseSameBatch(false)}
                      className="w-4 h-4"
                      style={{ accentColor: theme.colors.accent }}
                    />
                    <span className="text-sm font-medium" style={{ color: theme.text.primary }}>Create New Batch</span>
                  </label>
                  
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={useSameBatch}
                      onChange={() => setUseSameBatch(true)}
                      className="w-4 h-4"
                      style={{ accentColor: theme.colors.success }}
                    />
                    <span className="text-sm font-medium" style={{ color: theme.text.primary }}>Add to Existing Batch</span>
                  </label>
                </div>

                {useSameBatch && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium mb-2" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Select Existing Batch</label>
                    <select
                      value={selectedExistingBatch?.batch_reference || ""}
                      onChange={(e) => {
                        const selectedBatch = existingBatches.find(batch => batch.batch_reference === e.target.value);
                        setSelectedExistingBatch(selectedBatch || null);
                        if (selectedBatch) {
                          setNewStockExpiration(selectedBatch.expiration_date || "");
                        }
                      }}
                      className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                      style={{ 
                        borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                        backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                        color: isDarkMode ? '#f8fafc' : '#0f172a',
                        focusRingColor: theme.colors.success
                      }}
                    >
                      <option value="">Select a batch...</option>
                      {existingBatches.map((batch) => (
                        <option key={batch.batch_reference} value={batch.batch_reference}>
                          {batch.batch_reference} - Qty: {batch.quantity} - Exp: {batch.expiration_date ? new Date(batch.expiration_date).toLocaleDateString() : 'N/A'}
                        </option>
                      ))}
                    </select>
                    
                    {selectedExistingBatch && (
                      <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: theme.bg.secondary }}>
                        <div className="text-sm" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                          <div className="grid grid-cols-2 gap-2">
                            <div><strong>Batch Reference:</strong> {selectedExistingBatch.batch_reference}</div>
                            <div><strong>Current Quantity:</strong> {selectedExistingBatch.quantity}</div>
                            <div><strong>Expiration:</strong> {selectedExistingBatch.expiration_date ? new Date(selectedExistingBatch.expiration_date).toLocaleDateString() : 'N/A'}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-6 p-6 rounded-xl border-2 shadow-sm transition-all duration-200 hover:shadow-md" style={{ 
                backgroundColor: theme.bg.card, 
                borderColor: theme.border.default 
              }}>
                <h4 className="text-base font-semibold mb-4 flex items-center" style={{ color: theme.text.primary }}>
                  ℹ️ Batch Information
                </h4>
                <p className="text-sm mb-4" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                  No existing batches found for this product. A new batch will be created when you update the stock.
                </p>
                <div className="flex items-center space-x-2 text-sm" style={{ color: theme.text.muted }}>
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>This is normal for new products or products that haven't had stock updates yet.</span>
                </div>
              </div>
            )}

            {/* Expiration Date Section */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Expiration Date</label>
              <input
                type="date"
                value={newStockExpiration || ""}
                onChange={(e) => {
                  const selectedDate = e.target.value;
                  // Validate that the date is not in the past
                  if (selectedDate && new Date(selectedDate) < new Date()) {
                    safeToast("warning", "Expiration date cannot be in the past. Please select a future date.");
                    return;
                  }
                  setNewStockExpiration(selectedDate);
                }}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                  backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                  color: isDarkMode ? '#f8fafc' : '#0f172a',
                  focusRingColor: '#3b82f6'
                }}
              />
              <p className="text-xs mt-1" style={{ color: theme.text.muted }}>
                Select the expiration date for this stock batch (required for proper FIFO tracking)
              </p>
              {newStockExpiration && (
                <p className="text-xs mt-1" style={{ color: theme.colors.accent }}>
                  Expires: {new Date(newStockExpiration).toLocaleDateString()}
                </p>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 mt-6">
              <button
                type="button"
                onClick={closeUpdateStockModal}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleUpdateStock}
                disabled={loading || (() => {
                  if (stockUpdateConfigMode === "bulk") {
                    if (existingProduct?.product_type === "Medicine") {
                      // Medicine bulk mode: validate boxes, strips per box, tablets per strip
                      return (!newStockBoxes || newStockBoxes <= 0 || !newStockStripsPerBox || newStockStripsPerBox <= 0 || !newStockTabletsPerStrip || newStockTabletsPerStrip <= 0);
                    } else {
                      // Non-Medicine bulk mode: validate boxes, pieces per box
                      return (!newStockBoxes || newStockBoxes <= 0 || !newStockPiecesPerPack || newStockPiecesPerPack <= 0);
                    }
                  } else {
                    // Pieces mode: validate direct input
                    return (!newStockQuantity || newStockQuantity <= 0);
                  }
                })()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md disabled:opacity-50"
              >
                {loading ? "Adding..." : "Add to Batch"}
              </button>
            </div>
          </div>
        </div>
      </div>
    
  )}

  {showNewProductModal && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[9999] p-4">
          <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl max-w-6xl w-full max-h-[95vh] overflow-hidden border border-gray-200/50">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <h3 className="text-lg font-semibold text-gray-900">Add New Product</h3>
          <button onClick={closeNewProductModal} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(95vh-80px)]">
          <form onSubmit={handleAddNewProduct} className="p-6">
            {/* Helpful message for users */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h4 className="text-sm font-medium text-blue-800">Required Fields Guide</h4>
                  <p className="text-xs text-blue-700 mt-1">
                    <strong>Basic fields:</strong> Product Name, Category, Product Type, and SRP are always required. 
                    <strong>Product-specific fields:</strong> Fill in the bulk configuration fields based on your product type and configuration mode.
                  </p>
                </div>
              </div>
            </div>
            
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Product Name *</label>
              <input
                type="text"
                required
                value={newProductForm.product_name || ""}
                onChange={(e) => handleNewProductInputChange("product_name", e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                  backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                  color: isDarkMode ? '#f8fafc' : '#0f172a',
                  focusRingColor: '#3b82f6'
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Barcode</label>
              <input
                type="text"
                value={newProductForm.barcode || ""}
                onChange={(e) => handleNewProductInputChange("barcode", e.target.value)}
                placeholder="Scan or enter barcode"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                  backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                  color: isDarkMode ? '#f8fafc' : '#0f172a',
                  focusRingColor: '#3b82f6'
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Category *</label>
              <select
                required
                value={newProductForm.category || ""}
                onChange={(e) => {
                  handleNewProductInputChange("category", e.target.value);
                }}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                  backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                  color: isDarkMode ? '#f8fafc' : '#0f172a',
                  focusRingColor: '#3b82f6'
                }}
              >
                <option value="">Select Category</option>
                {categoriesData.map((category) => (
                  <option key={category.category_id} value={category.category_name}>
                    {category.category_name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">Available categories: {categoriesData.length}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product Type *</label>
              <div className="flex items-center space-x-3">
                <select
                  required
                  value={newProductForm.product_type || ""}
                  onChange={(e) => {
                    handleNewProductInputChange("product_type", e.target.value);
                    // Clear medicine/non-medicine fields when type changes
                    if (e.target.value === "Medicine") {
                      handleNewProductInputChange("boxes", "");
                      handleNewProductInputChange("pieces_per_pack", "");
                      handleNewProductInputChange("total_pieces", "");
                    } else if (e.target.value === "Non-Medicine") {
                      handleNewProductInputChange("boxes", "");
                      handleNewProductInputChange("strips_per_box", "");
                      handleNewProductInputChange("tablets_per_strip", "");
                      handleNewProductInputChange("total_tablets", "");
                    }
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Product Type</option>
                  <option value="Medicine">Medicine</option>
                  <option value="Non-Medicine">Non-Medicine</option>
                </select>
                {/* Configure button removed - bulk configuration now integrated into main form */}
              </div>
              
              {/* Product Type Summary */}
              {/* Product Type Summary - Now handled by bulk configuration section below */}
            </div>
            

       
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Suggested Retail Price (SRP) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={newProductForm.srp || ""}
                onChange={(e) => handleNewProductInputChange("srp", e.target.value)}
                placeholder="Enter SRP"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                  backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                  color: isDarkMode ? '#f8fafc' : '#0f172a',
                  focusRingColor: '#3b82f6'
                }}
              />
            </div>
            {/* Bulk Configuration Fields - Show based on product type and config mode */}
            {newProductForm.product_type && (
              <div className="md:col-span-3">
                <div className="p-4 rounded-lg border" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                  <h4 className="text-sm font-semibold mb-4 flex items-center" style={{ color: theme.text.primary }}>
                    ⚙️ Bulk Configuration
                  </h4>
                  
                  {/* Validation Status Indicator */}
                  <div className="mb-4 p-3 rounded-lg border" style={{
                    backgroundColor: (() => {
                      if (!newProductForm.product_type) return theme.colors.danger + '20'; // red with opacity
                      if (newProductForm.product_type === "Medicine") {
                        if (newProductForm.configMode === "bulk") {
                          return (newProductForm.boxes && newProductForm.strips_per_box && newProductForm.tablets_per_strip) 
                            ? theme.colors.success + '20' // green with opacity
                            : theme.colors.warning + '20'; // yellow with opacity
                        } else if (newProductForm.configMode === "pieces") {
                          return newProductForm.total_tablets ? theme.colors.success + '20' : theme.colors.warning + '20';
                        }
                      } else if (newProductForm.product_type === "Non-Medicine") {
                        if (newProductForm.configMode === "bulk") {
                          return (newProductForm.boxes && newProductForm.pieces_per_pack) 
                            ? theme.colors.success + '20' // green with opacity
                            : theme.colors.warning + '20'; // yellow with opacity
                        } else if (newProductForm.configMode === "pieces") {
                          return newProductForm.total_pieces ? theme.colors.success + '20' : theme.colors.warning + '20';
                        }
                      }
                      return theme.colors.warning + '20'; // yellow with opacity
                    })(),
                    borderColor: (() => {
                      if (!newProductForm.product_type) return theme.colors.danger;
                      if (newProductForm.product_type === "Medicine") {
                        if (newProductForm.configMode === "bulk") {
                          return (newProductForm.boxes && newProductForm.strips_per_box && newProductForm.tablets_per_strip) 
                            ? theme.colors.success
                            : theme.colors.warning;
                        } else if (newProductForm.configMode === "pieces") {
                          return newProductForm.total_tablets ? theme.colors.success : theme.colors.warning;
                        }
                      } else if (newProductForm.product_type === "Non-Medicine") {
                        if (newProductForm.configMode === "bulk") {
                          return (newProductForm.boxes && newProductForm.pieces_per_pack) 
                            ? theme.colors.success
                            : theme.colors.warning;
                        } else if (newProductForm.configMode === "pieces") {
                          return newProductForm.total_pieces ? theme.colors.success : theme.colors.warning;
                        }
                      }
                      return theme.colors.warning;
                    })()
                  }}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium" style={{
                          color: (() => {
                            if (!newProductForm.product_type) return theme.colors.danger;
                            if (newProductForm.product_type === "Medicine") {
                              if (newProductForm.configMode === "bulk") {
                                return (newProductForm.boxes && newProductForm.strips_per_box && newProductForm.tablets_per_strip) 
                                  ? theme.colors.success
                                  : theme.colors.warning;
                              } else if (newProductForm.configMode === "pieces") {
                                return newProductForm.total_tablets ? theme.colors.success : theme.colors.warning;
                              }
                            } else if (newProductForm.product_type === "Non-Medicine") {
                              if (newProductForm.configMode === "bulk") {
                                return (newProductForm.boxes && newProductForm.pieces_per_pack) 
                                  ? theme.colors.success
                                  : theme.colors.warning;
                              } else if (newProductForm.configMode === "pieces") {
                                return newProductForm.total_pieces ? theme.colors.success : theme.colors.warning;
                              }
                            }
                            return theme.colors.warning;
                          })()
                        }}>
                          {(() => {
                            if (!newProductForm.product_type) return '❌ Select Product Type';
                            if (newProductForm.product_type === "Medicine") {
                              if (newProductForm.configMode === "bulk") {
                                return (newProductForm.boxes && newProductForm.strips_per_box && newProductForm.tablets_per_strip) 
                                  ? '✅ Medicine Configuration Complete' 
                                  : '⏳ Fill Medicine Fields (Boxes, Strips, Tablets)';
                              } else if (newProductForm.configMode === "pieces") {
                                return newProductForm.total_tablets ? '✅ Medicine Configuration Complete' : '⏳ Enter Total Tablets';
                              }
                            } else if (newProductForm.product_type === "Non-Medicine") {
                              if (newProductForm.configMode === "bulk") {
                                return (newProductForm.boxes && newProductForm.pieces_per_pack) 
                                  ? '✅ Non-Medicine Configuration Complete' 
                                  : '⏳ Fill Non-Medicine Fields (Boxes, Pieces)';
                              } else if (newProductForm.configMode === "pieces") {
                                return newProductForm.total_pieces ? '✅ Non-Medicine Configuration Complete' : '⏳ Enter Total Pieces';
                              }
                            }
                            return '⏳ Configure Product';
                          })()}
                        </span>
                      </div>
                      <div className="text-xs" style={{
                        color: (() => {
                          if (!newProductForm.product_type) return theme.colors.danger;
                          if (newProductForm.product_type === "Medicine") {
                            if (newProductForm.configMode === "bulk") {
                              return (newProductForm.boxes && newProductForm.strips_per_box && newProductForm.tablets_per_strip) 
                                ? theme.colors.success
                                : theme.colors.warning;
                            } else if (newProductForm.configMode === "pieces") {
                              return newProductForm.total_tablets ? theme.colors.success : theme.colors.warning;
                            }
                          } else if (newProductForm.product_type === "Non-Medicine") {
                            if (newProductForm.configMode === "bulk") {
                              return (newProductForm.boxes && newProductForm.pieces_per_pack) 
                                ? theme.colors.success
                                : theme.colors.warning;
                            } else if (newProductForm.configMode === "pieces") {
                              return newProductForm.total_pieces ? theme.colors.success : theme.colors.warning;
                            }
                          }
                          return theme.colors.warning;
                        })()
                      }}>
                        {(() => {
                          if (!newProductForm.product_type) return 'Required';
                          if (newProductForm.product_type === "Medicine") {
                            if (newProductForm.configMode === "bulk") {
                              return (newProductForm.boxes && newProductForm.strips_per_box && newProductForm.tablets_per_strip) 
                                ? 'Ready' 
                                : 'Required';
                            } else if (newProductForm.configMode === "pieces") {
                              return newProductForm.total_tablets ? 'Ready' : 'Required';
                            }
                          } else if (newProductForm.product_type === "Non-Medicine") {
                            if (newProductForm.configMode === "bulk") {
                              return (newProductForm.boxes && newProductForm.pieces_per_pack) 
                                ? 'Ready' 
                                : 'Required';
                            } else if (newProductForm.configMode === "pieces") {
                              return newProductForm.total_pieces ? 'Ready' : 'Required';
                            }
                          }
                          return 'Required';
                        })()}
                      </div>
                    </div>
                  </div>
                  
                  {/* Configuration Mode Selection */}
                  <div className="mb-4">
                    <div className="flex items-center space-x-6">
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="newBulkMode"
                          name="newConfigMode"
                          value="bulk"
                          checked={newProductForm.configMode === "bulk"}
                          onChange={(e) => handleNewProductInputChange("configMode", e.target.value)}
                          className="h-4 w-4 focus:ring-blue-500"
                    style={{ 
                      accentColor: '#3b82f6',
                      borderColor: isDarkMode ? '#475569' : '#d1d5db'
                    }}
                        />
                        <label htmlFor="newBulkMode" className="text-sm font-medium" style={{ color: theme.text.primary }}>
                          📦 Bulk Mode (Boxes × Pieces)
                        </label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="newPiecesMode"
                          name="newConfigMode"
                          value="pieces"
                          checked={newProductForm.configMode === "pieces"}
                          onChange={(e) => handleNewProductInputChange("configMode", e.target.value)}
                          className="h-4 w-4 focus:ring-blue-500"
                    style={{ 
                      accentColor: '#3b82f6',
                      borderColor: isDarkMode ? '#475569' : '#d1d5db'
                    }}
                        />
                        <label htmlFor="newPiecesMode" className="text-sm font-medium" style={{ color: theme.text.primary }}>
                          🔢 Pieces Mode (Direct Total)
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Medicine Configuration */}
                  {newProductForm.product_type === "Medicine" && newProductForm.configMode === "bulk" && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Number of Boxes *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={newProductForm.boxes || ""}
                          onChange={(e) => handleNewProductInputChange("boxes", e.target.value)}
                          className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                          style={{ 
                            borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                            backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                            color: isDarkMode ? '#f8fafc' : '#0f172a',
                            focusRingColor: '#3b82f6'
                          }}
                          placeholder="Enter boxes"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Strips per Box *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={newProductForm.strips_per_box || ""}
                          onChange={(e) => handleNewProductInputChange("strips_per_box", e.target.value)}
                          className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                          style={{ 
                            borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                            backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                            color: isDarkMode ? '#f8fafc' : '#0f172a',
                            focusRingColor: '#3b82f6'
                          }}
                          placeholder="Enter strips per box"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Tablets per Strip *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={newProductForm.tablets_per_strip || ""}
                          onChange={(e) => handleNewProductInputChange("tablets_per_strip", e.target.value)}
                          className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                          style={{ 
                            borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                            backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                            color: isDarkMode ? '#f8fafc' : '#0f172a',
                            focusRingColor: '#3b82f6'
                          }}
                          placeholder="Enter tablets per strip"
                        />
                      </div>
                    </div>
                  )}

                  {/* Non-Medicine Configuration */}
                  {newProductForm.product_type === "Non-Medicine" && newProductForm.configMode === "bulk" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Number of Boxes *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={newProductForm.boxes || ""}
                          onChange={(e) => handleNewProductInputChange("boxes", e.target.value)}
                          className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                          style={{ 
                            borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                            backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                            color: isDarkMode ? '#f8fafc' : '#0f172a',
                            focusRingColor: '#3b82f6'
                          }}
                          placeholder="Enter boxes"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Pieces per Box *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={newProductForm.pieces_per_pack || ""}
                          onChange={(e) => handleNewProductInputChange("pieces_per_pack", e.target.value)}
                          className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                          style={{ 
                            borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                            backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                            color: isDarkMode ? '#f8fafc' : '#0f172a',
                            focusRingColor: '#3b82f6'
                          }}
                          placeholder="Enter pieces per box"
                        />
                      </div>
                    </div>
                  )}

                  {/* Pieces Mode Configuration */}
                  {newProductForm.configMode === "pieces" && (
                    <div>
                      <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                        Total {newProductForm.product_type === "Medicine" ? "Tablets" : "Pieces"} *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={newProductForm.product_type === "Medicine" ? (newProductForm.total_tablets || "") : (newProductForm.total_pieces || "")}
                        onChange={(e) => {
                          if (newProductForm.product_type === "Medicine") {
                            handleNewProductInputChange("total_tablets", e.target.value);
                          } else {
                            handleNewProductInputChange("total_pieces", e.target.value);
                          }
                        }}
                        className="w-full px-4 py-3 border-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-50 transition-all duration-200 hover:border-opacity-80 theme-input"
                        style={{ 
                          borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                          backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                          color: isDarkMode ? '#f8fafc' : '#0f172a',
                          focusRingColor: '#3b82f6'
                        }}
                        placeholder={`Enter total ${newProductForm.product_type === "Medicine" ? "tablets" : "pieces"}`}
                      />
                    </div>
                  )}

                  {/* Auto-computed Total Display */}
                  {newProductForm.configMode === "bulk" && (
                    <div className="mt-4 p-3 rounded border" style={{ backgroundColor: theme.bg.secondary, borderColor: theme.border.default }}>
                      <div className="text-sm" style={{ color: theme.text.primary }}>
                        <span className="font-medium">Auto-computed Total: </span>
                        {newProductForm.product_type === "Medicine" 
                          ? `${newProductForm.total_tablets || 0} tablets`
                          : `${newProductForm.total_pieces || 0} pieces`
                        }
                      </div>
                      <div className="text-xs mt-1" style={{ color: theme.text.muted }}>
                        {newProductForm.product_type === "Medicine" 
                          ? `Formula: ${newProductForm.boxes || 0} boxes × ${newProductForm.strips_per_box || 0} strips × ${newProductForm.tablets_per_strip || 0} tablets`
                          : `Formula: ${newProductForm.boxes || 0} boxes × ${newProductForm.pieces_per_pack || 0} pieces`
                        }
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Initial Stock field removed - now handled by bulk configuration fields above */}
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Brand</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Type brand name or enter new brand..."
                  value={newProductForm.brand_search || ""}
                  onChange={(e) => {
                    const searchTerm = e.target.value;
                    console.log("🔍 Brand input:", searchTerm);
                    handleNewProductInputChange("brand_search", searchTerm);
                    
                    // Clear brand_id to indicate this will be a new brand
                    handleNewProductInputChange("brand_id", null);
                    
                    // Clear any existing timeout
                    if (window.brandCreationTimeout) {
                      clearTimeout(window.brandCreationTimeout);
                    }
                    
                    // Auto-create brand after user stops typing for 1 second
                    if (searchTerm && searchTerm.trim().length >= 2) {
                      window.brandCreationTimeout = setTimeout(async () => {
                        const existingBrand = brandsData.find(brand => 
                          brand.brand.toLowerCase() === searchTerm.toLowerCase()
                        );
                        
                        if (!existingBrand) {
                          console.log("🆕 Auto-creating brand after timeout:", searchTerm);
                          try {
                            const brandResponse = await handleApiCall("add_brand", {
                              brand_name: searchTerm
                            });
                            
                            if (brandResponse.success) {
                              const newBrandId = brandResponse.brand_id;
                              console.log("✅ New brand auto-created with ID:", newBrandId);
                              handleNewProductInputChange("brand_id", newBrandId);
                              safeToast("success", `Brand "${searchTerm}" created automatically!`);
                              
                              // Reload brands data to include the new brand
                              await loadData("brands");
                            } else {
                              console.error("❌ Failed to auto-create brand:", brandResponse.message);
                            }
                          } catch (error) {
                            console.error("❌ Error auto-creating brand:", error);
                          }
                        }
                      }, 1000); // 1 second delay
                    }
                  }}
                  onKeyDown={async (e) => {
                    // Create brand when user presses Enter and brand doesn't exist
                    if (e.key === 'Enter' && newProductForm.brand_search && newProductForm.brand_search.trim()) {
                      console.log("🔍 Enter pressed, checking brand:", newProductForm.brand_search);
                      console.log("🔍 Available brands:", brandsData);
                      
                      const existingBrand = brandsData.find(brand => 
                        brand.brand.toLowerCase() === newProductForm.brand_search.toLowerCase()
                      );
                      
                      console.log("🔍 Existing brand found:", existingBrand);
                      
                      if (!existingBrand) {
                        e.preventDefault();
                        console.log("🆕 Auto-creating brand on Enter:", newProductForm.brand_search);
                        try {
                          const brandResponse = await handleApiCall("add_brand", {
                            brand_name: newProductForm.brand_search
                          });
                          
                          console.log("📡 Brand API Response:", brandResponse);
                          
                          if (brandResponse.success) {
                            const newBrandId = brandResponse.brand_id;
                            console.log("✅ New brand created with ID:", newBrandId);
                            handleNewProductInputChange("brand_id", newBrandId);
                            safeToast("success", `Brand "${newProductForm.brand_search}" created successfully!`);
                            
                            // Reload brands data to include the new brand
                            await loadData("brands");
                          } else {
                            console.error("❌ Failed to create brand:", brandResponse.message);
                            safeToast("error", `Failed to create brand "${newProductForm.brand_search}": ${brandResponse.message}`);
                          }
                        } catch (error) {
                          console.error("❌ Error creating brand:", error);
                          safeToast("error", `Error creating brand "${newProductForm.brand_search}": ${error.message}`);
                        }
                      } else {
                        console.log("ℹ️ Brand already exists:", existingBrand);
                      }
                    }
                  }}
                  onBlur={async () => {
                    // Create brand when user clicks away and brand doesn't exist
                    if (newProductForm.brand_search && newProductForm.brand_search.trim()) {
                      console.log("🔍 Blur event, checking brand:", newProductForm.brand_search);
                      console.log("🔍 Current brand_id:", newProductForm.brand_id);
                      
                      const existingBrand = brandsData.find(brand => 
                        brand.brand.toLowerCase() === newProductForm.brand_search.toLowerCase()
                      );
                      
                      console.log("🔍 Existing brand found:", existingBrand);
                      
                      if (!existingBrand && !newProductForm.brand_id) {
                        console.log("🆕 Auto-creating brand on blur:", newProductForm.brand_search);
                        try {
                          const brandResponse = await handleApiCall("add_brand", {
                            brand_name: newProductForm.brand_search
                          });
                          
                          console.log("📡 Brand API Response:", brandResponse);
                          
                          if (brandResponse.success) {
                            const newBrandId = brandResponse.brand_id;
                            console.log("✅ New brand created with ID:", newBrandId);
                            handleNewProductInputChange("brand_id", newBrandId);
                            safeToast("success", `Brand "${newProductForm.brand_search}" created successfully!`);
                            
                            // Reload brands data to include the new brand
                            await loadData("brands");
                          } else {
                            console.error("❌ Failed to create brand:", brandResponse.message);
                            safeToast("error", `Failed to create brand "${newProductForm.brand_search}": ${brandResponse.message}`);
                          }
                        } catch (error) {
                          console.error("❌ Error creating brand:", error);
                          safeToast("error", `Error creating brand "${newProductForm.brand_search}": ${error.message}`);
                        }
                      } else {
                        console.log("ℹ️ Brand already exists or brand_id already set:", existingBrand, newProductForm.brand_id);
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                  style={{ 
                    borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                    backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                    color: isDarkMode ? '#f8fafc' : '#0f172a',
                    focusRingColor: '#3b82f6'
                  }}
                />
                {/* Suggestions dropdown */}
                {newProductForm.brand_search && (
                  <div className="absolute z-10 w-full mt-1 rounded-md shadow-lg max-h-40 overflow-y-auto" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, border: `1px solid ${theme.border.default}` }}>
                    {/* Show existing brand suggestions */}
                    {brandsData
                      .filter(brand => 
                        brand.brand.toLowerCase().includes(newProductForm.brand_search.toLowerCase())
                      )
                      .map((brand) => (
                        <div
                          key={brand.brand_id}
                          className="px-3 py-2 cursor-pointer"
                          style={{ 
                            color: isDarkMode ? '#f8fafc' : '#0f172a',
                            ':hover': { backgroundColor: theme.bg.hover }
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bg.hover}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          onClick={() => {
                            console.log("🖱️ Brand suggestion clicked:", brand);
                            handleNewProductInputChange("brand_search", brand.brand);
                            handleNewProductInputChange("brand_id", brand.brand_id);
                          }}
                        >
                          {brand.brand}
                        </div>
                      ))}
                    {/* Show option to create new brand if no exact match */}
                    {!brandsData.find(brand => 
                      brand.brand.toLowerCase() === newProductForm.brand_search.toLowerCase()
                    ) && newProductForm.brand_search.trim() && (
                      <div
                        className="px-3 py-2 cursor-pointer border-t"
                        style={{ 
                          color: isDarkMode ? '#f8fafc' : '#0f172a',
                          backgroundColor: theme.colors.success + '20',
                          borderColor: theme.border.default
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.colors.success + '30'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = theme.colors.success + '20'}
                        onClick={async () => {
                          console.log("🆕 Creating new brand:", newProductForm.brand_search);
                          try {
                            const brandResponse = await handleApiCall("add_brand", {
                              brand_name: newProductForm.brand_search
                            });
                            
                            if (brandResponse.success) {
                              const newBrandId = brandResponse.brand_id;
                              console.log("✅ New brand created with ID:", newBrandId);
                              handleNewProductInputChange("brand_id", newBrandId);
                              safeToast("success", `Brand "${newProductForm.brand_search}" created successfully!`);
                              
                              // Reload brands data to include the new brand
                              await loadData("brands");
                            } else {
                              console.error("❌ Failed to create brand:", brandResponse.message);
                              safeToast("error", `Failed to create brand "${newProductForm.brand_search}": ${brandResponse.message}`);
                            }
                          } catch (error) {
                            console.error("❌ Error creating brand:", error);
                            safeToast("error", `Error creating brand "${newProductForm.brand_search}": ${error.message}`);
                          }
                        }}
                      >
                        ➕ Create new brand: "{newProductForm.brand_search}"
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs mt-1" style={{ color: theme.text.muted }}>
                Type brand name - new brands are created automatically after 1 second of no typing.
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Supplier</label>
              <select
                value={newProductForm.supplier_id || ""}
                onChange={(e) => handleNewProductInputChange("supplier_id", e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                  backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                  color: isDarkMode ? '#f8fafc' : '#0f172a',
                  focusRingColor: '#3b82f6'
                }}
              >
                <option value="">Select Supplier</option>
                {suppliersData.map((supplier) => (
                  <option key={supplier.supplier_id} value={supplier.supplier_id}>
                    {supplier.supplier_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Expiration Date</label>
              <input
                type="date"
                value={newProductForm.expiration || ""}
                onChange={(e) => {
                  const selectedDate = e.target.value;
                  // Validate that the date is not in the past
                  if (selectedDate && new Date(selectedDate) < new Date()) {
                    safeToast("warning", "Expiration date cannot be in the past. Please select a future date.");
                    return;
                  }
                  handleNewProductInputChange("expiration", selectedDate);
                }}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                  backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                  color: isDarkMode ? '#f8fafc' : '#0f172a',
                  focusRingColor: '#3b82f6'
                }}
              />
              <p className="text-xs mt-1" style={{ color: theme.text.muted }}>
                Required for proper FIFO inventory tracking
              </p>
              {newProductForm.expiration && (
                <p className="text-xs mt-1" style={{ color: theme.colors.accent }}>
                  Expires: {new Date(newProductForm.expiration).toLocaleDateString()}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Batch Reference</label>
              <input
                type="text"
                value={newProductForm.batch || ""}
                onChange={(e) => {
                  handleNewProductInputChange("batch", e.target.value);
                  setCurrentBatchNumber(e.target.value); // Update current batch number
                }}
                placeholder="Auto-generated batch reference"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                  backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                  color: isDarkMode ? '#f8fafc' : '#0f172a',
                  focusRingColor: '#3b82f6'
                }}
              />
              <p className="text-xs mt-1" style={{ color: theme.text.muted }}>
                Auto-generated batch reference - you can edit if needed
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Order Number</label>
              <input
                type="text"
                value={newProductForm.order_number || ""}
                onChange={(e) => handleNewProductInputChange("order_number", e.target.value)}
                placeholder="Enter order number"
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                  backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                  color: isDarkMode ? '#f8fafc' : '#0f172a',
                  focusRingColor: '#3b82f6'
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Added</label>
              <input
                type="date"
                value={newProductForm.date_added || ""}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-700 cursor-not-allowed"
              />
              <p className="text-xs text-gray-500 mt-1">Automatically set to current date</p>
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium mb-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Description</label>
              <textarea
                rows={3}
                value={newProductForm.description || ""}
                onChange={(e) => handleNewProductInputChange("description", e.target.value)}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                  backgroundColor: isDarkMode ? '#334155' : '#ffffff',
                  color: isDarkMode ? '#f8fafc' : '#0f172a',
                  focusRingColor: '#3b82f6'
                }}
              />
            </div>
            <div className="md:col-span-3">
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="newPrescription"
                    checked={newProductForm.prescription === 1}
                    onChange={(e) => handleNewProductInputChange("prescription", e.target.checked ? 1 : 0)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="newPrescription" className="text-sm font-medium text-gray-700">
                    Prescription Required
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="newBulk"
                    checked={newProductForm.bulk === 1}
                    onChange={(e) => handleNewProductInputChange("bulk", e.target.checked ? 1 : 0)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="newBulk" className="text-sm font-medium text-gray-700">
                    Bulk Product
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Section */}
          {newProductForm.product_type && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-900 mb-3">Product Summary</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-3 rounded border border-blue-200">
                  <h5 className="text-xs font-medium text-blue-800 mb-2">Bulk Units (for Reports & Inventory)</h5>
                  <p className="text-sm text-blue-700">
                    {newProductForm.product_type === "Medicine" 
                      ? `${newProductForm.boxes || 0} boxes`
                      : `${newProductForm.boxes || 0} boxes`
                    }
                  </p>
                </div>
                <div className="bg-white p-3 rounded border border-blue-200">
                  <h5 className="text-xs font-medium text-blue-800 mb-2">Total Pieces (for Internal & POS)</h5>
                  <p className="text-sm text-blue-700">
                    {newProductForm.product_type === "Medicine" 
                      ? `${newProductForm.total_tablets || 0} tablets`
                      : `${newProductForm.total_pieces || 0} pieces`
                    }
                  </p>
                </div>
              </div>
              <div className="mt-3 text-xs text-blue-600">
                <strong>Note:</strong> Reports and inventory display bulk units. Total pieces are used for internal calculations and POS operations.
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-6">
            <div className="flex items-center space-x-2">
              {temporaryProducts.length > 0 && (
                <span className="text-sm text-gray-600">
                  {temporaryProducts.length} product(s) in batch
                </span>
              )}
              {updateStockProducts.length > 0 && (
                <span className="text-sm text-blue-600">
                  {updateStockProducts.length} product(s) in update stock batch
                </span>
              )}
            </div>
            <div className="flex space-x-4">
              {temporaryProducts.length > 0 && (
                <button
                  type="button"
                  onClick={openBatchEntryModal}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-md flex items-center"
                >
                  <Package className="h-4 w-4 mr-2" />
                  View Batch ({temporaryProducts.length})
                </button>
              )}
              {updateStockProducts.length > 0 && (
                <button
                  type="button"
                  onClick={openUpdateStockBatchModal}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center"
                >
                  <Package className="h-4 w-4 mr-2" />
                  View Update Stock Batch ({updateStockProducts.length})
                </button>
              )}
              <button
                type="button"
                onClick={closeNewProductModal}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || (() => {
                  // Basic required fields
                  if (!newProductForm.product_name || !newProductForm.category || !newProductForm.product_type || !newProductForm.srp) {
                    return true;
                  }
                  
                  // Product type specific validation
                  if (newProductForm.product_type === "Medicine") {
                    if (newProductForm.configMode === "bulk") {
                      return (!newProductForm.boxes || !newProductForm.strips_per_box || !newProductForm.tablets_per_strip);
                    } else if (newProductForm.configMode === "pieces") {
                      return !newProductForm.total_tablets;
                    }
                  } else if (newProductForm.product_type === "Non-Medicine") {
                    if (newProductForm.configMode === "bulk") {
                      return (!newProductForm.boxes || !newProductForm.pieces_per_pack);
                    } else if (newProductForm.configMode === "pieces") {
                      return !newProductForm.total_pieces;
                    }
                  }
                  
                  return true; // Disable if no product type selected
                })()}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50"
                title={(() => {
                  if (!newProductForm.product_name) return "Please enter product name";
                  if (!newProductForm.category) return "Please select category";
                  if (!newProductForm.product_type) return "Please select product type";
                  if (!newProductForm.srp) return "Please enter SRP";
                  
                  if (newProductForm.product_type === "Medicine") {
                    if (newProductForm.configMode === "bulk") {
                      if (!newProductForm.boxes) return "Please enter number of boxes";
                      if (!newProductForm.strips_per_box) return "Please enter strips per box";
                      if (!newProductForm.tablets_per_strip) return "Please enter tablets per strip";
                    } else if (newProductForm.configMode === "pieces") {
                      if (!newProductForm.total_tablets) return "Please enter total tablets";
                    }
                  } else if (newProductForm.product_type === "Non-Medicine") {
                    if (newProductForm.configMode === "bulk") {
                      if (!newProductForm.boxes) return "Please enter number of boxes";
                      if (!newProductForm.pieces_per_pack) return "Please enter pieces per box";
                    } else if (newProductForm.configMode === "pieces") {
                      if (!newProductForm.total_pieces) return "Please enter total pieces";
                    }
                  }
                  
                  return "Fill in all required fields to enable button";
                })()}
              >
                {loading ? "Adding..." : "Add to Batch"}
              </button>
            </div>
          </div>
        </form>
          </div>
        </div>
      </div>
    
  )}
  
  
  
        {showFifoModal && selectedProductForFifo && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: theme.bg.card, boxShadow: `0 25px 50px ${theme.shadow}` }}>
              <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: theme.border.default }}>
                <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                  FIFO Stock Details - {selectedProductForFifo.product_name}
                </h3>
                <button onClick={closeFifoModal} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                <div className="mb-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="p-4 rounded-lg" style={{ backgroundColor: theme.colors.info + '20', borderColor: theme.colors.info + '40', border: '1px solid' }}>
                      <h4 className="font-semibold mb-2" style={{ color: theme.colors.info }}>Product Info</h4>
                      <p className="text-sm" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Barcode: {selectedProductForFifo.barcode}</p>
                      <p className="text-sm" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Category: {selectedProductForFifo.category}</p>
                      <p className="text-sm" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Total Stock: {selectedProductForFifo.quantity}</p>
                    </div>
                    <div className="p-4 rounded-lg" style={{ backgroundColor: theme.colors.success + '20', borderColor: theme.colors.success + '40', border: '1px solid' }}>
                      <h4 className="font-semibold mb-2" style={{ color: theme.colors.success }}>Stock Status</h4>
                      <p className="text-sm" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Status: {getStockStatus(selectedProductForFifo.quantity)}</p>
                      <p className="text-sm" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>SRP: ₱{Number.parseFloat(selectedProductForFifo?.srp || selectedProductForFifo?.unit_price || 0).toFixed(2)}</p>
                    </div>
                    <div className="p-4 rounded-lg" style={{ backgroundColor: theme.colors.warning + '20', borderColor: theme.colors.warning + '40', border: '1px solid' }}>
                      <h4 className="font-semibold mb-2" style={{ color: theme.colors.warning }}>FIFO Summary</h4>
                      <p className="text-sm" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Batches: {fifoStockData.length}</p>
                      <p className="text-sm" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Available: {fifoStockData.reduce((sum, batch) => sum + parseInt(batch.available_quantity || 0), 0)}</p>
                      <p className="text-sm" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Total Value: ₱{fifoStockData.reduce((sum, batch) => sum + (Number.parseFloat(batch.unit_cost || 0) * Number.parseFloat(batch.available_quantity || 0)), 0).toFixed(2)}</p>
                      <p className="text-sm" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Oldest Batch: {fifoStockData.length > 0 ? new Date(fifoStockData[0].batch_date || fifoStockData[0].entry_date).toLocaleDateString() : 'N/A'}</p>
                      <p className="text-sm" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Newest Batch: {fifoStockData.length > 0 ? new Date(fifoStockData[fifoStockData.length - 1].batch_date || fifoStockData[fifoStockData.length - 1].entry_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse" style={{ color: theme.text.primary, borderColor: theme.border.default, border: `1px solid` }}>
                    <thead>
                      <tr style={{ backgroundColor: theme.bg.secondary }}>
                        <th className="px-3 py-2 text-left text-sm font-semibold" style={{ borderColor: theme.border.default, border: `1px solid`, color: theme.text.secondary }}>FIFO Order</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold" style={{ borderColor: theme.border.default, border: `1px solid`, color: theme.text.secondary }}>Batch Number</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold" style={{ borderColor: theme.border.default, border: `1px solid`, color: theme.text.secondary }}>Batch Reference</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold" style={{ borderColor: theme.border.default, border: `1px solid`, color: theme.text.secondary }}>Available Qty</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold" style={{ borderColor: theme.border.default, border: `1px solid`, color: theme.text.secondary }}>Unit Cost</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold" style={{ borderColor: theme.border.default, border: `1px solid`, color: theme.text.secondary }}>SRP</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold" style={{ borderColor: theme.border.default, border: `1px solid`, color: theme.text.secondary }}>Total Value</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold" style={{ borderColor: theme.border.default, border: `1px solid`, color: theme.text.secondary }}>Expiration Date</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold" style={{ borderColor: theme.border.default, border: `1px solid`, color: theme.text.secondary }}>Days Until Expiry</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold" style={{ borderColor: theme.border.default, border: `1px solid`, color: theme.text.secondary }}>Date Added</th>
                        <th className="px-3 py-2 text-left text-sm font-semibold" style={{ borderColor: theme.border.default, border: `1px solid`, color: theme.text.secondary }}>Time Added</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fifoStockData.map((batch, index) => (
                        <tr key={batch.summary_id} style={{ backgroundColor: theme.bg.card }} onMouseEnter={(e) => e.target.style.backgroundColor = theme.bg.hover} onMouseLeave={(e) => e.target.style.backgroundColor = theme.bg.card}>
                          <td className="px-3 py-2 text-center font-medium" style={{ borderColor: theme.border.default, border: `1px solid`, color: theme.text.primary }}>
                            #{index + 1}
                          </td>
                          <td className="px-3 py-2 font-mono text-sm" style={{ borderColor: theme.border.default, border: `1px solid`, color: theme.text.primary }}>
                            {batch.batch_number || batch.batch_id}
                          </td>
                          <td className="px-3 py-2 font-mono text-xs" style={{ borderColor: theme.border.default, border: `1px solid`, color: theme.text.primary }}>
                            {batch.batch_reference || 'N/A'}
                          </td>
                          <td className="px-3 py-2 text-center" style={{ borderColor: theme.border.default, border: `1px solid` }}>
                            <span className="inline-block px-2 py-1 text-xs font-medium rounded-full" style={{
                              backgroundColor: batch.available_quantity <= 0 ? theme.colors.danger + '20' :
                                             batch.available_quantity <= 10 ? theme.colors.warning + '20' :
                                             theme.colors.success + '20',
                              color: batch.available_quantity <= 0 ? theme.colors.danger :
                                     batch.available_quantity <= 10 ? theme.colors.warning :
                                     theme.colors.success
                            }}>
                              {batch.available_quantity}
                            </span>
                          </td>
                          <td className="px-3 py-2" style={{ borderColor: theme.border.default, border: `1px solid`, color: theme.text.primary }}>
                            ₱{Number.parseFloat(batch.unit_cost || 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2" style={{ borderColor: theme.border.default, border: `1px solid`, color: theme.text.primary }}>
                            {batch?.srp && batch.srp > 0 ? `₱${Number.parseFloat(batch.srp).toFixed(2)}` : 'N/A'}
                          </td>
                          <td className="px-3 py-2 font-medium" style={{ borderColor: theme.border.default, border: `1px solid`, color: theme.text.primary }}>
                            ₱{(Number.parseFloat(batch.unit_cost || 0) * Number.parseFloat(batch.available_quantity || 0)).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-center" style={{ borderColor: theme.border.default, border: `1px solid`, color: theme.text.primary }}>
                            {batch.expiration_date ? new Date(batch.expiration_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-3 py-2 text-center" style={{ borderColor: theme.border.default, border: `1px solid` }}>
                            {batch.days_until_expiry !== null ? (
                              (() => {
                                const expiryStatus = getExpiryStatus(batch.expiration_date);
                                return (
                                  <span className="inline-block px-2 py-1 text-xs font-medium rounded-full" style={{
                                    backgroundColor: expiryStatus.status === 'expired' ? theme.colors.danger + '20' :
                                                   expiryStatus.status === 'critical' ? theme.colors.danger + '20' :
                                                   expiryStatus.status === 'warning' ? theme.colors.warning + '20' :
                                                   expiryStatus.status === 'good' ? theme.colors.success + '20' :
                                                   theme.bg.secondary,
                                    color: expiryStatus.status === 'expired' ? theme.colors.danger :
                                           expiryStatus.status === 'critical' ? theme.colors.danger :
                                           expiryStatus.status === 'warning' ? theme.colors.warning :
                                           expiryStatus.status === 'good' ? theme.colors.success :
                                           theme.text.secondary
                                  }}>
                                    {expiryStatus.status === 'expired' ? `Expired ${expiryStatus.days}d ago` : `${expiryStatus.days} days`}
                                    {expiryStatus.status === 'warning' && (
                                      <span className="ml-1 text-xs">⚠️</span>
                                    )}
                                    {expiryStatus.status === 'critical' && (
                                      <span className="ml-1 text-xs">🚨</span>
                                    )}
                                  </span>
                                );
                              })()
                            ) : (
                              <span style={{ color: theme.text.muted }}>N/A</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center text-sm" style={{ borderColor: theme.border.default, border: `1px solid`, color: theme.text.primary }}>
                            {batch.batch_date ? new Date(batch.batch_date).toLocaleDateString() : 'N/A'}
                          </td>
                          <td className="px-3 py-2 text-center text-sm" style={{ borderColor: theme.border.default, border: `1px solid`, color: theme.text.primary }}>
                            {batch.batch_time ? batch.batch_time : 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {fifoStockData.length === 0 && (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No FIFO stock data available for this product.</p>
                    <p className="text-sm text-gray-400 mt-2">This product may not have batch tracking enabled.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

     
        {showQuantityHistoryModal && selectedProductForHistory && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="backdrop-blur-md rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border" 
                 style={{ 
                   backgroundColor: theme.bg.card, 
                   borderColor: theme.border.default 
                 }}>
              <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: theme.border.default }}>
                <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                  Batch Details - {selectedProductForHistory.product_name}
                </h3>
                <div className="flex items-center gap-2">
                  <button onClick={closeQuantityHistoryModal} 
                          style={{ color: theme.text.muted }}
                          onMouseEnter={(e) => e.target.style.color = theme.text.secondary}
                          onMouseLeave={(e) => e.target.style.color = theme.text.muted}>
                    <X className="h-6 w-6" />
                  </button>
                </div>
              </div>

              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="p-4 rounded-lg border" 
                       style={{ 
                         backgroundColor: theme.colors.info + '20', 
                         borderColor: theme.colors.info + '40' 
                       }}>
                    <h4 className="font-semibold" style={{ color: theme.colors.info }}>Product Info</h4>
                    <p className="text-sm" style={{ color: theme.text.primary }}>Name: {selectedProductForHistory.product_name}</p>
                    <p className="text-sm" style={{ color: theme.text.primary }}>Category: {selectedProductForHistory.category}</p>
                    <p className="text-sm" style={{ color: theme.text.primary }}>
                      Current Stock: {
                        fifoStockData && fifoStockData.length > 0 
                          ? fifoStockData.reduce((sum, batch) => sum + (batch.available_quantity || 0), 0)
                          : selectedProductForHistory.quantity || 0
                      }
                    </p>
                  </div>
                  <div className="p-4 rounded-lg border" 
                       style={{ 
                         backgroundColor: theme.colors.success + '20', 
                         borderColor: theme.colors.success + '40' 
                       }}>
                    <h4 className="font-semibold" style={{ color: theme.colors.success }}>Stock Status</h4>
                    <p className="text-sm" style={{ color: theme.text.primary }}>
                      Status: {
                        (() => {
                          const currentStock = fifoStockData && fifoStockData.length > 0 
                            ? fifoStockData.reduce((sum, batch) => sum + (batch.available_quantity || 0), 0)
                            : selectedProductForHistory.quantity || 0;
                          
                          if (currentStock <= 0) return 'out of stock';
                          if (currentStock <= 10) return 'low stock';
                          return 'in stock';
                        })()
                      }
                    </p>
                    <p className="text-sm" style={{ color: theme.text.primary }}>SRP: ₱{Number.parseFloat(selectedProductForHistory?.srp || 0).toFixed(2)}</p>
                  </div>
                  <div className="p-4 rounded-lg border" 
                       style={{ 
                         backgroundColor: theme.colors.accent + '20', 
                         borderColor: theme.colors.accent + '40' 
                       }}>
                    <h4 className="font-semibold" style={{ color: theme.colors.accent }}>History Summary</h4>
                    <p className="text-sm" style={{ color: theme.text.primary }}>Total Movements: {quantityHistoryData.length}</p>
                    <p className="text-sm" style={{ color: theme.text.primary }}>Last Updated: {quantityHistoryData.length > 0 ? new Date(quantityHistoryData[0].movement_date).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <div className="p-4 rounded-lg border" 
                       style={{ 
                         backgroundColor: theme.colors.warning + '20', 
                         borderColor: theme.colors.warning + '40' 
                       }}>
                    <h4 className="font-semibold" style={{ color: theme.colors.warning }}>FIFO Batches</h4>
                    <p className="text-sm" style={{ color: theme.text.primary }}>
                      Active Batches: {
                        fifoStockData && fifoStockData.length > 0 
                          ? fifoStockData.filter(batch => (batch.available_quantity || 0) > 0).length
                          : 0
                      }
                    </p>
                    <p className="text-sm" style={{ color: theme.text.primary }}>
                      Total Available: {
                        fifoStockData && fifoStockData.length > 0 
                          ? fifoStockData.reduce((sum, batch) => sum + (batch.available_quantity || 0), 0)
                          : 0
                      } units
                    </p>
                  </div>
                </div>


                {/* Always show Current FIFO Batches */}
                {false ? (
                  // Quantity History Table
                  <div>
                    <h4 className="font-semibold mb-3" style={{ color: theme.text.primary }}>Quantity History</h4>
                    <div className="overflow-x-auto">
                    <table className="w-full border-collapse border" 
                           style={{ 
                             color: isDarkMode ? '#f8fafc' : '#0f172a',
                             borderColor: theme.border.default 
                           }}>
                      <thead>
                        <tr style={{ backgroundColor: theme.bg.hover }}>
                          <th className="border px-3 py-2 text-left text-sm font-semibold" 
                              style={{ 
                                borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                color: isDarkMode ? '#f8fafc' : '#0f172a' 
                              }}>Batch Reference</th>
                          <th className="border px-3 py-2 text-left text-sm font-semibold" 
                              style={{ 
                                borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                color: isDarkMode ? '#f8fafc' : '#0f172a' 
                              }}>Expiry Date</th>
                          <th className="border px-3 py-2 text-left text-sm font-semibold" 
                              style={{ 
                                borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                color: isDarkMode ? '#f8fafc' : '#0f172a' 
                              }}>Type</th>
                          <th className="border px-3 py-2 text-left text-sm font-semibold" 
                              style={{ 
                                borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                color: isDarkMode ? '#f8fafc' : '#0f172a' 
                              }}>Quantity Change</th>
                          <th className="border px-3 py-2 text-left text-sm font-semibold" 
                              style={{ 
                                borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                color: isDarkMode ? '#f8fafc' : '#0f172a' 
                              }}>Remaining Qty</th>
                          <th className="border px-3 py-2 text-left text-sm font-semibold" 
                              style={{ 
                                borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                color: isDarkMode ? '#f8fafc' : '#0f172a' 
                              }}>SRP</th>
                          <th className="border px-3 py-2 text-left text-sm font-semibold" 
                              style={{ 
                                borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                color: isDarkMode ? '#f8fafc' : '#0f172a' 
                              }}>Batch Reference</th>
                          <th className="border px-3 py-2 text-left text-sm font-semibold" 
                              style={{ 
                                borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                color: isDarkMode ? '#f8fafc' : '#0f172a' 
                              }}>Notes</th>
                          <th className="border px-3 py-2 text-left text-sm font-semibold" 
                              style={{ 
                                borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                color: isDarkMode ? '#f8fafc' : '#0f172a' 
                              }}>Created By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quantityHistoryData.map((movement, index) => (
                          <tr key={movement.movement_id} 
                              style={{ 
                                backgroundColor: index % 2 === 0 ? 'transparent' : theme.bg.hover + '30'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = theme.bg.hover + '50'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'transparent' : theme.bg.hover + '30'}>
                            <td className="border px-3 py-2 text-sm font-mono text-blue-600" 
                                style={{ 
                                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                  color: isDarkMode ? '#f8fafc' : '#0f172a' 
                                }}>
                              {index + 1}
                            </td>
                            <td className="border px-3 py-2 text-sm" 
                                style={{ 
                                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                  color: movement.expiration_date ? 
                                    (isProductExpired(movement.expiration_date) ? theme.colors.danger :
                                     isProductExpiringSoon(movement.expiration_date) ? theme.colors.warning :
                                     theme.text.primary) : theme.text.primary
                                }}>
                              {movement.expiration_date ? new Date(movement.expiration_date).toLocaleDateString() : 'N/A'}
                            </td>
                            <td className="border px-3 py-2 text-center" 
                                style={{ borderColor: theme.border.default }}>
                              <span className="inline-block px-2 py-1 text-xs font-medium rounded-full"
                                    style={{
                                      backgroundColor: movement.movement_type === 'IN' ? theme.colors.success + '20' : theme.colors.danger + '20',
                                      color: movement.movement_type === 'IN' ? theme.colors.success : theme.colors.danger
                                    }}>
                                {movement.movement_type}
                              </span>
                            </td>
                            <td className="border px-3 py-2 text-center" 
                                style={{ borderColor: theme.border.default }}>
                              <span className="font-medium"
                                    style={{
                                      color: movement.quantity_change > 0 ? theme.colors.success : theme.colors.danger
                                    }}>
                                {movement.quantity_change > 0 ? '+' : ''}{movement.quantity_change}
                              </span>
                            </td>
                            <td className="border px-3 py-2 text-center font-medium" 
                                style={{ 
                                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                  color: isDarkMode ? '#f8fafc' : '#0f172a' 
                                }}>
                              {movement.remaining_quantity}
                            </td>
                            <td className="border px-3 py-2" 
                                style={{ 
                                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                  color: isDarkMode ? '#f8fafc' : '#0f172a' 
                                }}>
                              ₱{Number.parseFloat(batch?.fifo_srp || batch?.srp || batch?.unit_cost || 0).toFixed(2)}
                            </td>
                            <td className="border px-3 py-2 font-mono text-sm" 
                                style={{ 
                                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                  color: isDarkMode ? '#f8fafc' : '#0f172a' 
                                }}>
                              {movement.batch_reference || movement.reference_no || 'N/A'}
                            </td>
                            <td className="border px-3 py-2 text-sm" 
                                style={{ 
                                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                  color: isDarkMode ? '#cbd5e1' : '#475569' 
                                }}>
                              {movement.notes || 'N/A'}
                            </td>
                            <td className="border px-3 py-2 text-sm" 
                                style={{ 
                                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                  color: isDarkMode ? '#f8fafc' : '#0f172a' 
                                }}>
                              {movement.created_by || 'System'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  </div>
                ) : (
                  // Current FIFO Batches Table
                  <div>
                    <h4 className="font-semibold mb-3" style={{ color: theme.text.primary }}>Current FIFO Batches</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border" 
                             style={{ 
                               color: isDarkMode ? '#f8fafc' : '#0f172a',
                               borderColor: theme.border.default 
                             }}>
                        <thead>
                          <tr style={{ backgroundColor: theme.bg.hover }}>
                            <th className="border px-3 py-2 text-left text-sm font-semibold" 
                                style={{ 
                                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                  color: isDarkMode ? '#f8fafc' : '#0f172a' 
                                }}>Batch Number</th>
                            <th className="border px-3 py-2 text-left text-sm font-semibold" 
                                style={{ 
                                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                  color: isDarkMode ? '#f8fafc' : '#0f172a' 
                                }}>Date Added</th>
                            <th className="border px-3 py-2 text-left text-sm font-semibold" 
                                style={{ 
                                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                  color: isDarkMode ? '#f8fafc' : '#0f172a' 
                                }}>Expiry Date</th>
                            <th className="border px-3 py-2 text-left text-sm font-semibold" 
                                style={{ 
                                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                  color: isDarkMode ? '#f8fafc' : '#0f172a' 
                                }}>Type</th>
                            <th className="border px-3 py-2 text-left text-sm font-semibold" 
                                style={{ 
                                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                  color: isDarkMode ? '#f8fafc' : '#0f172a' 
                                }}>Quantity Change</th>
                            <th className="border px-3 py-2 text-left text-sm font-semibold" 
                                style={{ 
                                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                  color: isDarkMode ? '#f8fafc' : '#0f172a' 
                                }}>Remaining Qty</th>
                            <th className="border px-3 py-2 text-left text-sm font-semibold" 
                                style={{ 
                                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                  color: isDarkMode ? '#f8fafc' : '#0f172a' 
                                }}>SRP</th>
                            <th className="border px-3 py-2 text-left text-sm font-semibold" 
                                style={{ 
                                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                  color: isDarkMode ? '#f8fafc' : '#0f172a' 
                                }}>Batch Reference</th>
                            <th className="border px-3 py-2 text-left text-sm font-semibold" 
                                style={{ 
                                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                  color: isDarkMode ? '#f8fafc' : '#0f172a' 
                                }}>Notes</th>
                            <th className="border px-3 py-2 text-left text-sm font-semibold" 
                                style={{ 
                                  borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                  color: isDarkMode ? '#f8fafc' : '#0f172a' 
                                }}>Created By</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fifoStockData && fifoStockData.length > 0 ? (
                            fifoStockData.map((batch, index) => (
                              <tr key={batch.fifo_id || index} 
                                  style={{ 
                                    backgroundColor: index % 2 === 0 ? 'transparent' : theme.bg.hover + '30'
                                  }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = theme.bg.hover + '50'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = index % 2 === 0 ? 'transparent' : theme.bg.hover + '30'}>
                                <td className="border px-3 py-2 text-sm font-mono text-blue-600" 
                                    style={{ 
                                      borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                      color: isDarkMode ? '#f8fafc' : '#0f172a' 
                                    }}>
                                  {index + 1}
                                </td>
                                <td className="border px-3 py-2 text-sm" 
                                    style={{ 
                                      borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                      color: isDarkMode ? '#f8fafc' : '#0f172a' 
                                    }}>
                                  {batch.fifo_entry_date ? new Date(batch.fifo_entry_date).toLocaleDateString() : 
                                   batch.batch_date ? new Date(batch.batch_date).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="border px-3 py-2 text-sm" 
                                    style={{ 
                                      borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                      color: batch.expiration_date ? 
                                        (isProductExpired(batch.expiration_date) ? theme.colors.danger :
                                         isProductExpiringSoon(batch.expiration_date) ? theme.colors.warning :
                                         theme.text.primary) : theme.text.primary
                                    }}>
                                  {batch.expiration_date ? new Date(batch.expiration_date).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="border px-3 py-2 text-center" 
                                    style={{ borderColor: theme.border.default }}>
                                  <span className="inline-block px-2 py-1 text-xs font-medium rounded-full"
                                        style={{
                                          backgroundColor: theme.colors.info + '20',
                                          color: theme.colors.info
                                        }}>
                                    FIFO
                                  </span>
                                </td>
                                <td className="border px-3 py-2 text-center" 
                                    style={{ borderColor: theme.border.default }}>
                                  <span className="font-medium"
                                        style={{ color: theme.colors.info }}>
                                    {batch.available_quantity > 0 ? `+${batch.available_quantity}` : '0'}
                                  </span>
                                </td>
                                <td className="border px-3 py-2 text-center font-medium" 
                                    style={{ 
                                      borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                      color: isDarkMode ? '#f8fafc' : '#0f172a' 
                                    }}>
                                  {batch.available_quantity || 0}
                                </td>
                                <td className="border px-3 py-2" 
                                    style={{ 
                                      borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                      color: isDarkMode ? '#f8fafc' : '#0f172a' 
                                    }}>
                                  ₱{Number.parseFloat(batch?.fifo_srp || batch?.srp || batch?.unit_cost || 0).toFixed(2)}
                                </td>
                                <td className="border px-3 py-2 font-mono text-sm" 
                                    style={{ 
                                      borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                      color: isDarkMode ? '#f8fafc' : '#0f172a' 
                                    }}>
                                  {batch.batch_reference || 'N/A'}
                                </td>
                                <td className="border px-3 py-2 text-sm" 
                                    style={{ 
                                      borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                      color: isDarkMode ? '#cbd5e1' : '#475569' 
                                    }}>
                                  {batch.available_quantity > 0 ? 'Active FIFO batch' : 'Consumed FIFO batch'}
                                </td>
                                <td className="border px-3 py-2 text-sm" 
                                    style={{ 
                                      borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                      color: isDarkMode ? '#f8fafc' : '#0f172a' 
                                    }}>
                                  {batch.entry_by || 'System'}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan="8" className="border px-3 py-2 text-center" 
                                  style={{ 
                                    borderColor: isDarkMode ? '#475569' : '#e2e8f0',
                                    color: isDarkMode ? '#cbd5e1' : '#475569' 
                                  }}>
                                No FIFO batches available
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                
                {!showCurrentFifoData && quantityHistoryData.length === 0 && (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto mb-4" style={{ color: theme.text.muted }} />
                    <p style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>No quantity history available for this product.</p>
                    <p className="text-sm mt-2" style={{ color: theme.text.muted }}>Quantity changes will appear here after stock updates.</p>
                  </div>
                )}


              </div>
            </div>
          </div>
        )}

    
        {showBatchEntryModal && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[99999]">
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200/50">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Batch Entry - {temporaryProducts.length} Product(s)
                </h3>
                <button onClick={closeBatchEntryModal} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                {temporaryProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No products in batch yet.</p>
                    <p className="text-sm text-gray-400 mt-2">Add products using the "Add New Product" modal.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-blue-50 rounded-lg">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{temporaryProducts.length}</div>
                          <div className="text-sm text-blue-700">Total Products</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {temporaryProducts.reduce((sum, p) => {
                              const totalPieces = p?.product_type === "Medicine" 
                                ? parseInt(p?.total_tablets || 0)  // Total tablets for medicine
                                : parseInt(p?.total_pieces || 0);  // Total pieces for non-medicine
                              return sum + totalPieces;
                            }, 0)}
                          </div>
                          <div className="text-sm text-green-700">Total Pieces</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {new Set(temporaryProducts.map(p => p?.category).filter(Boolean)).size}
                          </div>
                          <div className="text-sm text-orange-700">Categories</div>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-900">#</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-900">Product Name</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-900">Category</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-900">Brand</th>
                            <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-900">Quantity</th>
                            <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-900">SRP</th>
                            <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-900">Expiration</th>
                            <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-900">Type</th>
                            <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-900">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {temporaryProducts.map((product, index) => (
                            <tr key={product.temp_id} className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-900">
                                {index + 1}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 font-medium text-gray-900">
                                {product?.product_name || "N/A"}
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                  {product?.category || "N/A"}
                                </span>
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-gray-900">
                                {product?.brand_search || product?.brand_id || "N/A"}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-900">
                                {product?.product_type === "Medicine" 
                                  ? `${product?.total_tablets || 0} tablets`
                                  : `${product?.total_pieces || 0} pieces`
                                }
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-center text-gray-900">
                                ₱{parseFloat(product?.srp || 0).toFixed(2)}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-center" 
                                  style={{ 
                                    color: product?.expiration ? 
                                      (isProductExpired(product.expiration) ? theme.colors.danger :
                                       isProductExpiringSoon(product.expiration) ? theme.colors.warning :
                                       theme.text.primary) : theme.text.primary
                                  }}>
                                {product?.expiration ? new Date(product.expiration).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-center">
                                {(() => {
                                  const bulk = Number(product?.bulk || 0);
                                  const prescription = Number(product?.prescription || 0);
                                  if (bulk && prescription) {
                                    return <span className="inline-flex px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Bulk & Rx</span>;
                                  } else if (bulk) {
                                    return <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Bulk</span>;
                                  } else if (prescription) {
                                    return <span className="inline-flex px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Rx</span>;
                                  } else {
                                    return <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">Regular</span>;
                                  }
                                })()}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-center">
                                <button
                                  onClick={() => removeTemporaryProduct(product?.temp_id)}
                                  className="text-red-600 hover:text-red-900 p-1"
                                  title="Remove from batch"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        <p>• Products are stored temporarily until you save the batch</p>
                        <p>• You can add more products or remove existing ones</p>
                        <p>• All products will be saved to database when you click "Save Batch"</p>
                      </div>
                      <div className="flex space-x-4">
                        <button
                          type="button"
                          onClick={closeBatchEntryModal}
                          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Continue Adding
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveBatch}
                          disabled={loading}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50"
                        >
                          {loading ? "Saving..." : `Save Batch (${temporaryProducts.length} products)`}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Update Stock Batch Modal */}
        {showUpdateStockBatchModal && (
          <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[99999]">
            <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-gray-200/50">
              <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Update Stock Batch - {updateStockProducts.length} Product(s)
                  </h3>
                  {updateStockProducts.length > 0 && (
                    <p className="text-sm text-gray-600 mt-1">
                      Batch Reference: <span className="font-mono font-semibold text-blue-600">{updateStockProducts[0]?.batch_reference || "N/A"}</span>
                    </p>
                  )}
                </div>
                <button onClick={closeUpdateStockBatchModal} className="text-gray-400 hover:text-gray-600">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                {updateStockProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No products in update stock batch yet.</p>
                    <p className="text-sm text-gray-400 mt-2">Add products using the "Update Stock" modal.</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-blue-50 rounded-lg">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{updateStockProducts.length}</div>
                          <div className="text-sm text-blue-700">Total Products</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">
                            {updateStockProducts.reduce((sum, p) => sum + parseInt(p?.quantity || 0), 0)}
                          </div>
                          <div className="text-sm text-green-700">Total Pieces</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            ₱{updateStockProducts.reduce((sum, p) => sum + (parseFloat(p?.srp || 0) * parseInt(p?.quantity || 0)), 0).toFixed(2)}
                          </div>
                          <div className="text-sm text-purple-700">Total Value</div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">
                            {new Set(updateStockProducts.map(p => p?.category).filter(Boolean)).size}
                          </div>
                          <div className="text-sm text-orange-700">Categories</div>
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse border border-gray-300">
                        <thead>
                          <tr className="bg-gray-100">
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-900">#</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-900">Product Name</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-900">Category</th>
                            <th className="border border-gray-300 px-3 py-2 text-left text-sm font-semibold text-gray-900">Brand</th>
                            <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-900">Quantity</th>
                            <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-900">SRP</th>
                            <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-900">Total Value</th>
                            <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-900">Expiration</th>
                            <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-900">Type</th>
                            <th className="border border-gray-300 px-3 py-2 text-center text-sm font-semibold text-gray-900">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {updateStockProducts.map((product, index) => (
                            <tr key={product.temp_id} className="hover:bg-gray-50">
                              <td className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-900">
                                {index + 1}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 font-medium text-gray-900">
                                {product?.product_name || "N/A"}
                              </td>
                              <td className="border border-gray-300 px-3 py-2">
                                <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                  {product?.category || "N/A"}
                                </span>
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-gray-900">
                                {product?.brand_search || "N/A"}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-center font-medium text-gray-900">
                                {product?.product_type === "Medicine" 
                                  ? `${product?.quantity || 0} tablets`
                                  : `${product?.quantity || 0} pieces`
                                }
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-center text-gray-900">
                                ₱{parseFloat(product?.srp || 0).toFixed(2)}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-center text-gray-900">
                                ₱{(parseFloat(product?.srp || 0) * parseInt(product?.quantity || 0)).toFixed(2)}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-center" 
                                  style={{ 
                                    color: product?.expiration ? 
                                      (isProductExpired(product.expiration) ? theme.colors.danger :
                                       isProductExpiringSoon(product.expiration) ? theme.colors.warning :
                                       theme.text.primary) : theme.text.primary
                                  }}>
                                {product?.expiration ? new Date(product.expiration).toLocaleDateString() : 'N/A'}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-center">
                                {(() => {
                                  const bulk = Number(product?.bulk || 0);
                                  const prescription = Number(product?.prescription || 0);
                                  if (bulk && prescription) {
                                    return <span className="inline-flex px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Bulk & Rx</span>;
                                  } else if (bulk) {
                                    return <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Bulk</span>;
                                  } else if (prescription) {
                                    return <span className="inline-flex px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Rx</span>;
                                  } else {
                                    return <span className="inline-flex px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">Regular</span>;
                                  }
                                })()}
                              </td>
                              <td className="border border-gray-300 px-3 py-2 text-center">
                                <button
                                  onClick={() => removeUpdateStockProduct(product?.temp_id)}
                                  className="text-red-600 hover:text-red-900 p-1"
                                  title="Remove from batch"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-between items-center mt-6 pt-6 border-t border-gray-200">
                      <div className="text-sm text-gray-600">
                        <p>• Products are stored temporarily until you save the batch</p>
                        <p>• You can add more products or remove existing ones</p>
                        <p>• All products will be updated in database when you click "Save Batch"</p>
                      </div>
                      <div className="flex space-x-4">
                        <button
                          type="button"
                          onClick={closeUpdateStockBatchModal}
                          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                        >
                          Close
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            closeUpdateStockBatchModal();
                            // Reset update stock form for next product
                            setExistingProduct(null);
                            setNewStockQuantity("");
                            setNewStockBoxes("");
                            setNewStockStripsPerBox("");
                            setNewStockTabletsPerStrip("");
                            setNewStockPiecesPerPack("");
                            setNewStockExpiration("");
                            setNewSrp("");
                            setEditSrpEnabled(false);
                            // Keep same batch reference as first product in batch
                            const currentBatchRef = updateStockProducts.length > 0 ? updateStockProducts[0]?.batch_reference : generateBatchRef();
                            setNewStockBatchReference(currentBatchRef);
                            setUseSameBatch(false);
                            setSelectedExistingBatch(null);
                            setExistingBatches([]);
                            setStockUpdateConfigMode("pieces");
                            setShowUpdateStockModal(true);
                          }}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md"
                        >
                          Add More Products
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveUpdateStockBatch}
                          disabled={loading}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50"
                        >
                          {loading ? "Saving..." : `Save Batch (${updateStockProducts.length} products)`}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center py-8">
            <svg className="animate-spin h-8 w-8 text-blue-600" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span className="ml-2 text-blue-600">Loading...</span>
          </div>
        )}
          

                                 {showProductTypeModal && (
                   <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-[99999]">
                     <div className="bg-white/95 backdrop-blur-md rounded-xl shadow-2xl p-6 max-w-7xl w-full mx-4 border border-gray-200/50 max-h-[90vh] overflow-y-auto">
                      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md">
                        <h3 className="text-lg font-semibold text-gray-900">Configure Product Type</h3>
                        <button onClick={closeProductTypeModal} className="text-gray-400 hover:text-gray-600">
                          <X className="h-6 w-6" />
                        </button>
                      </div>

                      <div className="p-6">
                        {/* Product Type Selection */}
                        <div className="mb-6">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Product Type *</label>
                          <select
                            required
                            value={productTypeForm.product_type || ""}
                            onChange={(e) => handleProductTypeInputChange("product_type", e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Select Product Type</option>
                            <option value="Medicine">Medicine</option>
                            <option value="Non-Medicine">Non-Medicine</option>
                          </select>
                        </div>

                        {/* Configuration Mode Selection */}
                        {productTypeForm.product_type && (
                          <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-800 mb-4 flex items-center">
                              ⚙️ Configuration Mode
                            </h4>
                            <div className="flex items-center space-x-6">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="bulkMode"
                                  name="configMode"
                                  value="bulk"
                                  checked={productTypeForm.configMode === "bulk"}
                                  onChange={(e) => handleProductTypeInputChange("configMode", e.target.value)}
                                  className="h-4 w-4 focus:ring-blue-500"
                    style={{ 
                      accentColor: '#3b82f6',
                      borderColor: isDarkMode ? '#475569' : '#d1d5db'
                    }}
                                />
                                <label htmlFor="bulkMode" className="text-sm font-medium text-gray-700">
                                  📦 Bulk Mode (Boxes × Strips/Pieces)
                                </label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <input
                                  type="radio"
                                  id="piecesMode"
                                  name="configMode"
                                  value="pieces"
                                  checked={productTypeForm.configMode === "pieces"}
                                  onChange={(e) => handleProductTypeInputChange("configMode", e.target.value)}
                                  className="h-4 w-4 focus:ring-blue-500"
                    style={{ 
                      accentColor: '#3b82f6',
                      borderColor: isDarkMode ? '#475569' : '#d1d5db'
                    }}
                                />
                                <label htmlFor="piecesMode" className="text-sm font-medium text-gray-700">
                                  🔢 Pieces Mode (Direct Total Input)
                                </label>
                              </div>
                            </div>
                            <p className="text-xs text-gray-600 mt-2">
                              Choose how you want to configure the product quantity
                            </p>
                          </div>
                        )}

                        {/* Medicine Configuration - Bulk Mode */}
                        {productTypeForm.product_type === "Medicine" && productTypeForm.configMode === "bulk" && (
                          <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
                            <h4 className="text-sm font-semibold text-green-800 mb-4 flex items-center">
                              💊 Medicine Configuration (Bulk Mode)
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Boxes *</label>
                                <input
                                  type="number"
                                  required
                                  min="1"
                                  value={productTypeForm.boxes || ""}
                                  onChange={(e) => handleProductTypeInputChange("boxes", e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                  placeholder="Enter number of boxes"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Strips per Box *</label>
                                <input
                                  type="number"
                                  required
                                  min="1"
                                  value={productTypeForm.strips_per_box || ""}
                                  onChange={(e) => handleProductTypeInputChange("strips_per_box", e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                  placeholder="Enter strips per box"
                                />
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tablets per Strip *</label>
                                <input
                                  type="number"
                                  required
                                  min="1"
                                  value={productTypeForm.tablets_per_strip || ""}
                                  onChange={(e) => handleProductTypeInputChange("tablets_per_strip", e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                                  placeholder="Enter tablets per strip"
                                />
                              </div>
                            </div>
                            <div className="mt-4">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Total Tablets (Computed)</label>
                              <input
                                type="text"
                                value={productTypeForm.total_tablets || ""}
                                readOnly
                                className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                                placeholder="Auto-calculated"
                              />
                              <p className="text-xs text-gray-500 mt-1">Automatically computed: Boxes × Strips per Box × Tablets per Strip</p>
                            </div>
                          </div>
                        )}

                        {/* Medicine Configuration - Pieces Mode */}
                        {productTypeForm.product_type === "Medicine" && productTypeForm.configMode === "pieces" && (
                          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="text-sm font-semibold text-blue-800 mb-4 flex items-center">
                              💊 Medicine Configuration (Pieces Mode)
                            </h4>
                            <div className="grid grid-cols-1 gap-4">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Pieces</label>
                                <input
                                  type="number"
                                  required
                                  min="1"
                                  value={productTypeForm.total_tablets || ""}
                                  onChange={(e) => handleProductTypeInputChange("total_tablets", e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                  placeholder="Enter total number of tablets"
                                />
                                <p className="text-xs text-gray-500 mt-1">Direct input of total tablets for this medicine</p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Non-Medicine Configuration */}
                        {productTypeForm.product_type === "Non-Medicine" && (
                          <div className="mb-6 p-4 bg-orange-50 rounded-lg border border-orange-200">
                            <h4 className="text-sm font-semibold text-orange-800 mb-4 flex items-center">
                              📦 Non-Medicine Configuration
                            </h4>
                            {productTypeForm.configMode === "bulk" ? (
                              // Bulk Mode: Boxes × Pieces per Box
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Number of Boxes *</label>
                                  <input
                                    type="number"
                                    required
                                    min="1"
                                    value={productTypeForm.boxes || ""}
                                    onChange={(e) => handleProductTypeInputChange("boxes", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="Enter number of boxes"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">Pieces per Box *</label>
                                  <input
                                    type="number"
                                    required
                                    min="1"
                                    value={productTypeForm.pieces_per_pack || ""}
                                    onChange={(e) => handleProductTypeInputChange("pieces_per_pack", e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    placeholder="Enter pieces per box"
                                  />
                                </div>
                              </div>
                            ) : (
                              // Pieces Mode: Direct Total Input
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Pieces *</label>
                                <input
                                  type="number"
                                  required
                                  min="1"
                                  value={productTypeForm.total_pieces || ""}
                                  onChange={(e) => handleProductTypeInputChange("total_pieces", e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                                  placeholder="Enter total number of pieces"
                                />
                                <p className="text-xs text-gray-500 mt-1">Direct input of total pieces for this product</p>
                              </div>
                            )}
                            
                            {/* Show computed total for bulk mode */}
                            {productTypeForm.configMode === "bulk" && (
                              <div className="mt-4">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Total Pieces (Computed)</label>
                                <input
                                  type="text"
                                  value={productTypeForm.total_pieces || ""}
                                  readOnly
                                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-700 cursor-not-allowed"
                                  placeholder="Auto-calculated"
                                />
                                <p className="text-xs text-gray-500 mt-1">Automatically computed: Boxes × Pieces per Box</p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Summary Section */}
                        {productTypeForm.product_type && (
                          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <h4 className="text-sm font-semibold text-blue-900 mb-3">Configuration Summary</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-white p-3 rounded border border-blue-200">
                                <h5 className="text-xs font-medium text-blue-800 mb-2">Bulk Units (for Reports & Inventory)</h5>
                                <p className="text-sm text-blue-700">
                                  {productTypeForm.product_type === "Medicine" 
                                    ? `${productTypeForm.boxes || 0} boxes`
                                    : `${productTypeForm.boxes || 0} boxes`
                                  }
                                </p>
                              </div>
                              <div className="bg-white p-3 rounded border border-blue-200">
                                <h5 className="text-xs font-medium text-blue-800 mb-2">Total Pieces (for Internal & POS)</h5>
                                <p className="text-sm text-blue-700">
                                  {productTypeForm.product_type === "Medicine" 
                                    ? `${productTypeForm.total_tablets || 0} tablets`
                                    : `${productTypeForm.total_pieces || 0} pieces`
                                  }
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 text-xs text-blue-600">
                              <strong>Note:</strong> Reports and inventory display bulk units. Total pieces are used for internal calculations and POS operations.
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                          <button
                            type="button"
                            onClick={closeProductTypeModal}
                            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={saveProductTypeConfiguration}
                            disabled={!productTypeForm.product_type || 
                              (productTypeForm.product_type === "Medicine" && productTypeForm.configMode === "bulk" && (!productTypeForm.boxes || !productTypeForm.strips_per_box || !productTypeForm.tablets_per_strip)) ||
                              (productTypeForm.product_type === "Medicine" && productTypeForm.configMode === "pieces" && !productTypeForm.total_tablets) ||
                              (productTypeForm.product_type === "Non-Medicine" && productTypeForm.configMode === "bulk" && (!productTypeForm.boxes || !productTypeForm.pieces_per_pack)) ||
                              (productTypeForm.product_type === "Non-Medicine" && productTypeForm.configMode === "pieces" && !productTypeForm.total_pieces)
                            }
                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Save Configuration
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

      {/* Expiring Batch Modal */}
      {showExpiringBatchModal && selectedExpiringProduct && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto" style={{ backgroundColor: theme.bg.card, boxShadow: `0 25px 50px ${theme.shadow}` }}>
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: theme.border.default }}>
              <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                Expiring Batch Details - {selectedExpiringProduct.product_name}
              </h3>
              <button onClick={closeExpiringBatchModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              {selectedExpiringProduct.expiring_batch ? (
                <div className="space-y-4">
                  <div className="rounded-lg p-4" style={{ backgroundColor: theme.colors.warning + '20', borderColor: theme.colors.warning + '40', border: '1px solid' }}>
                    <h4 className="font-medium mb-2" style={{ color: theme.colors.warning }}>⚠️ Expiring Batch Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Batch Number:</span>
                        <span className="ml-2" style={{ color: theme.text.primary }}>{selectedExpiringProduct.expiring_batch.batch_number || selectedExpiringProduct.expiring_batch.batch_id}</span>
                      </div>
                      <div>
                        <span className="font-medium" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Batch Reference:</span>
                        <span className="ml-2 font-mono" style={{ color: theme.text.primary }}>{selectedExpiringProduct.expiring_batch.batch_reference}</span>
                      </div>
                      <div>
                        <span className="font-medium" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Quantity:</span>
                        <span className="ml-2" style={{ color: theme.text.primary }}>{selectedExpiringProduct.expiring_batch.quantity} units</span>
                      </div>
                      <div>
                        <span className="font-medium" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Days Until Expiry:</span>
                        <span className="ml-2 font-bold" style={{ color: theme.colors.danger }}>{selectedExpiringProduct.expiring_batch.days_until_expiry} days</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg p-4" style={{ backgroundColor: theme.colors.info + '20', borderColor: theme.colors.info + '40', border: '1px solid' }}>
                    <h4 className="font-medium mb-2" style={{ color: theme.colors.info }}>📋 Product Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Product Name:</span>
                        <span className="ml-2" style={{ color: theme.text.primary }}>{selectedExpiringProduct.product_name}</span>
                      </div>
                      <div>
                        <span className="font-medium" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Category:</span>
                        <span className="ml-2" style={{ color: theme.text.primary }}>{selectedExpiringProduct.category}</span>
                      </div>
                      <div>
                        <span className="font-medium" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Total Stock:</span>
                        <span className="ml-2" style={{ color: theme.text.primary }}>{selectedExpiringProduct.quantity} units</span>
                      </div>
                      <div>
                        <span className="font-medium" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>SRP:</span>
                        <span className="ml-2" style={{ color: theme.text.primary }}>₱{selectedExpiringProduct?.srp || selectedExpiringProduct?.unit_price || 0}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg p-4" style={{ backgroundColor: theme.bg.secondary, borderColor: theme.border.default, border: '1px solid' }}>
                    <h4 className="font-medium mb-2" style={{ color: theme.text.primary }}>💡 Recommended Actions</h4>
                    <ul className="text-sm space-y-1" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                      <li>• Consider moving this batch to the front for immediate sale</li>
                      <li>• Check if this batch can be transferred to other locations</li>
                      <li>• Review if the product needs to be discounted for quick sale</li>
                      <li>• Monitor daily sales to ensure this batch is consumed first</li>
                    </ul>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        closeExpiringBatchModal();
                        openFifoModal(selectedExpiringProduct);
                      }}
                      className="px-4 py-2 rounded-md transition-colors"
                      style={{ backgroundColor: theme.colors.primary, color: 'white' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = theme.colors.primary + 'dd'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = theme.colors.primary}
                    >
                      View All Batches
                    </button>
                    <button
                      onClick={closeExpiringBatchModal}
                      className="px-4 py-2 rounded-md transition-colors"
                      style={{ backgroundColor: theme.bg.secondary, color: theme.text.primary, border: `1px solid ${theme.border.default}` }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = theme.bg.primary}
                      onMouseLeave={(e) => e.target.style.backgroundColor = theme.bg.secondary}
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : fifoStockData && fifoStockData.length > 0 ? (
                <div className="space-y-4">
                  <div className="rounded-lg p-4" style={{ backgroundColor: theme.colors.info + '20', borderColor: theme.colors.info + '40', border: '1px solid' }}>
                    <h4 className="font-medium mb-2" style={{ color: theme.colors.info }}>📦 Available Batches</h4>
                    <div className="text-sm" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>
                      Found {fifoStockData.length} batch(es) for this product
                    </div>
                  </div>

                  <div className="rounded-lg p-4" style={{ backgroundColor: theme.bg.secondary, borderColor: theme.border.default, border: '1px solid' }}>
                    <h4 className="font-medium mb-4" style={{ color: theme.text.primary }}>Current FIFO Batches</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: `1px solid ${theme.border.default}` }}>
                            <th className="text-left py-2" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Batch #</th>
                            <th className="text-left py-2" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Reference</th>
                            <th className="text-left py-2" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Quantity</th>
                            <th className="text-left py-2" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Expiry Date</th>
                            <th className="text-left py-2" style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>Days Left</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fifoStockData.map((batch, index) => {
                            const daysLeft = batch.expiration_date ? 
                              Math.ceil((new Date(batch.expiration_date) - new Date()) / (1000 * 60 * 60 * 24)) : 
                              null;
                            return (
                              <tr key={index} style={{ borderBottom: `1px solid ${theme.border.light}` }}>
                                <td className="py-2" style={{ color: theme.text.primary }}>{batch.batch_number || batch.batch_id || index + 1}</td>
                                <td className="py-2 font-mono text-xs" style={{ color: theme.text.primary }}>{batch.batch_reference || 'N/A'}</td>
                                <td className="py-2" style={{ color: theme.text.primary }}>{batch.available_quantity || batch.quantity || 0} units</td>
                                <td className="py-2" style={{ color: theme.text.primary }}>
                                  {batch.expiration_date ? new Date(batch.expiration_date).toLocaleDateString() : 'N/A'}
                                </td>
                                <td className="py-2">
                                  {daysLeft !== null ? (
                                    <span style={{ 
                                      color: daysLeft < 0 ? theme.colors.danger : 
                                             daysLeft <= 30 ? theme.colors.warning : 
                                             theme.text.primary 
                                    }}>
                                      {daysLeft < 0 ? `Expired ${Math.abs(daysLeft)} days ago` : 
                                       daysLeft === 0 ? 'Expires today' : 
                                       `${daysLeft} days`}
                                    </span>
                                  ) : (
                                    <span style={{ color: theme.text.muted }}>No expiry</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        closeExpiringBatchModal();
                        openFifoModal(selectedExpiringProduct);
                      }}
                      className="px-4 py-2 rounded-md transition-colors"
                      style={{ backgroundColor: theme.colors.primary, color: 'white' }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = theme.colors.primary + 'dd'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = theme.colors.primary}
                    >
                      View Detailed FIFO
                    </button>
                    <button
                      onClick={closeExpiringBatchModal}
                      className="px-4 py-2 rounded-md transition-colors"
                      style={{ backgroundColor: theme.bg.secondary, color: theme.text.primary, border: `1px solid ${theme.border.default}` }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = theme.bg.primary}
                      onMouseLeave={(e) => e.target.style.backgroundColor = theme.bg.secondary}
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p style={{ color: isDarkMode ? '#cbd5e1' : '#475569' }}>No batch information available for this product.</p>
                  <button
                    onClick={closeExpiringBatchModal}
                    className="mt-4 px-4 py-2 rounded-md transition-colors"
                    style={{ backgroundColor: theme.bg.secondary, color: theme.text.primary, border: `1px solid ${theme.border.default}` }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = theme.bg.primary}
                    onMouseLeave={(e) => e.target.style.backgroundColor = theme.bg.secondary}
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Batch Modal */}
      {showViewBatchModal && viewBatchData && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="rounded-lg shadow-xl max-w-2xl w-full mx-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 25px 50px ${theme.shadow}` }}>
            <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: theme.border.default }}>
              <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                {viewBatchData.isUpdateStock ? "Review Stock Update" : "Batch Updated Successfully"}
              </h3>
              <button onClick={closeViewBatchModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <div className="p-6">
              <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: theme.bg.secondary }}>
                <div className="flex items-center mb-3">
                  <div className={`w-3 h-3 rounded-full mr-3 ${viewBatchData.isUpdateStock ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
                  <h4 className="text-lg font-semibold" style={{ color: theme.text.primary }}>
                    {viewBatchData.product?.product_name || 'N/A'}
                  </h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium" style={{ color: theme.text.muted }}>Batch Reference:</span>
                    <p className="font-semibold" style={{ color: theme.text.primary }}>{viewBatchData.batchReference}</p>
                  </div>
                  <div>
                    <span className="font-medium" style={{ color: theme.text.muted }}>Quantity Added:</span>
                    <p className="font-semibold" style={{ color: theme.text.primary }}>
                      {viewBatchData.quantityAdded} {viewBatchData.product?.product_type === "Medicine" ? "tablets" : "pieces"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium" style={{ color: theme.text.muted }}>Batch Type:</span>
                    <p className="font-semibold" style={{ color: theme.text.primary }}>
                      {viewBatchData.batchType === "existing" ? "Added to Existing Batch" : "New Batch Created"}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium" style={{ color: theme.text.muted }}>Expiration Date:</span>
                    <p className="font-semibold" style={{ color: theme.text.primary }}>
                      {viewBatchData.expirationDate ? new Date(viewBatchData.expirationDate).toLocaleDateString() : 'N/A'}
                    </p>
                  </div>
                </div>
                
                {viewBatchData?.srp && (
                  <div className="mt-4 pt-4 border-t" style={{ borderColor: theme.border.default }}>
                    <span className="font-medium" style={{ color: theme.text.muted }}>Updated SRP:</span>
                    <p className="font-semibold text-lg" style={{ color: theme.colors.success }}>
                      ₱{parseFloat(viewBatchData.srp).toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm" style={{ color: theme.text.muted }}>
                  {viewBatchData.isUpdateStock ? (
                    <>
                      <p>• Review the details above before confirming</p>
                      <p>• Stock will be updated after confirmation</p>
                    </>
                  ) : (
                    <>
                      <p>• Batch has been automatically logged</p>
                      <p>• FIFO tracking is now active</p>
                    </>
                  )}
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={closeViewBatchModal}
                    className="px-4 py-2 rounded-md transition-colors"
                    style={{ backgroundColor: theme.bg.secondary, color: theme.text.primary, border: `1px solid ${theme.border.default}` }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = theme.bg.primary}
                    onMouseLeave={(e) => e.target.style.backgroundColor = theme.bg.secondary}
                  >
                    {viewBatchData.isUpdateStock ? "Cancel" : "Close"}
                  </button>
                  {viewBatchData.isUpdateStock ? (
                    <button
                      onClick={async () => {
                        // Execute the actual stock update
                        setLoading(true);
                        try {
                          const response = await updateProductStock(
                            viewBatchData.updateParams.productId,
                            viewBatchData.updateParams.quantity,
                            viewBatchData.updateParams.batchRef,
                            viewBatchData.updateParams.expirationDate,
                            0, // Unit cost
                            viewBatchData.updateParams.srpValue,
                            viewBatchData.updateParams.currentUser
                          );
                          
                          if (response.success) {
                            safeToast("success", "Stock updated successfully!");
                            
                            // Refresh data
                            await loadData("products");
                            await refreshOldestBatchData();
                            
                            // Update the modal to show success
                            setViewBatchData(prev => ({
                              ...prev,
                              isUpdateStock: false // Change to success state
                            }));
                          } else {
                            safeToast("error", response.message || "Failed to update stock");
                          }
                        } catch (error) {
                          console.error("Error updating stock:", error);
                          safeToast("error", "Failed to update stock");
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                      className="px-4 py-2 rounded-md transition-colors text-white"
                      style={{ backgroundColor: theme.colors.success }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = theme.colors.successHover || theme.colors.success}
                      onMouseLeave={(e) => e.target.style.backgroundColor = theme.colors.success}
                    >
                      {loading ? "Updating..." : "Confirm Update"}
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        closeViewBatchModal();
                        // Reset the update stock modal to allow for new product scanning
                        setExistingProduct(null);
                        setNewStockQuantity("");
                        setNewStockBoxes("");
                        setNewStockStripsPerBox("");
                        setNewStockTabletsPerStrip("");
                        setNewStockPiecesPerPack("");
                        setNewStockExpiration("");
                        setNewSrp("");
                        setEditSrpEnabled(false);
                        setNewStockBatchReference("");
                        setUseSameBatch(false);
                        setSelectedExistingBatch(null);
                        setExistingBatches([]);
                        setStockUpdateConfigMode("pieces");
                        // Open the update stock modal for new product scanning
                        setTimeout(() => {
                          openUpdateStockModal({});
                        }, 100);
                      }}
                      className="px-4 py-2 rounded-md transition-colors text-white"
                      style={{ backgroundColor: theme.colors.accent }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = theme?.colors?.accentHover || theme?.colors?.accent || '#3b82f6'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = theme.colors.accent}
                    >
                      Continue Adding
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Warehouse;