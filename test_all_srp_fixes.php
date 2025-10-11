<?php
/**
 * Test all SRP fixes in the database queries
 */

require_once 'Api/conn.php';

header('Content-Type: application/json');

echo "🧪 TESTING ALL SRP FIXES\n";
echo "========================\n\n";

try {
    $conn = getDatabaseConnection();
    
    // Test 1: get_products_by_location_name (Convenience Store)
    echo "📝 Test 1: get_products_by_location_name (Convenience Store)\n";
    echo "-----------------------------------------------------------\n";
    
    $stmt = $conn->prepare("
        SELECT 
            p.product_id,
            p.product_name,
            p.barcode,
            c.category_name,
            p.description,
            p.prescription,
            p.bulk,
            p.expiration,
            COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id), 0) as quantity,
            COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0) as srp,
            p.brand_id,
            p.supplier_id,
            p.location_id,
            p.batch_id,
            p.status,
            p.stock_status,
            p.date_added,
            s.supplier_name,
            b.brand,
            l.location_name,
            batch.batch as batch_reference,
            batch.entry_date,
            batch.entry_by
        FROM tbl_product p 
        LEFT JOIN tbl_category c ON p.category_id = c.category_id
        LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id 
        LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id 
        LEFT JOIN tbl_location l ON p.location_id = l.location_id
        LEFT JOIN tbl_batch batch ON p.batch_id = batch.batch_id
        WHERE (p.status IS NULL OR p.status <> 'archived')
        AND l.location_name = ?
        GROUP BY p.product_id, p.product_name, p.barcode, c.category_name, p.description, p.prescription, p.bulk, p.expiration, p.brand_id, p.supplier_id, p.location_id, p.batch_id, p.status, p.stock_status, p.date_added, s.supplier_name, b.brand, l.location_name, batch.batch, batch.entry_date, batch.entry_by
        ORDER BY p.product_name ASC
        LIMIT 3
    ");
    
    $stmt->execute(['Convenience Store']);
    $convenienceProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "✅ Convenience Store Products Query: SUCCESS\n";
    echo "📊 Products found: " . count($convenienceProducts) . "\n";
    if (count($convenienceProducts) > 0) {
        echo "📋 Sample products:\n";
        foreach ($convenienceProducts as $product) {
            echo "   - " . $product['product_name'] . " (Qty: " . $product['quantity'] . ", SRP: ₱" . $product['srp'] . ")\n";
        }
    }
    echo "\n";
    
    // Test 2: get_products_by_location_name (Pharmacy Store)
    echo "📝 Test 2: get_products_by_location_name (Pharmacy Store)\n";
    echo "--------------------------------------------------------\n";
    
    $stmt->execute(['Pharmacy Store']);
    $pharmacyProducts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "✅ Pharmacy Store Products Query: SUCCESS\n";
    echo "📊 Products found: " . count($pharmacyProducts) . "\n";
    if (count($pharmacyProducts) > 0) {
        echo "📋 Sample products:\n";
        foreach ($pharmacyProducts as $product) {
            echo "   - " . $product['product_name'] . " (Qty: " . $product['quantity'] . ", SRP: ₱" . $product['srp'] . ")\n";
        }
    }
    echo "\n";
    
    // Test 3: get_transfers_with_details
    echo "📝 Test 3: get_transfers_with_details\n";
    echo "-------------------------------------\n";
    
    $stmt = $conn->prepare("
        SELECT 
            th.transfer_header_id,
            th.date,
            th.status,
            sl.location_name as source_location_name,
            dl.location_name as destination_location_name,
            e.Fname as employee_name,
            COUNT(td.product_id) as total_products,
            SUM(td.qty * COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0)) as total_value
        FROM tbl_transfer_header th
        LEFT JOIN tbl_location sl ON th.source_location_id = sl.location_id
        LEFT JOIN tbl_location dl ON th.destination_location_id = dl.location_id
        LEFT JOIN tbl_employee e ON th.employee_id = e.emp_id
        LEFT JOIN tbl_transfer_dtl td ON th.transfer_header_id = td.transfer_header_id
        LEFT JOIN tbl_product p ON td.product_id = p.product_id
        GROUP BY th.transfer_header_id
        ORDER BY th.transfer_header_id DESC
        LIMIT 3
    ");
    
    $stmt->execute();
    $transfers = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "✅ Transfers Query: SUCCESS\n";
    echo "📊 Transfers found: " . count($transfers) . "\n";
    if (count($transfers) > 0) {
        echo "📋 Sample transfers:\n";
        foreach ($transfers as $transfer) {
            echo "   - Transfer #" . $transfer['transfer_header_id'] . " (" . $transfer['total_products'] . " products, ₱" . $transfer['total_value'] . ")\n";
        }
    }
    echo "\n";
    
    // Test 4: get_warehouse_kpis
    echo "📝 Test 4: get_warehouse_kpis\n";
    echo "-----------------------------\n";
    
    $stmt = $conn->prepare("
        SELECT 
            COUNT(DISTINCT p.product_id) as totalProducts,
            COUNT(DISTINCT s.supplier_id) as totalSuppliers,
            ROUND(COUNT(DISTINCT p.product_id) * 100.0 / 1000, 1) as storageCapacity,
            COALESCE((SELECT SUM(fs.available_quantity * fs.srp) FROM tbl_fifo_stock fs), 0) as warehouseValue,
            COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs), 0) as totalQuantity,
            COALESCE((SELECT COUNT(DISTINCT fs.product_id) FROM tbl_fifo_stock fs WHERE fs.available_quantity <= 10 AND fs.available_quantity > 0), 0) as lowStockItems,
            COUNT(CASE WHEN p.expiration IS NOT NULL AND p.expiration <= DATE_ADD(CURDATE(), INTERVAL 30 DAY) THEN 1 END) as expiringSoon,
            COUNT(DISTINCT b.batch_id) as totalBatches
        FROM tbl_product p
        LEFT JOIN tbl_category c ON p.category_id = c.category_id
        LEFT JOIN tbl_location l ON p.location_id = l.location_id
        LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
        LEFT JOIN tbl_batch b ON p.batch_id = b.batch_id
        WHERE (p.status IS NULL OR p.status <> 'archived')
    ");
    
    $stmt->execute();
    $warehouseKPIs = $stmt->fetch(PDO::FETCH_ASSOC);
    
    echo "✅ Warehouse KPIs Query: SUCCESS\n";
    echo "📊 Warehouse KPIs:\n";
    foreach ($warehouseKPIs as $key => $value) {
        echo "   - $key: $value\n";
    }
    echo "\n";
    
    echo "🎉 ALL SRP FIXES TESTED SUCCESSFULLY!\n";
    echo "✅ No more 'p.srp' column errors!\n";
    echo "✅ All queries now use FIFO stock for SRP pricing!\n";
    echo "🔄 Your dashboard should now work without errors!\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    echo "🔧 Please check the database connection and try again\n";
}
?>
