<?php
/**
 * Debug Transfer Details - Check the transfer batch details structure
 */

require_once __DIR__ . '/simple_dotenv.php';
$dotenv = new SimpleDotEnv(__DIR__);
$dotenv->load();

require_once __DIR__ . '/Api/conn.php';

echo "<h1>🔍 Debug Transfer Details</h1>";

try {
    $conn = getDatabaseConnection();
    echo "<p>✅ Database connection successful</p>";
    
    // Check all transfer batch details for Convenience Store
    echo "<h2>🔄 All Transfer Batch Details for Convenience Store</h2>";
    $stmt = $conn->prepare("
        SELECT 
            tbd.product_id,
            p.product_name,
            tbd.quantity,
            tbd.location_id,
            l.location_name,
            p.location_id as product_location_id,
            pl.location_name as product_location_name
        FROM tbl_transfer_batch_details tbd 
        LEFT JOIN tbl_product p ON tbd.product_id = p.product_id 
        LEFT JOIN tbl_location l ON tbd.location_id = l.location_id
        LEFT JOIN tbl_location pl ON p.location_id = pl.location_id
        WHERE tbd.location_id = 4
        ORDER BY tbd.product_id
    ");
    $stmt->execute();
    $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<table border='1' style='border-collapse: collapse;'>";
    echo "<tr><th>Product ID</th><th>Product Name</th><th>Quantity</th><th>Transfer Location ID</th><th>Transfer Location</th><th>Product Location ID</th><th>Product Location</th></tr>";
    foreach ($results as $row) {
        echo "<tr>";
        echo "<td>{$row['product_id']}</td>";
        echo "<td>{$row['product_name']}</td>";
        echo "<td>{$row['quantity']}</td>";
        echo "<td>{$row['location_id']}</td>";
        echo "<td>{$row['location_name']}</td>";
        echo "<td>{$row['product_location_id']}</td>";
        echo "<td>{$row['product_location_name']}</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    // Check the sum for each product
    echo "<h2>📊 Sum of Quantities per Product in Convenience Store</h2>";
    $sumStmt = $conn->prepare("
        SELECT 
            tbd.product_id,
            p.product_name,
            SUM(tbd.quantity) as total_quantity,
            p.location_id as product_location_id,
            pl.location_name as product_location_name
        FROM tbl_transfer_batch_details tbd 
        LEFT JOIN tbl_product p ON tbd.product_id = p.product_id 
        LEFT JOIN tbl_location pl ON p.location_id = pl.location_id
        WHERE tbd.location_id = 4
        GROUP BY tbd.product_id, p.product_name, p.location_id, pl.location_name
        ORDER BY tbd.product_id
    ");
    $sumStmt->execute();
    $sumResults = $sumStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<table border='1' style='border-collapse: collapse;'>";
    echo "<tr><th>Product ID</th><th>Product Name</th><th>Total Quantity</th><th>Product Location ID</th><th>Product Location</th></tr>";
    foreach ($sumResults as $row) {
        echo "<tr>";
        echo "<td>{$row['product_id']}</td>";
        echo "<td>{$row['product_name']}</td>";
        echo "<td>{$row['total_quantity']}</td>";
        echo "<td>{$row['product_location_id']}</td>";
        echo "<td>{$row['product_location_name']}</td>";
        echo "</tr>";
    }
    echo "</table>";
    
    // Test the correct query approach
    echo "<h2>🔍 Test Correct Query Approach</h2>";
    $correctStmt = $conn->prepare("
        SELECT 
            tbd.product_id,
            p.product_name,
            p.barcode,
            c.category_name,
            b.brand,
            SUM(tbd.quantity) as available_quantity,
            COALESCE(tbd.srp, 0) as srp,
            tbd.location_id as transfer_location_id,
            l.location_name as transfer_location_name
        FROM tbl_transfer_batch_details tbd
        LEFT JOIN tbl_product p ON tbd.product_id = p.product_id
        LEFT JOIN tbl_category c ON p.category_id = c.category_id
        LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
        LEFT JOIN tbl_location l ON tbd.location_id = l.location_id
        WHERE tbd.location_id = 4
        GROUP BY tbd.product_id, p.product_name, p.barcode, c.category_name, b.brand, tbd.srp, tbd.location_id, l.location_name
        HAVING available_quantity > 0
        ORDER BY p.product_name
    ");
    $correctStmt->execute();
    $correctResults = $correctStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<p>Products with quantities > 0 in Convenience Store:</p>";
    if (empty($correctResults)) {
        echo "<p style='color: red;'>❌ No products found</p>";
    } else {
        echo "<table border='1' style='border-collapse: collapse;'>";
        echo "<tr><th>Product ID</th><th>Product Name</th><th>Barcode</th><th>Category</th><th>Brand</th><th>Available Qty</th><th>SRP</th></tr>";
        foreach ($correctResults as $row) {
            echo "<tr>";
            echo "<td>{$row['product_id']}</td>";
            echo "<td>{$row['product_name']}</td>";
            echo "<td>{$row['barcode']}</td>";
            echo "<td>{$row['category_name']}</td>";
            echo "<td>{$row['brand']}</td>";
            echo "<td>{$row['available_quantity']}</td>";
            echo "<td>₱{$row['srp']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }

} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Error: " . $e->getMessage() . "</p>";
    echo "<p>Stack trace:</p><pre>" . $e->getTraceAsString() . "</pre>";
}
?>

