"use client";
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Progress } from "../../components/ui/progress";
import { Badge } from "../../components/ui/badge";
import { 
  DollarSign, 
  TrendingUp, 
  Package, 
  ClipboardList, 
  Users, 
  Target,
  AlertTriangle,
  ShoppingCart,
  Receipt,
  BarChart3,
  Activity,
  Scan,
  Search
} from 'lucide-react';
import axios from 'axios';

const API_BASE_URL = "http://localhost/caps2e2/Api/backend.php";

export default function PharmacyDashboard() {
  const [dashboardData, setDashboardData] = useState({
    totalSalesToday: 0,
    monthlySales: 0,
    monthlyProfit: 0,
    lowStockProducts: [],
    purchaseOrders: {
      pending: 0,
      approved: 0,
      delivered: 0
    },
    totalTransactionsToday: 0,
    salesTarget: 0,
    currentSales: 0
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedProduct, setScannedProduct] = useState(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch multiple data points in parallel
      const [
        salesResponse,
        suppliersResponse,
        usersResponse,
        activitiesResponse,
        stockResponse,
        expiringResponse,
        purchaseOrdersResponse,
        transactionsCountResponse
      ] = await Promise.all([
        axios.post(API_BASE_URL, { action: 'get_dashboard_sales', filter: 'daily' }),
        axios.post(API_BASE_URL, { action: 'get_dashboard_suppliers' }),
        axios.post(API_BASE_URL, { action: 'get_dashboard_users' }),
        axios.post(API_BASE_URL, { action: 'get_dashboard_activities' }),
        axios.post(API_BASE_URL, { action: 'get_low_stock_products' }),
        axios.post(API_BASE_URL, { action: 'get_expiring_products' }),
        axios.post(API_BASE_URL, { action: 'get_purchase_orders_status' }),
        axios.post(API_BASE_URL, { action: 'get_today_transactions_count' })
      ]);

      // Calculate dashboard metrics from real data
      const totalSalesToday = salesResponse.data?.total_sales || 0;
      const monthlySales = salesResponse.data?.total_sales || 0;
      const monthlyProfit = monthlySales * 0.3; // Assuming 30% profit margin
      const salesTarget = 500000; // Set a target
      const currentSales = monthlySales;
      
      // Get low stock products
      const lowStockProducts = stockResponse.data?.products?.map(product => ({
        name: product.product_name || 'Unknown Product',
        quantity: product.quantity || 0,
        location: product.location_name || 'Unknown Location'
      })) || [];

      // Get recent activities
      const recentActivities = activitiesResponse.data?.activities || [];

      // Get purchase orders status from real data
      const purchaseOrders = purchaseOrdersResponse.data?.success ? 
        purchaseOrdersResponse.data.data : {
          pending: 0,
          approved: 0,
          delivered: 0
        };

      // Get today's transactions count
      const totalTransactionsToday = transactionsCountResponse.data?.success ? 
        transactionsCountResponse.data.count : 0;

      setDashboardData({
        totalSalesToday,
        monthlySales,
        monthlyProfit,
        lowStockProducts,
        purchaseOrders,
        totalTransactionsToday,
        salesTarget,
        currentSales
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Failed to load dashboard data. Please try again later.');
      
      // Fallback to sample data if API fails
      setDashboardData({
        totalSalesToday: 15420.50,
        monthlySales: 458750.00,
        monthlyProfit: 137625.00,
        lowStockProducts: [
          { name: "Aspirin 100mg", quantity: 8, location: "Shelf A1" },
          { name: "Cetirizine 10mg", quantity: 5, location: "Shelf B2" },
          { name: "Metformin 500mg", quantity: 3, location: "Shelf C3" },
          { name: "Lisinopril 10mg", quantity: 7, location: "Shelf A2" },
          { name: "Atorvastatin 20mg", quantity: 4, location: "Shelf B1" }
        ],
        purchaseOrders: {
          pending: 12,
          approved: 8,
          delivered: 15
        },
        totalTransactionsToday: 47,
        salesTarget: 500000.00,
        currentSales: 458750.00
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBarcodeScan = async () => {
    if (!barcodeInput.trim()) return;
    
    try {
      setScanning(true);
      setError(null);
      
      // Simulate API call to search product by barcode
      const response = await axios.post(API_BASE_URL, {
        action: 'search_product_by_barcode',
        barcode: barcodeInput.trim()
      });
      
      if (response.data?.success) {
        setScannedProduct(response.data.product);
      } else {
        setScannedProduct(null);
        setError('Product not found with this barcode');
      }
    } catch (error) {
      console.error('Error scanning barcode:', error);
      setError('Failed to scan barcode. Please try again.');
      setScannedProduct(null);
    } finally {
      setScanning(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleBarcodeScan();
    }
  };

  const salesProgress = (dashboardData.currentSales / dashboardData.salesTarget) * 100;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Pharmacy Dashboard</h1>
            <p className="text-gray-600 mt-1">Monitor your pharmacy performance and inventory</p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>{loading ? 'Loading...' : 'Refresh'}</span>
            </button>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              <Activity className="w-4 h-4 mr-1" />
              Live
            </Badge>
            <span className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleTimeString()}
            </span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
              <div className="ml-auto pl-3">
                <div className="-mx-1.5 -my-1.5">
                  <button
                    onClick={() => setError(null)}
                    className="inline-flex rounded-md p-1.5 text-red-500 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 focus:ring-offset-red-50"
                  >
                    <span className="sr-only">Dismiss</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Sales Today */}
          <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Sales Today
              </CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ₱{dashboardData.totalSalesToday.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Real-time from database
              </p>
            </CardContent>
          </Card>

          {/* Monthly Sales vs Profit */}
          <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Monthly Sales
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ₱{dashboardData.monthlySales.toLocaleString()}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Profit: ₱{dashboardData.monthlyProfit.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          {/* Total Transactions Today */}
          <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Transactions Today
              </CardTitle>
              <Receipt className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {dashboardData.totalTransactionsToday}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                From recent activities
              </p>
            </CardContent>
          </Card>

          {/* Sales Target Progress */}
          <Card className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Sales Target
              </CardTitle>
              <Target className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {salesProgress.toFixed(1)}%
              </div>
              <Progress value={salesProgress} className="mt-2" />
              <p className="text-xs text-gray-500 mt-1">
                ₱{dashboardData.currentSales.toLocaleString()} / ₱{dashboardData.salesTarget.toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Barcode Scanner Section */}
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Scan className="h-5 w-5 text-blue-600" />
              <span>Barcode Scanner</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex space-x-3">
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Scan or enter barcode..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={scanning}
                  />
                </div>
                <button
                  onClick={handleBarcodeScan}
                  disabled={scanning || !barcodeInput.trim()}
                  className="px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {scanning ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  <span>{scanning ? 'Scanning...' : 'Scan'}</span>
                </button>
              </div>
              
              {scannedProduct && (
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{scannedProduct.name}</h4>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">
                      Found
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Barcode:</span>
                      <p className="font-medium">{scannedProduct.barcode}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Price:</span>
                      <p className="font-medium text-green-600">₱{scannedProduct.price?.toLocaleString() || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Stock:</span>
                      <p className="font-medium">{scannedProduct.stock || 'N/A'}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Category:</span>
                      <p className="font-medium">{scannedProduct.category || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Secondary Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Purchase Orders Status */}
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ClipboardList className="h-5 w-5 text-purple-600" />
                <span>Purchase Orders</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium">Pending</span>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                    {dashboardData.purchaseOrders.pending}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <span className="text-sm font-medium">Approved</span>
                  </div>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                    {dashboardData.purchaseOrders.approved}
                  </Badge>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium">Delivered</span>
                  </div>
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    {dashboardData.purchaseOrders.delivered}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Low Stock Alerts */}
          <Card className="hover:shadow-lg transition-all duration-300">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span>Low Stock Alerts</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardData.lowStockProducts.length > 0 ? (
                <div className="space-y-3">
                  {dashboardData.lowStockProducts.slice(0, 4).map((product, index) => (
                    <div key={index} className="p-3 bg-red-50 rounded-lg border border-red-200 hover:bg-red-100 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium text-gray-900 text-sm">{product.name}</h4>
                        <Badge variant="destructive" className="text-xs">
                          {product.quantity} left
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600">Location: {product.location}</p>
                      <div className="mt-1 flex items-center space-x-2">
                        <ShoppingCart className="h-3 w-3 text-red-600" />
                        <span className="text-xs text-red-600 font-medium">Reorder needed</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No low stock alerts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="hover:shadow-lg transition-all duration-300">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <BarChart3 className="h-5 w-5 text-indigo-600" />
              <span>Quick Actions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-center">
                <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-blue-900">New Sale</span>
              </button>
              <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-center">
                <Package className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-green-900">Add Stock</span>
              </button>
              <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors text-center">
                <ClipboardList className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-purple-900">New PO</span>
              </button>
              <button className="p-4 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors text-center">
                <TrendingUp className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                <span className="text-sm font-medium text-orange-900">Reports</span>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
