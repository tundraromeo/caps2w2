"use client";
import { useEffect, useRef } from 'react';
import { useNotification } from './NotificationContext';

const SystemUpdateService = () => {
  const { updateSystemUpdates, updateReportsNotifications, updateLogsNotifications } = useNotification();
  const intervalRef = useRef(null);

  const checkForRealSystemUpdates = async () => {
    try {
      // Check for actual system updates from the database
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2e2/Api'}/backend.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check_system_updates',
          hours: 1 // Check last hour for updates
        })
      });

      if (response.ok) {
        const result = await response.json();
        
        if (result.success && result.data) {
          const { hasUpdates, updateCount, reportUpdates } = result.data;
          
          if (hasUpdates) {
            // Update system updates
            updateSystemUpdates(true, updateCount);
            
            // Update reports notifications based on actual data
            updateReportsNotifications(true, updateCount, reportUpdates || {});
            
            // Update logs notifications
            updateLogsNotifications(true, updateCount, {
              'Login Logs': { hasUpdates: false, count: 0 }
            });
            
            console.log('🔄 Real system updates detected:', {
              hasUpdates: true,
              count: updateCount,
              timestamp: new Date().toISOString()
            });
          } else {
            // Clear updates
            updateSystemUpdates(false, 0);
            updateReportsNotifications(false, 0, {});
            updateLogsNotifications(false, 0, {});
            
            console.log('✅ No real system updates at this time');
          }
        } else {
          // Clear updates if no data
          updateSystemUpdates(false, 0);
          updateReportsNotifications(false, 0, {});
          updateLogsNotifications(false, 0, {});
        }
      } else {
        // Clear updates if API fails
        updateSystemUpdates(false, 0);
        updateReportsNotifications(false, 0, {});
        updateLogsNotifications(false, 0, {});
        console.log('✅ Cleared updates due to API error');
      }
    } catch (error) {
      console.error('❌ Error checking for system updates:', error);
      // Clear updates on error
      updateSystemUpdates(false, 0);
      updateReportsNotifications(false, 0, {});
      updateLogsNotifications(false, 0, {});
    }
  };

  useEffect(() => {
    // Initial check
    checkForRealSystemUpdates();

    // Set up periodic checking (every 10 minutes)
    intervalRef.current = setInterval(checkForRealSystemUpdates, 10 * 60 * 1000);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return null; // This component doesn't render anything
};

export default SystemUpdateService;

