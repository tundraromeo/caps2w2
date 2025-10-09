<?php
/**
 * Fix GROUP BY clauses - remove "as category" since aliases aren't allowed in GROUP BY
 */

$files = [
    'Api/backend.php',
    'Api/modules/products.php',
    'Api/sales_api.php',
    'Api/pharmacy_api.php',
    'Api/convenience_store_api.php',
    'Api/batch_tracking.php',
    'Api/modules/inventory.php',
    'Api/fifo_transfer_api.php'
];

echo "FIXING GROUP BY ALIASES\n";
echo "=======================\n\n";

$fixed = 0;

foreach ($files as $file) {
    if (!file_exists($file)) {
        echo "⚠️  $file - NOT FOUND\n";
        continue;
    }
    
    $content = file_get_contents($file);
    $originalContent = $content;
    
    // Remove "as category" from GROUP BY (you can't use aliases in GROUP BY)
    $content = preg_replace('/c\.category_name\s+as\s+category/', 'c.category_name', $content);
    
    if ($content !== $originalContent) {
        file_put_contents($file, $content);
        echo "✅ " . basename($file) . " - Fixed\n";
        $fixed++;
    } else {
        echo "   " . basename($file) . " - No changes\n";
    }
}

echo "\n=======================\n";
echo "✅ Fixed $fixed files\n";
echo "GROUP BY aliases removed\n";
?>

