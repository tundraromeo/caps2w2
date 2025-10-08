"use client";
import { useEffect, useRef } from 'react';
import { useNotification } from './NotificationContext';
import { useSettings } from './SettingsContext';

const API_BASE_URL = "http://localhost/caps2e2/Api/backend.php";

const WarehouseNotificationService = () => {
  const { updateWarehouseNotifications, updateWarehouseSpecificNotifications } = useNotification();
  const { settings } = useSettings();
  const intervalRef = useRef(null);
  const lastFetchRef = useRef(null);

  const fetchWarehouseNotifications = async () => {
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get_warehouse_notifications',
          low_stock_threshold: settings.lowStockThreshold || 10,
          expiry_warning_days: settings.expiryWarningDays || 30
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let result;
      try {
        result = await response.json();
      } catch (e) {
        console.warn('Non-JSON response for warehouse notifications');
        return;
      }
      
      if (result.success && result.data) {
        const { totals, warehouses } = result.data;
        
        // Update overall warehouse notifications
        updateWarehouseNotifications({
          lowStock: totals.lowStock,
          expiring: totals.expiring,
          outOfStock: totals.outOfStock,
          expired: totals.expired,
          warehouses: warehouses
        });

        // Update individual warehouse notifications
        Object.entries(warehouses).forEach(([warehouseId, warehouseData]) => {
          updateWarehouseSpecificNotifications(warehouseId, warehouseData.name, {
            lowStock: warehouseData.lowStock,
            expiring: warehouseData.expiring,
            outOfStock: warehouseData.outOfStock,
            expired: warehouseData.expired
          });
        });

        lastFetchRef.current = new Date().toISOString();
        console.log('✅ Warehouse notifications updated:', {
          totals,
          warehouseCount: Object.keys(warehouses).length,
          timestamp: lastFetchRef.current
        });
      } else {
        console.warn('⚠️ Failed to fetch warehouse notifications:', result.message);
      }
    } catch (error) {
      console.error('❌ Error fetching warehouse notifications:', error);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchWarehouseNotifications();

    // Set up periodic fetching (every 5 minutes)
    intervalRef.current = setInterval(fetchWarehouseNotifications, 5 * 60 * 1000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [settings.lowStockThreshold, settings.expiryWarningDays]);

  // Manual refresh function (can be called from other components)
  const refreshNotifications = () => {
    fetchWarehouseNotifications();
  };

  return null; // This component doesn't render anything
};

export default WarehouseNotificationService;

