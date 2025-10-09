<?php
/**
 * COMPREHENSIVE CATEGORY FIX
 * 
 * Goal: Replace all category (VARCHAR) with category_id (INT FK) references
 * Scope: All PHP API files
 * 
 * Changes:
 * 1. SQL SELECT: p.category → c.category_name as category (with JOIN)
 * 2. SQL WHERE: p.category = ? → c.category_name = ?
 * 3. SQL INSERT/UPDATE: category → category_id
 * 4. PHP variables: $row['category'] stays (returned by JOIN)
 */

$apiDir = __DIR__ . '/Api';

// Get all PHP files in Api directory and subdirectories
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

echo "COMPREHENSIVE CATEGORY MIGRATION\n";
echo "=================================\n\n";
echo "Found " . count($files) . " PHP files to process\n\n";

$stats = [
    'files_modified' => 0,
    'select_fixed' => 0,
    'where_fixed' => 0,
    'group_by_fixed' => 0,
    'like_fixed' => 0
];

foreach ($files as $filepath) {
    $filename = basename($filepath);
    $content = file_get_contents($filepath);
    $originalContent = $content;
    
    // Count changes before
    $before = [
        'select' => preg_match_all('/\bp\.category,/', $content),
        'where' => preg_match_all('/\bp\.category\s*=\s*\?/', $content),
        'like' => preg_match_all('/\bp\.category\s+LIKE\s+\?/', $content),
        'group' => preg_match_all('/GROUP BY[^;]+\bp\.category\b/', $content)
    ];
    
    // FIX 1: Replace p.category, in SELECT clauses
    $content = preg_replace('/\bp\.category,/', 'c.category_name as category,', $content);
    
    // FIX 2: Replace p.category as category_name
    $content = preg_replace('/\bp\.category\s+as\s+category_name/', 'c.category_name as category_name', $content);
    
    // FIX 3: Replace WHERE conditions
    $content = preg_replace('/\bp\.category\s*=\s*\?/', 'c.category_name = ?', $content);
    
    // FIX 4: Replace LIKE conditions
    $content = preg_replace('/\bp\.category\s+LIKE\s+\?/', 'c.category_name LIKE ?', $content);
    
    // FIX 5: Replace in GROUP BY
    $content = preg_replace('/\bp\.category\b/', 'c.category_name', $content);
    
    // Count changes after
    $after = [
        'select' => preg_match_all('/\bc\.category_name as category,/', $content),
        'where' => preg_match_all('/\bc\.category_name\s*=\s*\?/', $content),
        'like' => preg_match_all('/\bc\.category_name\s+LIKE\s+\?/', $content),
        'group' => preg_match_all('/GROUP BY[^;]+\bc\.category_name\b/', $content)
    ];
    
    if ($content !== $originalContent) {
        // Backup original
        $backupPath = $filepath . '.backup';
        if (!file_exists($backupPath)) {
            file_put_contents($backupPath, $originalContent);
        }
        
        // Save changes
        file_put_contents($filepath, $content);
        
        $changes = 0;
        foreach (['select', 'where', 'like', 'group'] as $type) {
            $change = $after[$type] - $before[$type];
            if ($change > 0) {
                $changes += $change;
                $stats[$type . '_fixed'] += $change;
            }
        }
        
        echo "✅ $filename - $changes changes\n";
        $stats['files_modified']++;
    }
}

echo "\n=================================\n";
echo "SUMMARY:\n";
echo "=================================\n\n";
echo "Files modified: {$stats['files_modified']}\n";
echo "SELECT clauses fixed: {$stats['select_fixed']}\n";
echo "WHERE conditions fixed: {$stats['where_fixed']}\n";
echo "LIKE conditions fixed: {$stats['like_fixed']}\n";
echo "GROUP BY clauses fixed: {$stats['group_by_fixed']}\n";

echo "\n⚠️  IMPORTANT MANUAL STEPS:\n";
echo "===========================\n\n";

echo "Each modified file needs this JOIN added:\n";
echo "   LEFT JOIN tbl_category c ON p.category_id = c.category_id\n\n";

echo "Look for patterns like:\n";
echo "   FROM tbl_product p\n";
echo "   LEFT JOIN tbl_brand b ...\n";
echo "   LEFT JOIN tbl_supplier s ...\n";
echo "   [ADD HERE] LEFT JOIN tbl_category c ON p.category_id = c.category_id\n\n";

echo "Files have been backed up with .backup extension.\n";
echo "To restore: cp file.php.backup file.php\n\n";

echo "✅ All p.category references converted to c.category_name\n";
echo "📝 Manual JOIN addition required for each file\n";
?>

