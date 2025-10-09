<?php
/**
 * BULK FIX: Replace all p.category references in API files
 * 
 * Changes:
 * 1. p.category → c.category_name as category
 * 2. p.category = ? → c.category_name = ?
 * 3. p.category LIKE ? → c.category_name LIKE ?
 * 4. Add LEFT JOIN tbl_category c ON p.category_id = c.category_id where missing
 */

$apiDir = __DIR__ . '/Api';

$filesToFix = [
    'backend.php',
    'convenience_store_api.php',
    'pharmacy_api.php',
    'sales_api.php',
    'batch_tracking.php',
    'batch_stock_adjustment_api.php',
    'fifo_transfer_api.php',
    'stock_summary_api.php',
    'combined_reports_api.php',
    'inventory_transfer_api.php',
    'purchase_order_api.php'
];

echo "BULK FIX: Updating category references...\n";
echo "=========================================\n\n";

$totalChanges = 0;

foreach ($filesToFix as $filename) {
    $filepath = $apiDir . '/' . $filename;
    
    if (!file_exists($filepath)) {
        echo "⚠️  $filename - NOT FOUND\n";
        continue;
    }
    
    $content = file_get_contents($filepath);
    $originalContent = $content;
    
    // 1. Replace p.category, in SELECT
    $content = preg_replace('/\bp\.category,/', 'c.category_name as category,', $content);
    
    // 2. Replace p.category as category_name (some use this)
    $content = preg_replace('/\bp\.category\s+as\s+category_name/', 'c.category_name as category_name', $content);
    
    // 3. Replace WHERE p.category = ?
    $content = preg_replace('/\bp\.category\s*=\s*\?/', 'c.category_name = ?', $content);
    
    // 4. Replace WHERE p.category LIKE ?
    $content = preg_replace('/\bp\.category\s+LIKE\s+\?/', 'c.category_name LIKE ?', $content);
    
    // 5. Replace in GROUP BY
    $content = preg_replace('/GROUP BY ([^;]+)\bp\.category\b/', 'GROUP BY $1c.category_name', $content);
    
    // 6. Add LEFT JOIN if missing (basic pattern)
    // This is trickier - we'll note files that need manual JOIN addition
    
    if ($content !== $originalContent) {
        file_put_contents($filepath, $content);
        echo "✅ $filename - UPDATED\n";
        $totalChanges++;
    } else {
        echo "   $filename - No changes\n";
    }
}

echo "\n=========================================\n";
echo "✅ Updated $totalChanges files\n\n";

echo "⚠️  IMPORTANT: You must MANUALLY add this JOIN to each updated file:\n";
echo "   LEFT JOIN tbl_category c ON p.category_id = c.category_id\n\n";

echo "Next steps:\n";
echo "1. Test Warehouse (should work now)\n";
echo "2. Test other pages\n";
echo "3. Check console for any remaining errors\n";
?>

