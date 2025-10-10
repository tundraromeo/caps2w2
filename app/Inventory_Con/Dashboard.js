"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "./ThemeContext";
import apiHandler from '../lib/apiHandler';

function Dashboard() {
  const { theme } = useTheme();
  const [selectedProduct, setSelectedProduct] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("Warehouse");
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouseData, setWarehouseData] = useState({
    totalProducts: 0,
    totalSuppliers: 0,
    storageCapacity: 0,
    warehouseValue: 0,
    lowStockItems: 0,
    expiringSoon: 0,
    totalBatches: 0,
    activeTransfers: 0
  });
  const [supplyByProduct, setSupplyByProduct] = useState([]);
  const [supplyByLocation, setSupplyByLocation] = useState([]);
  const [returnRateByProduct, setReturnRateByProduct] = useState([]);
  const [stockoutItems, setStockoutItems] = useState([]);
  const [productKPIs, setProductKPIs] = useState([]);
  const [warehouseStats, setWarehouseStats] = useState({
    totalProducts: 0,
    totalSuppliers: 0,
    storageCapacity: 75,
    warehouseValue: 0,
    lowStockItems: 0,
    expiringSoon: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  // New chart data states
  const [topProductsByQuantity, setTopProductsByQuantity] = useState([]);
  const [stockDistributionByCategory, setStockDistributionByCategory] = useState([]);
  const [fastMovingItemsTrend, setFastMovingItemsTrend] = useState([]);
  const [criticalStockAlerts, setCriticalStockAlerts] = useState([]);
  const [inventoryByBranchCategory, setInventoryByBranchCategory] = useState([]);

  // Add new state for other modules' KPIs
  const [convenienceKPIs, setConvenienceKPIs] = useState({ totalProducts: 0, lowStock: 0, expiringSoon: 0 });
  const [pharmacyKPIs, setPharmacyKPIs] = useState({ totalProducts: 0, lowStock: 0, expiringSoon: 0 });
  const [transferKPIs, setTransferKPIs] = useState({ totalTransfers: 0, activeTransfers: 0 });

  // Retry function
  const retryFetch = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    fetchAllData();
  };

  // Fetch all data function
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      await Promise.all([
        fetchCategoriesAndLocations(),
        fetchWarehouseData(),
        fetchChartData(),
        fetchConvenienceKPIs(),
        fetchPharmacyKPIs(),
        fetchTransferKPIs()
      ]);
    } catch (error) {
      console.error('Error fetching all data:', error);
      setError('Failed to load dashboard data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch data from database
  useEffect(() => {
    fetchAllData();
  }, [selectedProduct, selectedLocation, retryCount]);

  const fetchCategoriesAndLocations = async () => {
    try {
      // Use centralized API handler instead of direct fetch
      const [categoriesResponse, locationsResponse] = await Promise.all([
        apiHandler.callAPI('backend.php', 'get_categories'),
        apiHandler.callAPI('backend.php', 'get_locations')
      ]);
      
      if (categoriesResponse) {
        // Handle both direct response format and wrapped response format
        const data = categoriesResponse.success ? categoriesResponse.data : categoriesResponse;
        setCategories(Array.isArray(data) ? data : []);
      } else {
        console.warn("⚠️ Unexpected categories response format:", categoriesResponse);
        setCategories([]);
      }
      
      if (locationsResponse) {
        // Handle both direct response format and wrapped response format
        const data = locationsResponse.success ? locationsResponse.data : locationsResponse;
        setLocations(Array.isArray(data) ? data : []);
      } else {
        console.warn("⚠️ Unexpected locations response format:", locationsResponse);
        setLocations([]);
      }
    } catch (error) {
      console.error('Error fetching categories and locations:', error);
      setCategories([]);
      setLocations([]);
    }
  };

  const fetchWarehouseData = async () => {
    try {
      setLoading(true);
      
      // Use centralized API handler instead of direct fetch
      const warehouseResponse = await apiHandler.getWarehouseKPIs({
        product: selectedProduct,
        location: selectedLocation
      });
      
      if (warehouseResponse) {
        // Handle both direct response format and wrapped response format
        const data = warehouseResponse.success ? warehouseResponse.data : warehouseResponse;
        
        // Set warehouse data with fallback values
        setWarehouseData({
          totalProducts: data.totalProducts || 0,
          totalSuppliers: data.totalSuppliers || 0,
          storageCapacity: data.storageCapacity || 75,
          warehouseValue: data.warehouseValue || 0,
          lowStockItems: data.lowStockItems || 0,
          expiringSoon: data.expiringSoon || 0,
          totalBatches: data.totalBatches || 0,
          activeTransfers: data.activeTransfers || 0
        });
      } else {
        console.warn("No warehouse response received");
      }

      // Fetch supply by product for warehouse
      try {
        const supplyProductResponse = await apiHandler.getWarehouseSupplyByProduct({
          product: selectedProduct,
          location: selectedLocation
        });
        if (supplyProductResponse) {
          // Handle both direct response format and wrapped response format
          const data = supplyProductResponse.success ? supplyProductResponse.data : supplyProductResponse;
          setSupplyByProduct(Array.isArray(data) ? data : []);
        } else {
          setSupplyByProduct([]);
        }
      } catch (error) {
        console.error('Error fetching supply by product:', error);
        setSupplyByProduct([]);
      }

      // Fetch supply by location for warehouse
      try {
        const supplyLocationResponse = await apiHandler.getWarehouseSupplyByLocation({
          product: selectedProduct,
          location: selectedLocation
        });
        if (supplyLocationResponse) {
          // Handle both direct response format and wrapped response format
          const data = supplyLocationResponse.success ? supplyLocationResponse.data : supplyLocationResponse;
          setSupplyByLocation(Array.isArray(data) ? data : []);
        } else {
          setSupplyByLocation([]);
        }
      } catch (error) {
        console.error('Error fetching supply by location:', error);
        setSupplyByLocation([]);
      }

      // Fetch warehouse stockout items
      try {
        const stockoutResponse = await apiHandler.getWarehouseStockoutItems({
          product: selectedProduct,
          location: selectedLocation
        });
        if (stockoutResponse) {
          // Handle both direct response format and wrapped response format
          const data = stockoutResponse.success ? stockoutResponse.data : stockoutResponse;
          setStockoutItems(Array.isArray(data) ? data : []);
        } else {
          setStockoutItems([]);
        }
      } catch (error) {
        console.error('Error fetching stockout items:', error);
        setStockoutItems([]);
      }

      // Fetch warehouse product KPIs
      try {
        const productKPIsResponse = await apiHandler.getWarehouseProductKPIs({
          product: selectedProduct,
          location: selectedLocation
        });
        if (productKPIsResponse) {
          // Handle both direct response format and wrapped response format
          const data = productKPIsResponse.success ? productKPIsResponse.data : productKPIsResponse;
          setProductKPIs(Array.isArray(data) ? data : []);
        } else {
          setProductKPIs([]);
        }
      } catch (error) {
        console.error('Error fetching product KPIs:', error);
        setProductKPIs([]);
      }

    } catch (error) {
      console.error('Error fetching warehouse data:', error);
      // Set empty data if API fails
      setEmptyData();
    } finally {
      setLoading(false);
    }
  };

  const fetchChartData = async () => {
    try {
      // Use centralized API handler instead of direct fetch
      
      // Fetch top 10 products by quantity
      try {
        const topProductsResponse = await apiHandler.getTopProductsByQuantity({
          product: selectedProduct,
          location: selectedLocation
        });
        if (topProductsResponse) {
          // Handle both direct response format and wrapped response format
          const data = topProductsResponse.success ? topProductsResponse.data : topProductsResponse;
          setTopProductsByQuantity(Array.isArray(data) ? data : []);
        } else {
          setTopProductsByQuantity([]);
        }
      } catch (error) {
        console.error('Error fetching top products:', error);
        setTopProductsByQuantity([]);
      }

      // Fetch stock distribution by category
      try {
        const categoryDistributionResponse = await apiHandler.getStockDistributionByCategory({
          product: selectedProduct,
          location: selectedLocation
        });
        if (categoryDistributionResponse) {
          // Handle both direct response format and wrapped response format
          const data = categoryDistributionResponse.success ? categoryDistributionResponse.data : categoryDistributionResponse;
          setStockDistributionByCategory(Array.isArray(data) ? data : []);
        } else {
          setStockDistributionByCategory([]);
        }
      } catch (error) {
        console.error('Error fetching category distribution:', error);
        setStockDistributionByCategory([]);
      }

      // Fetch fast-moving items trend
      try {
        const fastMovingResponse = await apiHandler.getFastMovingItemsTrend({
          product: selectedProduct,
          location: selectedLocation
        });
        if (fastMovingResponse) {
          // Handle both direct response format and wrapped response format
          const data = fastMovingResponse.success ? fastMovingResponse.data : fastMovingResponse;
          setFastMovingItemsTrend(Array.isArray(data) ? data : []);
        } else {
          setFastMovingItemsTrend([]);
        }
      } catch (error) {
        console.error('Error fetching fast moving items:', error);
        setFastMovingItemsTrend([]);
      }

      // Fetch critical stock alerts
      try {
        const criticalStockResponse = await apiHandler.getCriticalStockAlerts({
          product: selectedProduct,
          location: selectedLocation
        });
        if (criticalStockResponse) {
          // Handle both direct response format and wrapped response format
          const data = criticalStockResponse.success ? criticalStockResponse.data : criticalStockResponse;
          setCriticalStockAlerts(Array.isArray(data) ? data : []);
        } else {
          setCriticalStockAlerts([]);
        }
      } catch (error) {
        console.error('Error fetching critical stock alerts:', error);
        setCriticalStockAlerts([]);
      }

      // Fetch inventory by branch and category
      try {
        const branchCategoryResponse = await apiHandler.getInventoryByBranchCategory({
          product: selectedProduct,
          location: selectedLocation
        });
        if (branchCategoryResponse) {
          // Handle both direct response format and wrapped response format
          const data = branchCategoryResponse.success ? branchCategoryResponse.data : branchCategoryResponse;
          setInventoryByBranchCategory(Array.isArray(data) ? data : []);
        } else {
          setInventoryByBranchCategory([]);
        }
      } catch (error) {
        console.error('Error fetching branch category data:', error);
        setInventoryByBranchCategory([]);
      }

    } catch (error) {
      console.error('Error in fetchChartData:', error);
    }
  };

  // Fetch Convenience Store KPIs
  const fetchConvenienceKPIs = async () => {
    try {
      // Get location ID for convenience store
      const locRes = await apiHandler.callAPI('backend.php', 'get_locations');
      
      if (!locRes) {
        setConvenienceKPIs({ totalProducts: 0, lowStock: 0, expiringSoon: 0 });
        return;
      }
      
      // Handle both direct response format and wrapped response format
      const locData = locRes.success ? locRes.data : locRes;
      let locationId = null;
      if (locData && Array.isArray(locData)) {
        const loc = locData.find(l => l.location_name.toLowerCase().includes("convenience"));
        if (loc) locationId = loc.location_id;
      }
      if (!locationId) {
        setConvenienceKPIs({ totalProducts: 0, lowStock: 0, expiringSoon: 0 });
        return;
      }
      
      // Fetch products for convenience store
      const prodRes = await apiHandler.getProductsByLocationName({ location_name: "convenience" });
      
      if (prodRes) {
        // Handle both direct response format and wrapped response format
        const prodData = prodRes.success ? prodRes.data : prodRes;
        if (Array.isArray(prodData)) {
          const products = prodData;
          setConvenienceKPIs({
            totalProducts: products.length,
            lowStock: products.filter(p => p.stock_status === 'low stock').length,
            expiringSoon: products.filter(p => p.expiry_status === 'expiring soon').length
          });
        } else {
          setConvenienceKPIs({ totalProducts: 0, lowStock: 0, expiringSoon: 0 });
        }
      } else {
        setConvenienceKPIs({ totalProducts: 0, lowStock: 0, expiringSoon: 0 });
      }
    } catch (e) { 
      console.error('Error fetching convenience KPIs:', e);
      setConvenienceKPIs({ totalProducts: 0, lowStock: 0, expiringSoon: 0 }); 
    }
  };

  // Fetch Pharmacy KPIs
  const fetchPharmacyKPIs = async () => {
    try {
      // Get location ID for pharmacy
      const locRes = await apiHandler.callAPI('backend.php', 'get_locations');
      
      if (!locRes) {
        setPharmacyKPIs({ totalProducts: 0, lowStock: 0, expiringSoon: 0 });
        return;
      }
      
      // Handle both direct response format and wrapped response format
      const locData = locRes.success ? locRes.data : locRes;
      let locationId = null;
      if (locData && Array.isArray(locData)) {
        const loc = locData.find(l => l.location_name.toLowerCase().includes("pharmacy"));
        if (loc) locationId = loc.location_id;
      }
      if (!locationId) {
        setPharmacyKPIs({ totalProducts: 0, lowStock: 0, expiringSoon: 0 });
        return;
      }
      
      // Fetch products for pharmacy
      const prodRes = await apiHandler.getProductsByLocationName({ location_name: "pharmacy" });
      
      if (prodRes) {
        // Handle both direct response format and wrapped response format
        const prodData = prodRes.success ? prodRes.data : prodRes;
        if (Array.isArray(prodData)) {
          const products = prodData;
          setPharmacyKPIs({
            totalProducts: products.length,
            lowStock: products.filter(p => p.stock_status === 'low stock').length,
            expiringSoon: products.filter(p => p.expiry_status === 'expiring soon').length
          });
        } else {
          setPharmacyKPIs({ totalProducts: 0, lowStock: 0, expiringSoon: 0 });
        }
      } else {
        setPharmacyKPIs({ totalProducts: 0, lowStock: 0, expiringSoon: 0 });
      }
    } catch (e) { 
      console.error('Error fetching pharmacy KPIs:', e);
      setPharmacyKPIs({ totalProducts: 0, lowStock: 0, expiringSoon: 0 }); 
    }
  };

  // Fetch Transfer KPIs
  const fetchTransferKPIs = async () => {
    try {
      const res = await apiHandler.getTransfers();
      
      if (res) {
        // Handle both direct response format and wrapped response format
        const data = res.success ? res.data : res;
        if (Array.isArray(data)) {
          setTransferKPIs({
            totalTransfers: data.length,
            activeTransfers: data.filter(t => t.status === 'pending').length
          });
        } else {
          setTransferKPIs({ totalTransfers: 0, activeTransfers: 0 });
        }
      } else {
        setTransferKPIs({ totalTransfers: 0, activeTransfers: 0 });
      }
    } catch (e) { 
      console.error('Error fetching transfer KPIs:', e);
      setTransferKPIs({ totalTransfers: 0, activeTransfers: 0 }); 
    }
  };

  const setEmptyData = () => {
    setWarehouseData({
      totalProducts: 0,
      totalSuppliers: 0,
      storageCapacity: 0,
      warehouseValue: 0,
      lowStockItems: 0,
      expiringSoon: 0,
      totalBatches: 0,
      activeTransfers: 0
    });

    setSupplyByProduct([]);
    setSupplyByLocation([]);
    setReturnRateByProduct([]);
    setStockoutItems([]);
    setProductKPIs([]);
  }; 

  const formatNumber = (num) => {
    if (num === undefined || num === null || isNaN(num)) {
      return '0';
    }
    
    // Add thousand separators
    return num.toLocaleString();
  };

  const formatCurrency = (num) => {
    if (num === undefined || num === null || isNaN(num)) {
      return '₱0';
    }
    return '₱' + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const formatPercentage = (num) => {
    if (num === undefined || num === null || isNaN(num)) {
      return '0.00%';
    }
    const numericValue = typeof num === 'string' ? parseFloat(num) : num;
    if (isNaN(numericValue)) {
      return '0.00%';
    }
    return numericValue.toFixed(2) + '%';
  };

  // Chart rendering functions
  const renderBarChart = (data, title) => {
    const maxValue = Math.max(...data.map(item => item.quantity || 0));
    
    return (
      <div className="p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
        <h3 className="text-base sm:text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>{title}</h3>
        <div className="space-y-2 sm:space-y-3">
          {data.slice(0, 10).map((item, index) => (
            <div key={index} className="flex items-center space-x-2 sm:space-x-3">
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm truncate" style={{ color: theme.text.secondary }}>{item.product || 'Unknown Product'}</p>
              </div>
              <div className="flex-1 min-w-0">
                <div className="w-full rounded-full h-2" style={{ backgroundColor: theme.border.light }}>
                  <div 
                    className="h-2 rounded-full"
                    style={{ 
                      width: `${((item.quantity || 0) / maxValue) * 100}%`,
                      backgroundColor: theme.colors.accent
                    }}
                  ></div>
                </div>
              </div>
              <div className="text-xs w-12 sm:w-16 text-right flex-shrink-0" style={{ color: theme.text.muted }}>
                {formatNumber(item.quantity || 0)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderPieChart = (data, title) => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
    
    return (
      <div className="p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
        <h3 className="text-base sm:text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>{title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-center justify-center">
            <div className="relative w-24 h-24 sm:w-32 sm:h-32">
              {data.map((item, index) => {
                const percentage = (item.quantity / data.reduce((sum, d) => sum + d.quantity, 0)) * 100;
                const rotation = data.slice(0, index).reduce((sum, d) => sum + (d.quantity / data.reduce((total, dt) => total + dt.quantity, 0)) * 360, 0);
                
                return (
                  <div
                    key={index}
                    className="absolute inset-0 rounded-full"
                    style={{
                      background: `conic-gradient(${colors[index % colors.length]} ${rotation}deg, ${colors[index % colors.length]} ${rotation + (percentage * 3.6)}deg, transparent ${rotation + (percentage * 3.6)}deg)`
                    }}
                  ></div>
                );
              })}
              <div className="absolute inset-3 sm:inset-4 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.bg.card }}>
                <span className="text-xs sm:text-sm font-semibold" style={{ color: theme.text.secondary }}>Total</span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: colors[index % colors.length] }}
                ></div>
                <span className="text-xs sm:text-sm truncate" style={{ color: theme.text.secondary }}>{item.category}</span>
                <span className="text-xs ml-auto flex-shrink-0" style={{ color: theme.text.muted }}>{formatNumber(item.quantity)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderLineChart = (data, title) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    return (
      <div className="p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
        <h3 className="text-base sm:text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>{title}</h3>
        <div className="h-48 sm:h-64 flex items-end justify-between space-x-1">
          {months.map((month, index) => {
            const monthData = data.find(item => item.month === month) || { quantity: 0 };
            const maxValue = Math.max(...data.map(item => item.quantity || 0));
            const height = maxValue > 0 ? (monthData.quantity / maxValue) * 100 : 0;
            
            return (
              <div key={index} className="flex flex-col items-center space-y-2">
                <div 
                  className="w-6 sm:w-8 rounded-t"
                  style={{ 
                    height: `${height}%`,
                    backgroundColor: theme.colors.accent
                  }}
                ></div>
                <span className="text-xs" style={{ color: theme.text.muted }}>{month}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-4 space-y-1">
          {data.slice(0, 3).map((item, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: theme.colors.accent }}></div>
              <span className="text-xs truncate" style={{ color: theme.text.secondary }}>{item.product}</span>
              <span className="text-xs ml-auto flex-shrink-0" style={{ color: theme.text.muted }}>{formatNumber(item.quantity)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderGauge = (data, title) => {
    const criticalLevel = data.length;
    const maxCritical = 20; // Maximum critical level
    const percentage = Math.min((criticalLevel / maxCritical) * 100, 100);
    
    return (
      <div className="p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
        <h3 className="text-base sm:text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>{title}</h3>
        <div className="flex items-center justify-center">
          <div className="relative w-24 h-24 sm:w-32 sm:h-32">
            <div className="absolute inset-0 rounded-full" style={{ backgroundColor: theme.border.light }}></div>
            <div 
              className="absolute inset-0 rounded-full"
              style={{
                clipPath: `polygon(50% 50%, 50% 0%, ${50 + (percentage * 0.8)}% 0%, ${50 + (percentage * 0.8)}% 100%, 50% 100%)`,
                backgroundColor: percentage > 80 ? theme.colors.danger : percentage > 50 ? theme.colors.warning : theme.colors.success
              }}
            ></div>
            <div className="absolute inset-3 sm:inset-4 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.bg.card }}>
              <div className="text-center">
                <div className="text-lg sm:text-2xl font-bold" style={{ color: theme.text.primary }}>{criticalLevel}</div>
                <div className="text-xs" style={{ color: theme.text.muted }}>Critical</div>
              </div>
            </div>
          </div>
        </div>
        <div className="mt-4 space-y-1">
          {data.slice(0, 5).map((item, index) => (
            <div key={index} className="flex items-center justify-between text-xs">
              <span className="truncate min-w-0 flex-1" style={{ color: theme.text.secondary }}>{item.product}</span>
              <span className="font-medium flex-shrink-0 ml-2" style={{ color: theme.colors.danger }}>{item.quantity}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderStackedColumn = (data, title) => {
    const categories = [...new Set(data.map(item => {
    // Handle both string and object category formats
    if (typeof item.category === 'string') {
      return item.category;
    } else if (item.category && typeof item.category === 'object' && item.category.category_name) {
      return item.category.category_name;
    }
    return null;
  }).filter(Boolean))];
    const locations = [...new Set(data.map(item => item.location))];
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];
    
    return (
      <div className="p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
        <h3 className="text-base sm:text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>{title}</h3>
        <div className="space-y-3 sm:space-y-4">
          {locations.map((location, locIndex) => (
            <div key={locIndex} className="space-y-2">
              <div className="text-xs sm:text-sm font-medium" style={{ color: theme.text.secondary }}>{location}</div>
              <div className="flex items-end space-x-1 h-16 sm:h-20">
                {categories.map((category, catIndex) => {
                  const item = data.find(d => d.location === location && d.category === category);
                  const quantity = item ? item.quantity : 0;
                  const maxValue = Math.max(...data.map(d => d.quantity || 0));
                  const height = maxValue > 0 ? (quantity / maxValue) * 100 : 0;
                  
                  return (
                    <div key={catIndex} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full rounded-t"
                        style={{ 
                          height: `${height}%`,
                          backgroundColor: colors[catIndex % colors.length]
                        }}
                      ></div>
                      <span className="text-xs mt-1" style={{ color: theme.text.muted }}>{formatNumber(quantity)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-1 sm:gap-2">
          {categories.map((category, index) => (
            <div key={index} className="flex items-center space-x-1">
              <div 
                className="w-3 h-3 rounded flex-shrink-0"
                style={{ backgroundColor: colors[index % colors.length] }}
              ></div>
              <span className="text-xs truncate" style={{ color: theme.text.secondary }}>{typeof category === 'string' ? category : (category?.category_name || 'Unknown')}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bg.primary }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: theme.colors.accent }}></div>
          <p className="mt-4" style={{ color: theme.text.secondary }}>Loading warehouse data...</p>
          {retryCount > 0 && (
            <p className="mt-2 text-sm" style={{ color: theme.text.muted }}>Retry attempt: {retryCount}</p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: theme.bg.primary }}>
        <div className="text-center max-w-md mx-auto p-6">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-4" style={{ color: theme.text.primary }}>Connection Error</h2>
          <p className="mb-6" style={{ color: theme.text.secondary }}>{error}</p>
          <button 
            onClick={retryFetch}
            className="px-6 py-3 rounded-lg font-medium transition-colors duration-200"
            style={{ 
              backgroundColor: theme.colors.accent, 
              color: 'white',
              border: 'none',
              cursor: 'pointer'
            }}
            onMouseOver={(e) => e.target.style.opacity = '0.9'}
            onMouseOut={(e) => e.target.style.opacity = '1'}
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg.primary }}>
      {/* Header */}
      <div className="p-6" style={{ backgroundColor: theme.colors.accent }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-6 mb-4">
              <span className="border-b-2 pb-1" style={{ color: theme.text.primary, borderColor: theme.text.primary }}>Warehouse Overview</span>
              <span style={{ color: theme.text.secondary }}>Inventory Analytics</span>
              <span style={{ color: theme.text.secondary }}>Stock Reports</span>
            </div>
            <h1 className="text-3xl font-bold" style={{ color: theme.text.primary }}>Warehouse Management</h1>
          </div>
          <div className="flex space-x-4">
            <select 
              value={selectedProduct} 
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="px-3 py-2 rounded border"
              style={{ 
                backgroundColor: theme.bg.card, 
                color: theme.text.primary,
                borderColor: theme.border.default
              }}
            >
              <option value="All">All Categories</option>
              {categories.map((category, index) => (
                <option key={index} value={typeof category === 'string' ? category : (category?.category_name || 'Unknown')}>
                  {typeof category === 'string' ? category : (category?.category_name || 'Unknown')}
                </option>
              ))}
            </select>
            <select 
              value={selectedLocation} 
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-3 py-2 rounded border"
              style={{ 
                backgroundColor: theme.bg.card, 
                color: theme.text.primary,
                borderColor: theme.border.default
              }}
            >
              <option value="Warehouse">Warehouse</option>
              {locations.map((location, index) => (
                <option key={index} value={location.location_name}>
                  {location.location_name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Warehouse KPIs Section */}
      <div className="p-6 space-y-6">
        {/* Main Warehouse KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          <div className="p-3 sm:p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between min-h-[120px]" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <p className="text-xs sm:text-sm mb-1" style={{ color: theme.text.secondary }}>Total Products</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold" style={{ color: theme.text.primary }}>
              {formatNumber(warehouseData.totalProducts)}
            </p>
          </div>
          <div className="p-3 sm:p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between min-h-[120px]" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <p className="text-xs sm:text-sm mb-1" style={{ color: theme.text.secondary }}>Total Suppliers</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold" style={{ color: theme.text.primary }}>{formatNumber(warehouseData.totalSuppliers)}</p>
          </div>
          <div className="p-3 sm:p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between min-h-[120px]" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <p className="text-xs sm:text-sm mb-1" style={{ color: theme.text.secondary }}>Warehouse Value</p>
            <p className="text-sm sm:text-base lg:text-lg xl:text-2xl font-bold break-words" style={{ color: theme.text.primary }}>{formatCurrency(warehouseData.warehouseValue)}</p>
          </div>
          <div className="p-3 sm:p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between min-h-[120px]" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <p className="text-xs sm:text-sm mb-1" style={{ color: theme.text.secondary }}>Low Stock Items</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold" style={{ color: theme.text.primary }}>{formatNumber(warehouseData.lowStockItems)}</p>
          </div>
          <div className="p-3 sm:p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between min-h-[120px]" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <p className="text-xs sm:text-sm mb-1" style={{ color: theme.text.secondary }}>Expiring Soon</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold" style={{ color: theme.text.primary }}>{formatNumber(warehouseData.expiringSoon)}</p>
          </div>
          <div className="p-3 sm:p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between min-h-[120px]" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <p className="text-xs sm:text-sm mb-1" style={{ color: theme.text.secondary }}>Total Batches</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold" style={{ color: theme.text.primary }}>{formatNumber(warehouseData.totalBatches)}</p>
          </div>
          <div className="p-3 sm:p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 flex flex-col justify-between min-h-[120px]" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <p className="text-xs sm:text-sm mb-1" style={{ color: theme.text.secondary }}>Active Transfers</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold" style={{ color: theme.text.primary }}>{formatNumber(warehouseData.activeTransfers)}</p>
          </div>
        </div>

        {/* Module KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Convenience Store KPIs */}
          <div className="p-3 sm:p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <p className="text-xs sm:text-sm mb-1" style={{ color: theme.text.secondary }}>Convenience Store - Total Products</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold" style={{ color: theme.text.primary }}>{formatNumber(convenienceKPIs.totalProducts)}</p>
            <p className="text-xs sm:text-sm mb-1" style={{ color: theme.text.secondary }}>Low Stock</p>
            <p className="text-base sm:text-lg lg:text-xl font-bold" style={{ color: theme.colors.warning }}>{formatNumber(convenienceKPIs.lowStock)}</p>
            <p className="text-xs sm:text-sm mb-1" style={{ color: theme.text.secondary }}>Expiring Soon</p>
            <p className="text-base sm:text-lg lg:text-xl font-bold" style={{ color: theme.colors.warning }}>{formatNumber(convenienceKPIs.expiringSoon)}</p>
          </div>
          {/* Pharmacy KPIs */}
          <div className="p-3 sm:p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <p className="text-xs sm:text-sm mb-1" style={{ color: theme.text.secondary }}>Pharmacy - Total Products</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold" style={{ color: theme.text.primary }}>{formatNumber(pharmacyKPIs.totalProducts)}</p>
            <p className="text-xs sm:text-sm mb-1" style={{ color: theme.text.secondary }}>Low Stock</p>
            <p className="text-base sm:text-lg lg:text-xl font-bold" style={{ color: theme.colors.warning }}>{formatNumber(pharmacyKPIs.lowStock)}</p>
            <p className="text-xs sm:text-sm mb-1" style={{ color: theme.text.secondary }}>Expiring Soon</p>
            <p className="text-base sm:text-lg lg:text-xl font-bold" style={{ color: theme.colors.warning }}>{formatNumber(pharmacyKPIs.expiringSoon)}</p>
          </div>
          {/* Transfer KPIs */}
          <div className="p-3 sm:p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 sm:col-span-2 lg:col-span-1" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <p className="text-xs sm:text-sm mb-1" style={{ color: theme.text.secondary }}>Total Transfers</p>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold" style={{ color: theme.text.primary }}>{formatNumber(transferKPIs.totalTransfers)}</p>
            <p className="text-xs sm:text-sm mb-1" style={{ color: theme.text.secondary }}>Active Transfers</p>
            <p className="text-base sm:text-lg lg:text-xl font-bold" style={{ color: theme.colors.accent }}>{formatNumber(transferKPIs.activeTransfers)}</p>
          </div>
        </div>

        {/* Charts Section - First Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Bar Chart - Top 10 products by quantity */}
          {renderBarChart(topProductsByQuantity, "Top 10 Products by Quantity")}
          
          {/* Pie Chart - Stock distribution by category */}
          {renderPieChart(stockDistributionByCategory, "Stock Distribution by Category")}
        </div>

        {/* Charts Section - Second Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          {/* Line Chart - Stock trend of fast-moving items */}
          {renderLineChart(fastMovingItemsTrend, "Fast-Moving Items Trend")}
          
          {/* Gauge - Critical stock alerts */}
          {renderGauge(criticalStockAlerts, "Critical Stock Alerts")}
          
          {/* Stacked Column - Inventory by branch and category */}
          <div className="sm:col-span-2 lg:col-span-1">
            {renderStackedColumn(inventoryByBranchCategory, "Inventory by Branch & Category")}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Warehouse Stockout Items */}
          <div className="p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <h3 className="text-base sm:text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>Warehouse Stockout Items</h3>
            <div className="h-64 sm:h-80 flex items-end justify-between space-x-1">
              {Array.isArray(stockoutItems) && stockoutItems.map((item, index) => (
                <div key={index} className="flex flex-col items-center space-y-2">
                  <div 
                    className="w-6 sm:w-8 rounded-t"
                    style={{ 
                      height: `${Math.abs(item.stockout || 0) / 20}px`,
                      backgroundColor: theme.colors.danger
                    }}
                  ></div>
                  <span className="text-xs rotate-45 transform origin-left" style={{ color: theme.text.muted }}>
                    {item.product && item.product.length > 12 ? item.product.substring(0, 12) + '...' : (item.product || 'Unknown')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Warehouse Products KPIs Table */}
          <div className="p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
            <h3 className="text-base sm:text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>Warehouse Products KPIs</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs sm:text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${theme.border.default}` }}>
                    <th className="text-left py-2" style={{ color: theme.text.primary }}>Product name</th>
                    <th className="text-right py-2" style={{ color: theme.text.primary }}>Quantity</th>
                    <th className="text-right py-2" style={{ color: theme.text.primary }}>Unit Price</th>
                    <th className="text-right py-2" style={{ color: theme.text.primary }}>Total Value</th>
                    <th className="text-right py-2" style={{ color: theme.text.primary }}>Supplier</th>
                    <th className="text-right py-2" style={{ color: theme.text.primary }}>Batch</th>
                    <th className="text-right py-2" style={{ color: theme.text.primary }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.isArray(productKPIs) && productKPIs.map((item, index) => (
                    <tr key={index} style={{ borderBottom: `1px solid ${theme.border.light}` }}>
                      <td className="py-2 truncate max-w-20 sm:max-w-none" style={{ color: theme.text.primary }}>{item.product || 'Unknown Product'}</td>
                      <td className="py-2 text-right" style={{ color: theme.text.secondary }}>{item.quantity || 0}</td>
                      <td className="py-2 text-right" style={{ color: theme.text.secondary }}>{formatCurrency(item.unitPrice || 0)}</td>
                      <td className="py-2 text-right" style={{ color: theme.text.secondary }}>{formatCurrency((item.quantity || 0) * (item.unitPrice || 0))}</td>
                      <td className="py-2 text-right" style={{ color: theme.text.secondary }}>{item.supplier || 'N/A'}</td>
                      <td className="py-2 text-right" style={{ color: theme.text.secondary }}>{item.batch || 'N/A'}</td>
                      <td className="py-2 text-right" style={{ color: theme.text.secondary }}>{item.status || 'Active'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;