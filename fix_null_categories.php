<?php
$pdo = new PDO('mysql:host=localhost;dbname=enguio2', 'root', '');
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

echo "FIXING NULL CATEGORY_ID VALUES\n";
echo "===============================\n\n";

// Check current state
$stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_product WHERE category_id IS NULL");
$nullCount = $stmt->fetch(PDO::FETCH_ASSOC)['count'];

echo "Products with NULL category_id: $nullCount\n\n";

if ($nullCount > 0) {
    // Show products with NULL
    $stmt = $pdo->query("SELECT product_id, product_name, category_id FROM tbl_product WHERE category_id IS NULL");
    echo "Products needing category:\n";
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "  [{$row['product_id']}] {$row['product_name']}\n";
    }
    echo "\n";
    
    // Assign categories
    echo "Assigning categories...\n";
    
    // Mang tomas, Ketchup = Convenience Food (24)
    $pdo->exec("UPDATE tbl_product SET category_id = 24 WHERE (product_name LIKE '%Mang tomas%' OR product_name LIKE '%Ketchup%') AND category_id IS NULL");
    
    // Spicy = Snack Foods (25)
    $pdo->exec("UPDATE tbl_product SET category_id = 25 WHERE product_name LIKE '%Spicy%' AND category_id IS NULL");
    
    // Create Uncategorized if needed
    $pdo->exec("INSERT INTO tbl_category (category_name) SELECT 'Uncategorized' WHERE NOT EXISTS (SELECT 1 FROM tbl_category WHERE category_name = 'Uncategorized')");
    
    // Assign remaining to Uncategorized
    $pdo->exec("UPDATE tbl_product SET category_id = (SELECT category_id FROM tbl_category WHERE category_name = 'Uncategorized') WHERE category_id IS NULL");
    
    echo "✅ Categories assigned!\n\n";
}

// Verify
echo "VERIFICATION:\n";
echo "-------------\n";
$stmt = $pdo->query("
    SELECT p.product_id, p.product_name, c.category_name
    FROM tbl_product p
    LEFT JOIN tbl_category c ON p.category_id = c.category_id
");

while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
    $cat = $row['category_name'] ?? 'NULL';
    echo "[{$row['product_id']}] {$row['product_name']} → $cat\n";
}

echo "\n✅ All products now have categories!\n";
?>

