"use client";
import React, { useEffect, useRef } from 'react';
import { useNotification } from './NotificationContext';

const API_BASE_URL = "http://localhost/caps2e2/Api/backend.php";

const RealtimeNotificationService = () => {
  const { 
    updateSystemActivityNotifications, 
    updateReportsNotifications,
    addActivityNotification 
  } = useNotification();
  
  const intervalRef = useRef(null);
  const lastCheckRef = useRef(new Date());

  const checkForNewSales = async () => {
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_new_sales',
          since: lastCheckRef.current.toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let result;
      try {
        result = await response.json();
      } catch (e) {
        console.warn('Non-JSON response when checking new sales');
        return;
      }
      
      if (result.success && result.data) {
        const { newSales, newCashierActivity } = result.data;
        
        // Update POS activity notifications
        if (newSales > 0) {
          updateSystemActivityNotifications('posActivity', true, newSales);
          addActivityNotification('Sales Report', newSales, {
            message: `${newSales} new sales transaction${newSales > 1 ? 's' : ''} recorded`
          });
        }
        
        // Update cashier performance notifications
        if (newCashierActivity > 0) {
          updateSystemActivityNotifications('cashierReport', true, newCashierActivity);
          addActivityNotification('Cashier Performance Report', newCashierActivity, {
            message: `${newCashierActivity} new cashier activit${newCashierActivity > 1 ? 'ies' : 'y'} recorded`
          });
        }
        
        // Update last check time
        lastCheckRef.current = new Date();
      }
    } catch (error) {
      console.warn('Error checking for new sales:', error);
    }
  };

  useEffect(() => {
    // Start checking for new sales every 30 seconds
    intervalRef.current = setInterval(checkForNewSales, 30000);
    
    // Initial check
    checkForNewSales();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return null; // This component doesn't render anything
};

export default RealtimeNotificationService;
