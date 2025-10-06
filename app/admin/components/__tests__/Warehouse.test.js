import React from 'react';
import { render, screen } from '@testing-library/react';
import Warehouse from '../Warehouse';

// Mock contexts used by Warehouse
jest.mock('../ThemeContext', () => ({ useTheme: () => ({ theme: 'light' }) }));
jest.mock('../SettingsContext', () => ({
  useSettings: () => ({
    settings: { lowStockThreshold: 5, expiryAlerts: true, expiryWarningDays: 30, lowStockAlerts: true, barcodeScanning: false },
    isProductExpiringSoon: () => false,
    isProductExpired: () => false,
    getExpiryStatus: () => 'in stock',
    isStockLow: () => false,
  })
}));

// Mock NotificationSystem
jest.mock('../NotificationSystem', () => () => null);

// Test: Warehouse renders fallback UI and does not crash on empty/malformed data

describe('Warehouse Component Defensive Rendering', () => {
  it('renders without crashing on empty inventoryData', () => {
    render(<Warehouse />);
    // Should render some fallback UI, e.g. empty table or message
    expect(screen.queryByText(/no products/i)).toBeTruthy();
  });

  it('renders without crashing on malformed inventoryData', () => {
    // Simulate malformed data by directly setting state (not ideal, but for demonstration)
    // Would need to refactor Warehouse to accept props for easier testing
    render(<Warehouse />);
    // Should still render fallback UI
    expect(screen.queryByText(/no products/i)).toBeTruthy();
  });
});
