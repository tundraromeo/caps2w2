// Enhanced Printer Integration for POS System
// Handles QZ Tray with auto-reconnect, fallback to browser printing, and POS58 thermal support

class PrinterIntegration {
  constructor() {
    this.qz = null;
    this.isConnected = false;
    this.printerName = 'POS-58'; // Default thermal printer
    this.apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2w2/backend/Api';
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 0; // Unlimited (0 = unlimited)
    this.reconnectInterval = null;
    this.reconnectTimeout = 3000; // 3 seconds
    this.onStatusChange = null; // Callback for status changes
    this.isInitialized = false;
    this.browserPrintFallback = true;
    this.lastError = null;
  }

  // Initialize printer integration
  async initialize() {
    if (this.isInitialized) {
      console.log('Printer integration already initialized');
      return this.isConnected;
    }

    this.isInitialized = true;
    console.log('🚀 Initializing printer integration...');

    try {
      // Try to initialize QZ Tray
      const qzConnected = await this.initializeQZTray();
      
      if (qzConnected) {
        console.log('✅ QZ Tray connected successfully');
        this.notifyStatusChange('connected');
        return true;
      } else {
        console.log('⚠️ QZ Tray not available, using browser print fallback');
        this.notifyStatusChange('unavailable');
        
        // Initialize browser print fallback
        if (this.browserPrintFallback && typeof window !== 'undefined') {
          console.log('✅ Browser print fallback available');
          return true;
        }
        
        return false;
      }
    } catch (error) {
      console.error('❌ Printer initialization failed:', error);
      this.lastError = error;
      this.notifyStatusChange('error');
      return false;
    }
  }

  // Initialize QZ Tray
  async initializeQZTray() {
    try {
      // Load QZ Tray library
      if (typeof qz === 'undefined') {
        await this.loadQZTrayLibrary();
      }

      if (typeof qz === 'undefined') {
        console.warn('⚠️ QZ Tray library not loaded');
        return false;
      }

      this.qz = qz;

      // Try to connect
      try {
        // Set certificate if available
        if (this.qz.security) {
          try {
            await this.qz.security.setCertificatePromise(() => Promise.resolve(''));
          } catch (certError) {
            console.warn('Certificate setup warning:', certError);
          }
        }

        await this.qz.websocket.connect();
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Clear any existing reconnect interval
        this.stopAutoReconnect();
        
        return true;
      } catch (connectError) {
        console.warn('QZ Tray connection failed:', connectError.message);
        this.lastError = connectError;
        
        // Start auto-reconnect
        this.startAutoReconnect();
        
        return false;
      }
    } catch (error) {
      console.error('QZ Tray initialization error:', error);
      this.lastError = error;
      this.startAutoReconnect();
      return false;
    }
  }

  // Load QZ Tray library from multiple sources
  async loadQZTrayLibrary() {
    const sources = [
      '/qz-tray.js', // Local copy
      'http://localhost:8181/qz-tray.js', // QZ Tray local server
      'https://qz.io/js/qz-tray.js' // CDN fallback
    ];

    for (const src of sources) {
      try {
        console.log(`📦 Attempting to load QZ Tray from: ${src}`);
        await this.loadScript(src);
        
        // Wait for qz object to be available
        for (let i = 0; i < 10; i++) {
          if (typeof qz !== 'undefined') {
            console.log(`✅ QZ Tray loaded from: ${src}`);
            return true;
          }
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.warn(`Failed to load from ${src}:`, error);
      }
    }

    return false;
  }

  // Load script helper
  loadScript(src) {
    return new Promise((resolve, reject) => {
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

  // Start auto-reconnect loop
  startAutoReconnect() {
    // Don't start if already reconnecting
    if (this.reconnectInterval) {
      return;
    }

    console.log('🔄 Starting auto-reconnect for QZ Tray...');
    
    this.reconnectInterval = setInterval(async () => {
      // Check if we should continue reconnecting
      if (this.maxReconnectAttempts > 0 && this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.log('❌ Max reconnect attempts reached');
        this.stopAutoReconnect();
        return;
      }

      this.reconnectAttempts++;
      console.log(`🔄 Reconnect attempt ${this.reconnectAttempts}...`);

      try {
        const connected = await this.initializeQZTray();
        
        if (connected) {
          console.log('✅ Auto-reconnect successful!');
          this.stopAutoReconnect();
          this.notifyStatusChange('connected');
        } else {
          this.notifyStatusChange('reconnecting');
        }
      } catch (error) {
        console.warn('⚠️ Reconnect failed:', error);
        this.lastError = error;
      }
    }, this.reconnectTimeout);
  }

  // Stop auto-reconnect
  stopAutoReconnect() {
    if (this.reconnectInterval) {
      clearInterval(this.reconnectInterval);
      this.reconnectInterval = null;
      console.log('⏸️ Auto-reconnect stopped');
    }
  }

  // Manual connection (for test connection button)
  async connect() {
    console.log('🔌 Manual connection attempt...');
    this.notifyStatusChange('connecting');
    
    try {
      const connected = await this.initializeQZTray();
      
      if (connected) {
        console.log('✅ Manual connection successful');
        this.notifyStatusChange('connected');
        return { success: true, message: 'Connected to QZ Tray successfully' };
      } else {
        // Browser print is always available as fallback
        console.log('ℹ️ QZ Tray not available, browser print is ready');
        this.notifyStatusChange('fallback');
        return { success: true, message: 'Browser print is ready (QZ Tray not needed)' };
      }
    } catch (error) {
      // Browser print is always available as fallback
      console.log('ℹ️ QZ Tray not available, browser print is ready:', error.message);
      this.lastError = error;
      this.notifyStatusChange('fallback');
      return { success: true, message: 'Browser print is ready' };
    }
  }

  // Get printer status
  getStatus() {
    if (this.isConnected && this.qz) {
      return {
        connected: true,
        method: 'qz',
        name: this.printerName,
        status: 'connected',
        message: 'QZ Tray Ready'
      };
    } else if (this.browserPrintFallback && typeof window !== 'undefined') {
      // Browser print is always available as fallback
      return {
        connected: true,
        method: 'browser',
        name: 'Browser Print',
        status: 'fallback',
        message: 'Browser Print Ready'
      };
    } else if (this.reconnectInterval) {
      return {
        connected: false,
        method: null,
        name: null,
        status: 'reconnecting',
        message: 'Connecting to QZ Tray...',
        error: this.lastError?.message
      };
    } else {
      return {
        connected: false,
        method: null,
        name: null,
        status: 'disconnected',
        message: this.lastError ? `⚠️ ${this.lastError.message}` : 'Using browser print (QZ Tray not available)',
        error: this.lastError?.message
      };
    }
  }

  // Set status change callback
  setOnStatusChange(callback) {
    this.onStatusChange = callback;
  }

  // Notify status change
  notifyStatusChange(status) {
    if (this.onStatusChange) {
      this.onStatusChange(status);
    }
  }

  // Test printer connection
  async testConnection() {
    if (!this.isConnected) {
      // Try to connect first
      const result = await this.connect();
      if (!result.success) {
        return result;
      }
    }

    if (!this.isConnected) {
      return { 
        success: false, 
        message: 'Not connected to printer' 
      };
    }

    try {
      // Try to get available printers
      const printers = await this.getAvailablePrinters();
      return {
        success: true,
        message: `Test successful! Connected to printer: ${this.printerName}`,
        printers
      };
    } catch (error) {
      return {
        success: false,
        message: `Test failed: ${error.message}`
      };
    }
  }

  // Get available printers
  async getAvailablePrinters() {
    if (!this.isConnected) {
      throw new Error('Not connected to QZ Tray');
    }

    try {
      const printers = await this.qz.printers.get();
      console.log('📋 Available printers:', printers);
      return printers;
    } catch (error) {
      console.error('Failed to get printers:', error);
      throw error;
    }
  }

  // Print receipt
  async printReceipt(receiptData) {
    // Try QZ Tray first
    if (this.isConnected && this.qz) {
      try {
        return await this.printReceiptQZ(receiptData);
      } catch (error) {
        console.warn('QZ Tray print failed, falling back to browser print:', error.message);
        // Silently fall through to browser print
      }
    }

    // Always fallback to browser print if QZ Tray fails
    if (this.browserPrintFallback && typeof window !== 'undefined') {
      return await this.printReceiptBrowser(receiptData);
    }

    // If no fallback available, try browser print anyway
    return await this.printReceiptBrowser(receiptData);
  }

  // Print using QZ Tray
  async printReceiptQZ(receiptData) {
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

      // Configure print job for POS58 thermal printer
      const config = qz.configs.create(this.printerName, {
        colorType: 'blackwhite',
        scaleContent: true,
        rasterize: false,
        size: { width: 2.83, height: -1 }, // 58mm width
        units: 'in'
      });

      // Create print job with raw text
      const printJob = [{
        type: 'raw',
        format: 'plain',
        data: rawReceipt
      }];

      // Send to printer
      await this.qz.print(config, printJob);

      console.log('✅ Receipt printed successfully via QZ Tray');
      return {
        success: true,
        message: 'Receipt printed successfully',
        method: 'qz',
        transactionId: receiptData.transactionId
      };
    } catch (error) {
      console.error('❌ Print failed:', error);
      throw error;
    }
  }

  // Print using browser
  async printReceiptBrowser(receiptData) {
    const htmlReceipt = this.generateHTMLReceipt(receiptData);

    // Create print window
    const printWindow = window.open('', '_blank', 'width=400,height=600');

    if (!printWindow) {
      throw new Error('Popup blocked. Please allow popups for this site.');
    }

    // Write HTML content
    printWindow.document.write(htmlReceipt);
    printWindow.document.close();

    // Wait for content to load then auto-trigger print dialog
    printWindow.onload = function() {
      setTimeout(() => {
        printWindow.print(); // Auto-opens print dialog
        // Keep window open - user just needs to click Print button
      }, 300);
    };

    return {
      success: true,
      message: 'Receipt opened for printing',
      method: 'browser',
      transactionId: receiptData.transactionId
    };
  }

  // Generate HTML receipt for browser printing (matching offline format)
  generateHTMLReceipt(data) {
    const receiptWidth = 32; // Same as offline version
    
    // Helper function to format price line
    const formatPriceLine = (label, amount, width) => {
      const amountStr = parseFloat(amount).toFixed(2);
      const spaces = width - label.length - amountStr.length;
      return label + ' '.repeat(Math.max(0, spaces)) + amountStr;
    };
    
    // Helper function to pad text
    const padText = (text, width, padChar = ' ') => {
      if (text.length >= width) return text;
      return text + padChar.repeat(width - text.length);
    };
    
    // Helper function to center text
    const centerText = (text, width) => {
      const padding = Math.floor((width - text.length) / 2);
      return ' '.repeat(padding) + text;
    };
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt</title>
        <style>
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: 'Courier New', monospace;
              font-size: 11pt;
              line-height: 1.2;
              width: 80mm;
              color: #000;
              background: #fff;
            }
          }
          body {
            margin: 0;
            padding: 10px 5px;
            font-family: 'Courier New', monospace;
            font-size: 11pt;
            line-height: 1.2;
            width: 80mm;
            color: #000;
            background: #fff;
            white-space: pre;
          }
          .receipt {
            width: 100%;
          }
          .line {
            white-space: pre;
            font-family: 'Courier New', monospace;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="line">${'='.repeat(receiptWidth)}</div>
          <div class="line">${centerText("ENGUIO'S PHARMACY", receiptWidth)}</div>
          <div class="line">${'='.repeat(receiptWidth)}</div>
          <div class="line">Date: ${data.date || new Date().toLocaleDateString()}</div>
          <div class="line">Time: ${data.time || new Date().toLocaleTimeString()}</div>
          <div class="line">TXN ID: ${data.transactionId || 'N/A'}</div>
          <div class="line">Cashier: ${data.cashier || 'Admin'}</div>
          <div class="line">Terminal: ${data.terminalName || 'POS'}</div>
          <div class="line">${'-'.repeat(receiptWidth)}</div>
          <div class="line">${padText('QTY', 4)}${padText('ITEM', 14)}${padText('PRICE', 7)}${padText('TOTAL', 7)}</div>
          <div class="line">${'-'.repeat(receiptWidth)}</div>
          ${this.generateItemsHTMLRaw(data.items || [], receiptWidth)}
          <div class="line">${'-'.repeat(receiptWidth)}</div>
          <div class="line">${formatPriceLine('SUBTOTAL:', parseFloat(data.subtotal || data.total || 0).toFixed(2), receiptWidth)}</div>
          ${this.generateDiscountHTMLRaw(data, receiptWidth)}
          <div class="line">${'-'.repeat(receiptWidth)}</div>
          <div class="line">${formatPriceLine('GRAND TOTAL:', parseFloat(data.grandTotal || data.total || 0).toFixed(2), receiptWidth)}</div>
          <div class="line">${'-'.repeat(receiptWidth)}</div>
          <div class="line">PAYMENT: ${(data.paymentMethod || 'Unknown').toUpperCase()}</div>
          ${this.generatePaymentHTMLRaw(data, receiptWidth)}
          <div class="line">${'='.repeat(receiptWidth)}</div>
          <div class="line">${centerText('Thank you!', receiptWidth)}</div>
          <div class="line">${centerText('Please come again', receiptWidth)}</div>
          <div class="line">${centerText('This is your official receipt', receiptWidth)}</div>
          <div class="line">${'='.repeat(receiptWidth)}</div>
        </div>
      </body>
      </html>
    `;
  }
  
  // Generate items HTML in raw format (matching offline)
  generateItemsHTMLRaw(items, width) {
    const padText = (text, size) => {
      const textStr = String(text || '');
      if (textStr.length >= size) return textStr.substring(0, size);
      return textStr + ' '.repeat(size - textStr.length);
    };
    
    let html = '';
    items.forEach(item => {
      const name = item.name || 'Unknown';
      const qty = parseInt(item.quantity || 1);
      const price = parseFloat(item.price || 0);
      const total = qty * price;
      
      // Format: QTY (4) + ITEM (14) + PRICE (7) + TOTAL (7) = 32 chars
      html += `<div class="line">${padText(qty, 4)}${padText(name, 14)}${padText(price.toFixed(2), 7)}${padText(total.toFixed(2), 7)}</div>`;
    });
    
    return html;
  }
  
  // Generate discount HTML in raw format
  generateDiscountHTMLRaw(data, width) {
    const formatPriceLine = (label, amount, width) => {
      const amountStr = parseFloat(amount).toFixed(2);
      const spaces = width - label.length - amountStr.length;
      return label + ' '.repeat(Math.max(0, spaces)) + amountStr;
    };
    
    if (!data.discountType || !data.discountAmount || parseFloat(data.discountAmount) <= 0) {
      return '';
    }
    
    return `
      <div class="line">Discount: ${data.discountType}</div>
      <div class="line">${formatPriceLine('Discount Amt:', parseFloat(data.discountAmount).toFixed(2), width)}</div>
    `;
  }
  
  // Generate payment HTML in raw format
  generatePaymentHTMLRaw(data, width) {
    const formatPriceLine = (label, amount, width) => {
      const amountStr = parseFloat(amount).toFixed(2);
      const spaces = width - label.length - amountStr.length;
      return label + ' '.repeat(Math.max(0, spaces)) + amountStr;
    };
    
    const paymentMethod = (data.paymentMethod || '').toLowerCase();
    let html = '';
    
    if (paymentMethod === 'cash') {
      html = `
        <div class="line">${formatPriceLine('CASH:', parseFloat(data.amountPaid || 0).toFixed(2), width)}</div>
        <div class="line">${formatPriceLine('CHANGE:', parseFloat(data.change || 0).toFixed(2), width)}</div>
      `;
    } else if (paymentMethod === 'gcash') {
      if (data.gcashRef) {
        html = `
          <div class="line">GCASH REF: ${data.gcashRef}</div>
        `;
      }
      html += `
        <div class="line">${formatPriceLine('AMOUNT PAID:', parseFloat(data.amountPaid || 0).toFixed(2), width)}</div>
        <div class="line">${formatPriceLine('CHANGE:', parseFloat(data.change || 0).toFixed(2), width)}</div>
      `;
    }
    
    return html;
  }


  // Disconnect
  disconnect() {
    this.stopAutoReconnect();
    
    if (this.isConnected && this.qz) {
      try {
        this.qz.websocket.disconnect();
      } catch (error) {
        console.warn('Disconnect error:', error);
      }
    }
    
    this.isConnected = false;
    this.notifyStatusChange('disconnected');
    console.log('🔌 Printer disconnected');
  }
}

// Export for use in POS system
if (typeof window !== 'undefined') {
  window.PrinterIntegration = PrinterIntegration;
}

// Also export as default for modern module systems
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PrinterIntegration;
}

