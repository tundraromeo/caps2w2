<?php
// Simple test to check sales functionality
header('Content-Type: application/json');

// Test the get_today_sales function directly
$testData = [
    'action' => 'get_today_sales',
    'cashier_username' => 'Admin',
    'location_name' => 'Convenience Store',
    'terminal_name' => 'Convenience POS'
];

// Test via sales_api.php
$url = 'http://localhost/Enguio_Project/Api/sales_api.php';
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($testData));

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

echo json_encode([
    'test' => 'get_today_sales',
    'http_code' => $httpCode,
    'response' => json_decode($response, true),
    'raw_response' => $response
], JSON_PRETTY_PRINT);
?>

