<?php
/**
 * Find all remaining p.category references in API files
 */

$apiDir = __DIR__ . '/Api';
$files = glob($apiDir . '/*.php') + glob($apiDir . '/modules/*.php');

echo "Scanning API files for p.category references...\n\n";

$found = [];

foreach ($files as $file) {
    $content = file_get_contents($file);
    $lines = explode("\n", $content);
    
    foreach ($lines as $lineNum => $line) {
        if (preg_match('/\bp\.category\b/', $line) && !preg_match('/category_id/', $line)) {
            $found[] = [
                'file' => basename($file),
                'line' => $lineNum + 1,
                'content' => trim($line)
            ];
        }
    }
}

if (empty($found)) {
    echo "✅ NO MORE p.category references found!\n";
    echo "All files are updated!\n";
} else {
    echo "Found " . count($found) . " remaining references:\n\n";
    
    $byFile = [];
    foreach ($found as $item) {
        $byFile[$item['file']][] = $item;
    }
    
    foreach ($byFile as $file => $items) {
        echo "$file (" . count($items) . " instances):\n";
        foreach ($items as $item) {
            echo "   Line {$item['line']}: {$item['content']}\n";
        }
        echo "\n";
    }
}
?>

