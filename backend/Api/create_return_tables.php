<?php
/**
 * Script to create tbl_return_header and tbl_return_dtl tables
 * Run this script once to set up the return tables in your database
 * 
 * Access via: http://localhost/caps2w2/backend/Api/create_return_tables.php
 * Or run from command line: php create_return_tables.php
 */

header('Content-Type: text/plain; charset=utf-8');

require_once __DIR__ . '/conn.php';

try {
    $conn = getDatabaseConnection();
    
    echo "Creating return tables...\n\n";
    
    // Create tbl_return_header
    $createHeaderTable = "
    CREATE TABLE IF NOT EXISTS `tbl_return_header` (
      `return_header_id` int(11) NOT NULL AUTO_INCREMENT,
      `return_number` varchar(50) NOT NULL COMMENT 'Generated return reference (e.g., RET-20251102-0001)',
      `purchase_header_id` int(11) NOT NULL COMMENT 'Reference to original purchase order',
      `po_number` varchar(50) DEFAULT NULL COMMENT 'Purchase order number for reference',
      `return_date` datetime NOT NULL DEFAULT current_timestamp() COMMENT 'Date and time of return',
      `return_reason` text DEFAULT NULL COMMENT 'Reason for return',
      `returned_by` int(11) DEFAULT NULL COMMENT 'Employee ID who processed the return',
      `returned_by_name` varchar(100) DEFAULT NULL COMMENT 'Name of employee who processed return',
      `status` enum('pending','approved','rejected','completed','cancelled') NOT NULL DEFAULT 'pending',
      `created_at` datetime NOT NULL DEFAULT current_timestamp(),
      `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp(),
      PRIMARY KEY (`return_header_id`),
      UNIQUE KEY `unique_return_number` (`return_number`),
      KEY `fk_return_header_po` (`purchase_header_id`),
      KEY `fk_return_header_employee` (`returned_by`),
      KEY `idx_return_date` (`return_date`),
      KEY `idx_po_number` (`po_number`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ";
    
    try {
        $conn->exec($createHeaderTable);
        echo "✓ tbl_return_header created successfully\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'already exists') !== false || strpos($e->getMessage(), 'Duplicate') !== false) {
            echo "⚠ tbl_return_header already exists, skipping...\n";
        } else {
            throw $e;
        }
    }
    
    // Create tbl_return_dtl
    $createDtlTable = "
    CREATE TABLE IF NOT EXISTS `tbl_return_dtl` (
      `return_dtl_id` int(11) NOT NULL AUTO_INCREMENT,
      `return_header_id` int(11) NOT NULL COMMENT 'Reference to tbl_return_header.return_header_id',
      `purchase_dtl_id` int(11) DEFAULT NULL COMMENT 'Reference to original purchase order detail',
      `product_id` int(11) DEFAULT NULL COMMENT 'Product ID if available',
      `product_name` varchar(255) NOT NULL COMMENT 'Product name',
      `return_qty` int(11) NOT NULL DEFAULT 0 COMMENT 'Quantity returned',
      `received_qty` int(11) NOT NULL DEFAULT 0 COMMENT 'Original received quantity',
      `unit_type` varchar(50) DEFAULT 'pieces' COMMENT 'Unit type (pieces, bulk, etc.)',
      `created_at` datetime NOT NULL DEFAULT current_timestamp(),
      PRIMARY KEY (`return_dtl_id`),
      KEY `fk_return_dtl_header` (`return_header_id`),
      KEY `fk_return_dtl_purchase_dtl` (`purchase_dtl_id`),
      KEY `fk_return_dtl_product` (`product_id`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    ";
    
    try {
        $conn->exec($createDtlTable);
        echo "✓ tbl_return_dtl created successfully\n";
    } catch (PDOException $e) {
        if (strpos($e->getMessage(), 'already exists') !== false || strpos($e->getMessage(), 'Duplicate') !== false) {
            echo "⚠ tbl_return_dtl already exists, skipping...\n";
        } else {
            throw $e;
        }
    }
    
    echo "\n✅ Return tables setup completed!\n";
    echo "You can now use the Return functionality in Purchase Orders.\n";
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
    exit(1);
}

$conn = null;
?>

