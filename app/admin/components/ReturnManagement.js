'use client';

import { useState, useEffect } from 'react';
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
  }, [markNotificationAsViewed]);

  const loadPendingReturns = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost/caps2e2/Api/pos_return_api.php', {
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
      const response = await fetch('http://localhost/caps2e2/Api/pos_return_api.php', {
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
      const response = await fetch('http://localhost/caps2e2/Api/pos_return_api.php', {
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
      
      const response = await fetch('http://localhost/caps2e2/Api/pos_return_api.php', {
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
        const transferMessage = data.transfer_details_updated ? '\nTransfer details have been updated with returned quantities.' : '';
        alert(`Return approved successfully! Stock has been restored to ${data.location_name}.${transferMessage}\n\nRestored Items: ${data.restored_items}\nTotal Quantity: ${data.total_quantity_restored} units`);
        setShowApprovalModal(false);
        setShowDetailsModal(false);
        setApprovalNotes('');
        loadPendingReturns();
        
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
        alert(`Failed to approve return: ${data.message}`);
      }
    } catch (error) {
      console.error('Error approving return:', error);
      alert('Error approving return. Please try again.');
    }
  };

  const rejectReturn = async () => {
    if (!selectedReturn) return;

    try {
      const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
      
      const response = await fetch('http://localhost/caps2e2/Api/pos_return_api.php', {
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
        alert('Return rejected successfully.');
        setShowRejectionModal(false);
        setShowDetailsModal(false);
        setRejectionReason('');
        loadPendingReturns();
        
        // Clear return notifications after rejection
        markNotificationAsViewed('returns');
      } else {
        alert(`Failed to reject return: ${data.message}`);
      }
    } catch (error) {
      console.error('Error rejecting return:', error);
      alert('Error rejecting return. Please try again.');
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
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">Return Management</h1>
          {getTotalNotifications('returns') > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
              {getTotalNotifications('returns')} New
            </span>
          )}
        </div>
        <button
          onClick={() => activeTab === 'pending' ? loadPendingReturns() : loadReturnHistory()}
          className="px-4 py-2 text-white rounded-lg transition-colors"
          style={{ backgroundColor: theme.colors.accent }}
        >
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'pending'
                  ? 'border-transparent text-gray-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={activeTab === 'pending' ? { borderBottomColor: theme.colors.accent, color: theme.colors.accent } : {}}
            >
              Pending Returns ({pendingReturns.length})
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'history'
                  ? 'border-transparent text-gray-500'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              style={activeTab === 'history' ? { borderBottomColor: theme.colors.accent, color: theme.colors.accent } : {}}
            >
              Return History ({returnHistory.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({...filters, status: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
            <select
              value={filters.location}
              onChange={(e) => setFilters({...filters, location: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Locations</option>
              <option value="Convenience Store">Convenience Store</option>
              <option value="Pharmacy">Pharmacy</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Returns Table */}
      {loading ? (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderBottomColor: theme.colors.accent }}></div>
          <p className="mt-2 text-gray-600">Loading returns...</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {filteredReturns().length === 0 ? (
            <div className="text-center py-8 text-gray-500">
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
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Return ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Original Transaction
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submitted By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredReturns().map((returnItem) => (
                    <tr key={returnItem.return_id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {returnItem.return_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {returnItem.original_transaction_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {returnItem.reason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {returnItem.location_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {formatCurrency(returnItem.total_refund)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(returnItem.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {returnItem.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(returnItem.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => showReturnDetails(returnItem)}
                          style={{ color: theme.colors.accent }}
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Return Details - {selectedReturn.return_id}
                </h3>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
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
                    <label className="block text-sm font-medium text-gray-700">Original Transaction</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReturn.original_transaction_id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReturn.location_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Reason</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReturn.reason}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedReturn.status)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                    <p className="mt-1 text-sm text-gray-900 font-medium">{formatCurrency(selectedReturn.total_refund)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Submitted By</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReturn.username}</p>
                  </div>
                </div>

                {selectedReturn.approved_by_username && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Approved By</label>
                      <p className="mt-1 text-sm text-gray-900">{selectedReturn.approved_by_username}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Approved At</label>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(selectedReturn.approved_at)}</p>
                    </div>
                  </div>
                )}

                {selectedReturn.rejection_reason && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Rejection Reason</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedReturn.rejection_reason}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Return Items</label>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Quantity</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedReturn.items.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.product_name}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{item.quantity}</td>
                            <td className="px-4 py-2 text-sm text-gray-900">{formatCurrency(item.price)}</td>
                            <td className="px-4 py-2 text-sm text-gray-900 font-medium">{formatCurrency(item.total)}</td>
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Approve Return</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Approval Notes (Optional)</label>
                <textarea
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Add any notes about this approval..."
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
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
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Reject Return</h3>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Rejection Reason *</label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Please provide a reason for rejecting this return..."
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowRejectionModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
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
