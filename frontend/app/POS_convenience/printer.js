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

      // Try to connect to QZ Tray
      try {
        // Check if websocket is not active
        if (!this.qz.websocket.isActive()) {
          try {
            // Connect to QZ Tray
            await this.qz.websocket.connect();
            console.log("✅ QZ Tray connected!");
            
            this.isConnected = true;
            this.reconnectAttempts = 0;
            
            // Clear any existing reconnect interval
            this.stopAutoReconnect();
            
            return true;
          } catch (err) {
            console.error("❌ QZ Tray connection failed:", err);
            this.lastError = err;
            
            // Start auto-reconnect
            this.startAutoReconnect();
            
            return false;
          }
        } else {
          console.log("🔌 QZ Tray already connected.");
          this.isConnected = true;
          this.stopAutoReconnect();
          return true;
        }
      } catch (err) {
        console.error("❌ QZ Tray initialization error:", err);
        this.lastError = err;
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

      // Get available printers first
      let printerToUse = this.printerName; // Default: 'POS-58'
      
      try {
        const printers = await this.qz.printers.get();
        if (printers && printers.length > 0) {
          // Use the first available printer
          printerToUse = printers[0];
          console.log(`📋 Using printer: ${printerToUse}`);
        }
      } catch (e) {
        console.warn('Could not get printer list, using default:', e);
      }
      
      // Create config with specific printer and proper encoding
      const config = qz.configs.create(printerToUse, {
        encoding: 'UTF-8', // Use UTF-8 encoding to prevent character corruption
        colorType: 'blackwhite'
      });
      
      // Fix encoding and ensure proper line breaks
      // Normalize line endings only - keep text as is
      const fixedReceipt = rawReceipt
        .replace(/\r\n/g, '\n')              // Normalize Windows line endings
        .replace(/\r/g, '\n');               // Normalize old Mac line endings
      
      // Create print data with raw text
      const printData = [
        { 
          type: 'raw', 
          format: 'plain', 
          encoding: 'UTF-8',
          data: fixedReceipt  // Don't trim - keep all content including feeds
        }
      ];

      // Send to QZ Tray printer
      await qz.print(config, printData);
      
      console.log("🖨️ Printed successfully via QZ Tray!");

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

    // Wait for content to load then immediately trigger print dialog
    printWindow.onload = function() {
      setTimeout(() => {
        printWindow.print(); // Auto-opens print dialog immediately
        // Give user a moment to see the preview, then focus the print button
        setTimeout(() => {
          try {
            printWindow.focus();
          } catch (e) {
            // Ignore focus errors
          }
        }, 100);
      }, 200); // Faster - 200ms instead of 300ms
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
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt</title>
        <meta charset="UTF-8">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              margin: 0;
              padding: 3mm;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
          }
          
          body {
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.4;
            width: 75mm;
            margin: 0 auto;
            padding: 3mm;
            color: #000;
            background: #fff;
            font-weight: normal;
          }
          
          .receipt {
            width: 100%;
            max-width: 100%;
          }
          
          .line {
            font-family: 'Courier New', monospace;
            font-size: 13px;
            line-height: 1.4;
            white-space: pre;
            font-weight: normal;
            margin: 0;
            padding: 0;
            display: block;
          }
          
          .divider {
            font-family: 'Courier New', monospace;
            font-size: 13px;
            font-weight: normal;
          }
          
          .header {
            font-family: 'Courier New', monospace;
            font-weight: bold;
            font-size: 14px;
          }
          
          .footer {
            font-family: 'Courier New', monospace;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
${this.generateReceiptContent(data)}
        </div>
      </body>
      </html>
    `;
  }
  
  // Generate receipt content with proper formatting
  generateReceiptContent(data) {
    const receiptWidth = 32;
    
    // Helper functions
    const centerText = (text, width) => {
      const padding = Math.floor((width - text.length) / 2);
      return ' '.repeat(Math.max(0, padding)) + text;
    };
    
    const formatPriceLine = (label, amount) => {
      const amountStr = parseFloat(amount).toFixed(2);
      const spaces = Math.max(0, receiptWidth - label.length - amountStr.length);
      return label + ' '.repeat(spaces) + amountStr;
    };
    
    let content = '';
    
    // Header
    content += `<div class="line">${'='.repeat(receiptWidth)}</div>\n`;
    content += `<div class="line header">${centerText("ENGUIO'S PHARMACY", receiptWidth)}</div>\n`;
    content += `<div class="line">${'='.repeat(receiptWidth)}</div>\n`;
    
    // Receipt info
    content += `<div class="line">Date: ${data.date || new Date().toLocaleDateString()}</div>\n`;
    content += `<div class="line">Time: ${data.time || new Date().toLocaleTimeString()}</div>\n`;
    content += `<div class="line">TXN ID: ${data.transactionId || 'N/A'}</div>\n`;
    content += `<div class="line">Cashier: ${data.cashier || 'Admin'}</div>\n`;
    content += `<div class="line">Terminal: ${data.terminalName || 'POS'}</div>\n`;
    content += `<div class="line divider">${'-'.repeat(receiptWidth)}</div>\n`;
    
    // Items header - Removed to make it cleaner
    content += `<div class="line divider">${'-'.repeat(receiptWidth)}</div>\n`;
    
    // Items
    const items = this.generateItemsContent(data.items || []);
    content += items;
    
    content += `<div class="line divider">${'-'.repeat(receiptWidth)}</div>\n`;
    
    // Subtotal
    content += `<div class="line">${formatPriceLine('SUBTOTAL:', parseFloat(data.subtotal || data.total || 0))}</div>\n`;
    
    // Discount
    const discount = this.generateDiscountContent(data);
    content += discount;
    
    content += `<div class="line divider">${'-'.repeat(receiptWidth)}</div>\n`;
    
    // Grand total
    content += `<div class="line">${formatPriceLine('GRAND TOTAL:', parseFloat(data.grandTotal || data.total || 0))}</div>\n`;
    content += `<div class="line divider">${'-'.repeat(receiptWidth)}</div>\n`;
    
    // Payment info
    content += `<div class="line">PAYMENT: ${(data.paymentMethod || 'Unknown').toUpperCase()}</div>\n`;
    const payment = this.generatePaymentContent(data);
    content += payment;
    
    // Footer
    content += `<div class="line">${'='.repeat(receiptWidth)}</div>\n`;
    content += `<div class="line footer">${centerText('Thank you!', receiptWidth)}</div>\n`;
    content += `<div class="line footer">${centerText('Please come again', receiptWidth)}</div>\n`;
    content += `<div class="line footer">${centerText('This is your official receipt', receiptWidth)}</div>\n`;
    content += `<div class="line">${'='.repeat(receiptWidth)}</div>\n`;
    
    return content;
  }
  
  // Generate items content - Fixed layout to prevent breaking on print
  generateItemsContent(items) {
    let content = '';
    
    items.forEach(item => {
      const name = String(item.name || 'Unknown').substring(0, 15);
      const qty = String(item.quantity || 1);
      const price = parseFloat(item.price || 0).toFixed(2);
      const total = (parseInt(qty) * parseFloat(item.price || 0)).toFixed(2);
      
      // Simple, clear format
      const qtyStr = qty.padStart(2);
      const nameStr = name.padEnd(20);
      const priceStr = price;
      const totalStr = total;
      
      // Format: QTY (right) + ITEM (left) + PRICE + TOTAL
      content += `<div class="line">${qtyStr}x ${nameStr}</div>\n`;
      content += `<div class="line">${''.padEnd(15)}@${priceStr} = ${totalStr}</div>\n`;
    });
    
    return content;
  }
  
  // Generate discount content
  generateDiscountContent(data) {
    if (!data.discountType || !data.discountAmount || parseFloat(data.discountAmount) <= 0) {
      return '';
    }
    
    const receiptWidth = 32;
    const formatPriceLine = (label, amount) => {
      const amountStr = parseFloat(amount).toFixed(2);
      const spaces = Math.max(0, receiptWidth - label.length - amountStr.length);
      return label + ' '.repeat(spaces) + amountStr;
    };
    
    return `<div class="line">Discount: ${data.discountType}</div>\n<div class="line">${formatPriceLine('Discount Amt:', parseFloat(data.discountAmount))}</div>\n`;
  }
  
  // Generate payment content
  generatePaymentContent(data) {
    const receiptWidth = 32;
    const formatPriceLine = (label, amount) => {
      const amountStr = parseFloat(amount).toFixed(2);
      const spaces = Math.max(0, receiptWidth - label.length - amountStr.length);
      return label + ' '.repeat(spaces) + amountStr;
    };
    
    const paymentMethod = (data.paymentMethod || '').toLowerCase();
    let content = '';
    
    if (paymentMethod === 'cash') {
      content += `<div class="line">${formatPriceLine('CASH:', parseFloat(data.amountPaid || 0))}</div>\n`;
      content += `<div class="line">${formatPriceLine('CHANGE:', parseFloat(data.change || 0))}</div>\n`;
    } else if (paymentMethod === 'gcash') {
      if (data.gcashRef) {
        content += `<div class="line">GCASH REF: ${data.gcashRef}</div>\n`;
      }
      content += `<div class="line">${formatPriceLine('AMOUNT PAID:', parseFloat(data.amountPaid || 0))}</div>\n`;
      content += `<div class="line">${formatPriceLine('CHANGE:', parseFloat(data.change || 0))}</div>\n`;
    }
    
    return content;
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

