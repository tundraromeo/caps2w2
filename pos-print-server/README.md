# POS Print Server 🖨️

A simple Node.js server for printing thermal receipts to network printers.

## Setup

1. Install dependencies (already done):
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```
   or simply:
   ```bash
   node server.js
   ```

3. The server will run on `http://localhost:9100`

## Auto-Start on Windows

To automatically start the server when Windows boots:

1. Create a shortcut to `start.bat`
2. Press `Win + R` and type `shell:startup`
3. Move the shortcut to the startup folder

Or create a shortcut and add it to:
```
C:\Users\[YourUsername]\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup
```

## Usage

### From Next.js or JavaScript

```javascript
fetch("http://localhost:9100/print", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: "🧾 Sample Receipt\nTOTAL: ₱150.00",
    printerIP: "192.168.1.100",  // Your printer IP
    printerPort: 9100             // Optional, defaults to 9100
  })
});
```

### From PHP

```php
$response = file_get_contents('http://localhost:9100/print', false, stream_context_create([
    'http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/json',
        'content' => json_encode([
            'text' => '🧾 Sample Receipt\nTOTAL: ₱150.00',
            'printerIP' => '192.168.1.100',
            'printerPort' => 9100
        ])
    ]
]));
```

### Example Receipt Format

The server expects plain text. Format your receipt like this:

```
================================================
    ENGUIO'S PHARMACY
================================================
Date: 2025-01-15
Time: 10:30:00
TXN ID: TXN-001
Cashier: Admin
Terminal: POS
------------------------------------------------
QTY  Item                Price   Total
2    Paracetamol 500mg    50.00  100.00
1    Aspirin 100mg        30.00   30.00
------------------------------------------------
SUBTOTAL:                      130.00
GRAND TOTAL:                   130.00
------------------------------------------------
PAYMENT: CASH
CASH:                         200.00
CHANGE:                        70.00
================================================
     Thank you!
     Please come again
     This is your official receipt
================================================
```

## Features

- ✅ Works with network thermal printers (TCP/IP)
- ✅ ESC/POS command support
- ✅ Auto-feed after printing
- ✅ Error handling and logging
- ✅ Compatible with your existing PHP backend
- ✅ Runs offline and online

## Integration with Existing Code

You can integrate this with your existing `print_direct.php` by calling the Node.js server instead of directly connecting:

```php
// Instead of direct socket connection
$response = file_get_contents('http://localhost:9100/print', false, stream_context_create([
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
```

## Troubleshooting

- **Connection timeout**: Check printer IP and port
- **No data printed**: Verify printer is on the network
- **Server not starting**: Make sure port 9100 is not in use
- **Permission errors**: Run as administrator if needed

## Notes

- The server uses native Node.js `net` module (no external dependencies for printing)
- All printing is done via raw TCP/IP sockets
- Works with any ESC/POS compatible thermal printer
- Server must be running for printing to work

