"use client";

import { NextUIProvider } from "@nextui-org/react";
import { SettingsProvider } from "./Inventory_Con/SettingsContext";
import { NotificationProvider } from "./Inventory_Con/NotificationContext";

export function Providers({ children }) {
  return (
    <NextUIProvider>
      <SettingsProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </SettingsProvider>
    </NextUIProvider>
  );
} 