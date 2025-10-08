"use client";
import { useEffect, useRef } from 'react';
import { useNotification } from './NotificationContext';

const ReturnNotificationService = () => {
  const { updateReturnNotifications, notifications } = useNotification();
  const intervalRef = useRef(null);
  const lastCheckRef = useRef(null);

  // Function to check for new returns
  const checkForNewReturns = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2e2/Api'}/pos_return_api.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'get_pending_returns',
          limit: 100
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.warn('Non-JSON response when checking returns');
        return;
      }
      
      if (data.success && data.data) {
        const pendingReturns = data.data;
        const currentTime = new Date().toISOString();
        
        // Check if there are new returns since last check
        let newReturnsCount = 0;
        
        if (lastCheckRef.current) {
          newReturnsCount = pendingReturns.filter(returnItem => {
            const returnTime = new Date(returnItem.created_at);
            const lastCheckTime = new Date(lastCheckRef.current);
            return returnTime > lastCheckTime;
          }).length;
        } else {
          // First time checking - count all pending returns
          newReturnsCount = pendingReturns.length;
        }
        
        // Update notifications if there are new returns
        if (newReturnsCount > 0) {
          updateReturnNotifications({
            pendingReturns: pendingReturns.length,
            pendingApprovals: pendingReturns.length
          });
          
          // Show browser notification if permission is granted
          if (Notification.permission === 'granted') {
            new Notification(`New Return Request${newReturnsCount > 1 ? 's' : ''}`, {
              body: `${newReturnsCount} new return request${newReturnsCount > 1 ? 's' : ''} from POS system require${newReturnsCount > 1 ? '' : 's'} approval`,
              icon: '/assets/enguio_logo.png',
              tag: 'return-notification'
            });
          }
        }
        
        lastCheckRef.current = currentTime;
      }
    } catch (error) {
      console.error('Error checking for new returns:', error);
    }
  };

  // Request notification permission
  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  useEffect(() => {
    // Request notification permission on mount
    requestNotificationPermission();
    
    // Check for returns immediately
    checkForNewReturns();
    
    // Set up interval to check every 30 seconds
    intervalRef.current = setInterval(checkForNewReturns, 30000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Listen for return events from other components
  useEffect(() => {
    const handleReturnEvent = (event) => {
      if (event.detail && event.detail.type === 'new_return') {
        // Immediately check for new returns when a return event is triggered
        checkForNewReturns();
      }
    };

    window.addEventListener('returnCreated', handleReturnEvent);
    
    return () => {
      window.removeEventListener('returnCreated', handleReturnEvent);
    };
  }, []);

  return null; // This component doesn't render anything
};

export default ReturnNotificationService;

