<?php
// Simple check for returns
require_once 'Api/conn.php';

echo "<h2>🔍 Quick Return Check</h2>";

// Check for pending returns
$stmt = $conn->prepare("SELECT COUNT(*) as count FROM tbl_pos_returns WHERE status = 'pending'");
$stmt->execute();
$pendingCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

echo "<p><strong>Pending Returns:</strong> $pendingCount</p>";

if ($pendingCount > 0) {
    echo "<h3>Pending Returns:</h3>";
    $stmt = $conn->prepare("SELECT * FROM tbl_pos_returns WHERE status = 'pending' LIMIT 5");
    $stmt->execute();
    $returns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($returns as $return) {
        echo "<div style='border: 1px solid #ccc; padding: 10px; margin: 5px;'>";
        echo "<strong>Return ID:</strong> {$return['return_id']}<br>";
        echo "<strong>Amount:</strong> {$return['total_refund']}<br>";
        echo "<strong>Location:</strong> {$return['location_name']}<br>";
        echo "<strong>Status:</strong> {$return['status']}<br>";
        echo "</div>";
    }
    
    echo "<h3>Return Items:</h3>";
    foreach ($returns as $return) {
        $stmt = $conn->prepare("SELECT * FROM tbl_pos_return_items WHERE return_id = ?");
        $stmt->execute([$return['return_id']]);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "<h4>Return {$return['return_id']}:</h4>";
        foreach ($items as $item) {
            echo "- Product: {$item['product_id']}, Qty: {$item['quantity']}, Price: {$item['price']}<br>";
        }
    }
} else {
    echo "<p style='color: red;'><strong>❌ No pending returns found!</strong></p>";
    echo "<p>You need to:</p>";
    echo "<ol>";
    echo "<li>Go to your POS system</li>";
    echo "<li>Process a return transaction</li>";
    echo "<li>Then come back to Admin Panel → Return Management to approve it</li>";
    echo "</ol>";
}

// Check current product quantities
echo "<h3>Current Product Quantities (Location 4 - Convenience Store):</h3>";
$stmt = $conn->prepare("SELECT product_id, product_name, quantity FROM tbl_product WHERE location_id = 4 ORDER BY product_id LIMIT 10");
$stmt->execute();
$products = $stmt->fetchAll(PDO::FETCH_ASSOC);

foreach ($products as $product) {
    echo "Product {$product['product_id']}: {$product['product_name']} - Qty: {$product['quantity']}<br>";
}
?>




















