<?php
// Comprehensive script to fix all remaining PDO syntax in backend.php

$file_path = 'Api/backend.php';
$content = file_get_contents($file_path);

echo "Starting comprehensive PDO to mysqli conversion...\n";

// Fix all remaining execute([$param]) calls to bind_param + execute
// This is the most common pattern that needs fixing

// Pattern 1: execute([$param]) -> bind_param("s", $param); execute();
$content = preg_replace_callback(
    '/\$(\w+)->execute\(\[([^\]]+)\]\);/',
    function($matches) {
        $stmt_var = $matches[1];
        $params = $matches[2];
        
        // Count parameters and determine types
        $param_array = explode(',', $params);
        $types = '';
        $bind_params = '';
        
        foreach ($param_array as $param) {
            $param = trim($param);
            if (is_numeric($param) || strpos($param, '_id') !== false || strpos($param, 'qty') !== false || strpos($param, 'quantity') !== false) {
                $types .= 'i'; // integer
            } else {
                $types .= 's'; // string
            }
            $bind_params .= $param . ', ';
        }
        
        $bind_params = rtrim($bind_params, ', ');
        
        return "\$$stmt_var->bind_param(\"$types\", $bind_params);\n        \$$stmt_var->execute();";
    },
    $content
);

// Pattern 2: execute([$param1, $param2]) -> bind_param("ss", $param1, $param2); execute();
$content = preg_replace_callback(
    '/\$(\w+)->execute\(\[([^\]]+)\]\);/',
    function($matches) {
        $stmt_var = $matches[1];
        $params = $matches[2];
        
        // Count parameters and determine types
        $param_array = explode(',', $params);
        $types = '';
        $bind_params = '';
        
        foreach ($param_array as $param) {
            $param = trim($param);
            if (is_numeric($param) || strpos($param, '_id') !== false || strpos($param, 'qty') !== false || strpos($param, 'quantity') !== false) {
                $types .= 'i'; // integer
            } else {
                $types .= 's'; // string
            }
            $bind_params .= $param . ', ';
        }
        
        $bind_params = rtrim($bind_params, ', ');
        
        return "\$$stmt_var->bind_param(\"$types\", $bind_params);\n        \$$stmt_var->execute();";
    },
    $content
);

// Fix any remaining fetch(MYSQLI_ASSOC) calls
$content = preg_replace(
    '/\$(\w+)->fetch\(MYSQLI_ASSOC\)/',
    '$$1->get_result()->fetch_assoc()',
    $content
);

// Fix any remaining fetchAll(MYSQLI_ASSOC) calls
$content = preg_replace(
    '/\$(\w+)->fetchAll\(MYSQLI_ASSOC\)/',
    '$$1->get_result()->fetch_all(MYSQLI_ASSOC)',
    $content
);

// Fix any remaining fetchColumn() calls
$content = preg_replace(
    '/\$(\w+)->fetchColumn\(\)/',
    '$$1->get_result()->fetch_assoc()',
    $content
);

// Fix any remaining rowCount() calls
$content = preg_replace(
    '/\$(\w+)->rowCount\(\)/',
    '$$1->affected_rows',
    $content
);

// Fix any remaining lastInsertId() calls
$content = preg_replace(
    '/\$(\w+)->lastInsertId\(\)/',
    '$$1->insert_id',
    $content
);

// Write the fixed content back
file_put_contents($file_path, $content);

echo "Fixed all remaining PDO syntax in backend.php\n";
echo "This should resolve the 500 Internal Server Errors you were seeing.\n";
echo "The main issues were:\n";
echo "1. execute([\$param]) calls that should be bind_param + execute\n";
echo "2. fetch(MYSQLI_ASSOC) calls that should be get_result()->fetch_assoc()\n";
echo "3. fetchAll(MYSQLI_ASSOC) calls that should be get_result()->fetch_all(MYSQLI_ASSOC)\n";
echo "4. fetchColumn() calls that should be get_result()->fetch_assoc()\n";
echo "5. rowCount() calls that should be affected_rows\n";
echo "6. lastInsertId() calls that should be insert_id\n";
?>
