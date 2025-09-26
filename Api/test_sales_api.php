<?php
// Test the sales API directly
header('Content-Type: application/json');

echo "=== TESTING SALES API ===\n";

// Test 1: Check if sales_api.php is working
echo "1. Testing sales_api.php routing...\n";

$testData = [
    'action' => 'get_today_sales',
    'cashier_username' => 'Admin',
    'location_name' => 'Convenience Store',
    'terminal_name' => 'Convenience POS'
];

$url = 'http://localhost/Enguio_Project/Api/sales_api.php';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo "HTTP Code: $httpCode\n";
echo "Response: $response\n\n";

// Test 2: Check if modular backend is working
echo "2. Testing modular backend directly...\n";

$url2 = 'http://localhost/Enguio_Project/Api/backend_modular.php';
$ch2 = curl_init($url2);
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch2, CURLOPT_POST, true);
curl_setopt($ch2, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch2, CURLOPT_POSTFIELDS, json_encode($testData));

$response2 = curl_exec($ch2);
$httpCode2 = curl_getinfo($ch2, CURLINFO_HTTP_CODE);
curl_close($ch2);

echo "HTTP Code: $httpCode2\n";
echo "Response: $response2\n\n";

// Test 3: Check database directly
echo "3. Testing database connection...\n";

try {
    $conn = new PDO('mysql:host=localhost;dbname=enguio2', 'root', '');
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    $stmt = $conn->prepare('SELECT COUNT(*) as count FROM tbl_pos_transaction');
    $stmt->execute();
    $count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    echo "Database connection: SUCCESS\n";
    echo "Total transactions in database: $count\n";
    
} catch (Exception $e) {
    echo "Database connection: FAILED - " . $e->getMessage() . "\n";
}
?>

