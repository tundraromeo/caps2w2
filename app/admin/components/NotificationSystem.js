"use client";
import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { useSettings } from './SettingsContext';
import { useAlertManager } from './AlertManager';

const NotificationSystem = ({ products = [], onAlertCountChange }) => {
  const { settings, isProductExpiringSoon, isProductExpired, isStockLow, isStockOut } = useSettings();
  const { dismissAlert, isAlertDismissed } = useAlertManager();
  const [lastNotificationTime, setLastNotificationTime] = useState(0);

  // Helper function to create dismissible toast
  const createDismissibleToast = (type, message, toastId, productNames = [], autoClose = 5000) => {
    const toastOptions = {
      autoClose,
      toastId,
      closeOnClick: true,
      draggable: true,
      closeButton: true,
      onClick: () => {
        // Mark as dismissed with product details
        dismissAlert(toastId, type, productNames.join(', '), {
          productCount: productNames.length,
          dismissedAt: new Date().toISOString()
        });
        toast.dismiss(toastId);
      }
    };

    if (type === 'error') {
      toast.error(message, toastOptions);
    } else if (type === 'warning') {
      toast.warning(message, toastOptions);
    } else {
      toast.info(message, toastOptions);
    }
  };

  useEffect(() => {
    if (!products.length) return;

    // Check for expiring products (using earliest_expiration for warehouse)
    const expiringProducts = products.filter(product => {
      const expirationDate = product.earliest_expiration || product.expiration;
      return expirationDate && settings.expiryAlerts && 
             isProductExpiringSoon(expirationDate) && 
             !isProductExpired(expirationDate);
    });

    // Check for expired products
    const expiredProducts = products.filter(product => {
      const expirationDate = product.earliest_expiration || product.expiration;
      return expirationDate && isProductExpired(expirationDate);
    });

    // Check for low stock products
    const lowStockProducts = products.filter(product => {
      const quantity = parseInt(product.product_quantity || product.quantity || 0);
      return settings.lowStockAlerts && isStockLow(quantity);
    });

    // Check for out of stock products
    const outOfStockProducts = products.filter(product => {
      const quantity = parseInt(product.product_quantity || product.quantity || 0);
      return isStockOut(quantity);
    });

    // Calculate total alert count
    const totalAlerts = expiredProducts.length + expiringProducts.length + 
                       lowStockProducts.length + outOfStockProducts.length;

    // Notify parent component of alert count
    if (onAlertCountChange) {
      onAlertCountChange(totalAlerts);
    }

    // Show notifications with a delay to prevent spam
    const showNotifications = () => {
      const now = Date.now();
      const timeSinceLastNotification = now - lastNotificationTime;
      
      // Only show notifications if enough time has passed (5 minutes)
      if (timeSinceLastNotification < 300000) return;

      if (expiredProducts.length > 0 && !isAlertDismissed('expired-products')) {
        const productNames = expiredProducts.slice(0, 3).map(p => p.product_name);
        const allProductNames = expiredProducts.map(p => p.product_name);
        const moreText = expiredProducts.length > 3 ? ` and ${expiredProducts.length - 3} more` : '';
        createDismissibleToast(
          'error',
          `🚨 ${expiredProducts.length} product(s) have EXPIRED! ${productNames.join(', ')}${moreText}`,
          'expired-products',
          allProductNames,
          10000
        );
      }

      if (expiringProducts.length > 0 && !isAlertDismissed('expiring-products')) {
        const productNames = expiringProducts.slice(0, 3).map(p => p.product_name);
        const allProductNames = expiringProducts.map(p => p.product_name);
        const moreText = expiringProducts.length > 3 ? ` and ${expiringProducts.length - 3} more` : '';
        createDismissibleToast(
          'warning',
          `⚠️ ${expiringProducts.length} product(s) expiring within ${settings.expiryWarningDays} days. ${productNames.join(', ')}${moreText}`,
          'expiring-products',
          allProductNames,
          8000
        );
      }

      if (outOfStockProducts.length > 0 && !isAlertDismissed('out-of-stock')) {
        const productNames = outOfStockProducts.slice(0, 3).map(p => p.product_name);
        const allProductNames = outOfStockProducts.map(p => p.product_name);
        const moreText = outOfStockProducts.length > 3 ? ` and ${outOfStockProducts.length - 3} more` : '';
        createDismissibleToast(
          'error',
          `📦 ${outOfStockProducts.length} product(s) are OUT OF STOCK! ${productNames.join(', ')}${moreText}`,
          'out-of-stock',
          allProductNames,
          8000
        );
      }

      if (lowStockProducts.length > 0 && !isAlertDismissed('low-stock')) {
        const productNames = lowStockProducts.slice(0, 3).map(p => p.product_name);
        const allProductNames = lowStockProducts.map(p => p.product_name);
        const moreText = lowStockProducts.length > 3 ? ` and ${lowStockProducts.length - 3} more` : '';
        createDismissibleToast(
          'warning',
          `📉 ${lowStockProducts.length} product(s) are running LOW (≤${settings.lowStockThreshold} units). ${productNames.join(', ')}${moreText}`,
          'low-stock',
          allProductNames,
          6000
        );
      }

      setLastNotificationTime(now);
    };

    // Delay notifications to prevent overwhelming the user on page load
    const notificationTimer = setTimeout(showNotifications, 2000);

    return () => clearTimeout(notificationTimer);
  }, [products, settings, isProductExpiringSoon, isProductExpired, isStockLow, isStockOut, lastNotificationTime, onAlertCountChange, dismissAlert, isAlertDismissed]);

  return null; // This component doesn't render anything
};

export default NotificationSystem;
