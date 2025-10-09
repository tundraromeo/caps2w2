<?php
/**
 * Add missing tbl_category JOINs to all queries that use c.category_name
 */

$apiDir = __DIR__ . '/Api';

function getPhpFiles($dir) {
    $files = [];
    $items = glob($dir . '/*');
    foreach ($items as $item) {
        if (is_file($item) && pathinfo($item, PATHINFO_EXTENSION) === 'php') {
            $files[] = $item;
        } elseif (is_dir($item)) {
            $files = array_merge($files, getPhpFiles($item));
        }
    }
    return $files;
}

$files = getPhpFiles($apiDir);

echo "ADDING MISSING tbl_category JOINs\n";
echo "==================================\n\n";

$totalFixed = 0;

foreach ($files as $filepath) {
    $filename = basename($filepath);
    $content = file_get_contents($filepath);
    $originalContent = $content;
    
    // Pattern: Find queries that use c.category_name but missing the JOIN
    // Look for: FROM tbl_product p ... (no LEFT JOIN tbl_category c)
    
    // Strategy: Add the JOIN right after "FROM tbl_product p"
    // But only if c.category_name is used AND JOIN doesn't exist yet
    
    $hasUsage = str

_contains($content, 'c.category_name');
    $hasJoin = preg_match('/LEFT\s+JOIN\s+tbl_category\s+c\s+ON\s+p\.category_id\s*=\s*c\.category_id/i', $content);
    
    if ($hasUsage && !$hasJoin) {
        // Add JOIN after FROM tbl_product p
        // This is the tricky part - we need to insert it in the right place
        
        // Pattern: FROM tbl_product p\n (spaces) LEFT JOIN
        $content = preg_replace(
            '/(FROM\s+tbl_product\s+p\s*\n\s+)(LEFT\s+JOIN)/i',
            '$1LEFT JOIN tbl_category c ON p.category_id = c.category_id' . "\n                ",
            $content
        );
        
        // Also handle: FROM tbl_product p WHERE
        $content = preg_replace(
            '/(FROM\s+tbl_product\s+p\s*\n\s+)(WHERE)/i',
            '$1LEFT JOIN tbl_category c ON p.category_id = c.category_id' . "\n                $2",
            $content
        );
        
        // Handle: FROM tbl_product p\n GROUP BY
        $content = preg_replace(
            '/(FROM\s+tbl_product\s+p\s*\n\s+)(GROUP\s+BY)/i',
            '$1LEFT JOIN tbl_category c ON p.category_id = c.category_id' . "\n                $2",
            $content
        );
    }
    
    if ($content !== $originalContent) {
        file_put_contents($filepath, $content);
        echo "✅ $filename - JOIN added\n";
        $totalFixed++;
    }
}

echo "\n==================================\n";
echo "✅ Added JOINs to $totalFixed files\n";
echo "==================================\n\n";

if ($totalFixed > 0) {
    echo "Test your application now!\n";
} else {
    echo "All files already have proper JOINs or don't use category.\n";
}
?>

