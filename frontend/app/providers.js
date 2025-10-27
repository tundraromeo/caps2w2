"use client";

import { useHeartbeat } from './hooks/useHeartbeat';

export function Providers({ children }) {
  // Send heartbeat signals to keep user status as online
  useHeartbeat();
  
  return <>{children}</>;
} 