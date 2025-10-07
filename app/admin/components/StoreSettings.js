"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useTheme } from './ThemeContext';

const API_BASE_URL = "http://localhost/caps2e2/Api/backend.php";

function StoreSettings() {
  const { theme } = useTheme();
  const [settings, setSettings] = useState({
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
      sales_reports: true,
      system_updates: true
    }
  });
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.post(API_BASE_URL, {
        action: "get_store_settings"
      });
      if (response.data.success) {
        setSettings({ ...settings, ...response.data.settings });
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
      setSettings(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: type === 'checkbox' ? checked : value
        }
      }));
    } else {
      setSettings(prev => ({
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
        ...settings
      });
      
      if (response.data.success) {
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
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'system', label: 'System', icon: '💻' }
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg.primary }}>
      {/* Header */}
      <div className="p-6" style={{ backgroundColor: theme.colors.accent }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-6 mb-4">
              <span className="border-b-2 pb-1" style={{ color: theme.text.primary, borderColor: theme.text.primary }}>Store Settings</span>
              <span style={{ color: theme.text.secondary }}>Configuration</span>
              <span style={{ color: theme.text.secondary }}>System Preferences</span>
            </div>
            <h1 className="text-3xl font-bold" style={{ color: theme.text.primary }}>Store Settings</h1>
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="px-6 py-3 rounded-lg text-white font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50"
            style={{ backgroundColor: theme.colors.success }}
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
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
          className="rounded-lg border overflow-hidden"
          style={{
            backgroundColor: theme.bg.card,
            borderColor: theme.border.default
          }}
        >
          <div className="p-6">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>General Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>Store Name *</label>
                    <input
                      type="text"
                      name="store_name"
                      value={settings.store_name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      style={{
                        backgroundColor: theme.bg.input,
                        borderColor: theme.border.input,
                        color: theme.text.primary
                      }}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>Phone Number *</label>
                    <input
                      type="tel"
                      name="store_phone"
                      value={settings.store_phone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      style={{
                        backgroundColor: theme.bg.input,
                        borderColor: theme.border.input,
                        color: theme.text.primary
                      }}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>Email Address *</label>
                    <input
                      type="email"
                      name="store_email"
                      value={settings.store_email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      style={{
                        backgroundColor: theme.bg.input,
                        borderColor: theme.border.input,
                        color: theme.text.primary
                      }}
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>Tax Rate (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      name="tax_rate"
                      value={settings.tax_rate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      style={{
                        backgroundColor: theme.bg.input,
                        borderColor: theme.border.input,
                        color: theme.text.primary
                      }}
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>Store Address *</label>
                    <textarea
                      name="store_address"
                      value={settings.store_address}
                      onChange={handleInputChange}
                      rows="3"
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      style={{
                        backgroundColor: theme.bg.input,
                        borderColor: theme.border.input,
                        color: theme.text.primary
                      }}
                      required
                    />
                  </div>
                </div>
              </div>
            )}


            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>Notification Settings</h3>
                
                <div className="space-y-4">
                  {Object.entries(settings.notifications).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 border rounded-lg" style={{ borderColor: theme.border.default }}>
                      <div>
                        <h4 className="font-medium capitalize" style={{ color: theme.text.primary }}>
                          {key.replace('_', ' ')}
                        </h4>
                        <p className="text-sm" style={{ color: theme.text.secondary }}>
                          {key === 'low_stock' && 'Get notified when inventory is running low'}
                          {key === 'expiry_alerts' && 'Receive alerts for products nearing expiration'}
                          {key === 'sales_reports' && 'Get daily/weekly sales reports'}
                          {key === 'system_updates' && 'Receive notifications about system updates'}
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
                          className="w-11 h-6 peer-focus:outline-none peer-focus:ring-4 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:border after:rounded-full after:h-5 after:w-5 after:transition-all"
                          style={{
                            backgroundColor: theme.bg.hover,
                            '--tw-ring-color': theme.colors.accent
                          }}
                        ></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'system' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>System Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>Currency</label>
                    <select
                      name="currency"
                      value={settings.currency}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      style={{
                        backgroundColor: theme.bg.input,
                        borderColor: theme.border.input,
                        color: theme.text.primary
                      }}
                    >
                      <option value="PHP">Philippine Peso (₱)</option>
                      <option value="USD">US Dollar ($)</option>
                      <option value="EUR">Euro (€)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: theme.text.primary }}>Timezone</label>
                    <select
                      name="timezone"
                      value={settings.timezone}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      style={{
                        backgroundColor: theme.bg.input,
                        borderColor: theme.border.input,
                        color: theme.text.primary
                      }}
                    >
                      <option value="Asia/Manila">Asia/Manila (GMT+8)</option>
                      <option value="UTC">UTC (GMT+0)</option>
                      <option value="America/New_York">America/New_York (GMT-5)</option>
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
