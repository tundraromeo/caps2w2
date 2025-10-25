'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useTheme } from './ThemeContext';
import { useNotification } from './NotificationContext';

export default function ReturnManagement() {
  const { theme } = useTheme();
  const { markNotificationAsViewed, getTotalNotifications } = useNotification();
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingReturns, setPendingReturns] = useState([]);
  const [returnHistory, setReturnHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    location: 'all',
    dateFrom: '',
    dateTo: ''
  });
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  useEffect(() => {
    if (activeTab === 'pending') {
      loadPendingReturns();
    } else {
      loadReturnHistory();
    }
  }, [activeTab]);

  // Clear return notifications when component is viewed
  useEffect(() => {
    markNotificationAsViewed('returns');
  }, []); // Empty dependency array - only run once when component mounts

  // Set up real-time refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === 'pending') {
        loadPendingReturns();
      } else {
        loadReturnHistory();
      }
    }, 30000); // Refresh every 30 seconds

    setRefreshInterval(interval);

    // Cleanup interval on component unmount
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [activeTab]); // Re-setup interval when activeTab changes

  const loadPendingReturns = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2e2/Api'}/pos_return_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_pending_returns',
          limit: 100
        })
      });

      const data = await response.json();
      if (data.success) {
        setPendingReturns(data.data);
        setLastRefresh(new Date());
      } else {
        console.error('Failed to load pending returns:', data.message);
      }
    } catch (error) {
      console.error('Error loading pending returns:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReturnHistory = async () => {
    setLoading(true);
    try {
      console.log('Loading return history...');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2e2/Api'}/pos_return_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_all_returns',
          limit: 100
        })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Return history API response:', data);
      
      if (data.success) {
        // Show all returns in history tab (including completed, approved, rejected)
        console.log('Setting return history:', data.data.length, 'returns');
        setReturnHistory(data.data);
        setLastRefresh(new Date());
      } else {
        console.error('Failed to load return history:', data.message);
      }
    } catch (error) {
      console.error('Error loading return history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getReturnDetails = async (returnId) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2e2/Api'}/pos_return_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_return_details',
          return_id: returnId
        })
      });

      const data = await response.json();
      if (data.success) {
        return data.data;
      }
      return [];
    } catch (error) {
      console.error('Error loading return details:', error);
      return [];
    }
  };

  const showReturnDetails = async (returnItem) => {
    const details = await getReturnDetails(returnItem.return_id);
    setSelectedReturn({ ...returnItem, items: details });
    setShowDetailsModal(true);
  };

  const approveReturn = async () => {
    if (!selectedReturn) return;

    try {
      const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2e2/Api'}/pos_return_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve_return',
          return_id: selectedReturn.return_id,
          approved_by: userData.user_id || 1,
          approved_by_username: userData.username || 'Admin',
          notes: approvalNotes
        })
      });

      const data = await response.json();
      if (data.success) {
        const transferMessage = data.transfer_details_updated ? 'Transfer details have been updated with returned quantities.' : '';
        toast.success(
          <div>
            <div className="font-bold text-lg">Return Approved Successfully!</div>
            <div className="mt-2">
              <div>Stock has been restored to <strong>{data.location_name}</strong></div>
              {data.return_location && data.return_location !== data.location_name && (
                <div className="text-sm text-gray-600">Return processed from: {data.return_location}</div>
              )}
              {transferMessage && <div className="mt-1">{transferMessage}</div>}
            </div>
            <div className="mt-3 text-sm">
              <div><strong>Restored Items:</strong> {data.restored_items}</div>
              <div><strong>Total Quantity:</strong> {data.total_quantity_restored} units</div>
              {data.note && <div className="text-xs text-gray-500 mt-1">{data.note}</div>}
            </div>
          </div>,
          { 
            autoClose: 8000,
            style: {
              transform: 'scale(0.8)',
              transformOrigin: 'center'
            }
          }
        );
        setShowApprovalModal(false);
        setApprovalNotes('');
        loadPendingReturns();
        loadReturnHistory(); // Refresh history to show the approved return
        
        // Clear return notifications after approval
        markNotificationAsViewed('returns');
        
        // Trigger inventory refresh for the specific location
        if (data.location_name) {
          // Dispatch custom event to notify inventory components
          window.dispatchEvent(new CustomEvent('inventoryRefresh', {
            detail: {
              location: data.location_name,
              action: 'return_approved',
              message: `Stock restored: ${data.total_quantity_restored} units`,
              transferDetailsUpdated: data.transfer_details_updated || false
            }
          }));
        }
      } else {
        toast.error(`Failed to approve return: ${data.message}`);
      }
    } catch (error) {
      console.error('Error approving return:', error);
      toast.error('Error approving return. Please try again.');
    }
  };

  const rejectReturn = async () => {
    if (!selectedReturn) return;

    try {
      const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2e2/Api'}/pos_return_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject_return',
          return_id: selectedReturn.return_id,
          rejected_by: userData.user_id || 1,
          rejected_by_username: userData.username || 'Admin',
          rejection_reason: rejectionReason
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Return rejected successfully.');
        setShowRejectionModal(false);
        setRejectionReason('');
        loadPendingReturns();
        loadReturnHistory(); // Refresh history to show the rejected return
        
        // Clear return notifications after rejection
        markNotificationAsViewed('returns');
      } else {
        toast.error(`Failed to reject return: ${data.message}`);
      }
    } catch (error) {
      console.error('Error rejecting return:', error);
      toast.error('Error rejecting return. Please try again.');
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-PH');
  };

  const handleManualRefresh = () => {
    if (activeTab === 'pending') {
      loadPendingReturns();
    } else {
      loadReturnHistory();
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-gray-100 text-gray-800'
    };
    
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
        {status.toUpperCase()}
      </span>
    );
  };

  const filteredReturns = () => {
    const returns = activeTab === 'pending' ? pendingReturns : returnHistory;
    console.log('Filtering returns:', {
      activeTab,
      returnsCount: returns.length,
      filters,
      returns: returns
    });
    
    const filtered = returns.filter(returnItem => {
      if (filters.status !== 'all' && returnItem.status !== filters.status) return false;
      if (filters.location !== 'all' && returnItem.location_name !== filters.location) return false;
      if (filters.dateFrom && new Date(returnItem.created_at) < new Date(filters.dateFrom)) return false;
      if (filters.dateTo && new Date(returnItem.created_at) > new Date(filters.dateTo)) return false;
      return true;
    });
    
    console.log('Filtered results:', filtered.length);
    return filtered;
  };

  return (
    <div className="p-6" style={{ backgroundColor: theme.bg.primary, color: theme.text.primary }}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold" style={{ color: theme.text.primary }}>Return Management</h1>
          {getTotalNotifications('returns') > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {getTotalNotifications('returns')} New
            </span>
          )}
          <div className="flex items-center gap-2 text-sm" style={{ color: theme.text.secondary }}>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span>Auto-refresh every 30s</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-sm" style={{ color: theme.text.secondary }}>
            Last updated: {lastRefresh.toLocaleTimeString()}
          </div>
          <button
            onClick={handleManualRefresh}
            disabled={loading}
            className="px-3 py-1 text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ 
              color: theme.text.secondary,
              backgroundColor: 'transparent'
            }}
            onMouseEnter={(e) => e.target.style.color = theme.text.primary}
            onMouseLeave={(e) => e.target.style.color = theme.text.secondary}
            title="Refresh now"
          >
            {loading ? 'Refreshing...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div style={{ borderBottomColor: theme.border.default }}>
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className="py-2 px-1 border-b-2 font-medium text-sm border-transparent transition-colors"
              style={{
                borderBottomColor: activeTab === 'pending' ? theme.colors.accent : 'transparent',
                color: activeTab === 'pending' ? theme.colors.accent : theme.text.secondary
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'pending') {
                  e.target.style.color = theme.text.primary;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'pending') {
                  e.target.style.color = theme.text.secondary;
                }
              }}
            >
              Pending Returns ({pendingReturns.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className="py-2 px-1 border-b-2 font-medium text-sm border-transparent transition-colors"
              style={{
                borderBottomColor: activeTab === 'history' ? theme.colors.accent : 'transparent',
                color: activeTab === 'history' ? theme.colors.accent : theme.text.secondary
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'history') {
                  e.target.style.color = theme.text.primary;
                }
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'history') {
                  e.target.style.color = theme.text.secondary;
                }
              }}
            >
              Return History ({returnHistory.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 rounded-lg shadow mb-6" style={{ backgroundColor: theme.bg.card }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{ 
                backgroundColor: theme.bg.input, 
                color: theme.text.primary,
                borderColor: theme.border.default
              }}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Location</label>
            <select
              value={filters.location}
              onChange={(e) => setFilters({...filters, location: e.target.value})}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{ 
                backgroundColor: theme.bg.input, 
                color: theme.text.primary,
                borderColor: theme.border.default
              }}
            >
              <option value="all">All Locations</option>
              <option value="Convenience Store">Convenience Store</option>
              <option value="Pharmacy">Pharmacy</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{ 
                backgroundColor: theme.bg.input, 
                color: theme.text.primary,
                borderColor: theme.border.default
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: theme.text.primary }}>Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              className="w-full px-3 py-2 rounded-md focus:outline-none"
              style={{ 
                backgroundColor: theme.bg.input, 
                color: theme.text.primary,
                borderColor: theme.border.default
              }}
            />
          </div>
        </div>
      </div>

      {/* Returns Table */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderBottomColor: theme.colors.accent }}></div>
          <p className="mt-2" style={{ color: theme.text.secondary }}>Loading returns...</p>
        </div>
      ) : (
        <div className="rounded-lg shadow overflow-hidden" style={{ backgroundColor: theme.bg.card }}>
          {filteredReturns().length === 0 ? (
            <div className="text-center py-8" style={{ color: theme.text.secondary }}>
              <p className="text-lg">No returns found</p>
              <p className="text-sm">
                {activeTab === 'pending' 
                  ? 'All returns have been processed' 
                  : 'No return history available'
                }
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full" style={{ borderColor: theme.border.default }}>
                <thead style={{ backgroundColor: theme.bg.hover }}>
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.secondary }}>
                      Return ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.secondary }}>
                      Original Transaction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.secondary }}>
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.secondary }}>
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.secondary }}>
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.secondary }}>
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.secondary }}>
                      Submitted By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.secondary }}>
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{ color: theme.text.secondary }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                  {filteredReturns().map((returnItem) => (
                    <tr 
                      key={returnItem.return_id} 
                      className="transition-colors"
                      style={{ 
                        backgroundColor: theme.bg.card,
                        borderColor: theme.border.default
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = theme.bg.hover}
                      onMouseLeave={(e) => e.target.style.backgroundColor = theme.bg.card}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: theme.text.primary }}>
                        {returnItem.return_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: theme.text.secondary }}>
                        {returnItem.original_transaction_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: theme.text.secondary }}>
                        {returnItem.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: theme.text.secondary }}>
                        {returnItem.location_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium" style={{ color: theme.text.primary }}>
                        {formatCurrency(returnItem.total_refund)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(returnItem.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: theme.text.secondary }}>
                        {returnItem.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm" style={{ color: theme.text.secondary }}>
                        {formatDate(returnItem.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => showReturnDetails(returnItem)}
                          style={{ color: theme.colors.accent }}
                          className="hover:underline transition-colors"
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Return Details Modal */}
      {showDetailsModal && selectedReturn && (
        <div className="fixed inset-0 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border-2 shadow-2xl rounded-lg ring-4 w-11/12 md:w-3/4 lg:w-1/2" 
               style={{ 
                 backgroundColor: theme.bg.card,
                 borderColor: theme.colors.accent, 
                 ringColor: `${theme.colors.accent}20`
               }}>
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium" style={{ color: theme.text.primary }}>
                  Return Details - {selectedReturn.return_id}
                </h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  style={{ color: theme.text.secondary }}
                  onMouseEnter={(e) => e.target.style.color = theme.text.primary}
                  onMouseLeave={(e) => e.target.style.color = theme.text.secondary}
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium" style={{ color: theme.text.primary }}>Original Transaction</label>
                    <p className="mt-1 text-sm" style={{ color: theme.text.secondary }}>{selectedReturn.original_transaction_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium" style={{ color: theme.text.primary }}>Location</label>
                    <p className="mt-1 text-sm" style={{ color: theme.text.secondary }}>{selectedReturn.location_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium" style={{ color: theme.text.primary }}>Reason</label>
                    <p className="mt-1 text-sm" style={{ color: theme.text.secondary }}>{selectedReturn.reason}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium" style={{ color: theme.text.primary }}>Status</label>
                    <div className="mt-1">{getStatusBadge(selectedReturn.status)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium" style={{ color: theme.text.primary }}>Total Amount</label>
                    <p className="mt-1 text-sm font-medium" style={{ color: theme.text.secondary }}>{formatCurrency(selectedReturn.total_refund)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium" style={{ color: theme.text.primary }}>Submitted By</label>
                    <p className="mt-1 text-sm" style={{ color: theme.text.secondary }}>{selectedReturn.username}</p>
                  </div>
                </div>

                {selectedReturn.approved_by_username && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium" style={{ color: theme.text.primary }}>Approved By</label>
                      <p className="mt-1 text-sm" style={{ color: theme.text.secondary }}>{selectedReturn.approved_by_username}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium" style={{ color: theme.text.primary }}>Approved At</label>
                      <p className="mt-1 text-sm" style={{ color: theme.text.secondary }}>{formatDate(selectedReturn.approved_at)}</p>
                    </div>
                  </div>
                )}

                {selectedReturn.rejection_reason && (
                  <div>
                    <label className="block text-sm font-medium" style={{ color: theme.text.primary }}>Rejection Reason</label>
                    <p className="mt-1 text-sm" style={{ color: theme.text.secondary }}>{selectedReturn.rejection_reason}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>Return Items</label>
                  <div className="overflow-x-auto">
                    <table className="min-w-full" style={{ borderColor: theme.border.default }}>
                      <thead style={{ backgroundColor: theme.bg.hover }}>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase" style={{ color: theme.text.secondary }}>Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase" style={{ color: theme.text.secondary }}>Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase" style={{ color: theme.text.secondary }}>Price</th>
                          <th className="px-4 py-2 text-left text-xs font-medium uppercase" style={{ color: theme.text.secondary }}>Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y" style={{ backgroundColor: theme.bg.card, borderColor: theme.border.default }}>
                        {selectedReturn.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm" style={{ color: theme.text.primary }}>{item.product_name}</td>
                            <td className="px-4 py-2 text-sm" style={{ color: theme.text.primary }}>{item.quantity}</td>
                            <td className="px-4 py-2 text-sm" style={{ color: theme.text.primary }}>{formatCurrency(item.price)}</td>
                            <td className="px-4 py-2 text-sm font-medium" style={{ color: theme.text.primary }}>{formatCurrency(item.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedReturn.status === 'pending' && (
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => {
                        setShowApprovalModal(true);
                        setApprovalNotes('');
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Approve Return
                    </button>
                    <button
                      onClick={() => {
                        setShowRejectionModal(true);
                        setRejectionReason('');
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Reject Return
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Approval Modal */}
      {showApprovalModal && (
        <div className="fixed inset-0 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border-2 w-96 shadow-2xl rounded-lg ring-4" 
               style={{ 
                 backgroundColor: theme.bg.card,
                 borderColor: '#10b981', 
                 ringColor: 'rgba(16, 185, 129, 0.2)'
               }}>
            <div className="mt-3">
              <h3 className="text-lg font-medium mb-4" style={{ color: theme.text.primary }}>Approve Return</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>Approval Notes (Optional)</label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-md focus:outline-none"
                  style={{ 
                    backgroundColor: theme.bg.input, 
                    color: theme.text.primary,
                    borderColor: theme.border.default
                  }}
                  rows={3}
                  placeholder="Add any notes about this approval..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowApprovalModal(false);
                    setApprovalNotes('');
                  }}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{ 
                    backgroundColor: theme.border.default, 
                    color: theme.text.primary 
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = theme.bg.hover}
                  onMouseLeave={(e) => e.target.style.backgroundColor = theme.border.default}
                >
                  Cancel
                </button>
                <button
                  onClick={approveReturn}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border-2 w-96 shadow-2xl rounded-lg ring-4" 
               style={{ 
                 backgroundColor: theme.bg.card,
                 borderColor: '#ef4444', 
                 ringColor: 'rgba(239, 68, 68, 0.2)'
               }}>
            <div className="mt-3">
              <h3 className="text-lg font-medium mb-4" style={{ color: theme.text.primary }}>Reject Return</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>Rejection Reason *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-md focus:outline-none"
                  style={{ 
                    backgroundColor: theme.bg.input, 
                    color: theme.text.primary,
                    borderColor: theme.border.default
                  }}
                  rows={3}
                  placeholder="Please provide a reason for rejecting this return..."
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRejectionModal(false);
                    setRejectionReason('');
                  }}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{ 
                    backgroundColor: theme.border.default, 
                    color: theme.text.primary 
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = theme.bg.hover}
                  onMouseLeave={(e) => e.target.style.backgroundColor = theme.border.default}
                >
                  Cancel
                </button>
                <button
                  onClick={rejectReturn}
                  disabled={!rejectionReason.trim()}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

