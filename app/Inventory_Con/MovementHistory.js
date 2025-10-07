"use client";
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useAPI } from "../hooks/useAPI";
import { 
  FaSearch, 
  FaEye, 
  FaFilter, 
  FaDownload, 
  FaCalendar, 
  FaMapMarkerAlt, 
  FaTruck, 
  FaBox, 
  FaUser, 
  FaRedo 
} from "react-icons/fa";
import { Package, Truck, CheckCircle, AlertCircle, Clock, ArrowRight } from "lucide-react";
import { useTheme } from './ThemeContext';

const MovementHistory = () => {
  const { isDarkMode } = useTheme();
  const { api, loading: apiLoading, error: apiError } = useAPI();
  const [allTransactions, setAllTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTransactionType, setSelectedTransactionType] = useState("all");
  const [selectedPaymentType, setSelectedPaymentType] = useState("all");
  const [selectedDateRange, setSelectedDateRange] = useState("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(10);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // API call function
  const handleApiCall = async (action, data = {}, apiEndpoint = 'backend.php') => {
    try {
      const response = await api.callGenericAPI(apiEndpoint, action, data);
      return response;
    } catch (error) {
      console.error('API Error:', error);
      toast.error(error.message || 'Failed to fetch data');
      throw error;
    }
  };

  // Fetch combined transactions data (POS + Transfers)
  const fetchAllTransactions = async () => {
    setIsLoading(true);
    try {
      const allData = [];
      
      // Fetch POS transactions
      if (selectedTransactionType === 'all' || selectedTransactionType === 'POS') {
        try {
          const posFilters = {
            limit: 200,
            location: selectedPaymentType === 'all' ? null : selectedPaymentType,
            date: selectedDateRange === 'all' ? null : selectedDateRange
          };
          const posResult = await handleApiCall('get_pos_sales', posFilters, 'sales_api.php');
          if (posResult.data) {
            const posTransactions = posResult.data.map(tx => ({
              ...tx,
              transaction_type: 'POS',
              id: `pos_${tx.transaction_id}`,
              display_id: tx.transaction_id,
              amount: Number(tx.total_amount),
              from_location: tx.terminal_name || 'POS Terminal',
              to_location: 'Customer',
              status: 'Completed',
              moved_by: tx.cashier || 'Cashier',
              items_count: tx.items_count,
              items_summary: tx.items_summary
            }));
            allData.push(...posTransactions);
          }
        } catch (error) {
          console.error('Failed to fetch POS transactions:', error);
        }
      }
      
      // Fetch Transfer transactions
      if (selectedTransactionType === 'all' || selectedTransactionType === 'Transfer') {
        try {
          const transferResult = await handleApiCall('get_transfers_with_details', {}, 'transfer_api.php');
          if (transferResult.data) {
            const transferTransactions = transferResult.data.map(tx => ({
              ...tx,
              transaction_type: 'Transfer',
              id: `transfer_${tx.transfer_header_id}`,
              display_id: `TRF-${tx.transfer_header_id}`,
              amount: Number(tx.total_value) || 0,
              from_location: tx.source_location_name,
              to_location: tx.destination_location_name,
              status: tx.status,
              moved_by: tx.employee_name || 'Employee',
              items_count: tx.total_products,
              items_summary: tx.products ? tx.products.map(p => `${p.product_name} x${p.qty}`).join(', ') : ''
            }));
            allData.push(...transferTransactions);
          }
        } catch (error) {
          console.error('Failed to fetch transfer transactions:', error);
        }
      }
      
      // Sort by date (newest first)
      allData.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setAllTransactions(allData);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      setAllTransactions([]);
      setFilteredTransactions([]);
    } finally {
      setIsLoading(false);
    }
  };



  // Initial data fetch
  useEffect(() => {
    fetchAllTransactions();
  }, []);

  // Refetch data when date range changes (server-side filtering)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchAllTransactions();
    }, 500); // Debounce search

    return () => clearTimeout(timeoutId);
  }, [selectedDateRange]);
  
  // Apply client-side filtering when other filters change
  useEffect(() => {
    if (allTransactions.length === 0) return;
    
    let filteredData = allTransactions;
    
    // Filter by transaction type
    if (selectedTransactionType !== 'all') {
      filteredData = filteredData.filter(tx => tx.transaction_type === selectedTransactionType);
    }
    
    // Filter by payment type (only for POS transactions)
    if (selectedPaymentType !== 'all') {
      filteredData = filteredData.filter(tx => {
        if (tx.transaction_type === 'POS') {
          return tx.payment_type === selectedPaymentType;
        }
        return true; // Keep all transfer transactions
      });
    }
    
    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filteredData = filteredData.filter(tx => 
        tx.display_id.toLowerCase().includes(searchLower) ||
        tx.from_location.toLowerCase().includes(searchLower) ||
        tx.to_location.toLowerCase().includes(searchLower) ||
        tx.moved_by.toLowerCase().includes(searchLower) ||
        (tx.items_summary && tx.items_summary.toLowerCase().includes(searchLower))
      );
    }
    
    setFilteredTransactions(filteredData);
  }, [allTransactions, selectedTransactionType, selectedPaymentType, searchTerm]);

  const getTransactionTypeColor = (transactionType) => {
    if (isDarkMode) {
      switch (transactionType) {
        case "POS":
          return "bg-green-900 text-green-200 border border-green-700";
        case "Transfer":
          return "bg-blue-900 text-blue-200 border border-blue-700";
        default:
          return "bg-gray-800 text-gray-200 border border-gray-700";
      }
    } else {
      switch (transactionType) {
        case "POS":
          return "bg-green-100 text-green-800 border border-green-300";
        case "Transfer":
          return "bg-blue-100 text-blue-800 border border-blue-300";
        default:
          return "bg-gray-100 text-gray-800 border border-gray-300";
      }
    }
  };

  const getPaymentTypeColor = (paymentType) => {
    if (isDarkMode) {
      switch (paymentType) {
        case "CASH":
          return "bg-green-900 text-green-200 border border-green-700";
        case "GCASH":
          return "bg-blue-900 text-blue-200 border border-blue-700";
        default:
          return "bg-gray-800 text-gray-200 border border-gray-700";
      }
    } else {
      switch (paymentType) {
        case "CASH":
          return "bg-green-100 text-green-800 border border-green-300";
        case "GCASH":
          return "bg-blue-100 text-blue-800 border border-blue-300";
        default:
          return "bg-gray-100 text-gray-800 border border-gray-300";
      }
    }
  };

  const getStatusColor = (status) => {
    if (isDarkMode) {
      switch (status) {
        case "Completed":
          return "bg-green-900 text-green-200 border border-green-700";
        case "In Progress":
        case "Pending":
          return "bg-yellow-900 text-yellow-200 border border-yellow-700";
        case "Cancelled":
          return "bg-red-900 text-red-200 border border-red-700";
        default:
          return "bg-gray-800 text-gray-200 border border-gray-700";
      }
    } else {
      switch (status) {
        case "Completed":
          return "bg-green-100 text-green-800 border border-green-300";
        case "In Progress":
        case "Pending":
          return "bg-yellow-100 text-yellow-800 border border-yellow-300";
        case "Cancelled":
          return "bg-red-100 text-red-800 border border-red-300";
        default:
          return "bg-gray-100 text-gray-800 border border-gray-300";
      }
    }
  };


  const handleViewDetails = (transaction) => {
    setSelectedTransaction(transaction);
    setShowModal(true);
  };


  const handleExport = () => {
    // TODO: Implement export functionality
    toast.info('Export functionality coming soon');
  };

  const transactionTypes = ["all", "POS", "Transfer"];
  const paymentTypes = ["all", "CASH", "GCASH"];
  const dateRanges = ["all", "today", "week", "month"];

  const pages = Math.ceil(filteredTransactions.length / rowsPerPage);
  const items = filteredTransactions.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString;
  };

  // Calculate statistics
  const totalTransactions = filteredTransactions.length;
  const posTransactions = filteredTransactions.filter(t => t.transaction_type === 'POS').length;
  const transferTransactions = filteredTransactions.filter(t => t.transaction_type === 'Transfer').length;
  const totalAmount = filteredTransactions.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

  // Theme-based styles
  const themeStyles = {
    container: {
      backgroundColor: isDarkMode ? 'var(--inventory-bg-primary)' : 'var(--inventory-bg-primary)',
      color: isDarkMode ? 'var(--inventory-text-primary)' : 'var(--inventory-text-primary)'
    },
    card: {
      backgroundColor: isDarkMode ? 'var(--inventory-bg-card)' : 'var(--inventory-bg-card)',
      borderColor: isDarkMode ? 'var(--inventory-border)' : 'var(--inventory-border)',
      boxShadow: isDarkMode ? 'var(--inventory-shadow)' : 'var(--inventory-shadow)'
    },
    text: {
      primary: isDarkMode ? 'var(--inventory-text-primary)' : 'var(--inventory-text-primary)',
      secondary: isDarkMode ? 'var(--inventory-text-secondary)' : 'var(--inventory-text-secondary)',
      muted: isDarkMode ? 'var(--inventory-text-muted)' : 'var(--inventory-text-muted)'
    },
    border: {
      color: isDarkMode ? 'var(--inventory-border)' : 'var(--inventory-border)',
      light: isDarkMode ? 'var(--inventory-border-light)' : 'var(--inventory-border-light)'
    },
    input: {
      backgroundColor: isDarkMode ? 'var(--inventory-bg-card)' : 'var(--inventory-bg-card)',
      borderColor: isDarkMode ? 'var(--inventory-border)' : 'var(--inventory-border)',
      color: isDarkMode ? 'var(--inventory-text-primary)' : 'var(--inventory-text-primary)',
      placeholderColor: isDarkMode ? 'var(--inventory-text-muted)' : 'var(--inventory-text-muted)'
    }
  };

  return (
    <div className="p-6 space-y-6 min-h-screen" style={themeStyles.container}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: themeStyles.text.primary }}>Transaction History</h1>
          <p style={{ color: themeStyles.text.secondary }}>Track all POS sales and warehouse transfers</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            <FaDownload className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center">
            <Truck className="h-8 w-8 text-blue-500" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: themeStyles.text.secondary }}>Total Transactions</p>
              <p className="text-2xl font-bold" style={{ color: themeStyles.text.primary }}>{totalTransactions}</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: themeStyles.text.secondary }}>POS Sales</p>
              <p className="text-2xl font-bold" style={{ color: themeStyles.text.primary }}>{posTransactions}</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: themeStyles.text.secondary }}>Transfers</p>
              <p className="text-2xl font-bold" style={{ color: themeStyles.text.primary }}>{transferTransactions}</p>
            </div>
          </div>
        </div>
        <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
          <div className="flex items-center">
            <Package className="h-8 w-8 text-purple-500" />
            <div className="ml-4">
              <p className="text-sm font-medium" style={{ color: themeStyles.text.secondary }}>Total Value</p>
              <p className="text-2xl font-bold" style={{ color: themeStyles.text.primary }}>₱{totalAmount.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="rounded-3xl shadow-xl p-6 border" style={themeStyles.card}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <div className="relative">
              <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: themeStyles.text.muted }} />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                style={themeStyles.input}
              />
            </div>
          </div>
          <div>
            <select
              value={selectedTransactionType}
              onChange={(e) => setSelectedTransactionType(e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              style={themeStyles.input}
            >
              {transactionTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "all" ? "All Types" : type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <select
              value={selectedPaymentType}
              onChange={(e) => setSelectedPaymentType(e.target.value)}
              className="w-full px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              style={themeStyles.input}
            >
              {paymentTypes.map((type) => (
                <option key={type} value={type}>
                  {type === "all" ? "All Payment Types" : type}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="mt-4">
          <select
            value={selectedDateRange}
            onChange={(e) => setSelectedDateRange(e.target.value)}
            className="w-full md:w-48 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            style={themeStyles.input}
          >
            {dateRanges.map((range) => (
              <option key={range} value={range}>
                {range === "all" ? "All Time" : 
                 range === "today" ? "Today" :
                 range === "week" ? "Last 7 Days" :
                 range === "month" ? "Last 30 Days" : range}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Combined Transactions Table */}
      <div className="rounded-3xl shadow-xl border" style={themeStyles.card}>
        <div className="px-6 py-4 border-b" style={{ borderColor: themeStyles.border.color }}>
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold" style={{ color: themeStyles.text.primary }}>Transaction Records</h3>
            <div className="text-sm" style={{ color: themeStyles.text.muted }}>
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                  Loading...
                </div>
              ) : (
                `${filteredTransactions.length} transactions found`
              )}
            </div>
          </div>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full min-w-max" style={{ color: themeStyles.text.primary }}>
            <thead className="border-b sticky top-0 z-10" style={{ backgroundColor: isDarkMode ? '#374151' : '#f8fafc', borderColor: themeStyles.border.color }}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  TYPE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  TRANSACTION ID
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  AMOUNT/VALUE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  FROM
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  TO
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  HANDLED BY
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  ITEMS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  STATUS
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  DATE & TIME
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider" style={{ color: themeStyles.text.primary }}>
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ backgroundColor: themeStyles.card.backgroundColor, borderColor: themeStyles.border.color }}>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center" style={{ color: themeStyles.text.muted }}>
                    Loading transactions...
                  </td>
                </tr>
              ) : items.length > 0 ? (
                items.map((item) => (
                  <tr key={item.id} className="hover:opacity-80 transition-colors" style={{ backgroundColor: themeStyles.card.backgroundColor }}>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${getTransactionTypeColor(item.transaction_type)}`}>
                        {item.transaction_type === 'POS' ? '🛒' : '🚚'}
                        {item.transaction_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium" style={{ color: themeStyles.text.primary }}>{item.display_id}</div>
                        {item.reference_number && (
                          <div className="text-sm" style={{ color: themeStyles.text.muted }}>Ref: {item.reference_number}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="font-semibold text-green-500">
                        ₱{Number(item.amount).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FaMapMarkerAlt className="text-gray-400 h-3 w-3" />
                        <span className="text-sm" style={{ color: themeStyles.text.primary }}>{item.from_location}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FaMapMarkerAlt className="text-gray-400 h-3 w-3" />
                        <span className="text-sm" style={{ color: themeStyles.text.primary }}>{item.to_location}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <FaUser className="text-gray-400 h-3 w-3" />
                        <span className="text-sm" style={{ color: themeStyles.text.primary }}>{item.moved_by}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium" style={{ color: themeStyles.text.primary }}>{item.items_count} items</div>
                        {item.items_summary && (
                          <div className="text-xs" style={{ color: themeStyles.text.muted }}>{item.items_summary.substring(0, 30)}...</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(item.status)}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium" style={{ color: themeStyles.text.primary }}>{formatDate(item.date)}</div>
                        <div className="text-sm" style={{ color: themeStyles.text.muted }}>{formatTime(item.time)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={() => handleViewDetails(item)}
                          className="text-blue-600 hover:text-blue-900 p-1 transition-colors"
                        >
                          <FaEye className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={10} className="px-6 py-8 text-center">
                    <div className="flex flex-col items-center space-y-3">
                      <FaBox className="h-12 w-12" style={{ color: themeStyles.text.muted }} />
                      <div style={{ color: themeStyles.text.muted }}>
                        <p className="text-lg font-medium">No transaction records found</p>
                        <p className="text-sm">Try adjusting your filters or refresh the data</p>
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
                className="px-3 py-1 rounded disabled:opacity-50 transition-colors"
                style={{
                  backgroundColor: themeStyles.card.backgroundColor,
                  color: themeStyles.text.primary,
                  border: `1px solid ${themeStyles.border.color}`
                }}
              >
                Previous
              </button>
              <span className="px-3 py-1 text-sm" style={{ color: themeStyles.text.primary }}>
                Page {page} of {pages}
              </span>
              <button
                onClick={() => setPage(Math.min(pages, page + 1))}
                disabled={page === pages}
                className="px-3 py-1 rounded disabled:opacity-50 transition-colors"
                style={{
                  backgroundColor: themeStyles.card.backgroundColor,
                  color: themeStyles.text.primary,
                  border: `1px solid ${themeStyles.border.color}`
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>


      {/* Details Modal */}
      {showModal && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
          <div className="rounded-3xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto border" style={themeStyles.card}>
            <div className="px-6 py-4 border-b" style={{ borderColor: themeStyles.border.color }}>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold" style={{ color: themeStyles.text.primary }}>Transaction Details</h3>
                <button 
                  onClick={() => setShowModal(false)}
                  className="hover:opacity-70 transition-colors"
                  style={{ color: themeStyles.text.muted }}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              {selectedTransaction && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold mb-3" style={{ color: themeStyles.text.secondary }}>Transaction Information</h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Type:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedTransaction.transaction_type}</div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Transaction ID:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedTransaction.display_id}</div>
                        </div>
                        {selectedTransaction.reference_number && (
                          <div>
                            <span className="text-sm" style={{ color: themeStyles.text.muted }}>Reference Number:</span>
                            <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedTransaction.reference_number}</div>
                          </div>
                        )}
                        {selectedTransaction.payment_type && (
                        <div>
                            <span className="text-sm" style={{ color: themeStyles.text.muted }}>Payment Type:</span>
                            <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedTransaction.payment_type}</div>
                        </div>
                        )}
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Amount/Value:</span>
                          <div className="font-medium text-green-500">₱{Number(selectedTransaction.amount).toFixed(2)}</div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Status:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedTransaction.status}</div>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-3" style={{ color: themeStyles.text.secondary }}>Location & Staff Details</h4>
                      <div className="space-y-3">
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>From:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedTransaction.from_location}</div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>To:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedTransaction.to_location}</div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Handled By:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedTransaction.moved_by}</div>
                          </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Items Count:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{selectedTransaction.items_count}</div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Date:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{formatDate(selectedTransaction.date)}</div>
                        </div>
                        <div>
                          <span className="text-sm" style={{ color: themeStyles.text.muted }}>Time:</span>
                          <div className="font-medium" style={{ color: themeStyles.text.primary }}>{formatTime(selectedTransaction.time)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {selectedTransaction.items_summary && (
                    <div>
                      <h4 className="font-semibold mb-3" style={{ color: themeStyles.text.secondary }}>Items Summary</h4>
                      <div className="p-3 rounded-lg" style={{ backgroundColor: isDarkMode ? '#374151' : '#f1f5f9' }}>
                        <p style={{ color: themeStyles.text.secondary }}>{selectedTransaction.items_summary}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-end" style={{ borderColor: themeStyles.border.color }}>
              <button 
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      

    </div>
  );
};

export default MovementHistory; 