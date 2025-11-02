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

// Function to center text
function centerText($text, $width) {
    $padding = floor(($width - strlen($text)) / 2);
    return str_repeat(' ', max(0, $padding)) . $text;
}

// Function to format a price line (right-align amount)
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

// Build receipt content
$receipt = '';

// Header Section with double line border
$receipt .= str_repeat('=', $receiptWidth) . "\n";

// Store name centered
$storeName = $input['storeName'] ?? "ENGUIO'S CONVENIENCE STORE";
$receipt .= $escCenter . $storeName . $escLeft . "\n";

// Add address for all stores
$receipt .= $escCenter . "Z1 Lumbia, Cagayan De Oro" . $escLeft . "\n";

// Bottom border
$receipt .= str_repeat('=', $receiptWidth) . "\n";

// Transaction Details
$date = $input['date'] ?? date('n/j/Y'); // Format: 11/2/2025 (no leading zero on month/day if < 10)
$time = $input['time'] ?? date('g:i:s A'); // Format: 1:56:04 PM (12-hour, no leading zero on hour if < 10, uppercase AM/PM)
$txnId = $input['transactionId'] ?? 'TXN' . time();
$cashier = $input['cashier'] ?? 'admin';
$terminal = $input['terminalName'] ?? 'Convenience POS';

$receipt .= "Date: " . $date . "\n";
$receipt .= "Time: " . $time . "\n";
$receipt .= "TXN ID: " . $txnId . "\n";
$receipt .= "Cashier: " . $cashier . "\n";
$receipt .= "Terminal: " . $terminal . "\n";

// Dashed line separator
$receipt .= str_repeat('-', $receiptWidth) . "\n";

// Items
if (!empty($input['items'])) {
    foreach ($input['items'] as $item) {
        $name = $item['name'] ?? 'Unknown';
        $qty = (int)($item['quantity'] ?? 1);
        $price = (float)($item['price'] ?? 0);
        $srp = (float)($item['srp'] ?? $price);
        $total = $qty * $price;
        
        // Format: Item name on first line, qty srp total on second line
        $receipt .= $name . "\n";
        $receipt .= "qty:" . $qty . " srp:" . number_format($srp, 2) . " total:" . number_format($total, 2) . "\n";
    }
} else {
    $receipt .= "No items found\n";
}

// Dashed line separator
$receipt .= str_repeat('-', $receiptWidth) . "\n";

// Calculate totals
$subtotal = (float)($input['subtotal'] ?? $input['grandTotal'] ?? $input['total'] ?? 0);
$grandTotal = (float)($input['grandTotal'] ?? $input['total'] ?? 0);

// Item count and summary - Note the space before colon
if (!empty($input['items'])) {
    $totalQty = 0;
    foreach ($input['items'] as $item) {
        $totalQty += (int)($item['quantity'] ?? 1);
    }
    $totalItems = count($input['items']);
    $itemText = ($totalItems == 1) ? "item" : "items";
    $receipt .= "TOTAL : " . $totalQty . " items (" . $totalItems . " " . $itemText . ")\n";
}

// Subtotal
$receipt .= formatPriceLine("SUBTOTAL:", $subtotal, $receiptWidth) . "\n";

// Dashed line separator
$receipt .= str_repeat('-', $receiptWidth) . "\n";

// Grand Total
$receipt .= formatPriceLine("GRAND TOTAL:", $grandTotal, $receiptWidth) . "\n";

// Dashed line separator
$receipt .= str_repeat('-', $receiptWidth) . "\n";

// Payment Information
$pmLower = strtolower((string)($input['paymentMethod'] ?? 'cash'));
if ($pmLower === 'cash') {
    $cash = (float)($input['amountPaid'] ?? 0);
    $change = (float)($input['change'] ?? 0);
    $receipt .= formatPriceLine("CASH:", $cash, $receiptWidth) . "\n";
    $receipt .= formatPriceLine("CHANGE:", $change, $receiptWidth) . "\n";
} elseif ($pmLower === 'gcash') {
    $amountPaid = (float)($input['amountPaid'] ?? 0);
    $change = (float)($input['change'] ?? 0);
    $receipt .= formatPriceLine("GCASH:", $amountPaid, $receiptWidth) . "\n";
    if (!empty($input['gcashRef'])) {
        $receipt .= "GCASH REF: " . $input['gcashRef'] . "\n";
    }
    $receipt .= formatPriceLine("CHANGE:", $change, $receiptWidth) . "\n";
} else {
    $amountPaid = (float)($input['amountPaid'] ?? 0);
    $change = (float)($input['change'] ?? 0);
    $receipt .= formatPriceLine(strtoupper($input['paymentMethod'] ?? 'UNKNOWN') . ":", $amountPaid, $receiptWidth) . "\n";
    $receipt .= formatPriceLine("CHANGE:", $change, $receiptWidth) . "\n";
}

// Dashed line separator
$receipt .= str_repeat('-', $receiptWidth) . "\n";

// VAT/Tax Breakdown Section
$vatableSale = (float)($input['vatableSale'] ?? 0);
$vatExemptSale = (float)($input['vatExemptSale'] ?? 0);
$vatZeroRated = (float)($input['vatZeroRated'] ?? 0);
$vat12 = (float)($input['vat12'] ?? 0);

$receipt .= formatPriceLine("VATable Sale:", $vatableSale, $receiptWidth) . "\n";
$receipt .= formatPriceLine("VAT Exempt Sale:", $vatExemptSale, $receiptWidth) . "\n";
$receipt .= formatPriceLine("VAT Zero-Rated:", $vatZeroRated, $receiptWidth) . "\n";
$receipt .= formatPriceLine("VAT 12%:", $vat12, $receiptWidth) . "\n";

// Footer Section
$receipt .= str_repeat('=', $receiptWidth) . "\n";
$receipt .= $escCenter . "Thank you!" . $escLeft . "\n";
$receipt .= $escCenter . "Please come again" . $escLeft . "\n";
$receipt .= $escCenter . "THIS IS NOT AN OFFICIAL RECEIPT" . $escLeft . "\n";

$receipt .= "\n\n\n"; // Feed lines for paper cut

// Return raw receipt data for QZ Tray
$finalReceipt = $receipt;

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

