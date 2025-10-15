<?php
// Migration Script: Add item_status column to tbl_purchase_order_dtl
// Run this once to enable product-level status tracking

require_once 'conn.php';

try {
    echo "Starting migration: Adding item_status column...\n";
    
    // Check if column already exists
    $checkColumn = $conn->query("SHOW COLUMNS FROM tbl_purchase_order_dtl LIKE 'item_status'");
    if ($checkColumn->rowCount() > 0) {
        echo "✅ item_status column already exists. Skipping migration.\n";
        exit;
    }
    
    // Add item_status column
    echo "Adding item_status column...\n";
    $conn->exec("ALTER TABLE `tbl_purchase_order_dtl` 
                 ADD COLUMN `item_status` VARCHAR(20) DEFAULT 'pending' AFTER `missing_qty`");
    echo "✅ Column added successfully.\n";
    
    // Update existing records based on received_qty vs quantity
    echo "Updating existing records...\n";
    $updateQuery = "UPDATE `tbl_purchase_order_dtl` 
                    SET `item_status` = CASE 
                        WHEN `received_qty` = 0 THEN 'pending'
                        WHEN `received_qty` >= `quantity` AND `received_qty` > 0 THEN 'complete'
                        WHEN `received_qty` > 0 AND `received_qty` < `quantity` THEN 'partial'
                        ELSE 'pending'
                    END";
    
    $result = $conn->exec($updateQuery);
    echo "✅ Updated $result records.\n";
    
    // Show summary
    echo "\n📊 Status Distribution:\n";
    $summaryQuery = "SELECT 
                        item_status,
                        COUNT(*) as count,
                        CONCAT(ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM tbl_purchase_order_dtl), 2), '%') as percentage
                     FROM `tbl_purchase_order_dtl`
                     GROUP BY item_status";
    
    $stmt = $conn->query($summaryQuery);
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        echo "  - {$row['item_status']}: {$row['count']} records ({$row['percentage']})\n";
    }
    
    echo "\n✅ Migration completed successfully!\n";
    echo "Product-level status tracking is now enabled.\n";
    
} catch (Exception $e) {
    echo "❌ Migration failed: " . $e->getMessage() . "\n";
    exit(1);
}

$conn = null;
?>
