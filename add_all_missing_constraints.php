<?php
$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "=== ADDING ALL MISSING FOREIGN KEY CONSTRAINTS ===\n";
    
    // All missing constraints
    $constraints = [
        // tbl_product constraints
        "ALTER TABLE `tbl_product` ADD CONSTRAINT `fk_product_brand` FOREIGN KEY (`brand_id`) REFERENCES `tbl_brand` (`brand_id`) ON DELETE SET NULL ON UPDATE CASCADE",
        "ALTER TABLE `tbl_product` ADD CONSTRAINT `fk_product_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `tbl_supplier` (`supplier_id`) ON DELETE SET NULL ON UPDATE CASCADE",
        "ALTER TABLE `tbl_product` ADD CONSTRAINT `fk_product_location` FOREIGN KEY (`location_id`) REFERENCES `tbl_location` (`location_id`) ON DELETE SET NULL ON UPDATE CASCADE",
        "ALTER TABLE `tbl_product` ADD CONSTRAINT `fk_product_batch` FOREIGN KEY (`batch_id`) REFERENCES `tbl_batch` (`batch_id`) ON DELETE SET NULL ON UPDATE CASCADE",
        
        // tbl_fifo_stock constraints
        "ALTER TABLE `tbl_fifo_stock` ADD CONSTRAINT `fk_fifo_product` FOREIGN KEY (`product_id`) REFERENCES `tbl_product` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        "ALTER TABLE `tbl_fifo_stock` ADD CONSTRAINT `fk_fifo_batch` FOREIGN KEY (`batch_id`) REFERENCES `tbl_batch` (`batch_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        
        // tbl_batch_adjustment_log constraints
        "ALTER TABLE `tbl_batch_adjustment_log` ADD CONSTRAINT `fk_adjustment_product` FOREIGN KEY (`product_id`) REFERENCES `tbl_product` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        "ALTER TABLE `tbl_batch_adjustment_log` ADD CONSTRAINT `fk_adjustment_batch` FOREIGN KEY (`batch_id`) REFERENCES `tbl_batch` (`batch_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        
        // tbl_batch_transfer_details constraints
        "ALTER TABLE `tbl_batch_transfer_details` ADD CONSTRAINT `fk_batch_transfer_product` FOREIGN KEY (`product_id`) REFERENCES `tbl_product` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        "ALTER TABLE `tbl_batch_transfer_details` ADD CONSTRAINT `fk_batch_transfer_batch` FOREIGN KEY (`batch_id`) REFERENCES `tbl_batch` (`batch_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        
        // tbl_stock_movements constraints
        "ALTER TABLE `tbl_stock_movements` ADD CONSTRAINT `fk_movement_product` FOREIGN KEY (`product_id`) REFERENCES `tbl_product` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        "ALTER TABLE `tbl_stock_movements` ADD CONSTRAINT `fk_movement_batch` FOREIGN KEY (`batch_id`) REFERENCES `tbl_batch` (`batch_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        
        // tbl_stock_summary constraints
        "ALTER TABLE `tbl_stock_summary` ADD CONSTRAINT `fk_summary_product` FOREIGN KEY (`product_id`) REFERENCES `tbl_product` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        "ALTER TABLE `tbl_stock_summary` ADD CONSTRAINT `fk_summary_batch` FOREIGN KEY (`batch_id`) REFERENCES `tbl_batch` (`batch_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        
        // tbl_transfer_dtl constraints
        "ALTER TABLE `tbl_transfer_dtl` ADD CONSTRAINT `fk_transfer_dtl_header` FOREIGN KEY (`transfer_header_id`) REFERENCES `tbl_transfer_header` (`transfer_header_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        "ALTER TABLE `tbl_transfer_dtl` ADD CONSTRAINT `fk_transfer_dtl_product` FOREIGN KEY (`product_id`) REFERENCES `tbl_product` (`product_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        
        // tbl_transfer_header constraints
        "ALTER TABLE `tbl_transfer_header` ADD CONSTRAINT `fk_transfer_source_location` FOREIGN KEY (`source_location_id`) REFERENCES `tbl_location` (`location_id`) ON DELETE RESTRICT ON UPDATE CASCADE",
        "ALTER TABLE `tbl_transfer_header` ADD CONSTRAINT `fk_transfer_destination_location` FOREIGN KEY (`destination_location_id`) REFERENCES `tbl_location` (`location_id`) ON DELETE RESTRICT ON UPDATE CASCADE",
        "ALTER TABLE `tbl_transfer_header` ADD CONSTRAINT `fk_transfer_employee` FOREIGN KEY (`employee_id`) REFERENCES `tbl_employee` (`emp_id`) ON DELETE RESTRICT ON UPDATE CASCADE",
        
        // tbl_transfer_log constraints
        "ALTER TABLE `tbl_transfer_log` ADD CONSTRAINT `fk_transfer_log_product` FOREIGN KEY (`product_id`) REFERENCES `tbl_product` (`product_id`) ON DELETE SET NULL ON UPDATE CASCADE",
        
        // tbl_pos_sales_details constraints
        "ALTER TABLE `tbl_pos_sales_details` ADD CONSTRAINT `fk_sales_details_header` FOREIGN KEY (`sales_header_id`) REFERENCES `tbl_pos_sales_header` (`sales_header_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        "ALTER TABLE `tbl_pos_sales_details` ADD CONSTRAINT `fk_sales_details_product` FOREIGN KEY (`product_id`) REFERENCES `tbl_product` (`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE",
        
        // tbl_pos_sales_header constraints
        "ALTER TABLE `tbl_pos_sales_header` ADD CONSTRAINT `fk_sales_header_transaction` FOREIGN KEY (`transaction_id`) REFERENCES `tbl_pos_transaction` (`transaction_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        "ALTER TABLE `tbl_pos_sales_header` ADD CONSTRAINT `fk_sales_header_terminal` FOREIGN KEY (`terminal_id`) REFERENCES `tbl_pos_terminal` (`terminal_id`) ON DELETE RESTRICT ON UPDATE CASCADE",
        
        // tbl_pos_transaction constraints
        "ALTER TABLE `tbl_pos_transaction` ADD CONSTRAINT `fk_transaction_employee` FOREIGN KEY (`emp_id`) REFERENCES `tbl_employee` (`emp_id`) ON DELETE RESTRICT ON UPDATE CASCADE",
        
        // tbl_pos_terminal constraints
        "ALTER TABLE `tbl_pos_terminal` ADD CONSTRAINT `fk_terminal_shift` FOREIGN KEY (`shift_id`) REFERENCES `tbl_shift` (`shift_id`) ON DELETE RESTRICT ON UPDATE CASCADE",
        
        // tbl_pos_return_items constraints
        "ALTER TABLE `tbl_pos_return_items` ADD CONSTRAINT `fk_return_items_return` FOREIGN KEY (`return_id`) REFERENCES `tbl_pos_returns` (`return_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        "ALTER TABLE `tbl_pos_return_items` ADD CONSTRAINT `fk_return_items_product` FOREIGN KEY (`product_id`) REFERENCES `tbl_product` (`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE",
        
        // tbl_pos_returns constraints
        "ALTER TABLE `tbl_pos_returns` ADD CONSTRAINT `fk_returns_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_employee` (`emp_id`) ON DELETE SET NULL ON UPDATE CASCADE",
        
        // tbl_purchase_order_header constraints
        "ALTER TABLE `tbl_purchase_order_header` ADD CONSTRAINT `fk_po_header_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `tbl_supplier` (`supplier_id`) ON DELETE RESTRICT ON UPDATE CASCADE",
        "ALTER TABLE `tbl_purchase_order_header` ADD CONSTRAINT `fk_po_header_employee` FOREIGN KEY (`created_by`) REFERENCES `tbl_employee` (`emp_id`) ON DELETE SET NULL ON UPDATE CASCADE",
        
        // tbl_purchase_order_dtl constraints
        "ALTER TABLE `tbl_purchase_order_dtl` ADD CONSTRAINT `fk_po_dtl_header` FOREIGN KEY (`purchase_header_id`) REFERENCES `tbl_purchase_order_header` (`purchase_header_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        
        // tbl_purchase_order_approval constraints
        "ALTER TABLE `tbl_purchase_order_approval` ADD CONSTRAINT `fk_po_approval_header` FOREIGN KEY (`purchase_header_id`) REFERENCES `tbl_purchase_order_header` (`purchase_header_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        "ALTER TABLE `tbl_purchase_order_approval` ADD CONSTRAINT `fk_po_approval_employee` FOREIGN KEY (`approved_by`) REFERENCES `tbl_employee` (`emp_id`) ON DELETE RESTRICT ON UPDATE CASCADE",
        
        // tbl_purchase_order_delivery constraints
        "ALTER TABLE `tbl_purchase_order_delivery` ADD CONSTRAINT `fk_po_delivery_header` FOREIGN KEY (`purchase_header_id`) REFERENCES `tbl_purchase_order_header` (`purchase_header_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        
        // tbl_purchase_receiving_header constraints
        "ALTER TABLE `tbl_purchase_receiving_header` ADD CONSTRAINT `fk_receiving_header_po` FOREIGN KEY (`purchase_header_id`) REFERENCES `tbl_purchase_order_header` (`purchase_header_id`) ON DELETE RESTRICT ON UPDATE CASCADE",
        
        // tbl_purchase_receiving_dtl constraints
        "ALTER TABLE `tbl_purchase_receiving_dtl` ADD CONSTRAINT `fk_receiving_dtl_header` FOREIGN KEY (`receiving_id`) REFERENCES `tbl_purchase_receiving_header` (`receiving_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        
        // tbl_purchase_return_header constraints
        "ALTER TABLE `tbl_purchase_return_header` ADD CONSTRAINT `fk_return_header_supplier` FOREIGN KEY (`supplier_id`) REFERENCES `tbl_supplier` (`supplier_id`) ON DELETE RESTRICT ON UPDATE CASCADE",
        
        // tbl_purchase_return_dtl constraints
        "ALTER TABLE `tbl_purchase_return_dtl` ADD CONSTRAINT `fk_return_dtl_header` FOREIGN KEY (`return_header_id`) REFERENCES `tbl_purchase_return_header` (`return_header_id`) ON DELETE CASCADE ON UPDATE CASCADE",
        "ALTER TABLE `tbl_purchase_return_dtl` ADD CONSTRAINT `fk_return_dtl_product` FOREIGN KEY (`product_id`) REFERENCES `tbl_product` (`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE",
        
        // tbl_activity_log constraints
        "ALTER TABLE `tbl_activity_log` ADD CONSTRAINT `fk_activity_user` FOREIGN KEY (`user_id`) REFERENCES `tbl_employee` (`emp_id`) ON DELETE SET NULL ON UPDATE CASCADE"
    ];
    
    $success_count = 0;
    $error_count = 0;
    $errors = [];
    
    foreach ($constraints as $i => $sql) {
        try {
            echo "Adding constraint " . ($i + 1) . "/" . count($constraints) . "... ";
            $pdo->exec($sql);
            echo "✅ SUCCESS\n";
            $success_count++;
        } catch (Exception $e) {
            echo "❌ FAILED: " . $e->getMessage() . "\n";
            $error_count++;
            $errors[] = "Constraint " . ($i + 1) . ": " . $e->getMessage();
        }
    }
    
    echo "\n=== FINAL RESULTS ===\n";
    echo "✅ Successfully added: $success_count constraints\n";
    echo "❌ Failed: $error_count constraints\n";
    
    if ($error_count > 0) {
        echo "\n=== ERRORS DETAILS ===\n";
        foreach ($errors as $error) {
            echo "• $error\n";
        }
    }
    
    // Verify final count
    echo "\n=== VERIFICATION ===\n";
    $stmt = $pdo->query("
        SELECT COUNT(*) as total_constraints
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE REFERENCED_TABLE_SCHEMA = 'enguio2' 
        AND REFERENCED_TABLE_NAME IS NOT NULL
    ");
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    echo "Total foreign key constraints in database: " . $result['total_constraints'] . "\n";
    
    if ($success_count > 0) {
        echo "\n🎉 FOREIGN KEY CONSTRAINTS SUCCESSFULLY ADDED!\n";
        echo "Your database now has proper referential integrity.\n";
        echo "Perfect for your academic paper!\n";
    }
    
} catch (Exception $e) {
    echo "❌ Database connection error: " . $e->getMessage() . "\n";
}
?>
