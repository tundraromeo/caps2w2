<?php
/**
 * Debug POS API - Test the convenience store API directly
 */

// Load environment variables
require_once __DIR__ . '/simple_dotenv.php';
$dotenv = new SimpleDotEnv(__DIR__);
$dotenv->load();

// Database connection
require_once __DIR__ . '/Api/conn.php';

echo "<h1>🔍 Debug POS API</h1>";

try {
    $conn = getDatabaseConnection();
    echo "<p>✅ Database connection successful</p>";
    
    // Test 1: Check locations
    echo "<h2>📍 Test 1: Available Locations</h2>";
    $locationStmt = $conn->prepare("SELECT location_id, location_name FROM tbl_location ORDER BY location_name");
    $locationStmt->execute();
    $locations = $locationStmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($locations)) {
        echo "<p style='color: red;'>❌ No locations found in database</p>";
    } else {
        echo "<table border='1' style='border-collapse: collapse;'>";
        echo "<tr><th>ID</th><th>Location Name</th></tr>";
        foreach ($locations as $loc) {
            echo "<tr><td>{$loc['location_id']}</td><td>{$loc['location_name']}</td></tr>";
        }
        echo "</table>";
    }
    
    // Test 2: Check products
    echo "<h2>📦 Test 2: Sample Products</h2>";
    $productStmt = $conn->prepare("
        SELECT p.product_id, p.product_name, p.barcode, l.location_name 
        FROM tbl_product p 
        LEFT JOIN tbl_location l ON p.location_id = l.location_id 
        LIMIT 10
    ");
    $productStmt->execute();
    $products = $productStmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($products)) {
        echo "<p style='color: red;'>❌ No products found in database</p>";
    } else {
        echo "<table border='1' style='border-collapse: collapse;'>";
        echo "<tr><th>ID</th><th>Product Name</th><th>Barcode</th><th>Location</th></tr>";
        foreach ($products as $prod) {
            echo "<tr><td>{$prod['product_id']}</td><td>{$prod['product_name']}</td><td>{$prod['barcode']}</td><td>{$prod['location_name']}</td></tr>";
        }
        echo "</table>";
    }
    
    // Test 3: Check transfer batch details
    echo "<h2>🔄 Test 3: Transfer Batch Details</h2>";
    $batchStmt = $conn->prepare("
        SELECT tbd.product_id, p.product_name, tbd.quantity, l.location_name 
        FROM tbl_transfer_batch_details tbd 
        LEFT JOIN tbl_product p ON tbd.product_id = p.product_id 
        LEFT JOIN tbl_location l ON tbd.location_id = l.location_id 
        LIMIT 10
    ");
    $batchStmt->execute();
    $batches = $batchStmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($batches)) {
        echo "<p style='color: red;'>❌ No transfer batch details found</p>";
    } else {
        echo "<table border='1' style='border-collapse: collapse;'>";
        echo "<tr><th>Product ID</th><th>Product Name</th><th>Quantity</th><th>Location</th></tr>";
        foreach ($batches as $batch) {
            echo "<tr><td>{$batch['product_id']}</td><td>{$batch['product_name']}</td><td>{$batch['quantity']}</td><td>{$batch['location_name']}</td></tr>";
        }
        echo "</table>";
    }
    
    // Test 4: Test the actual API query
    echo "<h2>🔍 Test 4: Test API Query for 'Convenience Store'</h2>";
    $location_name = 'Convenience Store';
    
    // Get location ID
    $locationStmt = $conn->prepare("SELECT location_id FROM tbl_location WHERE location_name LIKE ? LIMIT 1");
    $locationStmt->execute(["%$location_name%"]);
    $locationResult = $locationStmt->fetch(PDO::FETCH_ASSOC);
    $target_location_id = $locationResult ? $locationResult['location_id'] : null;
    
    echo "<p>Looking for location: '$location_name'</p>";
    echo "<p>Found location ID: " . ($target_location_id ?? 'NOT FOUND') . "</p>";
    
    if ($target_location_id) {
        // Test the actual query
        $params = ["%$location_name%", $target_location_id, $target_location_id];
        $stmt = $conn->prepare("
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
            HAVING srp > 0
            ORDER BY COALESCE(tbd.expiration_date, ss.expiration_date, p.expiration) ASC, p.product_name ASC
            LIMIT 10
        ");
        
        $stmt->execute($params);
        $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "<p>Query returned " . count($rows) . " products:</p>";
        if (empty($rows)) {
            echo "<p style='color: red;'>❌ No products returned from API query</p>";
        } else {
            echo "<table border='1' style='border-collapse: collapse;'>";
            echo "<tr><th>ID</th><th>Name</th><th>Barcode</th><th>Category</th><th>Price</th><th>Quantity</th><th>Location</th></tr>";
            foreach ($rows as $row) {
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
    }
    
    // Test 5: Search functionality
    echo "<h2>🔍 Test 5: Search Functionality</h2>";
    $search_term = 'Mang Tomas';
    echo "<p>Testing search for: '$search_term'</p>";
    
    if ($target_location_id) {
        $searchParams = ["%$location_name%", "%$search_term%", "%$search_term%", "%$search_term%", $target_location_id, $target_location_id];
        $searchStmt = $conn->prepare("
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
            WHERE l.location_name LIKE ? AND (p.product_name LIKE ? OR p.barcode LIKE ? OR c.category_name LIKE ?)
            GROUP BY p.product_id, p.product_name, p.barcode, c.category_name, b.brand, p.status, s.supplier_name, p.expiration, l.location_name, tbd.srp, tbd.expiration_date
            HAVING srp > 0
            ORDER BY COALESCE(tbd.expiration_date, ss.expiration_date, p.expiration) ASC, p.product_name ASC
            LIMIT 10
        ");
        
        $searchStmt->execute($searchParams);
        $searchRows = $searchStmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "<p>Search returned " . count($searchRows) . " products:</p>";
        if (empty($searchRows)) {
            echo "<p style='color: red;'>❌ No products found for search term '$search_term'</p>";
        } else {
            echo "<table border='1' style='border-collapse: collapse;'>";
            echo "<tr><th>ID</th><th>Name</th><th>Barcode</th><th>Category</th><th>Price</th><th>Quantity</th></tr>";
            foreach ($searchRows as $row) {
                echo "<tr>";
                echo "<td>{$row['product_id']}</td>";
                echo "<td>{$row['product_name']}</td>";
                echo "<td>{$row['barcode']}</td>";
                echo "<td>{$row['category_name']}</td>";
                echo "<td>₱{$row['srp']}</td>";
                echo "<td>{$row['available_quantity']}</td>";
                echo "</tr>";
            }
            echo "</table>";
        }
    }

} catch (Exception $e) {
    echo "<p style='color: red;'>❌ Error: " . $e->getMessage() . "</p>";
    echo "<p>Stack trace:</p><pre>" . $e->getTraceAsString() . "</pre>";
}
?>

