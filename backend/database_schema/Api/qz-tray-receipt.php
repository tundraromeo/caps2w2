<?php
// qz-tray-receipt.php - For QZ Tray Integration
// This script generates raw receipt data that QZ Tray will print directly.

// Use centralized CORS configuration
require_once __DIR__ . '/cors.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
    exit;
}

$receiptWidth = 48; // Standard thermal printer width (58mm paper)

// Function to format a price line
function formatPriceLine($label, $amount, $width) {
    $amountStr = number_format((float)$amount, 2);
    $spaces = $width - strlen($label) - strlen($amountStr);
    return $label . str_repeat(' ', max(0, $spaces)) . $amountStr;
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

// Build receipt content with darker text
$receipt = '';
$receipt .= $escDoubleStrikeOn; // Enable double-strike for darker text
$receipt .= str_repeat('=', $receiptWidth) . "\n";
// Use storeName from input, fallback to defaults based on context
$storeName = $input['storeName'] ?? "ENGUIO'S PHARMACY";
$receipt .= $storeName . "\n";
$receipt .= str_repeat('=', $receiptWidth) . "\n";
$receipt .= $escDoubleStrikeOff; // Disable for normal text
$receipt .= 'Date: ' . ($input['date'] ?? date('Y-m-d')) . "\n";
$receipt .= 'Time: ' . ($input['time'] ?? date('H:i:s')) . "\n";
$receipt .= 'TXN ID: ' . ($input['transactionId'] ?? 'N/A') . "\n";
$receipt .= 'Cashier: ' . ($input['cashier'] ?? 'Admin') . "\n";
$receipt .= 'Terminal: ' . ($input['terminalName'] ?? 'POS') . "\n";
$receipt .= str_repeat('-', $receiptWidth) . "\n";

// Items header - Removed to make it cleaner
$receipt .= str_repeat('-', $receiptWidth) . "\n";

// Items
if (!empty($input['items'])) {
    foreach ($input['items'] as $item) {
        $name = $item['name'] ?? 'Unknown';
        $qty = (int)($item['quantity'] ?? 1);
        $price = (float)($item['price'] ?? 0);
        $srp = (float)($item['srp'] ?? $price); // Use SRP if available, fallback to price
        $total = $qty * $price;
        
        // Format: Product name on first line, qty srp total on second line
        $receipt .= $name . "\n";
        $receipt .= 'qty:' . $qty . ' srp:' . number_format($srp, 2) . ' total:' . number_format($total, 2) . "\n";
    }
} else {
    $receipt .= "No items found\n";
}

$receipt .= str_repeat('-', $receiptWidth) . "\n";

// Calculate total quantity and number of items
if (!empty($input['items'])) {
    $totalQty = 0;
    foreach ($input['items'] as $item) {
        $totalQty += (int)($item['quantity'] ?? 1);
    }
    $totalItems = count($input['items']);
    $receipt .= "TOTAL : {$totalQty} items ({$totalItems} " . ($totalItems == 1 ? 'item' : 'items') . ")\n";
}

// Discount (if any)
if (!empty($input['discountType']) && isset($input['discountAmount']) && (float)$input['discountAmount'] > 0) {
    $discountPercent = isset($input['discountPercent']) && $input['discountPercent'] > 0 
                       ? ' (' . round($input['discountPercent']) . '%)' 
                       : '';
    $receipt .= 'Discount: ' . $input['discountType'] . $discountPercent . "\n";
    $discountAmt = (float)$input['discountAmount'];
    $receipt .= formatPriceLine('Discount Amt:', $discountAmt, $receiptWidth) . "\n";
}

// Grand Total
$totalAmount = (float)($input['grandTotal'] ?? $input['total'] ?? 0);
$receipt .= str_repeat('-', $receiptWidth) . "\n";
$receipt .= 'GRAND TOTAL: ' . number_format($totalAmount, 2) . "\n";
$receipt .= str_repeat('-', $receiptWidth) . "\n";

// Payment details
$pmLower = strtolower((string)($input['paymentMethod'] ?? ''));
if ($pmLower === 'cash') {
    $receipt .= strtoupper($input['paymentMethod'] ?? 'CASH') . ': ' . number_format((float)($input['amountPaid'] ?? 0), 2) . "\n";
    $receipt .= 'CHANGE: ' . number_format((float)($input['change'] ?? 0), 2) . "\n";
} elseif ($pmLower === 'gcash') {
    $receipt .= strtoupper($input['paymentMethod'] ?? 'GCASH') . ': ' . number_format((float)($input['amountPaid'] ?? 0), 2) . "\n";
    if (!empty($input['gcashRef'])) {
        $receipt .= 'GCASH REF: ' . $input['gcashRef'] . "\n";
    }
    $receipt .= 'CHANGE: ' . number_format((float)($input['change'] ?? 0), 2) . "\n";
} else {
    $receipt .= strtoupper($input['paymentMethod'] ?? 'UNKNOWN') . ': ' . number_format((float)($input['amountPaid'] ?? 0), 2) . "\n";
    $receipt .= 'CHANGE: ' . number_format((float)($input['change'] ?? 0), 2) . "\n";
}

$receipt .= str_repeat('=', $receiptWidth) . "\n";
$receipt .= 'Thank you!' . "\n";
$receipt .= 'Please come again' . "\n";
$receipt .= 'This is your official receipt' . "\n";
$receipt .= str_repeat('=', $receiptWidth) . "\n";
$receipt .= "\n\n\n"; // Feed lines for paper cut

// Wrap entire receipt with darker text formatting
$finalReceipt = $escDoubleStrikeOn . $receipt . $escDoubleStrikeOff;

// Return raw receipt data for QZ Tray
echo json_encode([
    'success' => true,
    'message' => 'Raw receipt data generated for QZ Tray',
    'data' => [
        'rawReceipt' => $finalReceipt,
        'transactionId' => ($input['transactionId'] ?? null)
    ]
]);
?>

