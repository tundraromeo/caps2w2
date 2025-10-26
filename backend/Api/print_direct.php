<?php
// print_direct.php - Direct TCP/IP Printing to Network Printer
// This allows automatic printing without QZ Tray by sending raw data to printer IP

require_once __DIR__ . '/cors.php';

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
    exit;
}

$printerIP = $input['printerIP'] ?? '';
$printerPort = $input['printerPort'] ?? '9100';
$receiptData = $input['receiptData'] ?? [];

if (empty($printerIP)) {
    echo json_encode(['success' => false, 'message' => 'Printer IP not configured']);
    exit;
}

// Generate receipt content
$receiptWidth = 48;

function formatPriceLine($label, $amount, $width) {
    $amountStr = number_format((float)$amount, 2);
    $spaces = $width - strlen($label) - strlen($amountStr);
    return $label . str_repeat(' ', max(0, $spaces)) . $amountStr;
}

function centerText($text, $width) {
    $padding = floor(($width - strlen($text)) / 2);
    return str_repeat(' ', max(0, $padding)) . $text;
}

// Build receipt
$receipt = '';
$receipt .= str_repeat('=', $receiptWidth) . "\n";
$receipt .= centerText($receiptData['storeName'] ?? "ENGUIO'S PHARMACY", $receiptWidth) . "\n";
$receipt .= str_repeat('=', $receiptWidth) . "\n";
$receipt .= 'Date: ' . ($receiptData['date'] ?? date('Y-m-d')) . "\n";
$receipt .= 'Time: ' . ($receiptData['time'] ?? date('H:i:s')) . "\n";
$receipt .= 'TXN ID: ' . ($receiptData['transactionId'] ?? 'N/A') . "\n";
$receipt .= 'Cashier: ' . ($receiptData['cashier'] ?? 'Admin') . "\n";
$receipt .= 'Terminal: ' . ($receiptData['terminalName'] ?? 'POS') . "\n";
$receipt .= str_repeat('-', $receiptWidth) . "\n";

// Items
if (!empty($receiptData['items'])) {
    foreach ($receiptData['items'] as $item) {
        $name = substr($item['name'] ?? 'Unknown', 0, 20);
        $qty = (int)($item['quantity'] ?? 1);
        $price = (float)($item['price'] ?? 0);
        $total = $qty * $price;
        
        $receipt .= str_pad($qty, 4)
          . str_pad($name, 20)
          . str_pad(number_format($price, 2), 8, ' ', STR_PAD_LEFT)
          . str_pad(number_format($total, 2), 8, ' ', STR_PAD_LEFT) . "\n";
    }
}

$receipt .= str_repeat('-', $receiptWidth) . "\n";
$receipt .= formatPriceLine('SUBTOTAL:', $receiptData['subtotal'] ?? $receiptData['total'] ?? 0, $receiptWidth) . "\n";

if (!empty($receiptData['discountType']) && isset($receiptData['discountAmount']) && (float)$receiptData['discountAmount'] > 0) {
    $receipt .= 'Discount: ' . $receiptData['discountType'] . "\n";
    $receipt .= formatPriceLine('Discount Amt:', $receiptData['discountAmount'], $receiptWidth) . "\n";
}

$receipt .= str_repeat('-', $receiptWidth) . "\n";
$receipt .= formatPriceLine('GRAND TOTAL:', $receiptData['grandTotal'] ?? $receiptData['total'] ?? 0, $receiptWidth) . "\n";
$receipt .= str_repeat('-', $receiptWidth) . "\n";

// Payment
$receipt .= 'PAYMENT: ' . strtoupper($receiptData['paymentMethod'] ?? 'Unknown') . "\n";

$pmLower = strtolower(($receiptData['paymentMethod'] ?? ''));
if ($pmLower === 'cash') {
    $receipt .= formatPriceLine('CASH:', $receiptData['amountPaid'] ?? 0, $receiptWidth) . "\n";
    $receipt .= formatPriceLine('CHANGE:', $receiptData['change'] ?? 0, $receiptWidth) . "\n";
} elseif ($pmLower === 'gcash') {
    if (!empty($receiptData['gcashRef'])) {
        $receipt .= 'GCASH REF: ' . $receiptData['gcashRef'] . "\n";
    }
    $receipt .= formatPriceLine('AMOUNT PAID:', $receiptData['amountPaid'] ?? 0, $receiptWidth) . "\n";
    $receipt .= formatPriceLine('CHANGE:', $receiptData['change'] ?? 0, $receiptWidth) . "\n";
}

$receipt .= str_repeat('=', $receiptWidth) . "\n";
$receipt .= centerText('Thank you!', $receiptWidth) . "\n";
$receipt .= centerText('Please come again', $receiptWidth) . "\n";
$receipt .= centerText('This is your official receipt', $receiptWidth) . "\n";
$receipt .= str_repeat('=', $receiptWidth) . "\n";
$receipt .= "\n\n\n"; // Feed lines

// Connect to printer and send
try {
    // Create socket connection to printer
    $socket = @fsockopen($printerIP, (int)$printerPort, $errno, $errstr, 5);
    
    if (!$socket) {
        throw new Exception("Cannot connect to printer at {$printerIP}:{$printerPort} - {$errstr}");
    }
    
    // Add ESC/POS initialization commands
    $escPosInit = "\x1B\x40"; // Initialize printer
    $escPosFeed = "\x1B\x64\x05"; // Feed 5 lines
    
    $fullReceipt = $escPosInit . $receipt . $escPosFeed;
    
    // Send data to printer
    fwrite($socket, $fullReceipt);
    
    // Close connection
    fclose($socket);
    
    echo json_encode([
        'success' => true,
        'message' => 'Receipt sent to printer successfully',
        'printer' => "{$printerIP}:{$printerPort}"
    ]);
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>

