"use client";
import { useEffect, useRef } from 'react';
import { useNotification } from './NotificationContext';

const API_BASE_URL = "http://localhost/Enguio_Project/Api/backend.php";

const RealtimeActivityService = () => {
  const notificationContext = useNotification();
  
  // Safely destructure with fallbacks
  const updateReportsNotifications = notificationContext?.updateReportsNotifications || (() => {});
  const updateLogsNotifications = notificationContext?.updateLogsNotifications || (() => {});
  const intervalRef = useRef(null);
  const lastActivityCheckRef = useRef(null);
  const previousActivityCountsRef = useRef({
    stock_in: 0,
    stock_out: 0,
    sales: 0,
    total: 0
  });

  const checkForNewActivities = async () => {
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_activity_summary',
          hours: 1 // Check last hour for real-time updates
        }),
        timeout: 10000 // 10 second timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Debug logging
      console.log('📊 Activity summary response:', result);
      
      if (result.success && result.data) {
        // The backend returns the summary data directly in result.data, not nested under 'summary'
        const summary = result.data;
        const previousCounts = previousActivityCountsRef.current;
        
        // Check for new activities with safe property access
        const newStockIn = (summary.stock_in || 0) - (previousCounts.stock_in || 0);
        const newStockOut = (summary.stock_out || 0) - (previousCounts.stock_out || 0);
        const newSales = (summary.sales || 0) - (previousCounts.sales || 0);
        const newTotal = (summary.total || 0) - (previousCounts.total || 0);
        
        // Update previous counts with safe defaults
        previousActivityCountsRef.current = {
          stock_in: summary.stock_in || 0,
          stock_out: summary.stock_out || 0,
          sales: summary.sales || 0,
          total: summary.total || 0
        };
        
        // If there are new activities, update notifications
        if (newTotal > 0) {
          console.log('🔄 New activities detected:', {
            stock_in: newStockIn,
            stock_out: newStockOut,
            sales: newSales,
            total: newTotal,
            timestamp: new Date().toISOString()
          });
          
          // Update reports notifications based on new activities
          const hasStockInUpdates = newStockIn > 0;
          const hasStockOutUpdates = newStockOut > 0;
          const hasSalesUpdates = newSales > 0;
          
          updateReportsNotifications(true, newTotal, {
            'Stock In Report': { 
              hasUpdates: hasStockInUpdates, 
              count: hasStockInUpdates ? newStockIn : 0 
            },
            'Stock Out Report': { 
              hasUpdates: hasStockOutUpdates, 
              count: hasStockOutUpdates ? newStockOut : 0 
            },
            'Sales Report': { 
              hasUpdates: hasSalesUpdates, 
              count: hasSalesUpdates ? newSales : 0 
            },
            'Inventory Balance Report': { 
              hasUpdates: newTotal > 0, 
              count: newTotal 
            },
            'Supplier Report': { 
              hasUpdates: false, 
              count: 0 
            },
            'Cashier Performance Report': { 
              hasUpdates: hasSalesUpdates, 
              count: hasSalesUpdates ? newSales : 0 
            }
          });
          
          // Update logs notifications for any activity
          updateLogsNotifications(true, newTotal, {
            'Login Logs': { 
              hasUpdates: false, 
              count: 0 
            }
          });
          
          lastActivityCheckRef.current = new Date().toISOString();
        } else {
          console.log('✅ No new activities detected');
        }
      } else {
        console.warn('⚠️ Failed to fetch activity summary:', result.message || 'Unknown error');
        console.warn('📊 Response data:', result);
      }
    } catch (error) {
      console.error('❌ Error checking for new activities:', error);
    }
  };

  useEffect(() => {
    // Initial check
    checkForNewActivities();

    // Set up periodic checking (every 2 minutes for real-time updates)
    intervalRef.current = setInterval(checkForNewActivities, 2 * 60 * 1000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return null; // This component doesn't render anything
};

export default RealtimeActivityService;

