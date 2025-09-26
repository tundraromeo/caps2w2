"use client";
import React from 'react';
import WarehouseNotificationService from './WarehouseNotificationService';
import SystemUpdateService from './SystemUpdateService';
import RealtimeActivityService from './RealtimeActivityService';
import SystemActivityNotificationService from './SystemActivityNotificationService';

const NotificationManager = () => {
  return (
    <>
      {/* Warehouse notifications for low stock and expiry alerts */}
      <WarehouseNotificationService />
      
      {/* System update notifications */}
      <SystemUpdateService />
      
      {/* Real-time activity notifications */}
      <RealtimeActivityService />
      
      {/* System activity notifications for product entry, stock out, inventory balance, cashier and sales reports */}
      <SystemActivityNotificationService />
    </>
  );
};

export default NotificationManager;
