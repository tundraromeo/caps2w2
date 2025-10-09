<?php
$pdo = new PDO('mysql:host=localhost;dbname=enguio2', 'root', '');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "TESTING RAW SQL QUERY\n";
echo "=====================\n\n";

$sql = "
    SELECT 
        p.product_id,
        p.product_name,
        p.category_id,
        c.category_name as category,
        p.quantity,
        p.barcode,
        p.srp
    FROM tbl_product p
    LEFT JOIN tbl_category c ON p.category_id = c.category_id
    WHERE p.status = 'active' AND p.location_id = 2
    LIMIT 3
";

$stmt = $pdo->query($sql);
$products = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Query Results:\n";
echo "--------------\n";

foreach ($products as $p) {
    echo "\nProduct ID: {$p['product_id']}\n";
    echo "  Name: {$p['product_name']}\n";
    echo "  category_id: " . ($p['category_id'] ?? 'NULL') . "\n";
    echo "  category: " . ($p['category'] ?? 'NULL') . "\n";
    echo "  Barcode: {$p['barcode']}\n";
    
    // Show all keys
    echo "  All fields: " . implode(', ', array_keys($p)) . "\n";
}

echo "\n=====================\n";
echo "If category shows value, API is working!\n";
?>

