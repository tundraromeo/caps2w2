// QZ Tray Integration for POS System
// This module handles QZ Tray printer detection and printing
//
// IMPORTANT: To use this printer feature, you must:
// 1. Download and install QZ Tray from https://qz.io/download/
// 2. Start the QZ Tray application on your computer
// 3. Click the printer status indicator in the top-right corner to connect
// 4. Once connected, the status will show "Printer Ready" and you can print receipts
//
// Without QZ Tray running, the printer will show as disconnected/offline

class QZTrayIntegration {
  constructor() {
    this.qz = null;
    this.isConnected = false;
    this.printerName = 'POS-58'; // Default printer name
    this.apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/backend/Api';
  }

  // Initialize QZ Tray
  async initialize() {
    try {
      // Load QZ Tray library if not already loaded
      if (typeof qz === 'undefined') {
        await this.loadQZTrayLibrary();
      }

      // Check if qz is still undefined after loading
      if (typeof qz === 'undefined') {
        console.error('QZ library not loaded');
        throw new Error('QZ Tray library failed to load. Please check your internet connection.');
      }

      this.qz = qz;
      
      // Check if websocket exists
      if (!this.qz || !this.qz.websocket) {
        console.error('QZ websocket not available');
        throw new Error('QZ Tray websocket not available.');
      }
      
      // Try to connect to QZ Tray (don't check isActive() first, just try to connect)
      try {
        // Use certificate-based authentication if available
        if (this.qz.security) {
          try {
            await this.qz.security.setCertificatePromise(function() {
              return Promise.resolve('');
            });
          } catch (certError) {
            console.warn('Certificate setup warning:', certError);
          }
        }
        
        await this.qz.websocket.connect();
        this.isConnected = true;
      } catch (connectError) {
        console.error('QZ Tray connection error:', connectError);
        throw new Error('QZ Tray is not running. Please start QZ Tray application.');
      }
      return true;
    } catch (error) {
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      console.error('QZ Tray initialization failed:', errorMessage);
      console.error('Full error:', error);
      this.isConnected = false;
      return false;
    }
  }

  // Load QZ Tray JavaScript library
  async loadQZTrayLibrary() {
    if (typeof window === 'undefined') {
      throw new Error('This method can only be called in a browser environment');
    }

    // Check if qz is already available (maybe loaded by QZ Tray app itself)
    if (typeof qz !== 'undefined') {
      return;
    }

    // Try to load from local files first (most reliable)
    const localSources = [
      '/qz-tray.js',  // Local copy in public folder
      'http://localhost:8181/qz-tray.js',  // QZ Tray's local server (if running)
      'https://qz.io/js/qz-tray.js'       // Fallback to CDN (may be blocked)
    ];

    let lastError = null;
    
    for (const src of localSources) {
      try {
        await this.loadScript(src);
        
        // Wait for qz object to be available
        for (let i = 0; i < 10; i++) {
          if (typeof qz !== 'undefined') {
            return;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (typeof qz !== 'undefined') {
          return;
        }
        throw new Error('QZ object not available after script load');
      } catch (error) {
        console.warn(`Failed to load from ${src}:`, error);
        lastError = error;
        // Continue to next source
      }
    }
    
    throw new Error(`Failed to load QZ Tray library from all sources. Last error: ${lastError?.message || 'Unknown'}`);
  }

  // Helper method to load a script
  loadScript(src) {
    return new Promise((resolve, reject) => {
      // Check if script already exists
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script from ${src}`));
      document.head.appendChild(script);
    });
  }

  // Get available printers
  async getPrinters() {
    if (!this.isConnected) {
      throw new Error('QZ Tray not connected');
    }

    try {
      // Check if printers.get exists
      if (!this.qz.printers || typeof this.qz.printers.get !== 'function') {
        console.warn('QZ Tray printers.get is not available in this version. Using default printer.');
        return []; // Return empty array instead of failing
      }
      
      const printers = await this.qz.printers.get();
      return printers;
    } catch (error) {
      console.error('Failed to get printers:', error);
      // Return empty array instead of throwing
      return [];
    }
  }

  // Set default printer
  setPrinter(printerName) {
    this.printerName = printerName;
  }

  // Print receipt using QZ Tray
  async printReceipt(receiptData) {
    if (!this.isConnected) {
      throw new Error('QZ Tray not connected');
    }

    try {
      // Get raw receipt data from server
      const response = await fetch(`${this.apiUrl}/qz-tray-receipt.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(receiptData)
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message);
      }

      const rawReceipt = result.data.rawReceipt;

      // Configure print job
      const config = qz.configs.create(this.printerName, {
        colorType: 'blackwhite',
        scaleContent: true,
        rasterize: false
      });

      // Create print job with raw text
      const printJob = [
        {
          type: 'raw',
          format: 'plain',
          data: rawReceipt
        }
      ];

      // Send to printer
      await this.qz.print(config, printJob);
      return {
        success: true,
        message: 'Receipt printed successfully',
        transactionId: receiptData.transactionId
      };

    } catch (error) {
      console.error('Print failed:', error);
      throw error;
    }
  }

  // Test print
  async testPrint() {
    const testData = {
      storeName: "ENGUIO'S PHARMACY",
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      transactionId: 'TEST' + Date.now(),
      cashier: 'Test User',
      terminalName: 'POS Test',
      items: [
        {
          name: 'Test Item',
          quantity: 1,
          price: 10.00,
          total: 10.00
        }
      ],
      subtotal: 10.00,
      grandTotal: 10.00,
      paymentMethod: 'CASH',
      amountPaid: 10.00,
      change: 0.00
    };

    return await this.printReceipt(testData);
  }

  // Disconnect from QZ Tray
  disconnect() {
    if (this.isConnected && this.qz) {
      this.qz.websocket.disconnect();
      this.isConnected = false;
    }
  }
}

// Export for use in POS system (only in browser environment)
if (typeof window !== 'undefined') {
  window.QZTrayIntegration = QZTrayIntegration;
}
