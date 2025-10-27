"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { 
  FaPlus, 
  FaSearch, 
  FaEdit, 
  FaTrash, 
  FaEye, 
  FaFilter, 
  FaDownload, 
  FaUpload,
  FaArchive
} from "react-icons/fa";
import { Package, Truck, CheckCircle, AlertCircle, Bell, BellRing, Clock, X, History } from "lucide-react";
import { useTheme } from "./ThemeContext";
import { useSettings } from "./SettingsContext";
import { useNotification } from "./NotificationContext";
import NotificationSystem from "./NotificationSystem";
import { getApiEndpointForAction } from '../lib/apiHandler';
import apiHandler from '../lib/apiHandler';

const PharmacyInventory = () => {
  const { theme } = useTheme();
  const { settings, isProductExpiringSoon, isProductExpired, getExpiryStatus, isStockLow } = useSettings();
  const { updatePharmacyNotifications } = useNotification();
  const [inventory, setInventory] = useState([]);
  const [filteredInventory, setFilteredInventory] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [isLoading, setIsLoading] = useState(false);
  const [pharmacyLocationId, setPharmacyLocationId] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);
  
  // Transfer history states
  const [showQuantityHistoryModal, setShowQuantityHistoryModal] = useState(false);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState(null);
  const [quantityHistoryData, setQuantityHistoryData] = useState([]);
  const [showCurrentFifoData, setShowCurrentFifoData] = useState(false);
  const [fifoStockData, setFifoStockData] = useState([]);
  
  // Real-time connection status
  const [realtimeStatus, setRealtimeStatus] = useState('connecting'); // 'connecting', 'connected', 'disconnected', 'polling'
  
  // Notification states
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState({
    expiring: [],
    lowStock: [],
    outOfStock: []
  });

  // API function - Updated to use centralized API handler with robust error handling
  async function handleApiCall(action, data = {}) {
    try {
      // For specific actions, use direct fetch to avoid JSON parsing issues
      if (action === 'get_pharmacy_batch_details' || action === 'debug_pharmacy_stock') {
        try {
          const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/Api'}/pharmacy_api.php`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({ action, ...data })
          });
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const text = await response.text();
          // Clean the response text - remove any PHP warnings/notices that might be prepended
          const cleanText = text.replace(/^.*?(\{.*\})$/s, '$1');
          try {
            const jsonData = JSON.parse(cleanText);
            return jsonData;
          } catch (parseError) {
            console.error("❌ JSON Parse Error:", parseError);
            console.error("❌ Invalid JSON text:", cleanText);
            
            // Try to extract JSON from the response if it's mixed with other content
            const jsonMatch = text.match(/\{.*\}/s);
            if (jsonMatch) {
              try {
                const extractedJson = JSON.parse(jsonMatch[0]);
                return extractedJson;
              } catch (extractError) {
                console.error("❌ Failed to extract JSON:", extractError);
              }
            }
            
            return {
              success: false,
              message: "Server returned invalid JSON",
              error: "INVALID_JSON",
              rawResponse: text
            };
          }
        } catch (fetchError) {
          console.error("❌ Fetch Error:", fetchError);
          return {
            success: false,
            message: fetchError.message,
            error: "FETCH_ERROR"
          };
        }
      }
      
      // For other actions, use the centralized API handler
      const endpoint = getApiEndpointForAction(action);
      const response = await apiHandler.callAPI(endpoint, action, data);
      
      if (response && typeof response === "object") {
        if (!response.success) {
          console.warn("⚠️ API responded with failure:", response.message || response);
        }
        return response;
      } else {
        console.warn("⚠️ Unexpected API response format:", response);
        return {
          success: false,
          message: "Unexpected response format",
          data: response,
        };
      }
    } catch (error) {
      console.error("❌ API Call Error:", error);
      return {
        success: false,
        message: error.message,
        error: "REQUEST_ERROR",
      };
    }
  }



  // Calculate notifications for expiring and low stock products
  const calculateNotifications = (productList) => {
    const today = new Date();
    
    const expiring = productList.filter(product => {
      if (!product.expiration || !settings.expiryAlerts) return false;
      return isProductExpiringSoon(product.expiration) || isProductExpired(product.expiration);
    });
    
    const lowStock = productList.filter(product => {
      const quantity = parseInt(product.total_quantity || product.quantity || 0);
      return isStockLow(quantity) && settings.lowStockAlerts;
    });
    
    const outOfStock = productList.filter(product => {
      const quantity = parseInt(product.total_quantity || product.quantity || 0);
      return quantity === 0;
    });
    
    setNotifications({
      expiring: expiring.sort((a, b) => {
        const dateA = a.expiration && a.expiration !== 'null' ? new Date(a.expiration) : new Date(0);
        const dateB = b.expiration && b.expiration !== 'null' ? new Date(b.expiration) : new Date(0);
        return dateA - dateB;
      }),
      lowStock: lowStock.sort((a, b) => parseInt(a.quantity || 0) - parseInt(b.quantity || 0)),
      outOfStock
    });

    // Check for auto-reorder if enabled
    checkAutoReorder(productList);
  };

  // Auto-reorder functionality
  function checkAutoReorder(products) {
    if (!settings.autoReorder) return;
    
    const lowStockProducts = products.filter(product => {
      const quantity = parseInt(product.total_quantity || product.quantity || 0);
      return isStockLow(quantity);
    });
    
    if (lowStockProducts.length > 0) {
      const productNames = lowStockProducts.map(p => p.product_name).join(', ');
      toast.warning(`🔄 Auto-reorder: ${lowStockProducts.length} product(s) need restocking: ${productNames}`);
      
      // Here you could trigger an API call to create purchase orders
      // or send notifications to suppliers
    }
  }

  // Load pharmacy location ID
  const loadPharmacyLocation = async () => {
    try {
      const response = await handleApiCall("get_locations");
      if (response.success && Array.isArray(response.data)) {
        const pharmacyLocation = response.data.find(loc => 
          loc.location_name.toLowerCase().includes('pharmacy')
        );
        if (pharmacyLocation) {
          setPharmacyLocationId(pharmacyLocation.location_id);
        } else {
          console.warn("⚠️ No pharmacy location found");
          console.warn("⚠️ Available locations:", response.data.map(loc => loc.location_name));
        }
        
        return pharmacyLocation?.location_id || null;
      } else {
        console.warn("⚠️ Failed to load locations:", response.message);
      }
    } catch (error) {
      console.error("Error loading pharmacy location:", error);
    }
    return null;
  };

  // Load products for pharmacy
  const loadProducts = async (showLoading = true) => {
    if (!pharmacyLocationId || isLoading) return; // Prevent multiple simultaneous calls
    
    if (showLoading) setIsLoading(true);
    try {
      // First sync transferred products to ensure proper pricing
      try {
        await handleApiCall("sync_transferred_products", {
          location_name: "pharmacy"
        });
      } catch (syncError) {
        console.warn("⚠️ Sync failed, continuing with load:", syncError);
      }
      
      // Use the pharmacy products API
      const response = await handleApiCall("get_pharmacy_products", {
        location_name: "pharmacy",
        search: searchTerm,
        category: selectedCategory
      });
      if (response.success && Array.isArray(response.data)) {
        // Filter out archived products
        const activeProducts = response.data.filter(
          (product) => (product.status || "").toLowerCase() !== "archived"
        );
        // Debug SRP fields for first product
        if (activeProducts.length > 0) {
          const firstProduct = activeProducts[0];
        }
        
        // Only update if data actually changed to prevent unnecessary re-renders
        if (JSON.stringify(activeProducts) !== JSON.stringify(inventory)) {
          setInventory(activeProducts);
          setFilteredInventory(activeProducts);
          calculateNotifications(activeProducts);
        }
      } else {
        console.warn("⚠️ Primary API failed, trying fallback...");
        console.warn("⚠️ API Error:", response.message);
        
        // Fallback to the original backend API
        const fallbackResponse = await handleApiCall("get_products_by_location_name", {
          location_name: "pharmacy"
        });
        if (fallbackResponse.success && Array.isArray(fallbackResponse.data)) {
          // Filter out archived products
          const activeProducts = fallbackResponse.data.filter(
            (product) => (product.status || "").toLowerCase() !== "archived"
          );
          // Only update if data actually changed
          if (JSON.stringify(activeProducts) !== JSON.stringify(inventory)) {
            setInventory(activeProducts);
            setFilteredInventory(activeProducts);
            calculateNotifications(activeProducts);
          }
        } else {
          console.warn("⚠️ No products found for pharmacy");
          console.warn("⚠️ Fallback Error:", fallbackResponse.message);
          if (inventory.length === 0) {
            setInventory([]);
            setFilteredInventory([]);
          }
        }
      }
    } catch (error) {
      console.error("Error loading products:", error);
      if (showLoading) {
        toast.error("Failed to load products");
      }
      if (inventory.length === 0) {
        setInventory([]);
        setFilteredInventory([]);
      }
    } finally {
      if (showLoading) setIsLoading(false);
    }
  };

  // Silent refresh for auto-updates without loading states
  const loadProductsSilently = async () => {
    await loadProducts(false);
  };

  useEffect(() => {
    const initialize = async () => {
      const locationId = await loadPharmacyLocation();
      if (locationId) {
        await loadProducts();
      }
    };
    initialize();
  }, []); // Only run once on mount

  useEffect(() => {
    if (pharmacyLocationId) {
      loadProducts(true); // Show loading on initial load
      
      // Set up automatic refresh every 15 seconds (reduced frequency)
      const refreshInterval = setInterval(() => {
        if (pharmacyLocationId && !isLoading) {
          loadProductsSilently(); // Silent refresh
        }
      }, 15000); // Refresh every 15 seconds (less frequent)
      
      return () => {
        clearInterval(refreshInterval);
      };
    }
  }, [searchTerm, selectedCategory, pharmacyLocationId]);

  // Real-time updates using Server-Sent Events with fallback polling
  useEffect(() => {
    if (!pharmacyLocationId) return;
    let eventSource = null;
    let pollInterval = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    
    const connectSSE = () => {
      try {
        eventSource = new EventSource(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/Api'}/realtime_updates.php?location=pharmacy&location_id=${pharmacyLocationId}`);
        
        eventSource.onopen = () => {
          setRealtimeStatus('connected');
          reconnectAttempts = 0; // Reset reconnect attempts on successful connection
        };
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'connection') {
              toast.success("🔗 Connected to real-time updates", { autoClose: 2000 });
            } else if (data.type === 'inventory_update') {
              toast.info(`🔄 ${data.message || 'Inventory updated'}`, {
                autoClose: 3000,
                position: "top-right"
              });
              
              // Refresh products immediately (silent)
              loadProductsSilently();
            } else if (data.type === 'return_approved') {
              toast.success(`✅ ${data.message || 'Return approved - inventory updated'}`, {
                autoClose: 5000,
                position: "top-right"
              });
              
              // Refresh products with delay to ensure backend is updated
              setTimeout(() => {
                loadProductsSilently();
              }, 1000);
            } else if (data.type === 'transfer_completed') {
              toast.success(`📦 ${data.message || 'New products transferred to pharmacy'}`, {
                autoClose: 5000,
                position: "top-right"
              });
              
              // Refresh products (silent)
              loadProductsSilently();
            } else if (data.type === 'heartbeat') {
            }
          } catch (error) {
            console.error("❌ Error parsing real-time update:", error);
          }
        };
        
        eventSource.onerror = (error) => {
          console.warn("⚠️ Real-time connection error, falling back to polling:", error);
          setRealtimeStatus('disconnected');
          
          if (eventSource) {
            eventSource.close();
            eventSource = null;
          }
          
          // Skip reconnection attempts and go straight to polling
          setRealtimeStatus('polling');
          startPolling();
        };
        
      } catch (error) {
        console.warn("⚠️ Error creating SSE connection, using polling:", error);
        setRealtimeStatus('polling');
        startPolling();
      }
    };
    
    const startPolling = () => {
      setRealtimeStatus('polling');
      pollInterval = setInterval(() => {
      if (pharmacyLocationId && !isLoading) {
        loadProductsSilently(); // Silent polling
      }
      }, 20000); // Poll every 20 seconds as fallback (less frequent)
    };
    
    // Start with polling for now (SSE can be enabled later)
    setRealtimeStatus('polling');
    startPolling();
    
    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [pharmacyLocationId, isLoading]);

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

  // Listen for inventory refresh events (e.g., when returns are approved)
  useEffect(() => {
    const handleInventoryRefresh = (event) => {
      const { location, action, message, transferDetailsUpdated } = event.detail;
      
      // Check if this refresh is for Pharmacy - be more flexible with location matching
      const isPharmacyRefresh = location && (
        location.toLowerCase().includes('pharmacy') ||
        location.toLowerCase().includes('pharm') ||
        // Also check if we're currently viewing pharmacy inventory
        window.location.pathname.includes('pharmacy') ||
        window.location.pathname.includes('Pharmacy')
      );
      
      // Fallback: if we're on pharmacy page and no specific location match, still refresh
      const isOnPharmacyPage = window.location.pathname.includes('pharmacy') || window.location.pathname.includes('Pharmacy');
      
      if (isPharmacyRefresh || (isOnPharmacyPage && action === 'return_approved')) {
        // Show toast notification with transfer details info
        let notificationMessage = `🔄 ${message} - Refreshing pharmacy inventory...`;
        if (transferDetailsUpdated) {
          notificationMessage += `\n📊 Transfer details updated with returned quantities.`;
        }
        toast.success(notificationMessage);
        
        // Refresh products after a short delay (silent)
        setTimeout(() => {
          loadProductsSilently();
        }, 1000);
        
        // Also refresh again after a longer delay to ensure we catch any delayed updates
        setTimeout(() => {
          loadProductsSilently();
        }, 3000);
      }
    };

    window.addEventListener('inventoryRefresh', handleInventoryRefresh);
    return () => {
      window.removeEventListener('inventoryRefresh', handleInventoryRefresh);
    };
  }, [pharmacyLocationId]);

  useEffect(() => {
    filterInventory();
  }, [searchTerm, selectedCategory, inventory]);

  const filterInventory = () => {
    let filtered = inventory;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        (item.product_name && typeof item.product_name === 'string' && item.product_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.category && typeof item.category === 'string' && item.category.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.barcode && typeof item.barcode === 'string' && item.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedCategory !== "all") {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    setFilteredInventory(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "in stock":
        return "success";
      case "low stock":
        return "warning";
      case "out of stock":
        return "danger";
      default:
        return "default";
    }
  };

  // Archive functionality
  const openDeleteModal = (item) => {
    setSelectedItem(item);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setSelectedItem(null);
  };

  const handleDeleteItem = async () => {
    if (!selectedItem) return;
    
    setLoading(true);
    try {
      const response = await handleApiCall("delete_product", {
        product_id: selectedItem.product_id,
        reason: "Archived from pharmacy inventory",
        archived_by: "admin"
      });
      
      if (response.success) {
        toast.success("Product archived successfully");
        closeDeleteModal();
        loadProducts(); // Reload products
      } else {
        toast.error(response.message || "Failed to archive product");
      }
    } catch (error) {
      console.error("Error archiving product:", error);
      toast.error("Failed to archive product");
    } finally {
      setLoading(false);
    }
  };

  // Transfer history functions
  const openQuantityHistoryModal = (product) => {
    setSelectedProductForHistory(product);
    setShowQuantityHistoryModal(true);
    setShowCurrentFifoData(true);
    refreshProductData(product.product_id);
    loadTransferHistory(product.product_id);
  };

  const closeQuantityHistoryModal = () => {
    setShowQuantityHistoryModal(false);
    setSelectedProductForHistory(null);
    setQuantityHistoryData([]);
    setFifoStockData([]);
  };

  const refreshProductData = async (productId) => {
    try {
      const response = await handleApiCall("get_fifo_stock", { product_id: productId });
      if (response.success && Array.isArray(response.data)) {
        setFifoStockData(response.data);
      }
    } catch (error) {
      console.error("Error refreshing product data:", error);
    }
  };

  const loadTransferHistory = async (productId) => {
    setLoadingBatch(true);
    try {
      // Use same logic as Convenience Store - call get_pharmacy_batch_details
      const response = await handleApiCall("get_pharmacy_batch_details", {
        location_id: pharmacyLocationId,
        product_id: productId
      });
      // Handle different response types
      if (response.error === "INVALID_JSON") {
        console.error("❌ Invalid JSON response:", response.rawResponse);
        // Try fallback API
        try {
          const fallbackResponse = await handleApiCall("get_fifo_stock", {
            product_id: productId,
            location_id: pharmacyLocationId
          });
          
          if (fallbackResponse.success && fallbackResponse.data) {
            const fallbackData = Array.isArray(fallbackResponse.data) ? fallbackResponse.data : [fallbackResponse.data];
            displayBatchTransferDetails(fallbackData, { total_transfers: fallbackData.length });
            return;
          }
        } catch (fallbackError) {
          console.error("❌ Fallback API also failed:", fallbackError);
        }
        
        toast.error("Server returned invalid data. Please check server logs.");
        displayBatchTransferDetails([], {});
        return;
      }
      
      if (response.success && response.data) {
        const batchDetails = response.data.batch_details || [];
        const summary = response.data.summary || {};
        if (batchDetails.length > 0) {
          displayBatchTransferDetails(batchDetails, summary);
        } else {
          // Try fallback API if no data found
          try {
            const fallbackResponse = await handleApiCall("get_fifo_stock", {
              product_id: productId,
              location_id: pharmacyLocationId
            });
            
            if (fallbackResponse.success && fallbackResponse.data) {
              const fallbackData = Array.isArray(fallbackResponse.data) ? fallbackResponse.data : [fallbackResponse.data];
              displayBatchTransferDetails(fallbackData, { total_transfers: fallbackData.length });
              return;
            }
          } catch (fallbackError) {
            console.error("❌ Fallback API failed:", fallbackError);
          }
          
          displayBatchTransferDetails([], {});
        }
      } else {
        console.error("Error loading batch transfer details:", response.message);
        toast.warning(`Failed to load batch details: ${response.message || 'Unknown error'}`);
        displayBatchTransferDetails([], {});
      }
    } catch (error) {
      console.error("Error loading batch transfer details:", error);
      toast.error("Error loading batch details. Please try again.");
      displayBatchTransferDetails([], {});
    } finally {
      setLoadingBatch(false);
    }
  };

  const displayBatchTransferDetails = (batchDetails, summary) => {
    // This function is now handled by React state instead of direct DOM manipulation
    setQuantityHistoryData(batchDetails || []);
  };

  const displayTransferHistory = (transferLogs) => {
    // This function is kept for backward compatibility but now redirects to batch transfer details
    displayBatchTransferDetails(transferLogs, {});
  };


  const categories = [...new Set(inventory.map(p => {
    // Handle both string and object category formats
    if (typeof p.category === 'string') {
      return p.category;
    } else if (p.category && typeof p.category === 'object' && p.category.category_name) {
      return p.category.category_name;
    }
    return null;
  }).filter(Boolean))];
  
  // Update uniqueProducts for both table and stats
  const uniqueProducts = Array.from(new Map(filteredInventory.map(item => [item.product_name, item])).values());
  
  // Fix pagination to use uniqueProducts
  const pages = Math.ceil(uniqueProducts.length / rowsPerPage);
  const items = uniqueProducts.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <div className="p-6 space-y-6" style={{ backgroundColor: theme.bg.primary }}>

      <NotificationSystem products={inventory} componentName="pharmacy" />
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: theme.text.primary }}>Pharmacy Inventory</h1>
          <div className="flex items-center gap-3 mt-2">
          <p style={{ color: theme.text.secondary }}>Manage pharmaceutical products and medications</p>
            {/* Real-time Status Indicator */}
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                realtimeStatus === 'connected' ? 'bg-green-500 animate-pulse' :
                realtimeStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' :
                realtimeStatus === 'polling' ? 'bg-blue-500 animate-pulse' :
                'bg-red-500'
              }`}></div>
              <span className="text-xs font-medium" style={{ color: theme.text.muted }}>
                {realtimeStatus === 'connected' ? '🟢 Real-time' :
                 realtimeStatus === 'connecting' ? '🟡 Connecting...' :
                 realtimeStatus === 'polling' ? '🔵 Polling' :
                 '🔴 Disconnected'}
              </span>
            </div>
          </div>
        </div>
        
        {/* Notification Bell */}
        <div className="relative notification-dropdown">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative p-2 rounded-full hover:bg-opacity-10 hover:bg-gray-500 transition-colors"
            title="View Notifications"
          >
            {(notifications.expiring.length + notifications.lowStock.length + notifications.outOfStock.length) > 0 ? (
              <BellRing className="h-6 w-6" style={{ color: theme.colors.warning }} />
            ) : (
              <Bell className="h-6 w-6" style={{ color: theme.text.secondary }} />
            )}
            
            {/* Notification Badge */}
            {(notifications.expiring.length + notifications.lowStock.length + notifications.outOfStock.length) > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {Math.min(notifications.expiring.length + notifications.lowStock.length + notifications.outOfStock.length, 99)}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-96 rounded-lg shadow-2xl border z-50 max-h-96 overflow-y-auto" 
                 style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, boxShadow: `0 25px 50px ${theme.shadow.lg}` }}>
              <div className="p-4 border-b" style={{ borderColor: theme.border.default }}>
                <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>Notifications</h3>
                <p className="text-sm" style={{ color: theme.text.secondary }}>
                  {notifications.expiring.length + notifications.lowStock.length + notifications.outOfStock.length} alerts
                </p>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {/* Expiring Products */}
                {notifications.expiring.length > 0 && (
                  <div className="p-4 border-b" style={{ borderColor: theme.border.light }}>
                    <h4 className="font-medium mb-2 flex items-center" style={{ color: theme.colors.warning }}>
                      <Clock className="h-4 w-4 mr-2" />
                      Expiring Soon ({notifications.expiring.length})
                    </h4>
                    {notifications.expiring.slice(0, 5).map((product, index) => (
                      <div key={index} className="flex justify-between items-center py-1">
                        <span className="text-sm" style={{ color: theme.text.primary }}>{product.product_name}</span>
                        <span className="text-xs px-2 py-1 rounded" style={{ 
                          backgroundColor: theme.colors.warning + '20', 
                          color: theme.colors.warning 
                        }}>
                          {Math.ceil((new Date(product.expiration) - new Date()) / (1000 * 60 * 60 * 24))} days
                        </span>
                      </div>
                    ))}
                    {notifications.expiring.length > 5 && (
                      <p className="text-xs mt-2" style={{ color: theme.text.secondary }}>
                        +{notifications.expiring.length - 5} more...
                      </p>
                    )}
                  </div>
                )}

                {/* Low Stock Products */}
                {notifications.lowStock.length > 0 && (
                  <div className="p-4 border-b" style={{ borderColor: theme.border.light }}>
                    <h4 className="font-medium mb-2 flex items-center" style={{ color: theme.colors.warning }}>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Low Stock ({notifications.lowStock.length})
                    </h4>
                    {notifications.lowStock.slice(0, 5).map((product, index) => (
                      <div key={index} className="flex justify-between items-center py-1">
                        <span className="text-sm" style={{ color: theme.text.primary }}>{product.product_name}</span>
                        <span className="text-xs px-2 py-1 rounded" style={{ 
                          backgroundColor: theme.colors.warning + '20', 
                          color: theme.colors.warning 
                        }}>
                          {product.quantity} left
                        </span>
                      </div>
                    ))}
                    {notifications.lowStock.length > 5 && (
                      <p className="text-xs mt-2" style={{ color: theme.text.secondary }}>
                        +{notifications.lowStock.length - 5} more...
                      </p>
                    )}
                  </div>
                )}

                {/* Out of Stock Products */}
                {notifications.outOfStock.length > 0 && (
                  <div className="p-4">
                    <h4 className="font-medium mb-2 flex items-center" style={{ color: theme.colors.danger }}>
                      <Package className="h-4 w-4 mr-2" />
                      Out of Stock ({notifications.outOfStock.length})
                    </h4>
                    {notifications.outOfStock.slice(0, 5).map((product, index) => (
                      <div key={index} className="flex justify-between items-center py-1">
                        <span className="text-sm" style={{ color: theme.text.primary }}>{product.product_name}</span>
                        <span className="text-xs px-2 py-1 rounded" style={{ 
                          backgroundColor: theme.colors.danger + '20', 
                          color: theme.colors.danger 
                        }}>
                          0 stock
                        </span>
                      </div>
                    ))}
                    {notifications.outOfStock.length > 5 && (
                      <p className="text-xs mt-2" style={{ color: theme.text.secondary }}>
                        +{notifications.outOfStock.length - 5} more...
                      </p>
                    )}
                  </div>
                )}

                {/* No Notifications */}
                {(notifications.expiring.length + notifications.lowStock.length + notifications.outOfStock.length) === 0 && (
                  <div className="p-8 text-center">
                    <CheckCircle className="h-12 w-12 mx-auto mb-2" style={{ color: theme.colors.success }} />
                    <p className="text-sm" style={{ color: theme.text.secondary }}>All products are in good condition!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-3xl shadow-xl p-6" style={{ backgroundColor: theme.bg.card, boxShadow: `0 25px 50px ${theme.shadow.lg}` }}>
          <div className="flex items-center">
            <Package className="h-8 w-8" style={{ color: theme.colors.accent }} />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: theme.text.muted }}>Total Products</p>
              <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{uniqueProducts.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl shadow-xl p-6" style={{ backgroundColor: theme.bg.card, boxShadow: `0 25px 50px ${theme.shadow.lg}` }}>
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8" style={{ color: theme.colors.warning }} />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: theme.text.muted }}>Low Stock</p>
              <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                {inventory.filter(p => p.stock_status === 'low stock').length}
              </p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl shadow-xl p-6" style={{ backgroundColor: theme.bg.card, boxShadow: `0 25px 50px ${theme.shadow.lg}` }}>
          <div className="flex items-center">
            <Truck className="h-8 w-8" style={{ color: theme.colors.info }} />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: theme.text.muted }}>Total Value</p>
              <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>
                ₱{inventory.reduce((sum, p) => sum + (Number(p.first_batch_srp || p.srp || 0) * Number(p.total_quantity || p.quantity || 0)), 0).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="rounded-3xl shadow-xl p-6" style={{ backgroundColor: theme.bg.card, boxShadow: `0 25px 50px ${theme.shadow.lg}` }}>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: theme.text.muted }} />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border rounded-md focus:outline-none focus:ring-2"
                style={{ 
                  borderColor: theme.border.default, 
                  backgroundColor: theme.bg.secondary,
                  color: theme.text.primary,
                  focusRingColor: theme.colors.accent
                }}
              />
            </div>
          </div>
          <div className="w-full md:w-48">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2"
              style={{ 
                borderColor: theme.border.default, 
                backgroundColor: theme.bg.secondary,
                color: theme.text.primary,
                focusRingColor: theme.colors.accent
              }}
            >
              <option value="all">All Categories</option>
              {categories.map((category) => (
                <option key={category} value={typeof category === 'string' ? category : (category?.category_name || 'Unknown')}>
                  {typeof category === 'string' ? category : (category?.category_name || 'Unknown')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="rounded-3xl shadow-xl" style={{ backgroundColor: theme.bg.card, boxShadow: `0 25px 50px ${theme.shadow.lg}` }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: theme.border.default }}>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold" style={{ color: theme.text.primary }}>Products</h3>
            <div className="text-sm" style={{ color: theme.text.secondary }}>
              {uniqueProducts.length} unique products found ({filteredInventory.length} total entries)
            </div>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96 inventory-table-container">
          <table className="w-full min-w-max inventory-table" style={{ color: theme.text.primary }}>
            <thead className="border-b sticky top-0 z-10" style={{ backgroundColor: theme.bg.secondary, borderColor: theme.border.default }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  BARCODE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  PRODUCT NAME
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  CATEGORY
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  BRAND
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  PRODUCT QTY
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  SRP VALUE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  SUPPLIER
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  DAYS TO EXPIRY
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.primary }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.light }}>
              {isLoading && inventory.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center" style={{ color: theme.text.secondary }}>
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2" style={{ borderColor: theme.colors.accent }}></div>
                      <span>Loading products...</span>
                    </div>
                  </td>
                </tr>
              ) : items.length > 0 ? (
                // Display paginated unique products
                items.map((item, index) => {
                  const quantity = parseInt(item.total_quantity || item.quantity || 0);
                  
                  return (
                    <tr key={`${item.product_id}-${index}`} className="hover:bg-opacity-50" style={{ backgroundColor: 'transparent', hoverBackgroundColor: theme.bg.hover }}>
                      <td className="px-6 py-4 text-sm font-mono" style={{ color: theme.text.primary }}>
                        {item.barcode}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium" style={{ color: theme.text.primary }}>
                          {item.product_name}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full" style={{ backgroundColor: theme.bg.secondary, color: theme.text.primary }}>
                          {item.category || item.category_name || 'Uncategorized'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: theme.text.primary }}>
                        {item.brand || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className={`font-semibold ${quantity === 0 ? 'text-red-600' : quantity === 1 ? 'text-orange-600' : ''}`}>
                          {item.total_quantity || item.quantity || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center text-sm" style={{ color: theme.text.primary }}>
                        ₱{(() => {
                          const srpValue = Number.parseFloat(item.first_batch_srp || item.srp || 0);
                          return srpValue > 0 ? srpValue.toFixed(2) : '0.00';
                        })()}
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: theme.text.primary }}>
                        {item.supplier_name || "N/A"}
                      </td>
                      <td className="px-6 py-4 text-center text-sm" style={{ color: theme.text.primary }}>
                        {(() => {
                          if (!item.expiration) return 'N/A';
                          const today = new Date();
                          const expiry = new Date(item.expiration);
                          const daysUntilExpiry = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
                          
                          if (daysUntilExpiry < 0) {
                            return <span style={{ color: theme.colors.danger }}>Expired ({Math.abs(daysUntilExpiry)} days ago)</span>;
                          } else if (daysUntilExpiry <= 7) {
                            return <span style={{ color: theme.colors.warning }}>{daysUntilExpiry} days</span>;
                          } else if (daysUntilExpiry <= 30) {
                            return <span style={{ color: theme.colors.info }}>{daysUntilExpiry} days</span>;
                          } else {
                            return <span style={{ color: theme.colors.success }}>{daysUntilExpiry} days</span>;
                          }
                        })()}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => openQuantityHistoryModal(item)}
                            className="px-3 py-1 text-xs font-medium rounded-lg border transition-colors hover:shadow-md"
                            style={{
                              borderColor: theme.colors.accent,
                              backgroundColor: theme.colors.accent + '10',
                              color: theme.colors.accent
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.backgroundColor = theme.colors.accent + '20';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.backgroundColor = theme.colors.accent + '10';
                            }}
                            title="View Batch Details"
                          >
                            <History className="h-4 w-4 inline mr-1" />
                            Batch Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <Package className="h-12 w-12" style={{ color: theme.text.muted }} />
                      <div style={{ color: theme.text.secondary }}>
                        <p className="text-lg font-medium" style={{ color: theme.text.primary }}>No products found</p>
                        <p className="text-sm">Products will appear here when transferred from warehouse</p>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex justify-center mt-4 pb-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1 border rounded disabled:opacity-50"
                style={{ 
                  borderColor: theme.border.default,
                  color: theme.text.primary,
                  backgroundColor: theme.bg.secondary
                }}
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm" style={{ color: theme.text.secondary }}>
                Page {page} of {pages}
              </span>
              <button
                onClick={() => setPage(Math.min(pages, page + 1))}
                disabled={page === pages}
                className="px-3 py-1 border rounded disabled:opacity-50"
                style={{ 
                  borderColor: theme.border.default,
                  color: theme.text.primary,
                  backgroundColor: theme.bg.secondary
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="backdrop-blur-md rounded-xl shadow-2xl p-6 border w-96" style={{ 
            backgroundColor: theme.bg.card + 'F0', 
            borderColor: theme.border.default,
            boxShadow: `0 25px 50px ${theme.shadow.lg}`
          }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>Confirm Archive</h3>
            <p className="mb-4" style={{ color: theme.text.secondary }}>Are you sure you want to archive this product?</p>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={closeDeleteModal}
                className="px-4 py-2 border rounded-md"
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
                className="px-4 py-2 rounded-md disabled:opacity-50"
                style={{ 
                  backgroundColor: theme.colors.warning,
                  color: 'white'
                }}
              >
                {loading ? "Archiving..." : "Archive"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Details Modal */}
      {showQuantityHistoryModal && selectedProductForHistory && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50" style={{ zIndex: 9999 }}>
          <div className="rounded-xl shadow-2xl max-w-6xl w-full mx-4 max-h-[90vh] overflow-y-auto bg-white">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold text-gray-900">
                📦 Batch Details - {selectedProductForHistory.product_name}
              </h3>
              <div className="flex items-center gap-2">
                <button 
                  onClick={closeQuantityHistoryModal}
                  className="p-2 text-gray-500 hover:text-gray-700"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
                {/* Transfer Details Card */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="bg-green-100 p-2 rounded-lg flex-shrink-0">
                      <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Transfer Details</h4>
                      <p className="text-xs sm:text-sm text-green-600 truncate">Quantity: {selectedProductForHistory.total_quantity || selectedProductForHistory.quantity || 0} units</p>
                      <p className="text-xs sm:text-sm text-green-600 truncate">From: {selectedProductForHistory.source_location || 'Warehouse'}</p>
                      <p className="text-xs sm:text-sm text-green-600 truncate">To: Pharmacy</p>
                    </div>
                  </div>
                </div>

                {/* Batch Info Card */}
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="bg-orange-100 p-2 rounded-lg flex-shrink-0">
                      <Package className="h-5 w-5 sm:h-6 sm:w-6 text-orange-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-gray-900 text-sm sm:text-base">Batch Information</h4>
                      <p className="text-xs sm:text-sm text-orange-600 truncate">Batches Transferred: {quantityHistoryData.length}</p>
                      <p className="text-xs sm:text-sm text-orange-600 truncate">FIFO Order: Active</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Batch Details Table */}
              <div className="border rounded-lg bg-white border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h4 className="text-lg font-semibold text-gray-900">Batch Consumption Details</h4>
                  <p className="text-sm text-gray-600">Showing which batches were consumed for this transfer</p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">FIFO Order</th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Batch Reference</th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Transferred QTY</th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">SRP</th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Expiry Date</th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {loadingBatch ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            <div className="flex flex-col items-center space-y-2">
                              <Package className="h-8 w-8 text-gray-400" />
                              <p className="text-lg font-medium text-gray-900">Loading batch details...</p>
                              <p className="text-sm text-gray-600">Please wait while we fetch the batch information</p>
                            </div>
                          </td>
                        </tr>
                      ) : quantityHistoryData.length > 0 ? (
                        quantityHistoryData.map((batch, index) => {
                          const expiryDate = batch.expiration_date && batch.expiration_date !== 'null' ? new Date(batch.expiration_date).toLocaleDateString() : 'N/A';
                          const quantityUsed = batch.batch_quantity || batch.quantity || 0;
                          const batchSrp = batch.batch_srp || batch.srp || 0;
                          const batchReference = batch.batch_reference || `BR-${batch.batch_id || index + 1}`;
                          const isConsumed = quantityUsed > 0;
                          const isOldest = index === 0;
                          const isExpired = batch.expiration_date && batch.expiration_date !== 'null' && new Date(batch.expiration_date) < new Date();
                          const isExpiringSoon = batch.expiration_date && batch.expiration_date !== 'null' && 
                            new Date(batch.expiration_date) > new Date() && 
                            new Date(batch.expiration_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
                          
                          return (
                            <tr key={`${batch.product_id}_${batch.batch_id}_${index}_${batch.transfer_date}`} className={`hover:bg-gray-50 ${isOldest ? 'bg-yellow-50 border-l-4 border-yellow-400 ring-2 ring-yellow-200' : ''}`}>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                                <div className="flex items-center justify-center gap-2">
                                  <span className={`font-bold ${isOldest ? 'text-yellow-600' : 'text-gray-600'}`}>
                                    {index + 1}
                                  </span>
                                  {isOldest && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                      🥇 FIFO
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                  {batchReference}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  isConsumed ? 'bg-green-100 text-green-800' : 
                                  isExpired ? 'bg-red-100 text-red-800' :
                                  isExpiringSoon ? 'bg-orange-100 text-orange-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}>
                                  {quantityUsed} pieces
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-900">
                                ₱{Number.parseFloat(batchSrp).toFixed(2)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                                <div className="flex flex-col items-center">
                                  <span className={isExpired ? 'text-red-600 font-semibold' : isExpiringSoon ? 'text-orange-600 font-semibold' : ''}>
                                    {expiryDate}
                                  </span>
                                  {isExpired && <span className="text-xs text-red-500">EXPIRED</span>}
                                  {isExpiringSoon && <span className="text-xs text-orange-500">EXPIRING SOON</span>}
                                </div>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                  isConsumed ? 'bg-green-100 text-green-800' : 
                                  isExpired ? 'bg-red-100 text-red-800' :
                                  isExpiringSoon ? 'bg-orange-100 text-orange-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {isConsumed ? 'Consumed' : 
                                   isExpired ? 'Expired' :
                                   isExpiringSoon ? 'Expiring Soon' :
                                   'Available'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                            <div className="flex flex-col items-center space-y-2">
                              <Package className="h-8 w-8 text-gray-400" />
                              <p className="text-lg font-medium text-gray-900">No detailed batch information available</p>
                              <p className="text-sm text-gray-600">This transfer may not have detailed batch tracking</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="mt-6 p-4 rounded-lg bg-gray-50">
                <h4 className="font-semibold mb-2 text-gray-900">Transfer Summary</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total Quantity:</span>
                    <span className="ml-2 font-semibold text-gray-900">{quantityHistoryData.reduce((sum, batch) => sum + (batch.batch_quantity || 0), 0)} pieces</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Batches Transferred:</span>
                    <span className="ml-2 font-semibold text-gray-900">{quantityHistoryData.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">FIFO Order:</span>
                    <span className="ml-2 font-semibold text-green-600">✓ Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PharmacyInventory; 