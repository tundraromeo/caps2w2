"use client";
import React from 'react';
import NotificationService from '../../lib/NotificationService';
import { useNotification } from './NotificationContext';

const NotificationManager = () => {
  const notificationContext = useNotification();
  
  return (
    <NotificationService {...notificationContext} />
  );
};

export default NotificationManager;
