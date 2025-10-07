"use client";
import React, { useState, useEffect } from "react";
import axios from "axios";
import { useTheme } from './ThemeContext';

const API_BASE_URL = "http://localhost/caps2e2/Api/backend.php";

function Logs() {
  const { theme } = useTheme();
  const [selectedTab, setSelectedTab] = useState("Movement History");
  const [movementHistory, setMovementHistory] = useState([]);
  const [transferHistory, setTransferHistory] = useState([]);
  const [loginLogs, setLoginLogs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [movementLoading, setMovementLoading] = useState(false);
  const [transferLoading, setTransferLoading] = useState(false);
  const [loginLogsLoading, setLoginLogsLoading] = useState(false);
  const [activityLogsLoading, setActivityLogsLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [transferPage, setTransferPage] = useState(1);
  const [loginLogsPage, setLoginLogsPage] = useState(1);
  const [activityLogsPage, setActivityLogsPage] = useState(1);
  const itemsPerPage = 10;

  const fetchMovementHistory = async () => {
    try {
      setMovementLoading(true);
      const res = await axios.post(API_BASE_URL, { action: 'get_movement_history' });
      if (res.data?.success && Array.isArray(res.data.movements)) {
        setMovementHistory(res.data.movements);
        setCurrentPage(1);
      } else {
        setMovementHistory([]);
      }
    } catch (_) {
      setMovementHistory([]);
    } finally {
      setMovementLoading(false);
    }
  };

  const fetchTransferHistory = async () => {
    try {
      setTransferLoading(true);
      const res = await axios.post(API_BASE_URL, { action: 'get_transfer_history' });
      if (res.data?.success && Array.isArray(res.data.transfers)) {
        setTransferHistory(res.data.transfers);
        setTransferPage(1);
      } else {
        setTransferHistory([]);
      }
    } catch (_) {
      setTransferHistory([]);
    } finally {
      setTransferLoading(false);
    }
  };

  const fetchLoginLogs = async () => {
    try {
      setLoginLogsLoading(true);
      const res = await axios.post(API_BASE_URL, { action: 'get_login_logs' });
      if (res.data?.success && Array.isArray(res.data.logs)) {
        setLoginLogs(res.data.logs);
        setLoginLogsPage(1);
      } else {
        setLoginLogs([]);
      }
    } catch (_) {
      setLoginLogs([]);
    } finally {
      setLoginLogsLoading(false);
    }
  };

  const fetchActivityLogs = async () => {
    try {
      setActivityLogsLoading(true);
      const res = await axios.post(API_BASE_URL, { action: 'get_activity_logs' });
      if (res.data?.success && Array.isArray(res.data.data)) {
        setActivityLogs(res.data.data);
        setActivityLogsPage(1);
      } else {
        setActivityLogs([]);
      }
    } catch (_) {
      setActivityLogs([]);
    } finally {
      setActivityLogsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedTab === 'Movement History') {
      fetchMovementHistory();
    } else if (selectedTab === 'Transfer History') {
      fetchTransferHistory();
    } else if (selectedTab === 'Login Logs') {
      fetchLoginLogs();
    } else if (selectedTab === 'Activity Logs') {
      fetchActivityLogs();
    }
  }, [selectedTab]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: theme.bg.primary }}>
      {/* Header */}
      <div className="p-6" style={{ backgroundColor: theme.colors.accent }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-6 mb-4">
              <span className="border-b-2 pb-1" style={{ color: theme.text.primary, borderColor: theme.text.primary }}>Activity Logs</span>
              <span style={{ color: theme.text.secondary }}>System Monitoring</span>
              <span style={{ color: theme.text.secondary }}>Audit Trail</span>
            </div>
            <h1 className="text-3xl font-bold" style={{ color: theme.text.primary }}>Activity Logs</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Tabs */}
        <div className="flex items-center gap-2 mb-6">
          {['Movement History','Transfer History','Login Logs','Activity Logs'].map(tab => (
            <button
              key={tab}
              onClick={() => { 
                setSelectedTab(tab); 
                setCurrentPage(1); 
                setTransferPage(1);
                setLoginLogsPage(1);
                setActivityLogsPage(1);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                selectedTab === tab 
                  ? 'text-white' 
                  : 'hover:bg-gray-100'
              }`}
              style={{
                backgroundColor: selectedTab === tab ? theme.colors.accent : theme.bg.hover,
                color: selectedTab === tab ? theme.text.inverse : theme.text.primary
              }}
            >
              {tab}
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
          {selectedTab === 'Movement History' ? (
            <>
              <div className="max-h-[520px] overflow-y-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">#</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Product</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Movement Type</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Quantity</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">From Location</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">To Location</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {movementLoading ? (
                      <tr><td colSpan="7" className="p-4 text-center text-muted-foreground">Loading movement history...</td></tr>
                    ) : movementHistory.length === 0 ? (
                      <tr><td colSpan="7" className="p-4 text-center text-muted-foreground">No movement history</td></tr>
                    ) : (
                      movementHistory
                        .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                        .map((movement, idx) => (
                          <tr key={`${movement.id || idx}`} className="border-b transition-colors hover:bg-muted/50">
                            <td className="p-2">{(currentPage - 1) * itemsPerPage + idx + 1}</td>
                            <td className="p-2">{movement.product_name || '-'}</td>
                            <td className="p-2">{movement.movement_type || '-'}</td>
                            <td className="p-2">{movement.quantity || '-'}</td>
                            <td className="p-2">{movement.from_location || '-'}</td>
                            <td className="p-2">{movement.to_location || '-'}</td>
                            <td className="p-2">{movement.timestamp || '-'}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
              {movementHistory.length > itemsPerPage && (
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * itemsPerPage + 1} – {Math.min(currentPage * itemsPerPage, movementHistory.length)} of {movementHistory.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                      ← Prev
                    </button>
                    {Array.from({ length: Math.max(1, Math.ceil(movementHistory.length / itemsPerPage)) }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input h-8 px-3 ${currentPage === page ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-background hover:bg-accent hover:text-accent-foreground'}`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 ${currentPage === Math.max(1, Math.ceil(movementHistory.length / itemsPerPage)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={currentPage === Math.max(1, Math.ceil(movementHistory.length / itemsPerPage))}
                      onClick={() => setCurrentPage(p => Math.min(Math.max(1, Math.ceil(movementHistory.length / itemsPerPage)), p + 1))}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : selectedTab === 'Transfer History' ? (
            <>
              <div className="max-h-[520px] overflow-y-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">#</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Product</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Quantity</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">From</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">To</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Status</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {transferLoading ? (
                      <tr><td colSpan="7" className="p-4 text-center text-muted-foreground">Loading transfer history...</td></tr>
                    ) : transferHistory.length === 0 ? (
                      <tr><td colSpan="7" className="p-4 text-center text-muted-foreground">No transfer history</td></tr>
                    ) : (
                      transferHistory
                        .slice((transferPage - 1) * itemsPerPage, transferPage * itemsPerPage)
                        .map((transfer, idx) => (
                          <tr key={`${transfer.id || idx}`} className="border-b transition-colors hover:bg-muted/50">
                            <td className="p-2">{(transferPage - 1) * itemsPerPage + idx + 1}</td>
                            <td className="p-2">{transfer.product_name || '-'}</td>
                            <td className="p-2">{transfer.quantity || '-'}</td>
                            <td className="p-2">{transfer.from_location || '-'}</td>
                            <td className="p-2">{transfer.to_location || '-'}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded text-xs ${transfer.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                {transfer.status || 'pending'}
                              </span>
                            </td>
                            <td className="p-2">{transfer.timestamp || '-'}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
              {transferHistory.length > itemsPerPage && (
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(transferPage - 1) * itemsPerPage + 1} – {Math.min(transferPage * itemsPerPage, transferHistory.length)} of {transferHistory.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 ${transferPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={transferPage === 1}
                      onClick={() => setTransferPage(p => Math.max(1, p - 1))}
                    >
                      ← Prev
                    </button>
                    {Array.from({ length: Math.max(1, Math.ceil(transferHistory.length / itemsPerPage)) }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setTransferPage(page)}
                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input h-8 px-3 ${transferPage === page ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-background hover:bg-accent hover:text-accent-foreground'}`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 ${transferPage === Math.max(1, Math.ceil(transferHistory.length / itemsPerPage)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={transferPage === Math.max(1, Math.ceil(transferHistory.length / itemsPerPage))}
                      onClick={() => setTransferPage(p => Math.min(Math.max(1, Math.ceil(transferHistory.length / itemsPerPage)), p + 1))}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : selectedTab === 'Login Logs' ? (
            <>
              <div className="max-h-[520px] overflow-y-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">#</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">User</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Login Type</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Status</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">IP Address</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {loginLogsLoading ? (
                      <tr><td colSpan="6" className="p-4 text-center text-muted-foreground">Loading login logs...</td></tr>
                    ) : loginLogs.length === 0 ? (
                      <tr><td colSpan="6" className="p-4 text-center text-muted-foreground">No login logs</td></tr>
                    ) : (
                      loginLogs
                        .slice((loginLogsPage - 1) * itemsPerPage, loginLogsPage * itemsPerPage)
                        .map((log, idx) => (
                          <tr key={`${log.id || idx}`} className="border-b transition-colors hover:bg-muted/50">
                            <td className="p-2">{(loginLogsPage - 1) * itemsPerPage + idx + 1}</td>
                            <td className="p-2">{log.username || '-'}</td>
                            <td className="p-2">{log.login_type || '-'}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded text-xs ${log.status === 'SUCCESS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {log.status || '-'}
                              </span>
                            </td>
                            <td className="p-2">{log.ip_address || '-'}</td>
                            <td className="p-2">{log.timestamp || '-'}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
              {loginLogs.length > itemsPerPage && (
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(loginLogsPage - 1) * itemsPerPage + 1} – {Math.min(loginLogsPage * itemsPerPage, loginLogs.length)} of {loginLogs.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 ${loginLogsPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={loginLogsPage === 1}
                      onClick={() => setLoginLogsPage(p => Math.max(1, p - 1))}
                    >
                      ← Prev
                    </button>
                    {Array.from({ length: Math.max(1, Math.ceil(loginLogs.length / itemsPerPage)) }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setLoginLogsPage(page)}
                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input h-8 px-3 ${loginLogsPage === page ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-background hover:bg-accent hover:text-accent-foreground'}`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 ${loginLogsPage === Math.max(1, Math.ceil(loginLogs.length / itemsPerPage)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={loginLogsPage === Math.max(1, Math.ceil(loginLogs.length / itemsPerPage))}
                      onClick={() => setLoginLogsPage(p => Math.min(Math.max(1, Math.ceil(loginLogs.length / itemsPerPage)), p + 1))}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : selectedTab === 'Activity Logs' ? (
            <>
              <div className="max-h-[520px] overflow-y-auto">
                <table className="w-full caption-bottom text-sm">
                  <thead className="[&_tr]:border-b">
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">#</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">User</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Role</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Activity Type</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Description</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Table</th>
                      <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="[&_tr:last-child]:border-0">
                    {activityLogsLoading ? (
                      <tr><td colSpan="7" className="p-4 text-center text-muted-foreground">Loading activity logs...</td></tr>
                    ) : activityLogs.length === 0 ? (
                      <tr><td colSpan="7" className="p-4 text-center text-muted-foreground">No activity logs</td></tr>
                    ) : (
                      activityLogs
                        .slice((activityLogsPage - 1) * itemsPerPage, activityLogsPage * itemsPerPage)
                        .map((log, idx) => (
                          <tr key={`${log.id || idx}`} className="border-b transition-colors hover:bg-muted/50">
                            <td className="p-2">{(activityLogsPage - 1) * itemsPerPage + idx + 1}</td>
                            <td className="p-2">{log.username || '-'}</td>
                            <td className="p-2">{log.role || '-'}</td>
                            <td className="p-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                log.activity_type === 'LOGIN' ? 'bg-green-100 text-green-800' :
                                log.activity_type === 'LOGOUT' ? 'bg-red-100 text-red-800' :
                                log.activity_type === 'USER_CREATE' ? 'bg-gray-100 text-gray-800' :
                                log.activity_type === 'USER_UPDATE' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {log.activity_type || '-'}
                              </span>
                            </td>
                            <td className="p-2 max-w-xs truncate" title={log.activity_description}>
                              {log.activity_description || '-'}
                            </td>
                            <td className="p-2">{log.table_name || '-'}</td>
                            <td className="p-2">{log.created_at || '-'}</td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
              {activityLogs.length > itemsPerPage && (
                <div className="flex items-center justify-between p-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {(activityLogsPage - 1) * itemsPerPage + 1} – {Math.min(activityLogsPage * itemsPerPage, activityLogs.length)} of {activityLogs.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 ${activityLogsPage === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={activityLogsPage === 1}
                      onClick={() => setActivityLogsPage(p => Math.max(1, p - 1))}
                    >
                      ← Prev
                    </button>
                    {Array.from({ length: Math.max(1, Math.ceil(activityLogs.length / itemsPerPage)) }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setActivityLogsPage(page)}
                        className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input h-8 px-3 ${activityLogsPage === page ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-background hover:bg-accent hover:text-accent-foreground'}`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 ${activityLogsPage === Math.max(1, Math.ceil(activityLogs.length / itemsPerPage)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={activityLogsPage === Math.max(1, Math.ceil(activityLogs.length / itemsPerPage))}
                      onClick={() => setActivityLogsPage(p => Math.min(Math.max(1, Math.ceil(activityLogs.length / itemsPerPage)), p + 1))}
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default Logs;
