// QZ Tray Integration for POS System
// This module handles QZ Tray printer detection and printing

class QZTrayIntegration {
  constructor() {
    this.qz = null;
    this.isConnected = false;
    this.printerName = 'POS-58'; // Default printer name
    this.apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2e2/Api';
  }

  // Initialize QZ Tray
  async initialize() {
    try {
      // Load QZ Tray library if not already loaded
      if (typeof qz === 'undefined') {
        await this.loadQZTrayLibrary();
      }

      this.qz = qz;
      
      // Check if QZ Tray is running
      if (!this.qz.websocket.isActive()) {
        throw new Error('QZ Tray is not running. Please start QZ Tray application.');
      }

      // Connect to QZ Tray
      await this.qz.websocket.connect();
      this.isConnected = true;
      
      console.log('QZ Tray connected successfully');
      return true;
    } catch (error) {
      console.error('QZ Tray initialization failed:', error);
      this.isConnected = false;
      return false;
    }
  }

  // Load QZ Tray JavaScript library
  async loadQZTrayLibrary() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://qz.io/js/qz-tray.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Get available printers
  async getPrinters() {
    if (!this.isConnected) {
      throw new Error('QZ Tray not connected');
    }

    try {
      const printers = await this.qz.printers.get();
      console.log('Available printers:', printers);
      return printers;
    } catch (error) {
      console.error('Failed to get printers:', error);
      throw error;
    }
  }

  // Set default printer
  setPrinter(printerName) {
    this.printerName = printerName;
    console.log('Printer set to:', printerName);
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
      
      console.log('Receipt printed successfully via QZ Tray');
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
      console.log('QZ Tray disconnected');
    }
  }
}

// Export for use in POS system
window.QZTrayIntegration = QZTrayIntegration;
