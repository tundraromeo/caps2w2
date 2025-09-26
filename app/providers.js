"use client";

import { NextUIProvider } from "@nextui-org/react";
import { SettingsProvider } from "./Inventory_Con/SettingsContext";
import { AlertManagerProvider } from "./Inventory_Con/AlertManager";

export function Providers({ children }) {
  return (
    <NextUIProvider>
      <SettingsProvider>
        <AlertManagerProvider>
          {children}
        </AlertManagerProvider>
      </SettingsProvider>
    </NextUIProvider>
  );
} 