import { useEffect, useRef } from 'react';
import { API_BASE_URL } from '../lib/apiConfig';

/**
 * Hook to send periodic heartbeat signals to keep user status as online
 * This updates the last_seen timestamp in tbl_login table for real-time status tracking
 */
export function useHeartbeat() {
  const intervalRef = useRef(null);

  useEffect(() => {
    // Send heartbeat every 30 seconds
    const sendHeartbeat = async () => {
      try {
        // Get user data from sessionStorage to pass emp_id as fallback
        const userData = JSON.parse(sessionStorage.getItem('user_data') || '{}');
        
        const response = await fetch(`${API_BASE_URL}/backend.php`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'heartbeat',
            emp_id: userData.user_id || userData.emp_id // Pass emp_id as fallback
          }),
          credentials: 'include' // Include session cookies
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            console.log('✅ Heartbeat successful');
          } else {
            console.log('❌ Heartbeat failed:', data.message);
          }
        }
      } catch (error) {
        // Silently fail - heartbeat is not critical
        console.log('⚠️ Heartbeat error:', error.message);
      }
    };

    // Send initial heartbeat immediately
    sendHeartbeat();
    console.log('💓 Heartbeat started - will send signal every 30 seconds');

    // Set up interval to send heartbeat every 30 seconds
    intervalRef.current = setInterval(() => {
      sendHeartbeat();
    }, 30000); // 30 seconds

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return null;
}

