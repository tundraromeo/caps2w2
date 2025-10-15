"use client";
/**
 * Consolidated Notification Service
 * Handles all notification types: sales, returns, warehouse, system activities
 * Replaces: RealtimeNotificationService, ReturnNotificationService, 
 *           SystemActivityNotificationService, WarehouseNotificationService
 */

import { useEffect, useRef } from 'react';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2e2/Api';

export const NotificationService = ({ 
  updateSystemActivityNotifications,
  updateReportsNotifications,
  updateReturnNotifications,
  updateWarehouseNotifications,
  addActivityNotification,
  updateMultipleSystemActivities,
  updateSystemUpdates
}) => {
  const intervalRef = useRef(null);
  const lastCheckRef = useRef(new Date());
  const POLL_INTERVAL = 30000; // 30 seconds

  // Check for new sales and POS activity
  const checkSales = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/backend.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_new_sales',
          since: lastCheckRef.current.toISOString()
        })
      });

      if (!response.ok) return;
      
      const result = await response.json();
      if (result.success && result.data) {
        const { newSales, newCashierActivity } = result.data;
        
        if (newSales > 0) {
          updateSystemActivityNotifications?.('posActivity', true, newSales);
          addActivityNotification?.('Sales Report', newSales, {
            message: `${newSales} new sales transaction${newSales > 1 ? 's' : ''} recorded`
          });
        }
        
        if (newCashierActivity > 0) {
          updateReportsNotifications?.('cashierPerformance', true, newCashierActivity);
        }
      }
    } catch (error) {
      // Silently fail - don't disrupt user experience
    }
  };

  // Check for pending returns
  const checkReturns = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/pos_return_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_pending_returns',
          limit: 100
        })
      });

      if (!response.ok) return;

      const data = await response.json();
      if (data.success && data.data) {
        const pendingReturns = data.data;
        const hasNewReturns = pendingReturns.length > 0;
        
        updateReturnNotifications?.(hasNewReturns, pendingReturns.length);
        
        if (hasNewReturns) {
          updateSystemActivityNotifications?.('returns', true, pendingReturns.length);
        }
      }
    } catch (error) {
      // Silently fail
    }
  };

  // Check for warehouse/inventory updates
  const checkWarehouse = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/backend.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_low_stock_alerts'
        })
      });

      if (!response.ok) return;

      const result = await response.json();
      if (result.success && result.data) {
        const lowStockCount = result.data.length;
        
        if (lowStockCount > 0) {
          updateWarehouseNotifications?.(true, lowStockCount);
          updateSystemActivityNotifications?.('warehouse', true, lowStockCount);
        }
      }
    } catch (error) {
      // Silently fail
    }
  };

  // Check for system activities (product entries, stock out, etc.)
  const checkSystemActivities = async () => {
    try {
      const activities = {};
      
      // Check product entries
      const productEntryResp = await fetch(`${API_BASE_URL}/backend.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_recent_product_entries',
          hours: 1
        })
      });

      if (productEntryResp.ok) {
        const data = await productEntryResp.json();
        if (data.success && data.count > 0) {
          activities.productEntry = { hasNew: true, count: data.count };
        }
      }

      // Check stock out
      const stockOutResp = await fetch(`${API_BASE_URL}/backend.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_recent_stock_out',
          hours: 1
        })
      });

      if (stockOutResp.ok) {
        const data = await stockOutResp.json();
        if (data.success && data.count > 0) {
          activities.stockOut = { hasNew: true, count: data.count };
        }
      }

      // Update all activities at once
      if (Object.keys(activities).length > 0) {
        updateMultipleSystemActivities?.(activities);
      }
    } catch (error) {
      // Silently fail
    }
  };

  // Main polling function
  const pollNotifications = async () => {
    await Promise.all([
      checkSales(),
      checkReturns(),
      checkWarehouse(),
      checkSystemActivities()
    ]);
    
    lastCheckRef.current = new Date();
  };

  useEffect(() => {
    // Initial check
    pollNotifications();

    // Set up polling interval
    intervalRef.current = setInterval(pollNotifications, POLL_INTERVAL);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return null; // This is a service component, renders nothing
};

export default NotificationService;

