<?php
$file = 'Api/modules/products.php';
$content = file_get_contents($file);

// Fix only in SELECT clauses (not GROUP BY)
$content = preg_replace(
    '/(\s+p\.product_name,\s+)c\.category_name,(\s+p\.barcode,)/',
    '$1c.category_name as category,$2',
    $content
);

file_put_contents($file, $content);

echo "✅ Fixed alias in Api/modules/products.php\n";
echo "   Changed: c.category_name, → c.category_name as category,\n";
echo "   (Only in SELECT clauses after product_name and before barcode)\n";
?>

