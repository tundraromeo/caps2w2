"use client";

import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom";
import { logActivity } from "../../lib/utils";
import axios from "axios";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  ChevronUp,
  ChevronDown,
  Search,
  Package,
  TrendingUp,
  TrendingDown,
  Calendar,
  Filter,
  Download,
  RefreshCw,
  Eye,
  AlertTriangle,
  CheckCircle,
  Clock,
  Package2,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Plus
} from "lucide-react";
import { useTheme } from './ThemeContext';

function StockSummary() {
  const { isDarkMode, theme } = useTheme();
  
  // State management
  const [stockMovements, setStockMovements] = useState([]);
  const [stockSummary, setStockSummary] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [movementTypeFilter, setMovementTypeFilter] = useState("all");
  const [locationFilter, setLocationFilter] = useState("all");
  const [currentView, setCurrentView] = useState("movements"); // movements, summary, dashboard
  const [expandedRows, setExpandedRows] = useState({});
  const [selectedMovements, setSelectedMovements] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [locations, setLocations] = useState([]);
  const [summaryStats, setSummaryStats] = useState({
    totalMovements: 0,
    totalIn: 0,
    totalOut: 0,
    totalAdjustments: 0,
    lowStockItems: 0,
    outOfStockItems: 0
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    loadLocations();
    loadStockData();
  }, []);

  useEffect(() => {
    loadStockData();
  }, [currentPage, itemsPerPage, searchTerm, dateFilter, movementTypeFilter, locationFilter]);

  const loadLocations = async () => {
    try {
      const response = await axios.post('/Api/backend.php', {
        action: 'get_locations'
      });
      
      if (response.data.success) {
        setLocations(response.data.data);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    }
  };

  const loadStockData = async () => {
    setLoading(true);
    try {
      if (currentView === "movements") {
        await loadStockMovements();
      } else if (currentView === "summary") {
        await loadStockSummary();
      } else if (currentView === "dashboard") {
        await loadDashboardData();
      }
    } catch (error) {
      console.error('Error loading stock data:', error);
      toast.error('Error loading stock data');
    } finally {
      setLoading(false);
    }
  };

  const loadStockMovements = async () => {
    try {
      const response = await axios.post('/Api/stock_summary_api.php', {
        action: 'get_stock_movements',
        search: searchTerm,
        type: movementTypeFilter,
        page: currentPage,
        limit: itemsPerPage
      });
      
      if (response.data.success) {
        setStockMovements(response.data.data);
        setTotalPages(response.data.pages);
        setSummaryStats(prev => ({
          ...prev,
          totalMovements: response.data.total
        }));
      }
    } catch (error) {
      console.error('Error loading stock movements:', error);
      toast.error('Error loading stock movements');
    }
  };

  const loadStockSummary = async () => {
    try {
      // Get products with stock summary data
      const response = await axios.post('/Api/stock_summary_api.php', {
        action: 'get_stock_summary',
        location_id: locationFilter === "all" ? 0 : locationFilter,
        search: searchTerm,
        page: currentPage,
        limit: itemsPerPage
      });
      
      if (response.data.success) {
        setStockSummary(response.data.data);
        setTotalPages(response.data.pages);
      }
    } catch (error) {
      console.error('Error loading stock summary:', error);
      toast.error('Error loading stock summary');
    }
  };

  const loadDashboardData = async () => {
    try {
      // Load multiple data sources for dashboard
      const [movementsResponse, productsResponse] = await Promise.all([
        axios.post('/Api/stock_summary_api.php', {
          action: 'get_stock_movements',
          limit: 1000 // Get all for stats
        }),
        axios.post('/Api/backend.php', {
          action: 'get_products'
        })
      ]);

      if (movementsResponse.data.success && productsResponse.data.success) {
        const movements = movementsResponse.data.data;
        const products = productsResponse.data.data;
        
        // Calculate statistics
        const stats = {
          totalMovements: movements.length,
          totalIn: movements.filter(m => m.adjustment_type === 'Addition').length,
          totalOut: movements.filter(m => m.adjustment_type === 'Subtraction').length,
          totalAdjustments: movements.filter(m => m.adjustment_type === 'Adjustment').length,
          lowStockItems: products.filter(p => p.stock_status === 'low stock').length,
          outOfStockItems: products.filter(p => p.stock_status === 'out of stock').length
        };
        
        setSummaryStats(stats);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Error loading dashboard data');
    }
  };

  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleFilterChange = (filterType, value) => {
    switch (filterType) {
      case 'movementType':
        setMovementTypeFilter(value);
        break;
      case 'location':
        setLocationFilter(value);
        break;
      case 'date':
        setDateFilter(value);
        break;
    }
    setCurrentPage(1);
  };

  const toggleRowExpansion = (id) => {
    setExpandedRows(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleSelectMovement = (movementId, checked) => {
    if (checked) {
      setSelectedMovements(prev => [...prev, movementId]);
    } else {
      setSelectedMovements(prev => prev.filter(id => id !== movementId));
    }
  };

  const handleSelectAllMovements = (checked) => {
    if (checked) {
      setSelectedMovements(stockMovements.map(m => m.id));
    } else {
      setSelectedMovements([]);
    }
  };

  const exportData = () => {
    const dataToExport = currentView === "movements" ? stockMovements : stockSummary;
    const csvContent = convertToCSV(dataToExport);
    downloadCSV(csvContent, `${currentView}_export.csv`);
  };

  const convertToCSV = (data) => {
    if (data.length === 0) return '';
    
    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row => 
        headers.map(header => 
          JSON.stringify(row[header] || '')
        ).join(',')
      )
    ];
    
    return csvRows.join('\n');
  };

  const downloadCSV = (content, filename) => {
    const blob = new Blob([content], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getMovementIcon = (type) => {
    switch (type) {
      case 'Addition':
        return <ArrowUpRight className="w-4 h-4 text-green-500" />;
      case 'Subtraction':
        return <ArrowDownRight className="w-4 h-4 text-red-500" />;
      case 'Adjustment':
        return <Minus className="w-4 h-4 text-yellow-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStockStatusBadge = (status) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    switch (status) {
      case 'in stock':
        return `${baseClasses} bg-green-100 text-green-800 ${isDarkMode ? 'dark:bg-green-900 dark:text-green-200' : ''}`;
      case 'low stock':
        return `${baseClasses} bg-yellow-100 text-yellow-800 ${isDarkMode ? 'dark:bg-yellow-900 dark:text-yellow-200' : ''}`;
      case 'out of stock':
        return `${baseClasses} bg-red-100 text-red-800 ${isDarkMode ? 'dark:bg-red-900 dark:text-red-200' : ''}`;
      default:
        return `${baseClasses} bg-gray-100 text-gray-800 ${isDarkMode ? 'dark:bg-gray-900 dark:text-gray-200' : ''}`;
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Movements</p>
              <p className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{summaryStats.totalMovements}</p>
            </div>
            <Activity className={`w-8 h-8 ${isDarkMode ? 'text-blue-400' : 'text-blue-500'}`} />
          </div>
        </div>

        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Stock Additions</p>
              <p className={`text-2xl font-bold text-green-600`}>{summaryStats.totalIn}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Stock Subtractions</p>
              <p className={`text-2xl font-bold text-red-600`}>{summaryStats.totalOut}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-red-500" />
          </div>
        </div>

        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Adjustments</p>
              <p className={`text-2xl font-bold text-yellow-600`}>{summaryStats.totalAdjustments}</p>
            </div>
            <Minus className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Low Stock Items</p>
              <p className={`text-2xl font-bold text-yellow-600`}>{summaryStats.lowStockItems}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className={`p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-sm font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Out of Stock</p>
              <p className={`text-2xl font-bold text-red-600`}>{summaryStats.outOfStockItems}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Recent Movements */}
      <div className={`p-6 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <h3 className={`text-lg font-semibold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Recent Stock Movements</h3>
        <div className="space-y-3">
          {stockMovements.slice(0, 5).map((movement) => (
            <div key={movement.id} className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className="flex items-center space-x-3">
                {getMovementIcon(movement.adjustment_type)}
                <div>
                  <p className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{movement.product_name}</p>
                  <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{movement.reason}</p>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${movement.adjustment_type === 'Addition' ? 'text-green-600' : 'text-red-600'}`}>
                  {movement.adjustment_type === 'Addition' ? '+' : '-'}{movement.quantity}
                </p>
                <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{movement.date}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMovementsTable = () => (
    <div className="overflow-x-auto">
      <table className={`min-w-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <thead className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <tr>
            <th className="px-4 py-3 text-left">
              <input
                type="checkbox"
                checked={selectedMovements.length === stockMovements.length && stockMovements.length > 0}
                onChange={(e) => handleSelectAllMovements(e.target.checked)}
                className="rounded border-gray-300"
              />
            </th>
            <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
              Product
            </th>
            <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
              Type
            </th>
            <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
              Quantity
            </th>
            <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
              Reason
            </th>
            <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
              Adjusted By
            </th>
            <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
              Date
            </th>
            <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
          {stockMovements.map((movement) => (
            <tr key={movement.id} className={`${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
              <td className="px-4 py-4">
                <input
                  type="checkbox"
                  checked={selectedMovements.includes(movement.id)}
                  onChange={(e) => handleSelectMovement(movement.id, e.target.checked)}
                  className="rounded border-gray-300"
                />
              </td>
              <td className="px-4 py-4">
                <div>
                  <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {movement.product_name}
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    ID: {movement.product_id}
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className="flex items-center space-x-2">
                  {getMovementIcon(movement.adjustment_type)}
                  <span className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {movement.adjustment_type}
                  </span>
                </div>
              </td>
              <td className="px-4 py-4">
                <span className={`font-semibold ${movement.adjustment_type === 'Addition' ? 'text-green-600' : 'text-red-600'}`}>
                  {movement.adjustment_type === 'Addition' ? '+' : '-'}{movement.quantity}
                </span>
              </td>
              <td className="px-4 py-4">
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                  {movement.reason}
                </div>
              </td>
              <td className="px-4 py-4">
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                  {movement.adjusted_by}
                </div>
              </td>
              <td className="px-4 py-4">
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                  {movement.date} {movement.time}
                </div>
              </td>
              <td className="px-4 py-4">
                <button
                  onClick={() => toggleRowExpansion(movement.id)}
                  className={`p-1 rounded ${isDarkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}
                >
                  <Eye className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderSummaryTable = () => (
    <div className="overflow-x-auto">
      <table className={`min-w-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <thead className={`${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
          <tr>
            <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
              Product
            </th>
            <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
              Category
            </th>
            <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
              Current Stock
            </th>
            <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
              Available (Summary)
            </th>
            <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
              Status
            </th>
            <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
              Location
            </th>
            <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
              Batch Reference
            </th>
            <th className={`px-4 py-3 text-left text-xs font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
              Last Updated
            </th>
          </tr>
        </thead>
        <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
          {stockSummary.map((product) => (
            <tr key={product.product_id} className={`${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}`}>
              <td className="px-4 py-4">
                <div>
                  <div className={`font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {product.product_name}
                  </div>
                  <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    {product.barcode}
                  </div>
                </div>
              </td>
              <td className="px-4 py-4">
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                  {product.category}
                </div>
              </td>
              <td className="px-4 py-4">
                <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {product.current_stock}
                </div>
              </td>
              <td className="px-4 py-4">
                <div className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {product.summary_available}
                </div>
                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Total: {product.summary_total}
                </div>
              </td>
              <td className="px-4 py-4">
                <span className={getStockStatusBadge(product.stock_status)}>
                  {product.stock_status}
                </span>
              </td>
              <td className="px-4 py-4">
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                  {product.location_name}
                </div>
              </td>
              <td className="px-4 py-4">
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                  {product.batch_reference}
                </div>
                <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {product.batch_date}
                </div>
              </td>
              <td className="px-4 py-4">
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                  {product.last_updated ? new Date(product.last_updated).toLocaleDateString() : 'N/A'}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                Stock Summary & Movements
              </h1>
              <p className={`mt-2 text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Track inventory movements and view stock summaries across all locations
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => loadStockData()}
                className={`px-4 py-2 rounded-lg ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-white hover:bg-gray-50 text-gray-700'} border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'} flex items-center space-x-2`}
              >
                <RefreshCw className="w-4 h-4" />
                <span>Refresh</span>
              </button>
              <button
                onClick={exportData}
                className={`px-4 py-2 rounded-lg ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'} flex items-center space-x-2`}
              >
                <Download className="w-4 h-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>

        {/* View Tabs */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setCurrentView("dashboard")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === "dashboard"
                  ? `${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} shadow-sm`
                  : `${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`
              }`}
            >
              <BarChart3 className="w-4 h-4 inline mr-2" />
              Dashboard
            </button>
            <button
              onClick={() => setCurrentView("movements")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === "movements"
                  ? `${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} shadow-sm`
                  : `${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`
              }`}
            >
              <Activity className="w-4 h-4 inline mr-2" />
              Movements
            </button>
            <button
              onClick={() => setCurrentView("summary")}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === "summary"
                  ? `${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'} shadow-sm`
                  : `${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`
              }`}
            >
              <Package2 className="w-4 h-4 inline mr-2" />
              Summary
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className={`mb-6 p-4 rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Filters
            </h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2 rounded-lg ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            >
              <Filter className="w-4 h-4" />
            </button>
          </div>
          
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Search
                </label>
                <div className="relative">
                  <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearch}
                    placeholder="Search products..."
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  />
                </div>
              </div>

              {currentView === "movements" && (
                <div>
                  <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Movement Type
                  </label>
                  <select
                    value={movementTypeFilter}
                    onChange={(e) => handleFilterChange('movementType', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                  >
                    <option value="all">All Types</option>
                    <option value="IN">Addition</option>
                    <option value="OUT">Subtraction</option>
                    <option value="ADJUSTMENT">Adjustment</option>
                  </select>
                </div>
              )}

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Location
                </label>
                <select
                  value={locationFilter}
                  onChange={(e) => handleFilterChange('location', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                >
                  <option value="all">All Locations</option>
                  {locations.map((location) => (
                    <option key={location.location_id} value={location.location_id}>
                      {location.location_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Date Filter
                </label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => handleFilterChange('date', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'} focus:ring-2 focus:ring-blue-500 focus:border-transparent`}
                />
              </div>
            </div>
          )}
        </div>

        {/* Content */}
        <div className={`rounded-lg ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm border ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
              <span className={`ml-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Loading...</span>
            </div>
          ) : (
            <>
              {currentView === "dashboard" && renderDashboard()}
              {currentView === "movements" && renderMovementsTable()}
              {currentView === "summary" && renderSummaryTable()}
            </>
          )}
        </div>

        {/* Pagination */}
        {(currentView === "movements" || currentView === "summary") && totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-700'}`}>
              Showing page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-700'} border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''} ${isDarkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-700'} border ${isDarkMode ? 'border-gray-600' : 'border-gray-300'}`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default StockSummary;
