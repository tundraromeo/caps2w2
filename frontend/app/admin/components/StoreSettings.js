"use client";
import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useTheme } from './ThemeContext';
import { useSettings } from './SettingsContext';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2e2/Api'}/backend.php`;

function StoreSettings() {
  const { theme } = useTheme();
  const { settings: contextSettings, updateSetting } = useSettings();
  const [storeSettings, setStoreSettings] = useState({
    store_name: '',
    store_address: '',
    store_phone: '',
    store_email: '',
    tax_rate: '',
    currency: 'PHP',
    timezone: 'Asia/Manila',
    notifications: {
      low_stock: true,
      expiry_alerts: true,
      movement_alerts: true
    }
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('notifications');
  const syncTimeoutRef = useRef(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Sync notification settings with context settings when user toggles them
  const syncWithContext = (newStoreSettings) => {
    if (newStoreSettings.notifications) {
      // Clear any existing timeout
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
      
      // Debounce the sync to prevent rapid updates
      syncTimeoutRef.current = setTimeout(() => {
        updateSetting('lowStockAlerts', newStoreSettings.notifications.low_stock);
        updateSetting('expiryAlerts', newStoreSettings.notifications.expiry_alerts);
        updateSetting('movementAlerts', newStoreSettings.notifications.movement_alerts);
        syncTimeoutRef.current = null;
      }, 100);
    }
  };

  // Helper functions for notification functionality
  const handleExpiryAlertSettings = (days) => {
    setStoreSettings(prev => ({
      ...prev,
      notifications: {
        ...prev.notifications,
        expiry_warning_days: days
      }
    }));
    // Update context setting
    updateSetting('expiryWarningDays', days);
  };

  const checkExpiringProducts = () => {
    // This would typically check for products expiring within the warning period
    toast.info('Expiry check functionality would be implemented here');
  };

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.post(API_BASE_URL, {
        action: "get_store_settings"
      });
      if (response.data.success) {
        // Merge database settings with context settings
        const mergedSettings = {
          ...storeSettings,
          ...response.data.settings,
          notifications: {
            ...storeSettings.notifications,
            ...response.data.settings.notifications,
            // Use context settings if available, otherwise use database defaults
            low_stock: contextSettings.lowStockAlerts !== undefined ? contextSettings.lowStockAlerts : response.data.settings.notifications?.low_stock ?? true,
            expiry_alerts: contextSettings.expiryAlerts !== undefined ? contextSettings.expiryAlerts : response.data.settings.notifications?.expiry_alerts ?? true,
            movement_alerts: contextSettings.movementAlerts !== undefined ? contextSettings.movementAlerts : response.data.settings.notifications?.movement_alerts ?? true
          }
        };
        
        setStoreSettings(mergedSettings);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      const newSettings = {
        ...storeSettings,
        [parent]: {
          ...storeSettings[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      };
      setStoreSettings(newSettings);
      
      // If it's a notification setting, sync with context immediately
      if (parent === 'notifications') {
        syncWithContext(newSettings);
      }
    } else {
      setStoreSettings(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };


  const handleSaveSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.post(API_BASE_URL, {
        action: "update_store_settings",
        ...storeSettings
      });
      
      if (response.data.success) {
        // Sync with context settings
        syncWithContext(storeSettings);
        
        toast.success('Settings saved successfully!');
      } else {
        toast.error(response.data.message || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Error saving settings');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'system', label: 'System', icon: '💻' }
  ];

  return (
    <div className="responsive-container" style={{ backgroundColor: theme.bg.primary }}>
      {/* Header */}
      <div className="responsive-padding" style={{ backgroundColor: theme.bg.primary }}>
        <div className="responsive-flex justify-between">
          <div>
            <h1 className="responsive-text-2xl font-bold" style={{ color: theme.text.primary }}>Store Settings</h1>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="responsive-button rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
            style={{ backgroundColor: theme.colors.success }}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="responsive-padding">
        {/* Tabs */}
        <div className="responsive-nav mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`responsive-button rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                activeTab === tab.id 
                  ? 'text-white' 
                  : 'hover:bg-gray-100'
              }`}
              style={{
                backgroundColor: activeTab === tab.id ? theme.colors.accent : theme.bg.hover,
                color: activeTab === tab.id ? theme.text.inverse : theme.text.primary
              }}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div 
          className="responsive-card rounded-lg border overflow-hidden"
          style={{
            backgroundColor: theme.bg.card,
            borderColor: theme.border.default
          }}
        >
          <div className="responsive-padding">
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="responsive-text-lg font-semibold" style={{ color: theme.text.primary }}>Notification Settings</h3>
                
                <div className="space-y-4">
                  {Object.entries(storeSettings.notifications).filter(([key]) => ['low_stock', 'expiry_alerts', 'movement_alerts'].includes(key)).map(([key, value]) => (
                    <div key={key} className="responsive-flex justify-between responsive-padding border rounded-lg" style={{ borderColor: theme.border.default, backgroundColor: theme.bg.card }}>
                      <div>
                        <h4 className="responsive-text-base font-medium capitalize" style={{ color: theme.text.primary }}>
                          {key === 'low_stock' && 'Low Stock'}
                          {key === 'expiry_alerts' && 'Expiry Alerts'}
                          {key === 'movement_alerts' && 'Movement Alerts'}
                        </h4>
                        <p className="responsive-text-sm" style={{ color: theme.text.secondary }}>
                          {key === 'low_stock' && 'Get notified when inventory is running low'}
                          {key === 'expiry_alerts' && 'Receive alerts for products nearing expiration'}
                          {key === 'movement_alerts' && 'Get notified about stock movements and transfers'}
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name={`notifications.${key}`}
                          checked={value}
                          onChange={handleInputChange}
                          className="sr-only peer"
                        />
                        <div 
                          className={`w-11 h-6 rounded-full transition-all duration-200 ease-in-out ${
                            value 
                              ? 'bg-blue-600' 
                              : 'bg-gray-300'
                          }`}
                        >
                          <div 
                            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full transition-all duration-200 ease-in-out ${
                              value 
                                ? 'translate-x-5' 
                                : 'translate-x-0'
                            }`}
                          ></div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-6">
                <h3 className="responsive-text-lg font-semibold" style={{ color: theme.text.primary }}>System Settings</h3>
                
                <div className="responsive-grid">
                  <div>
                    <label className="block responsive-text-sm font-medium mb-2" style={{ color: theme.text.primary }}>Currency</label>
                    <select
                      name="currency"
                      value={storeSettings.currency}
                      onChange={handleInputChange}
                      className="responsive-input rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      style={{
                        backgroundColor: theme.bg.input,
                        borderColor: theme.border.input,
                        color: theme.text.primary
                      }}
                    >
                      <option value="PHP">Philippine Peso (₱)</option>
                  
                    </select>
                  </div>
                  
                  <div>
                    <label className="block responsive-text-sm font-medium mb-2" style={{ color: theme.text.primary }}>Timezone</label>
                    <select
                      name="timezone"
                      value={storeSettings.timezone}
                      onChange={handleInputChange}
                      className="responsive-input rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      style={{
                        backgroundColor: theme.bg.input,
                        borderColor: theme.border.input,
                        color: theme.text.primary
                      }}
                    >
                      <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                      
                    </select>
                  </div>
                </div>
                
                <div className="p-4 border rounded-lg" style={{ borderColor: theme.border.default }}>
                  <h4 className="font-medium mb-2" style={{ color: theme.text.primary }}>System Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span style={{ color: theme.text.secondary }}>Version:</span>
                      <span className="ml-2" style={{ color: theme.text.primary }}>1.0.0</span>
                    </div>
                    <div>
                      <span style={{ color: theme.text.secondary }}>Last Updated:</span>
                      <span className="ml-2" style={{ color: theme.text.primary }}>{new Date().toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span style={{ color: theme.text.secondary }}>Database Status:</span>
                      <span className="ml-2 px-2 py-1 rounded text-xs" style={{ backgroundColor: theme.colors.successBg, color: theme.colors.success }}>Connected</span>
                    </div>
                    <div>
                      <span style={{ color: theme.text.secondary }}>Server Status:</span>
                      <span className="ml-2 px-2 py-1 rounded text-xs" style={{ backgroundColor: theme.colors.successBg, color: theme.colors.success }}>Online</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StoreSettings;
