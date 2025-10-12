<?php
require_once __DIR__ . '/Api/conn.php';

echo "=== tbl_product Structure ===\n";
$result = $conn->query('DESCRIBE tbl_product');
while($row = $result->fetch(PDO::FETCH_ASSOC)) {
    echo $row['Field'] . " - " . $row['Type'] . "\n";
}
?>

