<?php
/**
 * Restore "as category" alias in SELECT (needed for frontend)
 * But keep it OUT of GROUP BY (SQL syntax)
 */

$files = glob('Api/*.php') + glob('Api/modules/*.php');

echo "RESTORING SELECT ALIASES\n";
echo "========================\n\n";

$fixed = 0;

foreach ($files as $file) {
    $content = file_get_contents($file);
    $originalContent = $content;
    
    // In SELECT clauses, restore the alias
    // Pattern: SELECT ... c.category_name, (in SELECT context)
    // Change to: SELECT ... c.category_name as category,
    
    // Use lookahead to ensure we're in SELECT, not GROUP BY
    $content = preg_replace(
        '/(SELECT\s[^;]+?)\bc\.category_name,/s',
        '$1c.category_name as category,',
        $content
    );
    
    // Also handle case where it's the last column (no comma)
    $content = preg_replace(
        '/(SELECT\s[^;]+?)\bc\.category_name\s+FROM/s',
        '$1c.category_name as category FROM',
        $content
    );
    
    if ($content !== $originalContent) {
        file_put_contents($file, $content);
        echo "✅ " . basename($file) . "\n";
        $fixed++;
    }
}

echo "\n========================\n";
echo "✅ Fixed $fixed files\n";
echo "Aliases restored in SELECT\n";
echo "Kept out of GROUP BY\n";
?>

