"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useTheme } from './ThemeContext';
import { useSettings } from './SettingsContext';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://enguio.shop/backend/Api'}/backend.php`;

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

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await axios.post(API_BASE_URL, {
        action: "get_store_settings"
      });
      if (response.data.success) {
        // Merge database settings with context settings
        const mergedSettings = {
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
          },
          ...response.data.settings,
          notifications: {
            low_stock: true,
            expiry_alerts: true,
            movement_alerts: true,
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
  }, [contextSettings]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

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
            className="group relative px-6 py-3 rounded-xl font-semibold text-white transition-all duration-300 ease-in-out transform hover:scale-105 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none overflow-hidden"
            style={{ 
              backgroundColor: theme.colors.success,
              boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.3)'
            }}
          >
            <div className="relative z-10 flex items-center gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Save Settings</span>
                </>
              )}
            </div>
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-0 group-hover:opacity-20 transition-opacity duration-300"
              style={{ transform: 'translateX(-100%)' }}
            ></div>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="responsive-padding">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 p-1 rounded-xl" style={{ backgroundColor: theme.bg.secondary }}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`group relative px-6 py-3 rounded-lg font-semibold transition-all duration-300 ease-in-out flex items-center gap-3 ${
                activeTab === tab.id 
                  ? 'text-white shadow-lg transform scale-105' 
                  : 'hover:scale-105 hover:shadow-md'
              }`}
              style={{
                backgroundColor: activeTab === tab.id ? theme.colors.accent : 'transparent',
                color: activeTab === tab.id ? '#ffffff' : theme.text.primary,
                boxShadow: activeTab === tab.id ? `0 4px 12px 0 ${theme.colors.accent}40` : 'none'
              }}
            >
              <span className={`text-lg transition-transform duration-300 ${
                activeTab === tab.id ? 'scale-110' : 'group-hover:scale-110'
              }`}>
                {tab.icon}
              </span>
              <span className="relative z-10">{tab.label}</span>
              
              {/* Active indicator */}
              {activeTab === tab.id && (
                <div 
                  className="absolute inset-0 rounded-lg opacity-20"
                  style={{ 
                    background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)'
                  }}
                ></div>
              )}
              
              {/* Hover effect */}
              <div 
                className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-10 transition-opacity duration-300"
                style={{ backgroundColor: theme.colors.accent }}
              ></div>
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
                    <div key={key} className="group flex justify-between items-center p-6 border rounded-xl transition-all duration-300 hover:shadow-lg hover:scale-[1.02]" style={{ 
                      borderColor: theme.border.default, 
                      backgroundColor: theme.bg.card,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 ${
                          value ? 'bg-blue-100' : 'bg-gray-100'
                        }`} style={{ 
                          backgroundColor: value ? `${theme.colors.accent}20` : `${theme.text.secondary}20`
                        }}>
                          <span className={`text-xl transition-all duration-300 ${
                            value ? 'scale-110' : 'scale-100'
                          }`}>
                            {key === 'low_stock' && '📦'}
                            {key === 'expiry_alerts' && '⏰'}
                            {key === 'movement_alerts' && '🔄'}
                          </span>
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold capitalize mb-1" style={{ color: theme.text.primary }}>
                            {key === 'low_stock' && 'Low Stock'}
                            {key === 'expiry_alerts' && 'Expiry Alerts'}
                            {key === 'movement_alerts' && 'Movement Alerts'}
                          </h4>
                          <p className="text-sm opacity-80" style={{ color: theme.text.secondary }}>
                            {key === 'low_stock' && 'Get notified when inventory is running low'}
                            {key === 'expiry_alerts' && 'Receive alerts for products nearing expiration'}
                            {key === 'movement_alerts' && 'Get notified about stock movements and transfers'}
                          </p>
                        </div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer group">
                        <input
                          type="checkbox"
                          name={`notifications.${key}`}
                          checked={value}
                          onChange={handleInputChange}
                          className="sr-only peer"
                        />
                        <div 
                          className={`relative w-14 h-7 rounded-full transition-all duration-300 ease-in-out ${
                            value 
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                              : 'bg-gray-300'
                          }`}
                          style={{
                            boxShadow: value ? '0 4px 12px rgba(59, 130, 246, 0.4)' : '0 2px 4px rgba(0,0,0,0.1)'
                          }}
                        >
                          <div 
                            className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full transition-all duration-300 ease-in-out shadow-lg ${
                              value 
                                ? 'translate-x-7' 
                                : 'translate-x-0'
                            }`}
                            style={{
                              boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                            }}
                          >
                            {value && (
                              <div className="absolute inset-0 flex items-center justify-center">
                                <svg className="w-3 h-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-6">
                <h3 className="text-xl font-semibold mb-6" style={{ color: theme.text.primary }}>System Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="group">
                    <label className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: theme.text.primary }}>
                      <span className="text-lg">💱</span>
                      Currency
                    </label>
                    <select
                      name="currency"
                      value={storeSettings.currency}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium"
                      style={{
                        backgroundColor: theme.bg.input,
                        borderColor: theme.border.input,
                        color: theme.text.primary
                      }}
                    >
                      <option value="PHP">Philippine Peso (₱)</option>
                    </select>
                  </div>
                  
                  <div className="group">
                    <label className="block text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: theme.text.primary }}>
                      <span className="text-lg">🌍</span>
                      Timezone
                    </label>
                    <select
                      name="timezone"
                      value={storeSettings.timezone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 rounded-xl border-2 transition-all duration-300 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 focus:outline-none font-medium"
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
                
                <div className="p-6 border rounded-xl transition-all duration-300 hover:shadow-lg" style={{ 
                  borderColor: theme.border.default,
                  backgroundColor: theme.bg.card,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                }}>
                  <h4 className="font-semibold mb-4 flex items-center gap-2" style={{ color: theme.text.primary }}>
                    <span className="text-lg">ℹ️</span>
                    System Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: theme.bg.secondary }}>
                      <span className="text-sm font-medium" style={{ color: theme.text.secondary }}>Version:</span>
                      <span className="text-sm font-semibold px-3 py-1 rounded-full" style={{ 
                        backgroundColor: theme.colors.accent + '20', 
                        color: theme.colors.accent 
                      }}>1.0.0</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: theme.bg.secondary }}>
                      <span className="text-sm font-medium" style={{ color: theme.text.secondary }}>Last Updated:</span>
                      <span className="text-sm font-semibold" style={{ color: theme.text.primary }}>{new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: theme.bg.secondary }}>
                      <span className="text-sm font-medium" style={{ color: theme.text.secondary }}>Database Status:</span>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1" style={{ 
                        backgroundColor: theme.colors.successBg, 
                        color: theme.colors.success 
                      }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.colors.success }}></div>
                        Connected
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: theme.bg.secondary }}>
                      <span className="text-sm font-medium" style={{ color: theme.text.secondary }}>Server Status:</span>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1" style={{ 
                        backgroundColor: theme.colors.successBg, 
                        color: theme.colors.success 
                      }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.colors.success }}></div>
                        Online
                      </span>
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
