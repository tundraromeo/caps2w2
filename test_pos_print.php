<?php
// Direct test for POS print script
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

$input = json_decode(file_get_contents('php://input'), true);
if (!is_array($input)) {
    echo json_encode(['success' => false, 'message' => 'Invalid JSON input']);
    exit;
}

// Test data (same as POS)
$receiptData = [
    'storeName' => $input['storeName'] ?? "ENGUIO'S PHARMACY",
    'date' => $input['date'] ?? date('Y-m-d'),
    'time' => $input['time'] ?? date('H:i:s'),
    'transactionId' => $input['transactionId'] ?? 'TEST' . time(),
    'cashier' => $input['cashier'] ?? 'Test User',
    'terminalName' => $input['terminalName'] ?? 'POS Test',
    'items' => $input['items'] ?? [
        [
            'name' => 'Test Item',
            'quantity' => 1,
            'price' => 10.00,
            'total' => 10.00
        ]
    ],
    'subtotal' => $input['subtotal'] ?? 10.00,
    'grandTotal' => $input['grandTotal'] ?? 10.00,
    'paymentMethod' => $input['paymentMethod'] ?? 'CASH',
    'amountPaid' => $input['amountPaid'] ?? 10.00,
    'change' => $input['change'] ?? 0.00
];

echo "=== TESTING POS PRINT SCRIPT ===\n";
echo "Receipt Data: " . json_encode($receiptData, JSON_PRETTY_PRINT) . "\n\n";

// Test the actual print script
$url = 'http://localhost/caps2e2/Api/print-receipt-fixed-width.php';
$data = json_encode($receiptData);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Content-Length: ' . strlen($data)
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$error = curl_error($ch);
curl_close($ch);

echo "=== RESPONSE ===\n";
echo "HTTP Code: $httpCode\n";
echo "Response: $response\n";
if ($error) {
    echo "CURL Error: $error\n";
}

// Parse response
$result = json_decode($response, true);
if ($result) {
    echo "\n=== PARSED RESULT ===\n";
    echo json_encode($result, JSON_PRETTY_PRINT) . "\n";
    
    if ($result['success']) {
        echo "\n✅ SUCCESS! Check your printer!\n";
    } else {
        echo "\n❌ FAILED: " . $result['message'] . "\n";
    }
} else {
    echo "\n❌ Invalid JSON response\n";
}
?>
