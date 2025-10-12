"use client";

import React, { useState, useEffect } from "react";
import { useTheme } from "./ThemeContext";
import apiHandler from '../lib/apiHandler';

function Dashboard() {
  const { theme } = useTheme();
  const [selectedProduct, setSelectedProduct] = useState("All");
  const [selectedLocation, setSelectedLocation] = useState("Warehouse");
  const [selectedTimePeriod, setSelectedTimePeriod] = useState("monthly");
  const [categories, setCategories] = useState([]);
  const [locations, setLocations] = useState([]);
  const [warehouseData, setWarehouseData] = useState({
    totalProducts: 0,
    totalSuppliers: 0,
    storageCapacity: 0,
    warehouseValue: 0,
    lowStockItems: 0,
    expiringSoon: 0,
    totalBatches: 0
  });
  const [supplyByProduct, setSupplyByProduct] = useState([]);
  const [supplyByLocation, setSupplyByLocation] = useState([]);
  const [returnRateByProduct, setReturnRateByProduct] = useState([]);
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

  // Add new state for other modules' KPIs
  const [convenienceKPIs, setConvenienceKPIs] = useState({ totalProducts: 0, lowStock: 0, expiringSoon: 0 });
  const [pharmacyKPIs, setPharmacyKPIs] = useState({ totalProducts: 0, lowStock: 0, expiringSoon: 0 });
  const [transferKPIs, setTransferKPIs] = useState({ totalTransfers: 0, activeTransfers: 0 });
  
  // Debug state
  const [debugInfo, setDebugInfo] = useState({
    lastFetch: null,
    apiErrors: [],
    dataSources: {
      warehouse: 'pending',
      convenience: 'pending',
      pharmacy: 'pending',
      transfers: 'pending',
      charts: 'pending'
    }
  });

  // Retry function
  const retryFetch = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    fetchAllData();
  };

  // Add fallback data for testing/demo purposes
  const getFallbackData = () => {
    return {
      warehouseData: {
        totalProducts: 156,
        totalSuppliers: 12,
        storageCapacity: 75,
        warehouseValue: 125000,
        lowStockItems: 8,
        expiringSoon: 3,
        totalBatches: 45
      },
      convenienceKPIs: {
        totalProducts: 89,
        lowStock: 5,
        expiringSoon: 2
      },
      pharmacyKPIs: {
        totalProducts: 67,
        lowStock: 3,
        expiringSoon: 1
      },
      transferKPIs: {
        totalTransfers: 15,
        activeTransfers: 2
      },
      fastMovingItemsTrend: [
        { product: 'Mang Tomas', quantity: 195 },
        { product: 'Lucky Me Pancit Canton', quantity: 142 },
        { product: 'Nissin Cup Noodles', quantity: 125 },
        { product: 'Skyflakes Crackers', quantity: 103 },
        { product: 'Bear Brand Milk', quantity: 89 },
        { product: 'Coca Cola 1.5L', quantity: 78 },
        { product: 'Sprite 1.5L', quantity: 65 },
        { product: 'Royal Tru Orange', quantity: 58 },
        { product: 'Pepsi 1.5L', quantity: 52 },
        { product: 'Mirinda Orange', quantity: 45 }
      ],
      criticalStockAlerts: [
        { product: 'Lava Cake', quantity: 0 },
        { product: 'Hot&Spicicy Ketchup', quantity: 8 },
        { product: 'Pinoy Spicy', quantity: 10 }
      ]
    };
  };

  // Fetch all data function
  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🚀 Starting dashboard data fetch...');
      
      // Update debug info
      setDebugInfo(prev => ({
        ...prev,
        lastFetch: new Date().toLocaleTimeString(),
        apiErrors: [],
        dataSources: {
          warehouse: 'loading',
          convenience: 'loading',
          pharmacy: 'loading',
          transfers: 'loading',
          charts: 'loading'
        }
      }));
      
      // Fetch data sequentially to avoid overwhelming the server
      await fetchCategoriesAndLocations();
      await fetchWarehouseData();
      await fetchChartData();
      await fetchConvenienceKPIs();
      await fetchPharmacyKPIs();
      await fetchTransferKPIs();
      
      console.log('✅ All dashboard data fetched successfully');
    } catch (error) {
      console.error('❌ Error fetching all data:', error);
      setError('Failed to load dashboard data. Please check your connection and try again.');
      
      // Update debug info with error
      setDebugInfo(prev => ({
        ...prev,
        apiErrors: [...prev.apiErrors, error.message].slice(-5)
      }));
      
      // Only set fallback data if no real data was fetched
      const hasRealData = warehouseData.totalProducts > 0 || 
                         convenienceKPIs.totalProducts > 0 || 
                         pharmacyKPIs.totalProducts > 0 || 
                         transferKPIs.totalTransfers > 0;
      
      if (!hasRealData) {
        console.log('🔄 Setting fallback data for demo...');
        const fallback = getFallbackData();
        setWarehouseData(fallback.warehouseData);
        setConvenienceKPIs(fallback.convenienceKPIs);
        setPharmacyKPIs(fallback.pharmacyKPIs);
        setTransferKPIs(fallback.transferKPIs);
        setFastMovingItemsTrend(fallback.fastMovingItemsTrend);
        setCriticalStockAlerts(fallback.criticalStockAlerts);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch data from database
  useEffect(() => {
    fetchAllData();
  }, [selectedProduct, selectedLocation, selectedTimePeriod, retryCount]);

  const fetchCategoriesAndLocations = async () => {
    try {
      console.log('📋 Fetching categories and locations...');
      
      // Use centralized API handler instead of direct fetch
      const [categoriesResponse, locationsResponse] = await Promise.all([
        apiHandler.callAPI('backend.php', 'get_categories'),
        apiHandler.callAPI('backend.php', 'get_locations')
      ]);
      
      console.log('📂 Categories response:', categoriesResponse);
      console.log('📍 Locations response:', locationsResponse);
      
      if (categoriesResponse) {
        // Handle both direct response format and wrapped response format
        const data = categoriesResponse.success ? categoriesResponse.data : categoriesResponse;
        const categories = Array.isArray(data) ? data : [];
        console.log('📊 Categories count:', categories.length);
        setCategories(categories);
      } else {
        console.warn("⚠️ Unexpected categories response format:", categoriesResponse);
        setCategories([]);
      }
      
      if (locationsResponse) {
        // Handle both direct response format and wrapped response format
        const data = locationsResponse.success ? locationsResponse.data : locationsResponse;
        const locations = Array.isArray(data) ? data : [];
        console.log('📊 Locations count:', locations.length);
        setLocations(locations);
      } else {
        console.warn("⚠️ Unexpected locations response format:", locationsResponse);
        setLocations([]);
      }
    } catch (error) {
      console.error('❌ Error fetching categories and locations:', error);
      setCategories([]);
      setLocations([]);
    }
  };

  const fetchWarehouseData = async () => {
    try {
      console.log('🏭 Fetching warehouse data...');
      
      // Use centralized API handler instead of direct fetch
      const warehouseResponse = await apiHandler.getWarehouseKPIs({
        product: selectedProduct,
        location: selectedLocation,
        timePeriod: selectedTimePeriod
      });
      
      console.log('📊 Warehouse KPIs response:', warehouseResponse);
      
      if (warehouseResponse && warehouseResponse.success) {
        const data = warehouseResponse.data;
        
        console.log('📈 Warehouse KPIs data:', data);
        
        // Set warehouse data with fallback values
        setWarehouseData({
          totalProducts: parseInt(data.totalProducts) || 0,
          totalSuppliers: parseInt(data.totalSuppliers) || 0,
          storageCapacity: parseInt(data.storageCapacity) || 75,
          warehouseValue: parseFloat(data.warehouseValue) || 0,
          lowStockItems: parseInt(data.lowStockItems) || 0,
          expiringSoon: parseInt(data.expiringSoon) || 0,
          totalBatches: parseInt(data.totalBatches) || 0
        });
        
        console.log('✅ Warehouse data set successfully:', {
          totalProducts: parseInt(data.totalProducts) || 0,
          totalSuppliers: parseInt(data.totalSuppliers) || 0,
          storageCapacity: parseInt(data.storageCapacity) || 75,
          warehouseValue: parseFloat(data.warehouseValue) || 0,
          lowStockItems: parseInt(data.lowStockItems) || 0,
          expiringSoon: parseInt(data.expiringSoon) || 0,
          totalBatches: parseInt(data.totalBatches) || 0
        });
        
        // Update debug info
        setDebugInfo(prev => ({
          ...prev,
          dataSources: { ...prev.dataSources, warehouse: 'success' }
        }));
      } else {
        console.warn("⚠️ No warehouse response received or failed:", warehouseResponse?.message || 'Unknown error');
        // Try to get basic product count as fallback
        try {
          const productsResponse = await apiHandler.callAPI('backend.php', 'get_products', { location: 'Warehouse' });
          if (productsResponse && productsResponse.success) {
            const products = productsResponse.data || [];
            setWarehouseData(prev => ({
              ...prev,
              totalProducts: products.length,
              totalSuppliers: new Set(products.map(p => p.supplier_id)).size,
              totalBatches: new Set(products.map(p => p.batch_id)).size
            }));
          }
        } catch (fallbackError) {
          console.error('Fallback warehouse data fetch failed:', fallbackError);
        }
      }

      // Fetch supply by product for warehouse
      try {
        const supplyProductResponse = await apiHandler.getWarehouseSupplyByProduct({
          product: selectedProduct,
          location: selectedLocation,
          timePeriod: selectedTimePeriod
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
          location: selectedLocation,
          timePeriod: selectedTimePeriod
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
      console.log('📊 Fetching chart data...');
      
      // Fetch top 10 products by quantity
      try {
        const topProductsResponse = await apiHandler.getTopProductsByQuantity({
          product: selectedProduct,
          location: selectedLocation,
          timePeriod: selectedTimePeriod
        });
        if (topProductsResponse && topProductsResponse.success) {
          const data = topProductsResponse.data || [];
          console.log('📈 Top products data:', data);
          setTopProductsByQuantity(Array.isArray(data) ? data : []);
        } else {
          console.warn('⚠️ No top products data received:', topProductsResponse?.message || 'Unknown error');
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
          location: selectedLocation,
          timePeriod: selectedTimePeriod
        });
        if (categoryDistributionResponse && categoryDistributionResponse.success) {
          const data = categoryDistributionResponse.data || [];
          console.log('📊 Category distribution data:', data);
          setStockDistributionByCategory(Array.isArray(data) ? data : []);
        } else {
          console.warn('⚠️ No category distribution data received:', categoryDistributionResponse?.message || 'Unknown error');
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
          location: selectedLocation,
          timePeriod: selectedTimePeriod
        });
        if (fastMovingResponse && fastMovingResponse.success) {
          const data = fastMovingResponse.data || [];
          
          if (Array.isArray(data) && data.length > 0) {
            // The API returns trend data with product, month, and quantity
            // We need to transform this for the chart component
            const processedData = data.map(item => ({
              product: item.product || 'Unknown Product',
              quantity: item.quantity || 0,
              month: item.month || 'Unknown'
            }));
            
            console.log('📈 Fast moving items trend data:', processedData);
            console.log('📊 Metadata:', fastMovingResponse.metadata);
            setFastMovingItemsTrend(processedData);
          } else {
            console.warn('⚠️ Empty fast moving items data received');
            setFastMovingItemsTrend([]);
          }
        } else {
          console.warn('⚠️ No fast moving items data received:', fastMovingResponse?.message || 'Unknown error');
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
          location: selectedLocation,
          timePeriod: selectedTimePeriod
        });
        if (criticalStockResponse && criticalStockResponse.success) {
          const data = criticalStockResponse.data || [];
          console.log('⚠️ Critical stock alerts data:', data);
          setCriticalStockAlerts(Array.isArray(data) ? data : []);
        } else {
          console.warn('⚠️ No critical stock alerts data received:', criticalStockResponse?.message || 'Unknown error');
          setCriticalStockAlerts([]);
        }
      } catch (error) {
        console.error('Error fetching critical stock alerts:', error);
        setCriticalStockAlerts([]);
      }

    } catch (error) {
      console.error('Error in fetchChartData:', error);
    }
  };

  // Fetch Convenience Store KPIs
  const fetchConvenienceKPIs = async () => {
    try {
      console.log('🛒 Fetching convenience store KPIs...');
      
      // Get locations first to find the correct location name
      const locRes = await apiHandler.callAPI('backend.php', 'get_locations');
      
      if (!locRes || !locRes.success) {
        console.warn('⚠️ No locations response received');
        setConvenienceKPIs({ totalProducts: 0, lowStock: 0, expiringSoon: 0 });
        return;
      }
      
      const locData = locRes.data || [];
      let convenienceLocationName = null;
      
      if (Array.isArray(locData)) {
        console.log('📍 Available locations:', locData.map(l => l.location_name));
        
        // Try different variations of convenience store names
        const convenienceVariations = ['convenience', 'convenience store', 'convenience_store'];
        const loc = locData.find(l => 
          convenienceVariations.some(variation => 
            l.location_name.toLowerCase().includes(variation)
          ) || l.location_name === 'Convenience Store'
        );
        
        if (loc) {
          convenienceLocationName = loc.location_name;
          console.log('✅ Found convenience location:', convenienceLocationName);
        } else {
          console.warn('⚠️ No convenience store location found. Available locations:', locData.map(l => l.location_name));
          // Try to use the first location that's not warehouse as fallback
          const nonWarehouseLoc = locData.find(l => 
            !l.location_name.toLowerCase().includes('warehouse') && 
            !l.location_name.toLowerCase().includes('pharmacy')
          );
          if (nonWarehouseLoc) {
            convenienceLocationName = nonWarehouseLoc.location_name;
            console.log('🔄 Using fallback location for convenience:', convenienceLocationName);
          }
        }
      }
      
      if (!convenienceLocationName) {
        console.warn('⚠️ No suitable location found for convenience store');
        setConvenienceKPIs({ totalProducts: 0, lowStock: 0, expiringSoon: 0 });
        return;
      }
      
      // Fetch products for convenience store using the exact location name
      const prodRes = await apiHandler.callAPI('backend.php', 'get_products_by_location_name', { 
        location_name: convenienceLocationName 
      });
      
      console.log('📦 Convenience products response:', prodRes);
      
      if (prodRes && prodRes.success) {
        const products = prodRes.data || [];
        console.log('📊 Convenience products count:', products.length);
        
        // Calculate KPIs with better error handling
        const totalProducts = products.length;
        const lowStock = products.filter(p => 
          p.stock_status === 'low stock' || 
          (p.quantity !== undefined && p.quantity <= 10 && p.quantity > 0)
        ).length;
        const expiringSoon = products.filter(p => {
          if (!p.expiration) return false;
          const expiryDate = new Date(p.expiration);
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          return expiryDate <= thirtyDaysFromNow;
        }).length;
        
        console.log('📈 Convenience KPIs:', { totalProducts, lowStock, expiringSoon });
        
        setConvenienceKPIs({
          totalProducts,
          lowStock,
          expiringSoon
        });
        
        // Update debug info
        setDebugInfo(prev => ({
          ...prev,
          dataSources: { ...prev.dataSources, convenience: 'success' }
        }));
      } else {
        console.warn('⚠️ No convenience products data received:', prodRes?.message || 'Unknown error');
        setConvenienceKPIs({ totalProducts: 0, lowStock: 0, expiringSoon: 0 });
      }
    } catch (e) { 
      console.error('❌ Error fetching convenience KPIs:', e);
      setConvenienceKPIs({ totalProducts: 0, lowStock: 0, expiringSoon: 0 }); 
    }
  };

  // Fetch Pharmacy KPIs
  const fetchPharmacyKPIs = async () => {
    try {
      console.log('💊 Fetching pharmacy KPIs...');
      
      // Get locations first to find the correct location name
      const locRes = await apiHandler.callAPI('backend.php', 'get_locations');
      
      if (!locRes || !locRes.success) {
        console.warn('⚠️ No locations response received');
        setPharmacyKPIs({ totalProducts: 0, lowStock: 0, expiringSoon: 0 });
        return;
      }
      
      const locData = locRes.data || [];
      let pharmacyLocationName = null;
      
      if (Array.isArray(locData)) {
        console.log('📍 Available locations:', locData.map(l => l.location_name));
        
        // Try different variations of pharmacy names
        const pharmacyVariations = ['pharmacy', 'pharmacy store', 'pharmacy_store'];
        const loc = locData.find(l => 
          pharmacyVariations.some(variation => 
            l.location_name.toLowerCase().includes(variation)
          ) || l.location_name === 'Pharmacy Store'
        );
        
        if (loc) {
          pharmacyLocationName = loc.location_name;
          console.log('✅ Found pharmacy location:', pharmacyLocationName);
        } else {
          console.warn('⚠️ No pharmacy location found. Available locations:', locData.map(l => l.location_name));
          // Try to use the first location that contains 'pharmacy' as fallback
          const pharmacyLoc = locData.find(l => 
            l.location_name.toLowerCase().includes('pharmacy')
          );
          if (pharmacyLoc) {
            pharmacyLocationName = pharmacyLoc.location_name;
            console.log('🔄 Using pharmacy location:', pharmacyLocationName);
          }
        }
      }
      
      if (!pharmacyLocationName) {
        console.warn('⚠️ No suitable location found for pharmacy');
        setPharmacyKPIs({ totalProducts: 0, lowStock: 0, expiringSoon: 0 });
        return;
      }
      
      // Fetch products for pharmacy using the exact location name
      const prodRes = await apiHandler.callAPI('backend.php', 'get_products_by_location_name', { 
        location_name: pharmacyLocationName 
      });
      
      console.log('💊 Pharmacy products response:', prodRes);
      
      if (prodRes && prodRes.success) {
        const products = prodRes.data || [];
        console.log('📊 Pharmacy products count:', products.length);
        
        // Calculate KPIs with better error handling
        const totalProducts = products.length;
        const lowStock = products.filter(p => 
          p.stock_status === 'low stock' || 
          (p.quantity !== undefined && p.quantity <= 10 && p.quantity > 0)
        ).length;
        const expiringSoon = products.filter(p => {
          if (!p.expiration) return false;
          const expiryDate = new Date(p.expiration);
          const thirtyDaysFromNow = new Date();
          thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
          return expiryDate <= thirtyDaysFromNow;
        }).length;
        
        console.log('📈 Pharmacy KPIs:', { totalProducts, lowStock, expiringSoon });
        
        setPharmacyKPIs({
          totalProducts,
          lowStock,
          expiringSoon
        });
        
        // Update debug info
        setDebugInfo(prev => ({
          ...prev,
          dataSources: { ...prev.dataSources, pharmacy: 'success' }
        }));
      } else {
        console.warn('⚠️ No pharmacy products data received:', prodRes?.message || 'Unknown error');
        setPharmacyKPIs({ totalProducts: 0, lowStock: 0, expiringSoon: 0 });
      }
    } catch (e) { 
      console.error('❌ Error fetching pharmacy KPIs:', e);
      setPharmacyKPIs({ totalProducts: 0, lowStock: 0, expiringSoon: 0 }); 
    }
  };

  // Fetch Transfer KPIs
  const fetchTransferKPIs = async () => {
    try {
      console.log('🚚 Fetching transfer KPIs...');
      
      const res = await apiHandler.getTransfers();
      
      console.log('📦 Transfer response:', res);
      
      if (res && res.success) {
        const data = res.data || [];
        if (Array.isArray(data)) {
          const totalTransfers = data.length;
          const activeTransfers = data.filter(t => 
            t.status === 'pending' || 
            t.status === 'in_progress' ||
            (t.status === '' || t.status === null) // Some transfers might have empty status
          ).length;
          
          console.log('📈 Transfer KPIs:', { totalTransfers, activeTransfers });
          
          setTransferKPIs({
            totalTransfers,
            activeTransfers
          });
          
          // Update debug info
          setDebugInfo(prev => ({
            ...prev,
            dataSources: { ...prev.dataSources, transfers: 'success' }
          }));
        } else {
          console.warn('⚠️ Transfer data is not an array:', data);
          setTransferKPIs({ totalTransfers: 0, activeTransfers: 0 });
        }
      } else {
        console.warn('⚠️ No transfer data received or failed:', res?.message || 'Unknown error');
        setTransferKPIs({ totalTransfers: 0, activeTransfers: 0 });
      }
    } catch (e) { 
      console.error('❌ Error fetching transfer KPIs:', e);
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
      totalBatches: 0
    });

    setSupplyByProduct([]);
    setSupplyByLocation([]);
    setReturnRateByProduct([]);
    setFastMovingItemsTrend([]);
    setCriticalStockAlerts([]);
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
      return '₱0.00';
    }
    // Ensure it's a number and add thousand separators
    const number = typeof num === 'string' ? parseFloat(num) : num;
    return '₱' + number.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const renderFastMovingTrendChart = (data, title) => {
    if (!data || data.length === 0) {
      return (
        <div className="p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
          <h3 className="text-base sm:text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>{title}</h3>
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📈</div>
            <p className="text-sm" style={{ color: theme.text.muted }}>
              No fast-moving items data
            </p>
            <p className="text-xs" style={{ color: theme.text.muted }}>
              Movement data will appear here
            </p>
          </div>
        </div>
      );
    }

    // Group data by product to show trends
    const productGroups = {};
    data.forEach(item => {
      if (!productGroups[item.product]) {
        productGroups[item.product] = [];
      }
      productGroups[item.product].push(item);
    });

    // Get top 5 products by total movement
    const topProducts = Object.entries(productGroups)
      .map(([product, items]) => ({
        product,
        totalMovement: items.reduce((sum, item) => sum + (item.quantity || 0), 0),
        items: items.sort((a, b) => a.month.localeCompare(b.month))
      }))
      .sort((a, b) => b.totalMovement - a.totalMovement)
      .slice(0, 5);

    const maxMovement = Math.max(...topProducts.map(p => p.totalMovement));

    return (
      <div className="p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
        <h3 className="text-base sm:text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>{title}</h3>
        
        <div className="space-y-4">
          {topProducts.map((productData, index) => (
            <div key={productData.product} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold w-4 text-center" style={{ color: theme.text.muted }}>
                    #{index + 1}
                  </span>
                  <p className="text-xs sm:text-sm font-medium truncate" style={{ color: theme.text.secondary }}>
                    {productData.product}
                  </p>
                </div>
                <div className="text-xs font-semibold" style={{ color: theme.text.primary }}>
                  {formatNumber(productData.totalMovement)} total
                </div>
              </div>
              
              {/* Trend line showing monthly movements */}
              <div className="flex items-end space-x-1 h-8">
                {productData.items.map((item, itemIndex) => {
                  const barHeight = maxMovement > 0 ? ((item.quantity || 0) / maxMovement) * 100 : 0;
                  return (
                    <div key={itemIndex} className="flex-1 flex flex-col items-center">
                      <div 
                        className="w-full rounded-t transition-all duration-500 ease-out"
                        style={{ 
                          height: `${Math.max(barHeight, 2)}%`,
                          backgroundColor: index < 3 ? theme.colors.success : theme.colors.accent
                        }}
                        title={`${item.month}: ${formatNumber(item.quantity)}`}
                      ></div>
                    </div>
                  );
                })}
              </div>
              
              {/* Month labels */}
              <div className="flex space-x-1 text-xs" style={{ color: theme.text.muted }}>
                {productData.items.map((item, itemIndex) => (
                  <div key={itemIndex} className="flex-1 text-center truncate" title={item.month}>
                    {item.month}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-4 text-center">
          <p className="text-xs" style={{ color: theme.text.muted }}>
            Showing top {topProducts.length} fast-moving products by total movement
          </p>
        </div>
      </div>
    );
  };

  const renderBarChart = (data, title) => {
    const maxValue = Math.max(...data.map(item => item.quantity || 0));
    const totalQuantity = data.reduce((sum, item) => sum + (item.quantity || 0), 0);
    
    // Determine if this is movement data or inventory data
    const isMovementData = title.toLowerCase().includes('fast-moving') || title.toLowerCase().includes('movement');
    
    return (
      <div className="p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
        <h3 className="text-base sm:text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>{title}</h3>
        
        {data.length > 0 ? (
          <>
            <div className="text-center mb-4">
              <p className="text-sm" style={{ color: theme.text.secondary }}>
                {isMovementData ? 'Total Movement' : 'Total Inventory'}: <span className="font-semibold" style={{ color: theme.text.primary }}>{formatNumber(totalQuantity)}</span> units
              </p>
              <p className="text-xs" style={{ color: theme.text.muted }}>
                Showing top {Math.min(data.length, 10)} {data.length === 1 ? 'product' : 'products'}
              </p>
            </div>
            
            <div className="space-y-2 sm:space-y-3">
              {data.slice(0, 10).map((item, index) => {
                const percentage = ((item.quantity || 0) / totalQuantity) * 100;
                const barPercentage = maxValue > 0 ? ((item.quantity || 0) / maxValue) * 100 : 0;
                
                return (
                  <div key={index} className="flex items-center space-x-2 sm:space-x-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-semibold w-4 text-center" style={{ color: theme.text.muted }}>
                          #{index + 1}
                        </span>
                        <p className="text-xs sm:text-sm truncate font-medium" style={{ color: theme.text.secondary }}>
                          {item.product || 'Unknown Product'}
                        </p>
                      </div>
                      <div className="text-xs ml-6" style={{ color: theme.text.muted }}>
                        {percentage.toFixed(1)}% of {isMovementData ? 'total movement' : 'total inventory'}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="w-full rounded-full h-3 bg-opacity-20" style={{ backgroundColor: theme.border.light }}>
                        <div 
                          className="h-3 rounded-full transition-all duration-500 ease-out"
                          style={{ 
                            width: `${barPercentage}%`,
                            backgroundColor: index < 3 ? theme.colors.success : theme.colors.accent
                          }}
                        ></div>
                      </div>
                    </div>
                    <div className="text-xs w-12 sm:w-16 text-right flex-shrink-0 font-semibold" style={{ color: theme.text.primary }}>
                      {formatNumber(item.quantity || 0)}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {data.length > 10 && (
              <div className="mt-3 text-center">
                <p className="text-xs" style={{ color: theme.text.muted }}>
                  ... and {data.length - 10} more products
                </p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📈</div>
            <p className="text-sm" style={{ color: theme.text.muted }}>
              {isMovementData ? 'No fast-moving items data' : 'No product data available'}
            </p>
            <p className="text-xs" style={{ color: theme.text.muted }}>
              {isMovementData ? 'Movement data will appear here' : 'Product data will appear here'}
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderPieChart = (data, title) => {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'];
    
    // Calculate total for percentage calculations
    const totalQuantity = data.reduce((sum, d) => sum + (d.quantity || 0), 0);
    
    return (
      <div className="p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
        <h3 className="text-base sm:text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>{title}</h3>
        
        {data.length > 0 ? (
          <>
            <div className="text-center mb-4">
              <p className="text-sm" style={{ color: theme.text.secondary }}>
                Total Stock: <span className="font-semibold" style={{ color: theme.text.primary }}>{formatNumber(totalQuantity)}</span> units
              </p>
              <p className="text-xs" style={{ color: theme.text.muted }}>
                {data.length} {data.length === 1 ? 'category' : 'categories'} found
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center justify-center">
                <div className="relative w-24 h-24 sm:w-32 sm:h-32">
                  {data.map((item, index) => {
                    const percentage = ((item.quantity || 0) / totalQuantity) * 100;
                    const rotation = data.slice(0, index).reduce((sum, d) => sum + ((d.quantity || 0) / totalQuantity) * 360, 0);
                    
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
                    <div className="text-center">
                      <div className="text-xs sm:text-sm font-semibold" style={{ color: theme.text.primary }}>
                        {formatNumber(totalQuantity)}
                      </div>
                      <div className="text-xs" style={{ color: theme.text.muted }}>
                        Total
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                {data.map((item, index) => {
                  const percentage = ((item.quantity || 0) / totalQuantity) * 100;
                  const categoryName = item.category || item.product || 'Unknown';
                  return (
                    <div key={index} className="flex items-center justify-between space-x-2">
                      <div className="flex items-center space-x-2 flex-1">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0" 
                          style={{ backgroundColor: colors[index % colors.length] }}
                        ></div>
                        <span className="text-xs sm:text-sm truncate" style={{ color: theme.text.secondary }}>
                          {categoryName}
                        </span>
                      </div>
                      <div className="text-xs sm:text-sm font-semibold flex-shrink-0" style={{ color: theme.text.primary }}>
                        {formatNumber(item.quantity || 0)}
                      </div>
                      <div className="text-xs flex-shrink-0" style={{ color: theme.text.muted }}>
                        ({percentage.toFixed(1)}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">📊</div>
            <p className="text-sm" style={{ color: theme.text.muted }}>
              No category data available
            </p>
            <p className="text-xs" style={{ color: theme.text.muted }}>
              Check your inventory categories
            </p>
          </div>
        )}
      </div>
    );
  };

  const renderLineChart = (data, title) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    
    // Process data to get values for each month
    const monthValues = months.map(month => {
      const monthData = data.find(item => item.month === month);
      return monthData ? monthData.quantity : 0;
    });
    
    const maxValue = Math.max(...monthValues, 1); // Avoid division by zero
    const minValue = Math.min(...monthValues);
    const range = maxValue - minValue || 1;
    
    // Calculate SVG path for the line
    const width = 300;
    const height = 200;
    const padding = 20;
    const chartWidth = width - (padding * 2);
    const chartHeight = height - (padding * 2);
    
    const points = monthValues.map((value, index) => {
      const x = padding + (index * (chartWidth / (months.length - 1)));
      const y = padding + chartHeight - ((value - minValue) / range) * chartHeight;
      return `${x},${y}`;
    });
    
    const pathData = `M ${points.join(' L ')}`;
    
    return (
      <div className="p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
        <h3 className="text-base sm:text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>{title}</h3>
        
        {/* SVG Line Chart */}
        <div className="h-48 sm:h-64 flex items-center justify-center">
          <svg width="300" height="200" className="w-full h-full">
            {/* Grid lines */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
              <g key={index}>
                <line
                  x1={padding}
                  y1={padding + ratio * chartHeight}
                  x2={width - padding}
                  y2={padding + ratio * chartHeight}
                  stroke={theme.border.light}
                  strokeWidth="1"
                  opacity="0.3"
                />
                <text
                  x={padding - 5}
                  y={padding + ratio * chartHeight + 4}
                  fontSize="10"
                  fill={theme.text.muted}
                  textAnchor="end"
                >
                  {Math.round(maxValue - (ratio * range))}
                </text>
              </g>
            ))}
            
            {/* Data line */}
            <path
              d={pathData}
              fill="none"
              stroke={theme.colors.accent}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            
            {/* Data points */}
            {points.map((point, index) => {
              const [x, y] = point.split(',').map(Number);
              return (
                <g key={index}>
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill={theme.colors.accent}
                    stroke={theme.bg.card}
                    strokeWidth="2"
                  />
                  <text
                    x={x}
                    y={height - 5}
                    fontSize="10"
                    fill={theme.text.muted}
                    textAnchor="middle"
                  >
                    {months[index]}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        
        {/* Legend */}
        <div className="mt-4 space-y-2">
          {data.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: theme.colors.accent }}></div>
                  <span className="text-sm font-medium" style={{ color: theme.text.primary }}>
                    {data[0].product}
                  </span>
                </div>
                <span className="text-xs" style={{ color: theme.text.muted }}>
                  {data.length} months trend
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="text-center">
                  <div style={{ color: theme.text.muted }}>Peak</div>
                  <div className="font-semibold" style={{ color: theme.colors.accent }}>
                    {formatNumber(Math.max(...data.map(item => item.quantity)))}
                  </div>
                </div>
                <div className="text-center">
                  <div style={{ color: theme.text.muted }}>Low</div>
                  <div className="font-semibold" style={{ color: theme.text.secondary }}>
                    {formatNumber(Math.min(...data.map(item => item.quantity)))}
                  </div>
                </div>
                <div className="text-center">
                  <div style={{ color: theme.text.muted }}>Avg</div>
                  <div className="font-semibold" style={{ color: theme.text.secondary }}>
                    {formatNumber(Math.round(data.reduce((sum, item) => sum + item.quantity, 0) / data.length))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="text-xs text-center" style={{ color: theme.text.muted }}>
              No trend data available
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderGauge = (data, title) => {
    const criticalLevel = data.length;
    const maxCritical = 20; // Maximum critical level
    const percentage = Math.min((criticalLevel / maxCritical) * 100, 100);
    
    return (
      <div className="p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 min-h-[400px] flex flex-col" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
        <h3 className="text-base sm:text-lg font-semibold mb-6" style={{ color: theme.text.primary }}>{title}</h3>
        
        {/* Improved Gauge */}
        <div className="flex flex-col items-center justify-center mb-6 flex-shrink-0">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 mb-2">
            {/* Background circle */}
            <div className="absolute inset-0 rounded-full" style={{ backgroundColor: theme.border.light }}></div>
            {/* Progress circle */}
            <div 
              className="absolute inset-0 rounded-full transition-all duration-500"
              style={{
                background: `conic-gradient(from 0deg, ${percentage > 80 ? theme.colors.danger : percentage > 50 ? theme.colors.warning : theme.colors.success} 0deg, ${percentage > 80 ? theme.colors.danger : percentage > 50 ? theme.colors.warning : theme.colors.success} ${percentage * 3.6}deg, ${theme.border.light} ${percentage * 3.6}deg)`
              }}
            ></div>
            {/* Inner circle */}
            <div className="absolute inset-2 sm:inset-3 rounded-full flex items-center justify-center" style={{ backgroundColor: theme.bg.card }}>
              <div className="text-center">
                <div className="text-xl sm:text-2xl font-bold" style={{ color: theme.colors.danger }}>{criticalLevel}</div>
                <div className="text-xs" style={{ color: theme.text.muted }}>Critical</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Improved List */}
        <div className="space-y-2 flex-1 overflow-hidden">
          {data.length > 0 ? (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between p-2 rounded-md min-h-[40px]" style={{ backgroundColor: theme.colors.danger + '20', borderColor: theme.colors.danger + '40', border: '1px solid' }}>
                  <span className="text-sm font-medium truncate flex-1 pr-2" style={{ color: theme.colors.danger }}>{item.product}</span>
                  <span className="text-sm font-bold flex-shrink-0" style={{ color: theme.colors.danger }}>{item.quantity}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-sm font-medium" style={{ color: theme.colors.success }}>No critical alerts</div>
              <div className="text-xs" style={{ color: theme.text.muted }}>All items are well stocked</div>
            </div>
          )}
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
      <div className="p-6" style={{ backgroundColor: theme.bg.secondary }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-6 mb-4">
              
            </div>
            <h1 className="text-3xl font-bold" style={{ color: theme.text.primary }}>Warehouse Management</h1>
          </div>
          <div className="flex flex-wrap gap-4">
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
            <select 
              value={selectedTimePeriod} 
              onChange={(e) => setSelectedTimePeriod(e.target.value)}
              className="px-3 py-2 rounded border"
              style={{ 
                backgroundColor: theme.bg.card, 
                color: theme.text.primary,
                borderColor: theme.border.default
              }}
            >
              <option value="today">Today</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <button 
              onClick={fetchAllData}
              className="px-4 py-2 rounded-lg font-medium transition-colors duration-200"
              style={{ 
                backgroundColor: theme.colors.accent, 
                color: 'white',
                border: 'none',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => e.target.style.opacity = '0.9'}
              onMouseOut={(e) => e.target.style.opacity = '1'}
            >
              🔄 Refresh Data
            </button>
          </div>
        </div>
      </div>

      {/* Debug Info Panel */}
      {process.env.NODE_ENV === 'development' && (
        <div className="p-4 mx-6 mb-4 rounded-lg" style={{ backgroundColor: theme.bg.card, border: `1px solid ${theme.border.default}` }}>
          <h3 className="text-sm font-semibold mb-2" style={{ color: theme.text.primary }}>Debug Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
            <div>
              <span style={{ color: theme.text.secondary }}>Last Fetch:</span>
              <div style={{ color: theme.text.muted }}>{debugInfo.lastFetch || 'Never'}</div>
            </div>
            <div>
              <span style={{ color: theme.text.secondary }}>Warehouse:</span>
              <div style={{ color: debugInfo.dataSources.warehouse === 'success' ? theme.colors.success : theme.colors.warning }}>
                {debugInfo.dataSources.warehouse}
              </div>
            </div>
            <div>
              <span style={{ color: theme.text.secondary }}>Convenience:</span>
              <div style={{ color: debugInfo.dataSources.convenience === 'success' ? theme.colors.success : theme.colors.warning }}>
                {debugInfo.dataSources.convenience}
              </div>
            </div>
            <div>
              <span style={{ color: theme.text.secondary }}>Pharmacy:</span>
              <div style={{ color: debugInfo.dataSources.pharmacy === 'success' ? theme.colors.success : theme.colors.warning }}>
                {debugInfo.dataSources.pharmacy}
              </div>
            </div>
            <div>
              <span style={{ color: theme.text.secondary }}>Transfers:</span>
              <div style={{ color: debugInfo.dataSources.transfers === 'success' ? theme.colors.success : theme.colors.warning }}>
                {debugInfo.dataSources.transfers}
              </div>
            </div>
          </div>
          {debugInfo.apiErrors.length > 0 && (
            <div className="mt-2">
              <span style={{ color: theme.text.secondary }}>API Errors:</span>
              <div className="text-xs" style={{ color: theme.colors.danger }}>
                {debugInfo.apiErrors.slice(-3).join(', ')}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Warehouse KPIs Section */}
      <div className="p-6 space-y-6">
        {/* Main Warehouse KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-center items-center min-h-[140px]" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, border: '1px solid' }}>
            <p className="text-sm font-medium mb-2" style={{ color: theme.colors.info }}>Total Products</p>
            <p className="text-3xl font-bold" style={{ color: theme.colors.info }}>
              {formatNumber(warehouseData.totalProducts)}
            </p>
          </div>
          <div className="p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-center items-center min-h-[140px]" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, border: '1px solid' }}>
            <p className="text-sm font-medium mb-2" style={{ color: theme.colors.success }}>Total Suppliers</p>
            <p className="text-3xl font-bold" style={{ color: theme.colors.success }}>{formatNumber(warehouseData.totalSuppliers)}</p>
          </div>
          <div className="p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-center items-center min-h-[140px]" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, border: '1px solid' }}>
            <p className="text-sm font-medium mb-2" style={{ color: theme.colors.accent }}>Warehouse Value</p>
            <p className="text-2xl font-bold" style={{ color: theme.colors.accent }}>{formatCurrency(warehouseData.warehouseValue)}</p>
          </div>
          <div className="p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-center items-center min-h-[140px]" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, border: '1px solid' }}>
            <p className="text-sm font-medium mb-2" style={{ color: theme.colors.warning }}>Low Stock Items</p>
            <p className="text-3xl font-bold" style={{ color: theme.colors.warning }}>{formatNumber(warehouseData.lowStockItems)}</p>
          </div>
          <div className="p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-center items-center min-h-[140px]" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, border: '1px solid' }}>
            <p className="text-sm font-medium mb-2" style={{ color: theme.colors.danger }}>Expiring Soon</p>
            <p className="text-3xl font-bold" style={{ color: theme.colors.danger }}>{formatNumber(warehouseData.expiringSoon)}</p>
          </div>
          <div className="p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col justify-center items-center min-h-[140px]" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, border: '1px solid' }}>
            <p className="text-sm font-medium mb-2" style={{ color: theme.colors.info }}>Total Batches</p>
            <p className="text-3xl font-bold" style={{ color: theme.colors.info }}>{formatNumber(warehouseData.totalBatches)}</p>
          </div>
        </div>

        {/* Module KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Convenience Store KPIs */}
          <div className="p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, border: '1px solid' }}>
            <p className="text-sm font-medium mb-2" style={{ color: theme.colors.success }}>Convenience Store - Total Products</p>
            <p className="text-3xl font-bold mb-3" style={{ color: theme.colors.success }}>{formatNumber(convenienceKPIs.totalProducts)}</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: theme.text.secondary }}>Low Stock</span>
                <span className="text-lg font-bold" style={{ color: theme.colors.warning }}>{formatNumber(convenienceKPIs.lowStock)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: theme.text.secondary }}>Expiring Soon</span>
                <span className="text-lg font-bold" style={{ color: theme.colors.danger }}>{formatNumber(convenienceKPIs.expiringSoon)}</span>
              </div>
            </div>
          </div>
          {/* Pharmacy KPIs */}
          <div className="p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, border: '1px solid' }}>
            <p className="text-sm font-medium mb-2" style={{ color: theme.colors.accent }}>Pharmacy - Total Products</p>
            <p className="text-3xl font-bold mb-3" style={{ color: theme.colors.accent }}>{formatNumber(pharmacyKPIs.totalProducts)}</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: theme.text.secondary }}>Low Stock</span>
                <span className="text-lg font-bold" style={{ color: theme.colors.warning }}>{formatNumber(pharmacyKPIs.lowStock)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs" style={{ color: theme.text.secondary }}>Expiring Soon</span>
                <span className="text-lg font-bold" style={{ color: theme.colors.danger }}>{formatNumber(pharmacyKPIs.expiringSoon)}</span>
              </div>
            </div>
          </div>
          {/* Transfer KPIs */}
          <div className="p-4 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default, border: '1px solid' }}>
            <p className="text-sm font-medium mb-2" style={{ color: theme.colors.info }}>Total Transfers</p>
            <p className="text-3xl font-bold" style={{ color: theme.colors.info }}>{formatNumber(transferKPIs.totalTransfers)}</p>
          </div>
        </div>

        {/* Charts Section - First Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Fast-moving items trend chart */}
          {renderFastMovingTrendChart(fastMovingItemsTrend, "Fast-Moving Items Trend")}
          
          {/* Pie Chart - Stock distribution by category */}
          {renderPieChart(stockDistributionByCategory, "Stock Distribution by Category")}
        </div>

        {/* Charts Section - Second Row */}
         <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          {/* Bar Chart - Top 10 products by quantity */}
          {renderBarChart(topProductsByQuantity, "Top 10 Products by Quantity")}
          
          {/* Gauge - Critical stock alerts */}
          {renderGauge(criticalStockAlerts, "Critical Stock Alerts")}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;