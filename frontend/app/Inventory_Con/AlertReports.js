"use client";
import React, { useState, useEffect } from 'react';
import { useAlertManager } from './AlertManager';
import { useTheme } from './ThemeContext';
import { 
  AlertTriangle, 
  Clock, 
  Package, 
  TrendingDown, 
  Calendar, 
  BarChart3,
  Download,
  Filter,
  RefreshCw
} from 'lucide-react';

const AlertReports = () => {
  const { theme } = useTheme();
  const { getAlertHistory, getAlertStats, clearDismissedAlerts } = useAlertManager();
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end: new Date()
  });
  const [stats, setStats] = useState(null);
  const [alertHistory, setAlertHistory] = useState([]);

  useEffect(() => {
    loadAlertData();
  }, [selectedFilter, dateRange]);

  const loadAlertData = () => {
    const filterType = selectedFilter === 'all' ? null : selectedFilter;
    const history = getAlertHistory(filterType, {
      start: dateRange.start,
      end: dateRange.end
    });
    const alertStats = getAlertStats();
    
    setAlertHistory(history);
    setStats(alertStats);
  };

  const getAlertTypeIcon = (type) => {
    switch (type) {
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Package className="h-4 w-4 text-blue-500" />;
      default:
        return <TrendingDown className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAlertTypeLabel = (type) => {
    switch (type) {
      case 'error':
        return 'Critical Alert';
      case 'warning':
        return 'Warning';
      case 'info':
        return 'Information';
      default:
        return 'Unknown';
    }
  };

  const getAlertTypeColor = (type) => {
    switch (type) {
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Type', 'Product Name', 'Details'];
    const csvContent = [
      headers.join(','),
      ...alertHistory.map(alert => [
        new Date(alert.dismissedAt).toLocaleString(),
        getAlertTypeLabel(alert.type),
        alert.productName,
        JSON.stringify(alert.details)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alert-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getDateRangeLabel = () => {
    const start = dateRange.start.toLocaleDateString();
    const end = dateRange.end.toLocaleDateString();
    return `${start} - ${end}`;
  };

  return (
    <div className="p-6 space-y-6" style={{ backgroundColor: theme.bg.primary }}>
      <div style={{ transform: 'scale(0.8)', transformOrigin: 'top left', width: '125%', minHeight: '125vh' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-2" style={{ color: theme.text.primary }}>
            Alert Reports & Analytics
          </h1>
          <p style={{ color: theme.text.secondary }}>
            Monitor and analyze inventory alert patterns and dismissals
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadAlertData}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors"
            style={{ 
              backgroundColor: theme.bg.card, 
              borderColor: theme.border.default,
              color: theme.text.primary 
            }}
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors"
            style={{ 
              backgroundColor: theme.colors.accent + '20', 
              borderColor: theme.colors.accent,
              color: theme.colors.accent 
            }}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 p-4 rounded-lg border" style={{ 
        backgroundColor: theme.bg.card, 
        borderColor: theme.border.default 
      }}>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" style={{ color: theme.text.secondary }} />
          <span style={{ color: theme.text.secondary }}>Filter by type:</span>
        </div>
        <select
          value={selectedFilter}
          onChange={(e) => setSelectedFilter(e.target.value)}
          className="px-3 py-1 rounded border"
          style={{ 
            backgroundColor: theme.bg.primary, 
            borderColor: theme.border.default,
            color: theme.text.primary 
          }}
        >
          <option value="all">All Alerts</option>
          <option value="error">Critical Alerts</option>
          <option value="warning">Warnings</option>
          <option value="info">Information</option>
        </select>
        
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" style={{ color: theme.text.secondary }} />
          <span style={{ color: theme.text.secondary }}>Date range:</span>
          <input
            type="date"
            value={dateRange.start.toISOString().split('T')[0]}
            onChange={(e) => setDateRange(prev => ({ ...prev, start: new Date(e.target.value) }))}
            className="px-3 py-1 rounded border"
            style={{ 
              backgroundColor: theme.bg.primary, 
              borderColor: theme.border.default,
              color: theme.text.primary 
            }}
          />
          <span style={{ color: theme.text.secondary }}>to</span>
          <input
            type="date"
            value={dateRange.end.toISOString().split('T')[0]}
            onChange={(e) => setDateRange(prev => ({ ...prev, end: new Date(e.target.value) }))}
            className="px-3 py-1 rounded border"
            style={{ 
              backgroundColor: theme.bg.primary, 
              borderColor: theme.border.default,
              color: theme.text.primary 
            }}
          />
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg border" style={{ 
            backgroundColor: theme.bg.card, 
            borderColor: theme.border.default 
          }}>
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium" style={{ color: theme.text.secondary }}>
                Total Alerts
              </span>
            </div>
            <div className="text-2xl font-bold" style={{ color: theme.text.primary }}>
              {stats.total}
            </div>
          </div>

          <div className="p-4 rounded-lg border" style={{ 
            backgroundColor: theme.bg.card, 
            borderColor: theme.border.default 
          }}>
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="text-sm font-medium" style={{ color: theme.text.secondary }}>
                Critical Alerts
              </span>
            </div>
            <div className="text-2xl font-bold text-red-500">
              {stats.byType.error || 0}
            </div>
          </div>

          <div className="p-4 rounded-lg border" style={{ 
            backgroundColor: theme.bg.card, 
            borderColor: theme.border.default 
          }}>
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-medium" style={{ color: theme.text.secondary }}>
                Warnings
              </span>
            </div>
            <div className="text-2xl font-bold text-yellow-500">
              {stats.byType.warning || 0}
            </div>
          </div>

          <div className="p-4 rounded-lg border" style={{ 
            backgroundColor: theme.bg.card, 
            borderColor: theme.border.default 
          }}>
            <div className="flex items-center gap-2 mb-2">
              <Package className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium" style={{ color: theme.text.secondary }}>
                Information
              </span>
            </div>
            <div className="text-2xl font-bold text-blue-500">
              {stats.byType.info || 0}
            </div>
          </div>
        </div>
      )}

      {/* Alert History Table */}
      <div className="rounded-lg border" style={{ 
        backgroundColor: theme.bg.card, 
        borderColor: theme.border.default 
      }}>
        <div className="p-4 border-b" style={{ borderColor: theme.border.default }}>
          <h3 className="text-lg font-semibold" style={{ color: theme.text.primary }}>
            Alert History ({alertHistory.length} alerts)
          </h3>
          <p className="text-sm" style={{ color: theme.text.secondary }}>
            {getDateRangeLabel()}
          </p>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b" style={{ borderColor: theme.border.default }}>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: theme.text.secondary }}>
                  Date & Time
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: theme.text.secondary }}>
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: theme.text.secondary }}>
                  Products
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium" style={{ color: theme.text.secondary }}>
                  Details
                </th>
              </tr>
            </thead>
            <tbody>
              {alertHistory.length > 0 ? (
                alertHistory.map((alert, index) => (
                  <tr key={index} className="border-b hover:bg-opacity-50" style={{ 
                    borderColor: theme.border.light,
                    backgroundColor: index % 2 === 0 ? 'transparent' : theme.bg.primary + '20'
                  }}>
                    <td className="px-4 py-3 text-sm" style={{ color: theme.text.primary }}>
                      {formatDate(alert.dismissedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getAlertTypeColor(alert.type)}`}>
                        {getAlertTypeIcon(alert.type)}
                        {getAlertTypeLabel(alert.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: theme.text.primary }}>
                      {alert.productName}
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: theme.text.secondary }}>
                      {alert.details.productCount} product(s) affected
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center" style={{ color: theme.text.secondary }}>
                    No alerts found for the selected criteria
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Clear Data Button */}
      <div className="flex justify-end">
        <button
          onClick={() => {
            if (window.confirm('Are you sure you want to clear all alert history? This action cannot be undone.')) {
              clearDismissedAlerts();
              loadAlertData();
            }
          }}
          className="px-4 py-2 rounded-lg border transition-colors text-red-600 border-red-300 hover:bg-red-50"
        >
          Clear Alert History
        </button>
      </div>
      </div>
    </div>
  );
};

export default AlertReports;
