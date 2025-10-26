# Integration Guide for CAPS2W2 POS System

## Quick Start

1. **Start the print server**:
   ```bash
   cd pos-print-server
   node server.js
   ```

2. **Test it works**: Open `test.html` in your browser

3. **Auto-start on Windows**: Copy `start.bat` to your Windows Startup folder

## Integration with Your Existing Code

### Option 1: Call from PHP (Recommended)

Update your `backend/Api/print_direct.php` to optionally use the Node.js server:

```php
// Add this function at the top of print_direct.php

function sendToNodeServer($printerIP, $printerPort, $receipt) {
    $response = @file_get_contents('http://localhost:9100/print', false, stream_context_create([
        'http' => [
            'method' => 'POST',
            'header' => 'Content-Type: application/json',
            'content' => json_encode([
                'text' => $receipt,
                'printerIP' => $printerIP,
                'printerPort' => $printerPort
            ])
        ]
    ]));
    
    if ($response) {
        $result = json_decode($response, true);
        return $result['success'] ?? false;
    }
    
    return false;
}

// Then in your try-catch block, you can try this first:
if (function_exists('socket_create') && !empty($printerIP)) {
    try {
        $socket = @fsockopen($printerIP, (int)$printerPort, $errno, $errstr, 5);
        // ... your existing code
    } catch (Exception $e) {
        // Fallback to Node.js server
        if (sendToNodeServer($printerIP, $printerPort, $fullReceipt)) {
            echo json_encode([
                'success' => true,
                'message' => 'Receipt sent via Node.js print server',
                'method' => 'nodejs'
            ]);
            exit;
        }
    }
}
```

### Option 2: Call from JavaScript

Update your `frontend/app/POS_convenience/printer.js` to add a new method:

```javascript
// Add this method to the PrinterIntegration class

// Print using Node.js server
async printReceiptNode(receiptData) {
    try {
        // Get formatted receipt text (similar to your existing format)
        const receiptText = this.formatReceiptForNode(receiptData);
        
        const response = await fetch('http://localhost:9100/print', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: receiptText,
                printerIP: '192.168.1.100', // Configure this
                printerPort: 9100
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            console.log('✅ Printed via Node.js server');
            return {
                success: true,
                message: 'Printed successfully',
                method: 'nodejs',
                transactionId: receiptData.transactionId
            };
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Node.js print failed:', error);
        throw error;
    }
}

// Format receipt text for Node.js server
formatReceiptForNode(data) {
    const receiptWidth = 48;
    
    const formatPriceLine = (label, amount, width) => {
        const amountStr = parseFloat(amount).toFixed(2);
        const spaces = Math.max(0, width - label.length - amountStr.length);
        return label + ' '.repeat(spaces) + amountStr;
    };
    
    const centerText = (text, width) => {
        const padding = Math.floor((width - text.length) / 2);
        return ' '.repeat(Math.max(0, padding)) + text;
    };
    
    let receipt = '';
    
    // Header
    receipt += '='.repeat(receiptWidth) + '\n';
    receipt += centerText("ENGUIO'S PHARMACY", receiptWidth) + '\n';
    receipt += '='.repeat(receiptWidth) + '\n';
    
    // Info
    receipt += `Date: ${data.date || new Date().toLocaleDateString()}\n`;
    receipt += `Time: ${data.time || new Date().toLocaleTimeString()}\n`;
    receipt += `TXN ID: ${data.transactionId || 'N/A'}\n`;
    receipt += `Cashier: ${data.cashier || 'Admin'}\n`;
    receipt += `Terminal: ${data.terminalName || 'POS'}\n`;
    receipt += '-'.repeat(receiptWidth) + '\n';
    
    // Items
    if (data.items) {
        data.items.forEach(item => {
            const name = String(item.name || 'Unknown').substring(0, 20);
            const qty = item.quantity || 1;
            const price = parseFloat(item.price || 0).toFixed(2);
            const total = (qty * parseFloat(item.price || 0)).toFixed(2);
            
            receipt += `${String(qty).padStart(4)}${name.padEnd(20)}${price.padStart(8)}${total.padStart(8)}\n`;
        });
    }
    
    // Totals
    receipt += '-'.repeat(receiptWidth) + '\n';
    receipt += formatPriceLine('SUBTOTAL:', data.subtotal || data.total || 0, receiptWidth) + '\n';
    
    if (data.discountAmount && parseFloat(data.discountAmount) > 0) {
        receipt += `Discount: ${data.discountType}\n`;
        receipt += formatPriceLine('Discount Amt:', data.discountAmount, receiptWidth) + '\n';
    }
    
    receipt += '-'.repeat(receiptWidth) + '\n';
    receipt += formatPriceLine('GRAND TOTAL:', data.grandTotal || data.total || 0, receiptWidth) + '\n';
    receipt += '-'.repeat(receiptWidth) + '\n';
    
    // Payment
    receipt += `PAYMENT: ${(data.paymentMethod || 'Unknown').toUpperCase()}\n`;
    
    if (data.paymentMethod?.toLowerCase() === 'cash') {
        receipt += formatPriceLine('CASH:', data.amountPaid || 0, receiptWidth) + '\n';
        receipt += formatPriceLine('CHANGE:', data.change || 0, receiptWidth) + '\n';
    }
    
    // Footer
    receipt += '='.repeat(receiptWidth) + '\n';
    receipt += centerText('Thank you!', receiptWidth) + '\n';
    receipt += centerText('Please come again', receiptWidth) + '\n';
    receipt += centerText('This is your official receipt', receiptWidth) + '\n';
    receipt += '='.repeat(receiptWidth) + '\n';
    receipt += '\n\n\n';
    
    return receipt;
}
```

## Using as Fallback

You can use this as a fallback when direct connection fails:

```javascript
async printReceipt(receiptData) {
    // Try QZ Tray first
    if (this.isConnected && this.qz) {
        try {
            return await this.printReceiptQZ(receiptData);
        } catch (error) {
            console.warn('QZ Tray failed, trying Node.js server...');
            try {
                return await this.printReceiptNode(receiptData);
            } catch (nodeError) {
                console.warn('Node.js failed, using browser print...');
                return await this.printReceiptBrowser(receiptData);
            }
        }
    }
    
    // Try Node.js if QZ Tray not available
    if (this.nodeJsAvailable) {
        try {
            return await this.printReceiptNode(receiptData);
        } catch (error) {
            return await this.printReceiptBrowser(receiptData);
        }
    }
    
    // Fallback to browser print
    return await this.printReceiptBrowser(receiptData);
}
```

## Configuration

Create a config file `pos-print-server/config.json`:

```json
{
  "printerIP": "192.168.1.100",
  "printerPort": 9100,
  "autoStart": true
}
```

## Advantages

✅ **Works offline** - No internet required  
✅ **Works online** - Can be used in both scenarios  
✅ **ESC/POS compatible** - Works with all thermal printers  
✅ **TCP/IP printing** - Same method as your existing PHP code  
✅ **Auto-print** - No user interaction needed  
✅ **Easy to start** - Just run `node server.js`  

## Troubleshooting

- **Port 9100 in use**: Change port in `server.js` (line 86)
- **Printer not responding**: Check IP and network connection
- **Server won't start**: Make sure Node.js is installed (`node --version`)
- **Test page won't load**: Start the server first (`node server.js`)

