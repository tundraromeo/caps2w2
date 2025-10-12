<?php
// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Simulate exact frontend request
$_POST = json_encode([
    'action' => 'get_product_details',
    'transfer_id' => 91
]);

// Include backend
require_once __DIR__ . '/Api/backend.php';
?>

