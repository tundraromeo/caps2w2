<?php
// Simple Migration Runner
// Run this to add item_status column to your database

echo "🚀 Purchase Order Migration Runner\n";
echo "=====================================\n\n";

// Check if we're running from command line or web
if (php_sapi_name() === 'cli') {
    echo "Running from command line...\n";
    $runMigration = true;
} else {
    echo "Running from web browser...\n";
    echo "Click 'Run Migration' to proceed:\n";
    echo "<form method='post'>";
    echo "<input type='submit' name='run' value='Run Migration' style='padding: 10px 20px; font-size: 16px; background: #007cba; color: white; border: none; border-radius: 5px; cursor: pointer;'>";
    echo "</form>";
    
    if (isset($_POST['run'])) {
        $runMigration = true;
    } else {
        $runMigration = false;
    }
}

if ($runMigration) {
    try {
        require_once 'conn.php';
        
        echo "✅ Database connection established.\n";
        
        // Check if column already exists
        $checkColumn = $conn->query("SHOW COLUMNS FROM tbl_purchase_order_dtl LIKE 'item_status'");
        if ($checkColumn->rowCount() > 0) {
            echo "✅ item_status column already exists. Migration not needed.\n";
        } else {
            echo "📝 Adding item_status column...\n";
            
            // Add item_status column
            $conn->exec("ALTER TABLE `tbl_purchase_order_dtl` 
                         ADD COLUMN `item_status` VARCHAR(20) DEFAULT 'pending' AFTER `missing_qty`");
            echo "✅ Column added successfully.\n";
            
            // Update existing records
            echo "📝 Updating existing records...\n";
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
                                COUNT(*) as count
                             FROM `tbl_purchase_order_dtl`
                             GROUP BY item_status";
            
            $stmt = $conn->query($summaryQuery);
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                echo "  - {$row['item_status']}: {$row['count']} records\n";
            }
        }
        
        echo "\n🎉 Migration completed successfully!\n";
        echo "Product-level status tracking is now enabled.\n";
        echo "\nYou can now:\n";
        echo "1. Refresh your Purchase Order page\n";
        echo "2. Test the product-level status tracking\n";
        echo "3. Products will move between tabs based on their individual status\n";
        
    } catch (Exception $e) {
        echo "❌ Migration failed: " . $e->getMessage() . "\n";
        echo "Please check your database connection and try again.\n";
    }
} else {
    echo "\nTo run this migration:\n";
    echo "1. Via Command Line: php add_item_status_column.php\n";
    echo "2. Via Web Browser: Click the button above\n";
}

echo "\n=====================================\n";
echo "Migration Runner Complete\n";
?>
