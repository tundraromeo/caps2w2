<?php
// Test the actual API call
$conn = new PDO('mysql:host=localhost;dbname=enguio2', 'root', '');

echo "=== TESTING ACTUAL API CALL ===\n";

// Simulate the API call
$data = [
    'action' => 'get_convenience_batch_details',
    'product_id' => 131,
    'location_id' => 4
];

echo "API Request: " . json_encode($data) . "\n";

// Get the API response
$input = json_encode($data);
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, 'http://localhost/caps2e2/Api/convenience_store_api.php');
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $input);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 10);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: " . $httpCode . "\n";
echo "Response: " . $response . "\n";

if ($response) {
    $result = json_decode($response, true);
    if ($result && isset($result['success']) && $result['success']) {
        echo "\n✅ API Success!\n";
        echo "Data count: " . (is_array($result['data']) ? count($result['data']) : 'Not array') . "\n";
        
        if (is_array($result['data'])) {
            foreach($result['data'] as $batch) {
                echo "- Product: " . ($batch['product_id'] ?? 'N/A') . 
                     ", Batch: " . ($batch['batch_reference'] ?? 'N/A') . 
                     ", Qty: " . ($batch['batch_quantity'] ?? 'N/A') . 
                     ", SRP: " . ($batch['batch_srp'] ?? 'N/A') . 
                     ", Expiry: " . ($batch['expiration_date'] ?? 'N/A') . "\n";
            }
        } else {
            echo "Data structure: " . json_encode($result['data']) . "\n";
        }
    } else {
        echo "❌ API Error: " . ($result['message'] ?? 'Unknown error') . "\n";
    }
} else {
    echo "❌ No response from API\n";
}
?>
