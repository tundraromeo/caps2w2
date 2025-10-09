<?php
/**
 * Verify all files using c.category_name have the proper JOIN
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

echo "VERIFYING tbl_category JOINs\n";
echo "============================\n\n";

$issues = [];

foreach ($files as $filepath) {
    $filename = basename($filepath);
    $content = file_get_contents($filepath);
    
    // Check if uses c.category_name
    $usesCategoryName = preg_match('/\bc\.category_name\b/', $content);
    
    if ($usesCategoryName) {
        // Check if has the JOIN
        $hasJoin = preg_match('/LEFT\s+JOIN\s+tbl_category\s+c\s+ON\s+p\.category_id\s*=\s*c\.category_id/i', $content);
        
        if (!$hasJoin) {
            $issues[] = $filename;
            echo "❌ $filename - Uses c.category_name but MISSING JOIN\n";
        } else {
            echo "✅ $filename - Has proper JOIN\n";
        }
    }
}

echo "\n============================\n";

if (empty($issues)) {
    echo "✅ ALL FILES HAVE PROPER JOINs!\n";
    echo "Your Warehouse should work now!\n";
} else {
    echo "⚠️  " . count($issues) . " files need manual JOIN addition:\n";
    foreach ($issues as $file) {
        echo "   - $file\n";
    }
}
?>

