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
        
        // Skip heartbeat if no user data (user not logged in)
        if (!userData.user_id && !userData.emp_id) {
          return;
        }
        
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

        // Parse response even if status is not ok (backend might return JSON error with 200)
        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (parseError) {
          // If response is not JSON, it's likely a server error
          if (process.env.NODE_ENV === 'development') {
            console.warn('⚠️ Heartbeat: Invalid JSON response:', text);
          }
          return;
        }

        if (data.success) {
          // Only log in development to reduce console noise
          if (process.env.NODE_ENV === 'development') {
            console.log('✅ Heartbeat successful');
          }
        } else {
          // Check for database connection errors specifically
          const errorMessage = data.message || 'Unknown error';
          if (errorMessage.includes('Database connection failed')) {
            console.error('❌ Heartbeat failed: Database connection failed. Please check your database configuration and ensure MySQL is running.');
          } else {
            // Other errors (like "No active login record found") are less critical
            if (process.env.NODE_ENV === 'development') {
              console.log('❌ Heartbeat failed:', errorMessage);
            }
          }
        }
      } catch (error) {
        // Network errors and other exceptions
        if (process.env.NODE_ENV === 'development') {
          console.log('⚠️ Heartbeat error:', error.message);
        }
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

