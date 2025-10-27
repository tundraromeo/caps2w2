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

// ESC/POS commands for text formatting
$escBoldOn = "\x1B\x45\x01";      // Bold ON
$escBoldOff = "\x1B\x45\x00";     // Bold OFF
$escDoubleStrikeOn = "\x1B\x47\x01";  // Double-strike ON (makes text darker)
$escDoubleStrikeOff = "\x1B\x47\x00"; // Double-strike OFF
$escBigTextOn = "\x1B\x21\x30";    // Double width and double height
$escBigTextOff = "\x1B\x21\x00";   // Normal size
$escCenter = "\x1B\x61\x01";       // Center alignment
$escLeft = "\x1B\x61\x00";         // Left alignment

// Build receipt with darker text
$receipt = '';
$receipt .= $escDoubleStrikeOn; // Enable double-strike for darker text
$receipt .= str_repeat('=', $receiptWidth) . "\n";
// Use storeName from receiptData, fallback to defaults
$storeName = $receiptData['storeName'] ?? "ENGUIO'S PHARMACY";
$receipt .= $storeName . "\n";
$receipt .= str_repeat('=', $receiptWidth) . "\n";
$receipt .= $escDoubleStrikeOff; // Disable for normal text
$receipt .= 'Date: ' . ($receiptData['date'] ?? date('Y-m-d')) . "\n";
$receipt .= 'Time: ' . ($receiptData['time'] ?? date('H:i:s')) . "\n";
$receipt .= 'TXN ID: ' . ($receiptData['transactionId'] ?? 'N/A') . "\n";
$receipt .= 'Cashier: ' . ($receiptData['cashier'] ?? 'Admin') . "\n";
$receipt .= 'Terminal: ' . ($receiptData['terminalName'] ?? 'POS') . "\n";
$receipt .= str_repeat('-', $receiptWidth) . "\n";

// Items header - Removed to make it cleaner
$receipt .= str_repeat('-', $receiptWidth) . "\n";

// Items
if (!empty($receiptData['items'])) {
    foreach ($receiptData['items'] as $item) {
        $name = $item['name'] ?? 'Unknown';
        $qty = (int)($item['quantity'] ?? 1);
        $price = (float)($item['price'] ?? 0);
        $srp = (float)($item['srp'] ?? $price); // Use SRP if available, fallback to price
        $total = $qty * $price;
        
        // Format: Product name on first line, qty srp total on second line
        $receipt .= $name . "\n";
        $receipt .= 'qty:' . $qty . ' srp:' . number_format($srp, 2) . ' total:' . number_format($total, 2) . "\n";
    }
}

$receipt .= str_repeat('-', $receiptWidth) . "\n";

// Calculate total quantity and number of items
if (!empty($receiptData['items'])) {
    $totalQty = 0;
    foreach ($receiptData['items'] as $item) {
        $totalQty += (int)($item['quantity'] ?? 1);
    }
    $totalItems = count($receiptData['items']);
    $receipt .= "TOTAL : {$totalQty} items ({$totalItems} " . ($totalItems == 1 ? 'item' : 'items') . ")\n";
}

// Discount
if (!empty($receiptData['discountType']) && isset($receiptData['discountAmount']) && (float)$receiptData['discountAmount'] > 0) {
    $discountPercent = isset($receiptData['discountPercent']) && $receiptData['discountPercent'] > 0 
                       ? ' (' . round($receiptData['discountPercent']) . '%)' 
                       : '';
    $receipt .= 'Discount: ' . $receiptData['discountType'] . $discountPercent . "\n";
    $receipt .= formatPriceLine('Discount Amt:', $receiptData['discountAmount'], $receiptWidth) . "\n";
}

$receipt .= str_repeat('-', $receiptWidth) . "\n";
$receipt .= 'GRAND TOTAL: ' . number_format($receiptData['grandTotal'] ?? $receiptData['total'] ?? 0, 2) . "\n";
$receipt .= str_repeat('-', $receiptWidth) . "\n";

// Payment
$pmLower = strtolower(($receiptData['paymentMethod'] ?? ''));
if ($pmLower === 'cash') {
    $receipt .= strtoupper($receiptData['paymentMethod'] ?? 'CASH') . ': ' . number_format((float)($receiptData['amountPaid'] ?? 0), 2) . "\n";
    $receipt .= 'CHANGE: ' . number_format((float)($receiptData['change'] ?? 0), 2) . "\n";
} elseif ($pmLower === 'gcash') {
    $receipt .= strtoupper($receiptData['paymentMethod'] ?? 'GCASH') . ': ' . number_format((float)($receiptData['amountPaid'] ?? 0), 2) . "\n";
    if (!empty($receiptData['gcashRef'])) {
        $receipt .= 'GCASH REF: ' . $receiptData['gcashRef'] . "\n";
    }
    $receipt .= 'CHANGE: ' . number_format((float)($receiptData['change'] ?? 0), 2) . "\n";
} else {
    $receipt .= strtoupper($receiptData['paymentMethod'] ?? 'UNKNOWN') . ': ' . number_format((float)($receiptData['amountPaid'] ?? 0), 2) . "\n";
    $receipt .= 'CHANGE: ' . number_format((float)($receiptData['change'] ?? 0), 2) . "\n";
}

$receipt .= str_repeat('=', $receiptWidth) . "\n";
$receipt .= 'Thank you!' . "\n";
$receipt .= 'Please come again' . "\n";
$receipt .= 'This is your official receipt' . "\n";
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
    
    // Make entire receipt darker using double-strike
    $fullReceipt = $escPosInit . $escDoubleStrikeOn . $receipt . $escDoubleStrikeOff . $escPosFeed;
    
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

