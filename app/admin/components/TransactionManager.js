"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTheme } from './ThemeContext';

// Determine the correct API URL based on the current environment
const getAPIBaseURL = () => {
  if (typeof window !== 'undefined') {
    const currentHost = window.location.hostname;
    const currentPort = window.location.port;
    
    // If running on Next.js dev server (usually port 3000), use the proxy
    if (currentPort === '3000') {
      return '/api/proxy';
    }
    
    // If running on localhost without port (Apache), use direct PHP
    if (currentHost === 'localhost' && !currentPort) {
      return 'http://localhost/Enguio_Project/Api/backend.php';
    }
    
    // Otherwise use the same host/port
    return `${window.location.protocol}//${currentHost}${currentPort ? ':' + currentPort : ''}/Enguio_Project/Api/backend.php`;
  }
  
  // Fallback for server-side rendering
  return '/api/proxy';
};

const API_BASE_URL = getAPIBaseURL();

function TransactionManager() {
  const { theme } = useTheme();
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [pagination, setPagination] = useState({
    limit: 50,
    offset: 0,
    total: 0,
    hasMore: false
  });

  const fetchTransactions = async (offset = 0, append = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const requestData = {
        action: 'get_transactions',
        start_date: dateRange.startDate,
        end_date: dateRange.endDate,
        limit: pagination.limit,
        offset: offset
      };
      
      const res = await axios.post(API_BASE_URL, requestData, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (res.data?.success) {
        if (append) {
          setTransactions(prev => [...prev, ...res.data.data]);
        } else {
          setTransactions(res.data.data || []);
        }
        setPagination(res.data.pagination);
      } else {
        setError(res.data?.message || 'Failed to fetch transactions');
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setError('Failed to load transactions. Please check if XAMPP services are running.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const requestData = {
        action: 'get_transaction_summary',
        start_date: dateRange.startDate,
        end_date: dateRange.endDate
      };
      
      const res = await axios.post(API_BASE_URL, requestData);
      
      if (res.data?.success) {
        setSummary(res.data.data);
      }
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const fetchTransactionDetails = async (transactionId) => {
    try {
      setLoading(true);
      const requestData = {
        action: 'get_transaction_details',
        transaction_id: transactionId
      };
      
      const res = await axios.post(API_BASE_URL, requestData);
      
      if (res.data?.success) {
        setSelectedTransaction(res.data.data);
      } else {
        setError(res.data?.message || 'Failed to fetch transaction details');
      }
    } catch (error) {
      console.error('Error fetching transaction details:', error);
      setError('Failed to load transaction details');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (pagination.hasMore && !loading) {
      fetchTransactions(pagination.offset + pagination.limit, true);
    }
  };

  const setLast24Hours = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setDateRange({
      startDate: yesterday.toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    });
  };

  useEffect(() => {
    fetchTransactions(0, false);
    fetchSummary();
  }, [dateRange]);

  const formatCurrency = (amount) => `₱${parseFloat(amount || 0).toFixed(2)}`;
  const formatDate = (date) => new Date(date).toLocaleDateString('en-PH');
  const formatTime = (time) => new Date(`2000-01-01T${time}`).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });

  const getPaymentIcon = (paymentType) => {
    switch (paymentType?.toLowerCase()) {
      case 'cash': return '💵';
      case 'card': return '💳';
      case 'gcash': return '📱';
      default: return '💰';
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg.primary }}>
      {/* Header */}
      <div className="p-6" style={{ backgroundColor: theme.colors.accent }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-6 mb-4">
              <span className="text-4xl">📊</span>
              <div>
                <h1 className="text-3xl font-bold" style={{ color: theme.text.primary }}>Transaction Manager</h1>
                <p className="text-lg" style={{ color: theme.text.secondary }}>View and manage POS transactions</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Date Range Selection */}
        <div className="mb-6">
          <div
            className="rounded-lg shadow-md p-4"
            style={{
              backgroundColor: theme.bg.card,
              boxShadow: `0 10px 25px ${theme.shadow}`
            }}
          >
            <h3 className="text-lg font-semibold mb-3" style={{ color: theme.text.primary }}>Date Range</h3>
            <div className="flex gap-4 items-center flex-wrap">
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: theme.text.secondary }}>Start Date</label>
                <input
                  type="date"
                  value={dateRange.startDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                  className="px-3 py-2 border rounded-md"
                  style={{
                    backgroundColor: theme.bg.input,
                    borderColor: theme.border.default,
                    color: theme.text.primary
                  }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: theme.text.secondary }}>End Date</label>
                <input
                  type="date"
                  value={dateRange.endDate}
                  onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                  className="px-3 py-2 border rounded-md"
                  style={{
                    backgroundColor: theme.bg.input,
                    borderColor: theme.border.default,
                    color: theme.text.primary
                  }}
                />
              </div>
              <button
                onClick={setLast24Hours}
                className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105"
                style={{
                  backgroundColor: theme.colors.success,
                  color: 'white'
                }}
              >
                Last 24 Hours
              </button>
              <button
                onClick={() => {
                  fetchTransactions(0, false);
                  fetchSummary();
                }}
                disabled={loading}
                className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                style={{
                  backgroundColor: theme.colors.accent,
                  color: theme.text.primary
                }}
              >
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">🛒</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Transactions</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{summary.summary.total_transactions}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">💰</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Sales</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{formatCurrency(summary.summary.total_sales)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">📊</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Average Sale</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{formatCurrency(summary.summary.average_transaction)}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">👥</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Active Cashiers</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{summary.summary.active_cashiers}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg shadow-md p-4" style={{ backgroundColor: theme.bg.card, boxShadow: `0 10px 25px ${theme.shadow}` }}>
              <div className="flex items-center">
                <div className="text-3xl mr-3">🖥️</div>
                <div>
                  <p className="text-sm font-medium" style={{ color: theme.text.secondary }}>Active Terminals</p>
                  <p className="text-2xl font-bold" style={{ color: theme.text.primary }}>{summary.summary.active_terminals}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Method Breakdown */}
        {summary?.payment_breakdown && summary.payment_breakdown.length > 0 && (
          <div className="mb-6">
            <div
              className="rounded-lg shadow-md p-4"
              style={{
                backgroundColor: theme.bg.card,
                boxShadow: `0 10px 25px ${theme.shadow}`
              }}
            >
              <h3 className="text-lg font-semibold mb-3" style={{ color: theme.text.primary }}>Payment Method Breakdown</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {summary.payment_breakdown.map((payment, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-md" style={{ backgroundColor: theme.bg.input }}>
                    <div className="flex items-center">
                      <span className="text-2xl mr-2">{getPaymentIcon(payment.payment_type)}</span>
                      <span className="font-medium capitalize" style={{ color: theme.text.primary }}>{payment.payment_type}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-bold" style={{ color: theme.text.primary }}>{formatCurrency(payment.total_amount)}</div>
                      <div className="text-sm" style={{ color: theme.text.secondary }}>{payment.transaction_count} transactions</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Transactions Table */}
        <div
          className="rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200"
          style={{
            backgroundColor: theme.bg.card,
            boxShadow: `0 10px 25px ${theme.shadow}`
          }}
        >
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4" style={{ color: theme.text.primary }}>
              Transactions - {dateRange.startDate} to {dateRange.endDate}
            </h3>

            {loading && transactions.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: theme.colors.accent }}></div>
                <span className="ml-2" style={{ color: theme.text.secondary }}>Loading transactions...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">⚠️</div>
                <p className="text-lg font-medium mb-2" style={{ color: theme.colors.danger }}>Error Loading Transactions</p>
                <p className="mb-4" style={{ color: theme.text.secondary }}>{error}</p>
                <button
                  onClick={() => {
                    fetchTransactions(0, false);
                    fetchSummary();
                  }}
                  className="px-4 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105"
                  style={{
                    backgroundColor: theme.colors.accent,
                    color: theme.text.primary
                  }}
                >
                  Try Again
                </button>
              </div>
            ) : transactions.length > 0 ? (
              <>
                <div className="max-h-[600px] overflow-y-auto">
                  <table className="w-full caption-bottom text-sm">
                    <thead className="[&_tr]:border-b sticky top-0" style={{ backgroundColor: theme.bg.card }}>
                      <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>
                          Transaction ID
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>
                          Date & Time
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>
                          Cashier
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>
                          Payment
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>
                          Amount
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>
                          Items
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>
                          Terminal
                        </th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0" style={{ color: theme.text.primary }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="[&_tr:last-child]:border-0">
                      {transactions.map((transaction, index) => (
                        <tr key={index} className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                          <td className="p-4 align-middle font-medium" style={{ color: theme.text.primary }}>
                            #{transaction.transaction_id}
                          </td>
                          <td className="p-4 align-middle" style={{ color: theme.text.secondary }}>
                            <div>
                              <div>{formatDate(transaction.date)}</div>
                              <div className="text-sm">{formatTime(transaction.time)}</div>
                            </div>
                          </td>
                          <td className="p-4 align-middle" style={{ color: theme.text.secondary }}>
                            <div>
                              <div className="font-medium">{transaction.emp_name || 'Unknown'}</div>
                              <div className="text-sm">{transaction.position || 'Cashier'}</div>
                            </div>
                          </td>
                          <td className="p-4 align-middle">
                            <div className="flex items-center">
                              <span className="text-xl mr-2">{getPaymentIcon(transaction.payment_type)}</span>
                              <span className="capitalize" style={{ color: theme.text.secondary }}>{transaction.payment_type}</span>
                            </div>
                          </td>
                          <td className="p-4 align-middle font-bold" style={{ color: theme.text.primary }}>
                            {formatCurrency(transaction.total_amount)}
                          </td>
                          <td className="p-4 align-middle" style={{ color: theme.text.secondary }}>
                            {transaction.items_count || 0} items
                          </td>
                          <td className="p-4 align-middle" style={{ color: theme.text.secondary }}>
                            {transaction.terminal_name || `Terminal ${transaction.terminal_id}`}
                          </td>
                          <td className="p-4 align-middle">
                            <button
                              onClick={() => fetchTransactionDetails(transaction.transaction_id)}
                              className="px-3 py-1 rounded-md text-sm font-medium transition-all duration-200 hover:scale-105"
                              style={{
                                backgroundColor: theme.colors.accent,
                                color: theme.text.primary
                              }}
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Load More Button */}
                {pagination.hasMore && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={loadMore}
                      disabled={loading}
                      className="px-6 py-2 rounded-md font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
                      style={{
                        backgroundColor: theme.colors.accent,
                        color: theme.text.primary
                      }}
                    >
                      {loading ? 'Loading...' : `Load More (${pagination.total - transactions.length} remaining)`}
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8" style={{ color: theme.text.secondary }}>
                <div className="text-4xl mb-4">📊</div>
                <p>No transactions found for the selected date range</p>
              </div>
            )}
          </div>
        </div>

        {/* Transaction Details Modal */}
        {selectedTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div 
              className="rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
              style={{ backgroundColor: theme.bg.card }}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold" style={{ color: theme.text.primary }}>
                    Transaction #{selectedTransaction.header.transaction_id} Details
                  </h3>
                  <button
                    onClick={() => setSelectedTransaction(null)}
                    className="text-2xl hover:opacity-70"
                    style={{ color: theme.text.secondary }}
                  >
                    ×
                  </button>
                </div>
                
                {/* Transaction Header */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 rounded-md" style={{ backgroundColor: theme.bg.input }}>
                  <div>
                    <div className="text-sm font-medium" style={{ color: theme.text.secondary }}>Date & Time</div>
                    <div style={{ color: theme.text.primary }}>
                      {formatDate(selectedTransaction.header.date)} {formatTime(selectedTransaction.header.time)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: theme.text.secondary }}>Cashier</div>
                    <div style={{ color: theme.text.primary }}>{selectedTransaction.header.emp_name || 'Unknown'}</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: theme.text.secondary }}>Payment Method</div>
                    <div className="flex items-center">
                      <span className="mr-1">{getPaymentIcon(selectedTransaction.header.payment_type)}</span>
                      <span className="capitalize" style={{ color: theme.text.primary }}>{selectedTransaction.header.payment_type}</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: theme.text.secondary }}>Total Amount</div>
                    <div className="font-bold" style={{ color: theme.text.primary }}>{formatCurrency(selectedTransaction.header.total_amount)}</div>
                  </div>
                </div>

                {/* Transaction Details */}
                <h4 className="text-lg font-semibold mb-3" style={{ color: theme.text.primary }}>Products Sold</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b" style={{ borderColor: theme.border.default }}>
                        <th className="text-left py-2" style={{ color: theme.text.primary }}>Product</th>
                        <th className="text-left py-2" style={{ color: theme.text.primary }}>Barcode</th>
                        <th className="text-left py-2" style={{ color: theme.text.primary }}>Category</th>
                        <th className="text-right py-2" style={{ color: theme.text.primary }}>Quantity</th>
                        <th className="text-right py-2" style={{ color: theme.text.primary }}>Price</th>
                        <th className="text-right py-2" style={{ color: theme.text.primary }}>Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTransaction.details.map((detail, index) => (
                        <tr key={index} className="border-b" style={{ borderColor: theme.border.default }}>
                          <td className="py-2" style={{ color: theme.text.primary }}>{detail.product_name}</td>
                          <td className="py-2" style={{ color: theme.text.secondary }}>{detail.barcode}</td>
                          <td className="py-2" style={{ color: theme.text.secondary }}>{detail.category}</td>
                          <td className="py-2 text-right" style={{ color: theme.text.primary }}>{detail.quantity}</td>
                          <td className="py-2 text-right" style={{ color: theme.text.primary }}>{formatCurrency(detail.price)}</td>
                          <td className="py-2 text-right font-medium" style={{ color: theme.text.primary }}>{formatCurrency(detail.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TransactionManager;
