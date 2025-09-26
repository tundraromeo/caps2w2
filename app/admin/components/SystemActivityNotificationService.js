"use client";
import { useEffect, useRef } from 'react';
import { useNotification } from './NotificationContext';

const API_BASE_URL = "http://localhost/Enguio_Project/Api/backend.php";

const SystemActivityNotificationService = () => {
  const { 
    updateSystemActivityNotifications, 
    updateMultipleSystemActivities,
    updateReportsNotifications,
    updateSystemUpdates 
  } = useNotification();
  const intervalRef = useRef(null);
  const lastCheckRef = useRef(null);

  const checkSystemActivities = async () => {
    try {
      console.log('🔍 Checking system activities...');
      
      // Check for product entry activities
      const productEntryResponse = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_recent_product_entries',
          hours: 1 // Check last hour
        })
      });

      // Check for stock out activities
      const stockOutResponse = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_recent_stock_out',
          hours: 1
        })
      });

      // Check for inventory balance changes
      const inventoryResponse = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_inventory_balance_changes',
          hours: 1
        })
      });

      // Check for cashier activities
      const cashierResponse = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_cashier_activities',
          hours: 1
        })
      });

      // Check for sales activities
      const salesResponse = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_sales_activities',
          hours: 1
        })
      });

      // Check for POS activities
      const posResponse = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_pos_activities',
          hours: 1
        })
      });

      const activities = {};

      // Process product entry activities
      if (productEntryResponse.ok) {
        try {
          const responseText = await productEntryResponse.text();
          if (responseText.trim()) {
            const productData = JSON.parse(responseText);
            if (productData.success && productData.data) {
              activities.productEntry = {
                hasUpdates: productData.data.count > 0,
                count: productData.data.count || 0
              };
            }
          }
        } catch (parseError) {
          console.error('❌ Error parsing product entry response:', parseError);
        }
      }

      // Process stock out activities
      if (stockOutResponse.ok) {
        try {
          const responseText = await stockOutResponse.text();
          if (responseText.trim()) {
            const stockOutData = JSON.parse(responseText);
            if (stockOutData.success && stockOutData.data) {
              activities.stockOut = {
                hasUpdates: stockOutData.data.count > 0,
                count: stockOutData.data.count || 0
              };
            }
          }
        } catch (parseError) {
          console.error('❌ Error parsing stock out response:', parseError);
        }
      }

      // Process inventory balance changes
      if (inventoryResponse.ok) {
        try {
          const responseText = await inventoryResponse.text();
          if (responseText.trim()) {
            const inventoryData = JSON.parse(responseText);
            if (inventoryData.success && inventoryData.data) {
              activities.inventoryBalance = {
                hasUpdates: inventoryData.data.count > 0,
                count: inventoryData.data.count || 0
              };
            }
          }
        } catch (parseError) {
          console.error('❌ Error parsing inventory response:', parseError);
        }
      }

      // Process cashier activities
      if (cashierResponse.ok) {
        try {
          const responseText = await cashierResponse.text();
          if (responseText.trim()) {
            const cashierData = JSON.parse(responseText);
            if (cashierData.success && cashierData.data) {
              activities.cashierReport = {
                hasUpdates: cashierData.data.count > 0,
                count: cashierData.data.count || 0
              };
            }
          }
        } catch (parseError) {
          console.error('❌ Error parsing cashier response:', parseError);
        }
      }

      // Process sales activities
      if (salesResponse.ok) {
        try {
          const responseText = await salesResponse.text();
          if (responseText.trim()) {
            const salesData = JSON.parse(responseText);
            if (salesData.success && salesData.data) {
              activities.salesReport = {
                hasUpdates: salesData.data.count > 0,
                count: salesData.data.count || 0
              };
            }
          }
        } catch (parseError) {
          console.error('❌ Error parsing sales response:', parseError);
        }
      }

      // Process POS activities
      if (posResponse.ok) {
        try {
          const responseText = await posResponse.text();
          if (responseText.trim()) {
            const posData = JSON.parse(responseText);
            if (posData.success && posData.data) {
              activities.posActivity = {
                hasUpdates: posData.data.count > 0,
                count: posData.data.count || 0
              };
            }
          }
        } catch (parseError) {
          console.error('❌ Error parsing POS response:', parseError);
        }
      }

      // Update system activities
      updateMultipleSystemActivities(activities);

      // Update reports notifications based on activities
      const hasAnyActivity = Object.values(activities).some(activity => activity.hasUpdates);
      if (hasAnyActivity) {
        const totalCount = Object.values(activities).reduce((sum, activity) => sum + activity.count, 0);
        
        updateReportsNotifications(true, totalCount, {
          'Stock In Report': activities.productEntry || { hasUpdates: false, count: 0 },
          'Stock Out Report': activities.stockOut || { hasUpdates: false, count: 0 },
          'Sales Report': activities.salesReport || { hasUpdates: false, count: 0 },
          'Inventory Balance Report': activities.inventoryBalance || { hasUpdates: false, count: 0 },
          'Cashier Performance Report': activities.cashierReport || { hasUpdates: false, count: 0 },
          'Stock Adjustment Report': { hasUpdates: false, count: 0 },
          'Login Logs Report': { hasUpdates: false, count: 0 }
        });

        // Update system updates
        updateSystemUpdates(true, totalCount);

        console.log('✅ System activities updated:', {
          activities,
          totalCount,
          timestamp: new Date().toISOString()
        });
      } else {
        // Clear notifications if no activities
        updateMultipleSystemActivities({
          productEntry: { hasUpdates: false, count: 0 },
          stockOut: { hasUpdates: false, count: 0 },
          inventoryBalance: { hasUpdates: false, count: 0 },
          cashierReport: { hasUpdates: false, count: 0 },
          salesReport: { hasUpdates: false, count: 0 },
          posActivity: { hasUpdates: false, count: 0 }
        });

        updateSystemUpdates(false, 0);
        console.log('✅ No new system activities detected');
      }

      lastCheckRef.current = new Date().toISOString();

    } catch (error) {
      console.error('❌ Error checking system activities:', error);
      
      // Don't simulate activities - only show notifications when there are actual activities
      // Clear all notifications if API fails
      updateMultipleSystemActivities({
        productEntry: { hasUpdates: false, count: 0 },
        stockOut: { hasUpdates: false, count: 0 },
        inventoryBalance: { hasUpdates: false, count: 0 },
        cashierReport: { hasUpdates: false, count: 0 },
        salesReport: { hasUpdates: false, count: 0 },
        posActivity: { hasUpdates: false, count: 0 }
      });

      updateSystemUpdates(false, 0);
      console.log('✅ Cleared notifications due to API error');
    }
  };

  useEffect(() => {
    // Initial check
    checkSystemActivities();

    // Set up periodic checking (every 3 minutes for real-time updates)
    intervalRef.current = setInterval(checkSystemActivities, 3 * 60 * 1000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return null; // This component doesn't render anything
};

export default SystemActivityNotificationService;
