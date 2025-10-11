/**
 * Heartbeat Service - Real-time Online/Offline Status Detection
 * 
 * This service sends periodic heartbeat signals to the server to maintain
 * the user's "online" status. If heartbeats stop (browser closed, network lost),
 * the backend will automatically mark the user as offline.
 * 
 * Usage:
 * import { HeartbeatService } from '@/app/lib/HeartbeatService';
 * 
 * // Start heartbeat when user logs in
 * HeartbeatService.start(userData);
 * 
 * // Stop heartbeat when user logs out
 * HeartbeatService.stop();
 */

const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2e2/Api';

class HeartbeatServiceClass {
  constructor() {
    this.intervalId = null;
    this.userData = null;
    this.isRunning = false;
  }

  /**
   * Start sending heartbeat signals
   * @param {Object} userData - User data from session storage
   */
  start(userData) {
    if (this.isRunning) {
      console.log('⚡ Heartbeat already running');
      return;
    }

    if (!userData) {
      console.error('❌ Cannot start heartbeat: No user data provided');
      return;
    }

    // Support both emp_id and user_id
    const empId = userData.emp_id || userData.user_id;
    if (!empId) {
      console.error('❌ Cannot start heartbeat: Invalid user data (no emp_id or user_id)', userData);
      return;
    }

    // Normalize user data to ensure emp_id exists
    this.userData = {
      ...userData,
      emp_id: empId,
      user_id: empId,
      username: userData.username || userData.full_name || 'Unknown User'
    };
    this.isRunning = true;

    console.log('💓 Starting heartbeat service for:', this.userData.username, '(ID:', empId, ')');

    // Send initial heartbeat immediately
    this.sendHeartbeat();

    // Then send heartbeat every 30 seconds
    this.intervalId = setInterval(() => {
      this.sendHeartbeat();
    }, HEARTBEAT_INTERVAL);

    // Also send heartbeat on user activity (mouse move, keyboard)
    this.setupActivityListeners();
  }

  /**
   * Stop sending heartbeat signals
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.removeActivityListeners();
    this.isRunning = false;

    console.log('💔 Heartbeat service stopped');
  }

  /**
   * Send heartbeat signal to server
   */
  async sendHeartbeat() {
    if (!this.userData) return;

    try {
      const empId = this.userData.emp_id || this.userData.user_id;
      const loginId = this.userData.login_id;
      const username = this.userData.username || this.userData.full_name || 'Unknown';

      const response = await fetch(`${API_BASE_URL}/heartbeat.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'heartbeat',
          emp_id: empId,
          login_id: loginId,
          username: username
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('💓 Heartbeat sent:', result.timestamp);
      } else {
        console.warn('⚠️ Heartbeat failed:', result.message);
        
        // If server says we should re-login, stop heartbeat
        if (result.should_relogin) {
          this.stop();
          console.log('🔒 Session expired - stopping heartbeat service');
          // You could trigger a re-login modal here
        }
      }
    } catch (error) {
      console.error('❌ Heartbeat error:', error);
      // Don't stop on network errors - keep trying
    }
  }

  /**
   * Setup activity listeners to detect user activity
   */
  setupActivityListeners() {
    // Debounced heartbeat on activity
    let activityTimeout = null;

    this.activityHandler = () => {
      if (activityTimeout) clearTimeout(activityTimeout);
      
      activityTimeout = setTimeout(() => {
        this.sendHeartbeat();
      }, 5000); // Send heartbeat 5 seconds after activity
    };

    // Listen for user activity
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', this.activityHandler);
      window.addEventListener('keydown', this.activityHandler);
      window.addEventListener('click', this.activityHandler);
    }
  }

  /**
   * Remove activity listeners
   */
  removeActivityListeners() {
    if (typeof window !== 'undefined' && this.activityHandler) {
      window.removeEventListener('mousemove', this.activityHandler);
      window.removeEventListener('keydown', this.activityHandler);
      window.removeEventListener('click', this.activityHandler);
    }
  }

  /**
   * Check if heartbeat is currently running
   */
  isActive() {
    return this.isRunning;
  }
}

// Export singleton instance
export const HeartbeatService = new HeartbeatServiceClass();

// Also export as default
export default HeartbeatService;

