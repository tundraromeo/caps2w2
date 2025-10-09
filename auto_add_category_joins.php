<?php
/**
 * Automatically add tbl_category JOINs to files missing them
 */

$filesToFix = [
    'Api/batch_stock_adjustment_api.php',
    'Api/batch_tracking.php',
    'Api/combined_reports_api.php',
    'Api/convenience_store_api.php',
    'Api/fifo_transfer_api.php',
    'Api/inventory_transfer_api.php',
    'Api/modules/barcode.php',
    'Api/modules/inventory.php',
    'Api/modules/reports.php',
    'Api/pharmacy_api.php',
    'Api/purchase_order_api.php',
    'Api/sales_api.php',
    'Api/stock_summary_api.php'
];

echo "AUTO-ADDING CATEGORY JOINs\n";
echo "==========================\n\n";

$fixed = 0;

foreach ($filesToFix as $filepath) {
    if (!file_exists($filepath)) {
        echo "⚠️  $filepath - NOT FOUND\n";
        continue;
    }
    
    $content = file_get_contents($filepath);
    $originalContent = $content;
    
    // Pattern 1: FROM tbl_product p\n LEFT JOIN tbl_supplier
    $content = preg_replace(
        '/(FROM\s+tbl_product\s+p\s*\n\s+)(LEFT\s+JOIN\s+tbl_supplier)/i',
        '$1LEFT JOIN tbl_category c ON p.category_id = c.category_id' . "\n                $2",
        $content
    );
    
    // Pattern 2: FROM tbl_product p\n LEFT JOIN tbl_brand
    $content = preg_replace(
        '/(FROM\s+tbl_product\s+p\s*\n\s+)(LEFT\s+JOIN\s+tbl_brand)/i',
        '$1LEFT JOIN tbl_category c ON p.category_id = c.category_id' . "\n                $2",
        $content
    );
    
    // Pattern 3: FROM tbl_product p\n LEFT JOIN tbl_location
    $content = preg_replace(
        '/(FROM\s+tbl_product\s+p\s*\n\s+)(LEFT\s+JOIN\s+tbl_location)/i',
        '$1LEFT JOIN tbl_category c ON p.category_id = c.category_id' . "\n                $2",
        $content
    );
    
    // Pattern 4: FROM tbl_product p\n LEFT JOIN tbl_transfer_batch_details
    $content = preg_replace(
        '/(FROM\s+tbl_product\s+p\s*\n\s+)(LEFT\s+JOIN\s+tbl_transfer_batch_details)/i',
        '$1LEFT JOIN tbl_category c ON p.category_id = c.category_id' . "\n                $2",
        $content
    );
    
    // Pattern 5: FROM tbl_product p\n INNER JOIN
    $content = preg_replace(
        '/(FROM\s+tbl_product\s+p\s*\n\s+)(INNER\s+JOIN)/i',
        '$1LEFT JOIN tbl_category c ON p.category_id = c.category_id' . "\n                $2",
        $content
    );
    
    // Pattern 6: FROM tbl_product p\n WHERE
    $content = preg_replace(
        '/(FROM\s+tbl_product\s+p\s*\n\s+)(WHERE)/i',
        '$1LEFT JOIN tbl_category c ON p.category_id = c.category_id' . "\n                $2",
        $content
    );
    
    // Pattern 7: FROM tbl_product p WHERE (no newline)
    $content = preg_replace(
        '/(FROM\s+tbl_product\s+p\s+)(WHERE)/i',
        '$1' . "\n                LEFT JOIN tbl_category c ON p.category_id = c.category_id\n                " . '$2',
        $content
    );
    
    if ($content !== $originalContent) {
        // Backup
        $backupPath = $filepath . '.backup_' . date('YmdHis');
        file_put_contents($backupPath, $originalContent);
        
        // Save
        file_put_contents($filepath, $content);
        
        echo "✅ " . basename($filepath) . " - JOIN added\n";
        $fixed++;
    } else {
        echo "   " . basename($filepath) . " - No pattern matched\n";
    }
}

echo "\n==========================\n";
echo "✅ Fixed $fixed files\n";
echo "==========================\n\n";

echo "Run verification again:\n";
echo "C:\\xampp\\php\\php.exe verify_all_joins_added.php\n";
?>

