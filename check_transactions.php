<?php
// Check existing transactions and returns
header('Content-Type: text/html');

require_once 'Api/conn.php';

try {
    echo "<h2>🔍 Transaction and Return Check</h2>";
    
    // Check existing sales transactions
    echo "<h3>1. Existing Sales Transactions:</h3>";
    $stmt = $conn->prepare("SELECT * FROM tbl_pos_sales_header ORDER BY sales_header_id DESC LIMIT 5");
    $stmt->execute();
    $sales = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($sales as $sale) {
        echo "Transaction: {$sale['reference_number']}, Amount: {$sale['total_amount']}, Terminal: {$sale['terminal_id']}<br>";
    }
    
    // Check existing returns
    echo "<h3>2. Existing Returns:</h3>";
    $stmt = $conn->prepare("SELECT * FROM tbl_pos_returns ORDER BY id DESC LIMIT 5");
    $stmt->execute();
    $returns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($returns as $return) {
        echo "Return: {$return['return_id']}, Original TXN: {$return['original_transaction_id']}, Status: {$return['status']}, Location: {$return['location_name']}<br>";
    }
    
    // Check return items
    echo "<h3>3. Return Items:</h3>";
    $stmt = $conn->prepare("SELECT * FROM tbl_pos_return_items ORDER BY id DESC LIMIT 5");
    $stmt->execute();
    $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($items as $item) {
        echo "Return: {$item['return_id']}, Product: {$item['product_id']}, Qty: {$item['quantity']}, Price: {$item['price']}<br>";
    }
    
    // Check products
    echo "<h3>4. Products in Database:</h3>";
    $stmt = $conn->prepare("SELECT product_id, product_name, quantity, location_id FROM tbl_product ORDER BY product_id LIMIT 10");
    $stmt->execute();
    $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($products as $product) {
        echo "Product: {$product['product_id']} - {$product['product_name']}, Qty: {$product['quantity']}, Location: {$product['location_id']}<br>";
    }
    
    // Check locations
    echo "<h3>5. Locations:</h3>";
    $stmt = $conn->prepare("SELECT * FROM tbl_location");
    $stmt->execute();
    $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($locations as $location) {
        echo "Location: {$location['location_id']} - {$location['location_name']}<br>";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage();
}
?>

