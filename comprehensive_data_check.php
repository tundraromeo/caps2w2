<?php
$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== COMPREHENSIVE DATA INTEGRITY CHECK ===\n";
    
    // Check all potential foreign key relationships
    $checks = [
        // tbl_batch
        ['table' => 'tbl_batch', 'column' => 'supplier_id', 'ref_table' => 'tbl_supplier', 'ref_column' => 'supplier_id'],
        ['table' => 'tbl_batch', 'column' => 'location_id', 'ref_table' => 'tbl_location', 'ref_column' => 'location_id'],
        
        // tbl_employee
        ['table' => 'tbl_employee', 'column' => 'role_id', 'ref_table' => 'tbl_role', 'ref_column' => 'role_id'],
        ['table' => 'tbl_employee', 'column' => 'shift_id', 'ref_table' => 'tbl_shift', 'ref_column' => 'shift_id'],
        
        // tbl_product
        ['table' => 'tbl_product', 'column' => 'brand_id', 'ref_table' => 'tbl_brand', 'ref_column' => 'brand_id'],
        ['table' => 'tbl_product', 'column' => 'supplier_id', 'ref_table' => 'tbl_supplier', 'ref_column' => 'supplier_id'],
        ['table' => 'tbl_product', 'column' => 'location_id', 'ref_table' => 'tbl_location', 'ref_column' => 'location_id'],
        ['table' => 'tbl_product', 'column' => 'batch_id', 'ref_table' => 'tbl_batch', 'ref_column' => 'batch_id'],
        
        // tbl_fifo_stock
        ['table' => 'tbl_fifo_stock', 'column' => 'product_id', 'ref_table' => 'tbl_product', 'ref_column' => 'product_id'],
        ['table' => 'tbl_fifo_stock', 'column' => 'batch_id', 'ref_table' => 'tbl_batch', 'ref_column' => 'batch_id'],
        
        // tbl_batch_adjustment_log
        ['table' => 'tbl_batch_adjustment_log', 'column' => 'product_id', 'ref_table' => 'tbl_product', 'ref_column' => 'product_id'],
        ['table' => 'tbl_batch_adjustment_log', 'column' => 'batch_id', 'ref_table' => 'tbl_batch', 'ref_column' => 'batch_id'],
        
        // tbl_transfer_dtl
        ['table' => 'tbl_transfer_dtl', 'column' => 'transfer_header_id', 'ref_table' => 'tbl_transfer_header', 'ref_column' => 'transfer_header_id'],
        ['table' => 'tbl_transfer_dtl', 'column' => 'product_id', 'ref_table' => 'tbl_product', 'ref_column' => 'product_id'],
        
        // tbl_transfer_header
        ['table' => 'tbl_transfer_header', 'column' => 'source_location_id', 'ref_table' => 'tbl_location', 'ref_column' => 'location_id'],
        ['table' => 'tbl_transfer_header', 'column' => 'destination_location_id', 'ref_table' => 'tbl_location', 'ref_column' => 'location_id'],
        ['table' => 'tbl_transfer_header', 'column' => 'employee_id', 'ref_table' => 'tbl_employee', 'ref_column' => 'emp_id'],
        
        // tbl_pos_sales_details
        ['table' => 'tbl_pos_sales_details', 'column' => 'sales_header_id', 'ref_table' => 'tbl_pos_sales_header', 'ref_column' => 'sales_header_id'],
        ['table' => 'tbl_pos_sales_details', 'column' => 'product_id', 'ref_table' => 'tbl_product', 'ref_column' => 'product_id'],
        
        // tbl_pos_sales_header
        ['table' => 'tbl_pos_sales_header', 'column' => 'transaction_id', 'ref_table' => 'tbl_pos_transaction', 'ref_column' => 'transaction_id'],
        ['table' => 'tbl_pos_sales_header', 'column' => 'terminal_id', 'ref_table' => 'tbl_pos_terminal', 'ref_column' => 'terminal_id'],
        
        // tbl_pos_transaction
        ['table' => 'tbl_pos_transaction', 'column' => 'emp_id', 'ref_table' => 'tbl_employee', 'ref_column' => 'emp_id'],
        
        // tbl_pos_terminal
        ['table' => 'tbl_pos_terminal', 'column' => 'shift_id', 'ref_table' => 'tbl_shift', 'ref_column' => 'shift_id'],
        
        // tbl_purchase_order_header
        ['table' => 'tbl_purchase_order_header', 'column' => 'supplier_id', 'ref_table' => 'tbl_supplier', 'ref_column' => 'supplier_id'],
        ['table' => 'tbl_purchase_order_header', 'column' => 'created_by', 'ref_table' => 'tbl_employee', 'ref_column' => 'emp_id'],
    ];
    
    $total_issues = 0;
    
    foreach ($checks as $check) {
        $sql = "SELECT COUNT(*) as count FROM {$check['table']} t 
                LEFT JOIN {$check['ref_table']} r ON t.{$check['column']} = r.{$check['ref_column']} 
                WHERE t.{$check['column']} IS NOT NULL AND r.{$check['ref_column']} IS NULL";
        
        $stmt = $pdo->query($sql);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($result['count'] > 0) {
            echo "❌ {$check['table']}.{$check['column']} → {$check['ref_table']}.{$check['ref_column']}: {$result['count']} orphaned records\n";
            $total_issues += $result['count'];
        } else {
            echo "✅ {$check['table']}.{$check['column']} → {$check['ref_table']}.{$check['ref_column']}: OK\n";
        }
    }
    
    echo "\n=== SUMMARY ===\n";
    echo "Total data integrity issues: $total_issues\n";
    
    if ($total_issues > 0) {
        echo "\n⚠️  You need to clean up data before adding foreign key constraints!\n";
        echo "Run cleanup scripts first.\n";
    } else {
        echo "\n✅ All data is clean! You can add foreign key constraints safely.\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>
