<?php
// QZ TRAY RECEIPT - FOR ONLINE POS AUTO PRINTING
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'message' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
        exit;
    }

    // Create receipt content in ESC/POS format
    $receipt = createESCPOSReceipt($input);
    
    echo json_encode([
        'success' => true,
        'message' => 'Receipt data prepared for QZ Tray',
        'data' => [
            'receipt' => $receipt,
            'transactionId' => ($input['transactionId'] ?? null),
            'printer' => 'POS-58',
            'format' => 'ESCPOS'
        ]
    ]);
    
} catch (Exception $e) {
    echo json_encode(['success' => false, 'message' => 'Error: ' . $e->getMessage()]);
}

function createESCPOSReceipt($input) {
    // ESC/POS commands for thermal printer
    $receipt = "";
    
    // Initialize printer
    $receipt .= "\x1B\x40"; // ESC @ - Initialize printer
    
    // Center align and double height
    $receipt .= "\x1B\x61\x01"; // ESC a 1 - Center align
    $receipt .= "\x1B\x21\x10"; // ESC ! 16 - Double height
    $receipt .= "ENGUIO'S PHARMACY\n";
    $receipt .= "& CONVENIENCE STORE\n";
    
    // Reset formatting
    $receipt .= "\x1B\x21\x00"; // ESC ! 0 - Normal text
    $receipt .= "\x1B\x61\x00"; // ESC a 0 - Left align
    
    // Store address
    $receipt .= "123 Main Street, City\n";
    $receipt .= "Phone: (123) 456-7890\n";
    $receipt .= "================================\n";
    
    // Transaction details
    $receipt .= "Date: " . ($input['date'] ?? date('Y-m-d')) . "\n";
    $receipt .= "Time: " . ($input['time'] ?? date('H:i:s')) . "\n";
    $receipt .= "TXN ID: " . ($input['transactionId'] ?? 'N/A') . "\n";
    $receipt .= "Cashier: " . ($input['cashier'] ?? 'Admin') . "\n";
    $receipt .= "Terminal: " . ($input['terminalName'] ?? 'POS') . "\n";
    $receipt .= "--------------------------------\n";
    
    // Items header
    $receipt .= "QTY  ITEM            PRICE  TOTAL\n";
    $receipt .= "--------------------------------\n";
    
    // Items
    if (!empty($input['items'])) {
        foreach ($input['items'] as $item) {
            $name = $item['name'] ?? 'Unknown';
            $qty = (int)($item['quantity'] ?? 1);
            $price = (float)($item['price'] ?? 0);
            $total = $qty * $price;
            
            $receipt .= sprintf("%-4d %-15s %6.2f %6.2f\n", $qty, substr($name, 0, 15), $price, $total);
        }
    }
    
    $receipt .= "--------------------------------\n";
    $receipt .= "SUBTOTAL:            " . sprintf("%6.2f", $input['subtotal'] ?? 0) . "\n";
    
    if (!empty($input['discountType']) && isset($input['discountAmount']) && (float)$input['discountAmount'] > 0) {
        $receipt .= "DISCOUNT (" . $input['discountType'] . "): " . sprintf("%6.2f", -$input['discountAmount']) . "\n";
    }
    
    $receipt .= "GRAND TOTAL:         " . sprintf("%6.2f", $input['grandTotal'] ?? 0) . "\n";
    $receipt .= "--------------------------------\n";
    $receipt .= "PAYMENT: " . strtoupper($input['paymentMethod'] ?? 'CASH') . "\n";
    $receipt .= "AMOUNT PAID:         " . sprintf("%6.2f", $input['amountPaid'] ?? 0) . "\n";
    $receipt .= "CHANGE:              " . sprintf("%6.2f", $input['change'] ?? 0) . "\n";
    $receipt .= "================================\n";
    
    // Center align footer
    $receipt .= "\x1B\x61\x01"; // ESC a 1 - Center align
    $receipt .= "Thank you for purchasing!\n";
    $receipt .= "Please come again!\n";
    $receipt .= "This is your official receipt\n";
    
    // Reset formatting
    $receipt .= "\x1B\x61\x00"; // ESC a 0 - Left align
    
    // Cut paper
    $receipt .= "\n\n\n\n";
    $receipt .= "\x1D\x56\x00"; // GS V 0 - Full cut
    
    return $receipt;
}
?>
