<?php
/**
 * Debug SQL Query - Test the exact query being used
 */

require_once __DIR__ . '/simple_dotenv.php';
$dotenv = new SimpleDotEnv(__DIR__);
$dotenv->load();

require_once __DIR__ . '/Api/conn.php';

echo "<h1>🔍 Debug SQL Query</h1>";

try {
    $conn = getDatabaseConnection();
    echo "<p>✅ Database connection successful</p>";
    
    // Test parameters
    $location_name = 'Convenience Store';
    $target_location_id = 4; // From previous debug
    
    // Get location ID first
    $locationStmt = $conn->prepare("SELECT location_id FROM tbl_location WHERE location_name LIKE ? LIMIT 1");
    $locationStmt->execute(["%$location_name%"]);
    $locationResult = $locationStmt->fetch(PDO::FETCH_ASSOC);
    $target_location_id = $locationResult ? $locationResult['location_id'] : null;
    
    echo "<p>Target location ID: $target_location_id</p>";
    
    if (!$target_location_id) {
        echo "<p style='color: red;'>❌ Location not found</p>";
        exit;
    }
    
    // Test the WHERE clause first
    $where = "l.location_name LIKE ?";
    $params = ["%$location_name%"];
    $params[] = $target_location_id; // For available_quantity subquery
    $params[] = $target_location_id; // For LEFT JOIN
    
    echo "<h2>🔍 Test 1: Check WHERE clause</h2>";
    $whereTest = $conn->prepare("
        SELECT p.product_id, p.product_name, l.location_name 
        FROM tbl_product p
        LEFT JOIN tbl_location l ON p.location_id = l.location_id
        WHERE $where
        LIMIT 5
    ");
    $whereTest->execute(["%$location_name%"]);
    $whereResults = $whereTest->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<p>Products matching WHERE clause:</p>";
    if (empty($whereResults)) {
        echo "<p style='color: red;'>❌ No products match WHERE clause</p>";
    } else {
        echo "<table border='1' style='border-collapse: collapse;'>";
        echo "<tr><th>Product ID</th><th>Product Name</th><th>Location Name</th></tr>";
        foreach ($whereResults as $row) {
            echo "<tr><td>{$row['product_id']}</td><td>{$row['product_name']}</td><td>{$row['location_name']}</td></tr>";
        }
        echo "</table>";
    }
    
    // Test the available_quantity calculation
    echo "<h2>🔍 Test 2: Check available_quantity calculation</h2>";
    $qtyTest = $conn->prepare("
        SELECT 
            p.product_id,
            p.product_name,
            COALESCE(
                (SELECT SUM(tbd2.quantity) 
                 FROM tbl_transfer_batch_details tbd2 
                 WHERE tbd2.product_id = p.product_id
                 AND tbd2.location_id = ?),
                0
            ) as available_quantity
        FROM tbl_product p
        LEFT JOIN tbl_location l ON p.location_id = l.location_id
        WHERE l.location_name LIKE ?
        LIMIT 5
    ");
    $qtyTest->execute([$target_location_id, "%$location_name%"]);
    $qtyResults = $qtyTest->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<p>Available quantities:</p>";
    if (empty($qtyResults)) {
        echo "<p style='color: red;'>❌ No quantity results</p>";
    } else {
        echo "<table border='1' style='border-collapse: collapse;'>";
        echo "<tr><th>Product ID</th><th>Product Name</th><th>Available Quantity</th></tr>";
        foreach ($qtyResults as $row) {
            echo "<tr><td>{$row['product_id']}</td><td>{$row['product_name']}</td><td>{$row['available_quantity']}</td></tr>";
        }
        echo "</table>";
    }
    
    // Test the full query without HAVING clause
    echo "<h2>🔍 Test 3: Full query without HAVING</h2>";
    $fullTest = $conn->prepare("
        SELECT 
            p.product_id,
            p.product_name,
            p.barcode,
            c.category_name,
            b.brand,
            COALESCE(ss.srp, tbd.srp, 0) as unit_price,
            COALESCE(ss.srp, tbd.srp, 0) as srp,
            COALESCE(
                (SELECT SUM(tbd2.quantity) 
                 FROM tbl_transfer_batch_details tbd2 
                 WHERE tbd2.product_id = p.product_id
                 AND tbd2.location_id = ?),
                0
            ) as available_quantity,
            l.location_name
        FROM tbl_product p
        LEFT JOIN tbl_category c ON p.category_id = c.category_id
        LEFT JOIN tbl_location l ON p.location_id = l.location_id
        LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
        LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
        LEFT JOIN tbl_stock_summary ss ON p.product_id = ss.product_id
        LEFT JOIN tbl_transfer_batch_details tbd ON p.product_id = tbd.product_id AND tbd.location_id = ?
        WHERE l.location_name LIKE ?
        GROUP BY p.product_id, p.product_name, p.barcode, c.category_name, b.brand, p.status, s.supplier_name, p.expiration, l.location_name, tbd.srp, tbd.expiration_date
        LIMIT 5
    ");
    $fullTest->execute([$target_location_id, $target_location_id, "%$location_name%"]);
    $fullResults = $fullTest->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<p>Full query results (without HAVING):</p>";
    if (empty($fullResults)) {
        echo "<p style='color: red;'>❌ No results from full query</p>";
    } else {
        echo "<table border='1' style='border-collapse: collapse;'>";
        echo "<tr><th>ID</th><th>Name</th><th>Barcode</th><th>Category</th><th>SRP</th><th>Available Qty</th><th>Location</th></tr>";
        foreach ($fullResults as $row) {
            echo "<tr>";
            echo "<td>{$row['product_id']}</td>";
            echo "<td>{$row['product_name']}</td>";
            echo "<td>{$row['barcode']}</td>";
            echo "<td>{$row['category_name']}</td>";
            echo "<td>₱{$row['srp']}</td>";
            echo "<td>{$row['available_quantity']}</td>";
            echo "<td>{$row['location_name']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }
    
    // Test the final query with HAVING clause
    echo "<h2>🔍 Test 4: Final query with HAVING</h2>";
    $finalTest = $conn->prepare("
        SELECT 
            p.product_id,
            p.product_name,
            p.barcode,
            c.category_name,
            b.brand,
            COALESCE(ss.srp, tbd.srp, 0) as unit_price,
            COALESCE(ss.srp, tbd.srp, 0) as srp,
            COALESCE(
                (SELECT SUM(tbd2.quantity) 
                 FROM tbl_transfer_batch_details tbd2 
                 WHERE tbd2.product_id = p.product_id
                 AND tbd2.location_id = ?),
                0
            ) as available_quantity,
            l.location_name
        FROM tbl_product p
        LEFT JOIN tbl_category c ON p.category_id = c.category_id
        LEFT JOIN tbl_location l ON p.location_id = l.location_id
        LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
        LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
        LEFT JOIN tbl_stock_summary ss ON p.product_id = ss.product_id
        LEFT JOIN tbl_transfer_batch_details tbd ON p.product_id = tbd.product_id AND tbd.location_id = ?
        WHERE l.location_name LIKE ?
        GROUP BY p.product_id, p.product_name, p.barcode, c.category_name, b.brand, p.status, s.supplier_name, p.expiration, l.location_name, tbd.srp, tbd.expiration_date
        HAVING available_quantity > 0
        LIMIT 5
    ");
    $finalTest->execute([$target_location_id, $target_location_id, "%$location_name%"]);
    $finalResults = $finalTest->fetchAll(PDO::FETCH_ASSOC);
    
    echo "<p>Final query results (with HAVING available_quantity > 0):</p>";
    if (empty($finalResults)) {
        echo "<p style='color: red;'>❌ No results from final query</p>";
    } else {
        echo "<table border='1' style='border-collapse: collapse;'>";
        echo "<tr><th>ID</th><th>Name</th><th>Barcode</th><th>Category</th><th>SRP</th><th>Available Qty</th><th>Location</th></tr>";
        foreach ($finalResults as $row) {
            echo "<tr>";
            echo "<td>{$row['product_id']}</td>";
            echo "<td>{$row['product_name']}</td>";
            echo "<td>{$row['barcode']}</td>";
            echo "<td>{$row['category_name']}</td>";
            echo "<td>₱{$row['srp']}</td>";
            echo "<td>{$row['available_quantity']}</td>";
            echo "<td>{$row['location_name']}</td>";
            echo "</tr>";
        }
        echo "</table>";
    }

} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Error: " . $e->getMessage() . "</p>";
    echo "<p>Stack trace:</p><pre>" . $e->getTraceAsString() . "</pre>";
}
?>

