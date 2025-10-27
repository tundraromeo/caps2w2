// Online Printing Alternative for POS System
// This module provides printing functionality when QZ Tray is not available

class OnlinePrinting {
  constructor() {
    this.isAvailable = true;
    this.printerName = 'Browser Print';
  }

  // Initialize online printing
  async initialize() {
    try {
      // Check if browser supports printing
      if (typeof window === 'undefined' || !window.print) {
        throw new Error('Browser printing not supported');
      }
      return true;
    } catch (error) {
      console.error('Online printing initialization failed:', error);
      return false;
    }
  }

  // Print receipt using browser's print dialog
  async printReceipt(receiptData) {
    try {
      // Generate HTML receipt
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
          printWindow.print();
          // Keep window open so user can see preview
          // printWindow.close();
        }, 300);
      };

      return true;
    } catch (error) {
      console.error('Online printing failed:', error);
      throw error;
    }
  }

  // Generate HTML receipt for printing
  generateHTMLReceipt(data) {
    const receiptWidth = 320; // CSS pixels for thermal printer width
    
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
              padding: 10px;
              font-family: 'Courier New', monospace;
              font-size: 12px;
              line-height: 1.2;
            }
          }
          body {
            margin: 0;
            padding: 10px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.2;
            width: ${receiptWidth}px;
          }
          .receipt {
            width: 100%;
            text-align: center;
          }
          .header {
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
            margin-bottom: 10px;
          }
          .company-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 5px;
          }
          .receipt-info {
            text-align: left;
            margin-bottom: 10px;
          }
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 10px;
          }
          .items-table th,
          .items-table td {
            text-align: left;
            padding: 2px 0;
            border-bottom: 1px dotted #ccc;
          }
          .items-table .qty {
            width: 15%;
          }
          .items-table .item {
            width: 45%;
          }
          .items-table .price,
          .items-table .total {
            width: 20%;
            text-align: right;
          }
          .totals {
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 10px;
          }
          .total-line {
            display: flex;
            justify-content: space-between;
            margin: 2px 0;
          }
          .grand-total {
            font-weight: bold;
            border-top: 1px solid #000;
            border-bottom: 1px solid #000;
            padding: 5px 0;
            margin: 5px 0;
          }
          .payment-info {
            margin-top: 10px;
          }
          .footer {
            text-align: center;
            margin-top: 15px;
            border-top: 1px solid #000;
            padding-top: 10px;
          }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header">
            <div class="company-name">ENGUIO'S PHARMACY</div>
            <div>================================</div>
          </div>
          
          <div class="receipt-info">
            <div>Date: ${data.date || new Date().toLocaleDateString()}</div>
            <div>Time: ${data.time || new Date().toLocaleTimeString()}</div>
            <div>TXN ID: ${data.transactionId || 'N/A'}</div>
            <div>Cashier: ${data.cashier || 'Admin'}</div>
            <div>Terminal: ${data.terminalName || 'POS'}</div>
          </div>
          
          <table class="items-table">
            <thead>
              <tr>
                <th class="qty">QTY</th>
                <th class="item">ITEMS</th>
                <th class="price">SRP</th>
                <th class="total">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${this.generateItemsHTML(data.items || [])}
            </tbody>
          </table>
          
          <div class="totals">
            <div class="total-line">
              <span>SUBTOTAL:</span>
              <span>₱${parseFloat(data.subtotal || data.total || 0).toFixed(2)}</span>
            </div>
            ${this.generateDiscountHTML(data)}
            <div class="total-line grand-total">
              <span>GRAND TOTAL:</span>
              <span>₱${parseFloat(data.grandTotal || data.total || 0).toFixed(2)}</span>
            </div>
          </div>
          
          <div class="payment-info">
            <div><strong>PAYMENT: ${(data.paymentMethod || 'Unknown').toUpperCase()}</strong></div>
            ${this.generatePaymentHTML(data)}
          </div>
          
          <div class="footer">
            <div>================================</div>
            <div><strong>Thank you!</strong></div>
            <div>Please come again</div>
            <div>This is your official receipt</div>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Generate items HTML
  generateItemsHTML(items) {
    return items.map(item => {
      const name = item.name || 'Unknown';
      const qty = parseInt(item.quantity || 1);
      const srp = parseFloat(item.srp || item.price || 0);
      const total = qty * parseFloat(item.price || 0);
      
      return `
        <tr>
          <td class="qty" style="width: 8%; text-align: center;">${qty}</td>
          <td class="item" style="width: 52%; padding-left: 3px; padding-right: 3px;">${name}</td>
          <td class="price" style="width: 20%; text-align: right; padding-right: 3px;">${srp.toFixed(2)}</td>
          <td class="total" style="width: 20%; text-align: right;">${total.toFixed(2)}</td>
        </tr>
      `;
    }).join('');
  }

  // Generate discount HTML
  generateDiscountHTML(data) {
    if (!data.discountType || !data.discountAmount || parseFloat(data.discountAmount) <= 0) {
      return '';
    }
    
    return `
      <div class="total-line">
        <span>Discount: ${data.discountType}</span>
        <span>-₱${parseFloat(data.discountAmount).toFixed(2)}</span>
      </div>
    `;
  }

  // Generate payment HTML
  generatePaymentHTML(data) {
    const paymentMethod = (data.paymentMethod || '').toLowerCase();
    
    if (paymentMethod === 'cash') {
      return `
        <div class="total-line">
          <span>CASH:</span>
          <span>₱${parseFloat(data.amountPaid || 0).toFixed(2)}</span>
        </div>
        <div class="total-line">
          <span>CHANGE:</span>
          <span>₱${parseFloat(data.change || 0).toFixed(2)}</span>
        </div>
      `;
    } else if (paymentMethod === 'gcash') {
      return `
        ${data.gcashRef ? `<div>GCASH REF: ${data.gcashRef}</div>` : ''}
        <div class="total-line">
          <span>AMOUNT PAID:</span>
          <span>₱${parseFloat(data.amountPaid || 0).toFixed(2)}</span>
        </div>
        <div class="total-line">
          <span>CHANGE:</span>
          <span>₱${parseFloat(data.change || 0).toFixed(2)}</span>
        </div>
      `;
    }
    
    return '';
  }

  // Check if online printing is available
  isPrintingAvailable() {
    return this.isAvailable && typeof window !== 'undefined' && window.print;
  }

  // Get printer status
  getPrinterStatus() {
    return {
      connected: this.isAvailable,
      name: this.printerName,
      type: 'browser'
    };
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = OnlinePrinting;
} else if (typeof window !== 'undefined') {
  window.OnlinePrinting = OnlinePrinting;
}
