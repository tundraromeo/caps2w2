<?php
$host = 'localhost';
$dbname = 'enguio2';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "QUICK CHECK: tbl_batch_transfer_details\n";
    echo "========================================\n\n";
    
    // Count records
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_batch_transfer_details");
    $count1 = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM tbl_transfer_batch_details");
    $count2 = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
    
    echo "tbl_batch_transfer_details: $count1 records\n";
    echo "tbl_transfer_batch_details: $count2 records\n\n";
    
    // Check FK references
    $stmt = $pdo->query("
        SELECT TABLE_NAME, COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
        WHERE REFERENCED_TABLE_SCHEMA = '$dbname'
        AND REFERENCED_TABLE_NAME = 'tbl_batch_transfer_details'
    ");
    $refs = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "OTHER TABLES referencing tbl_batch_transfer_details: " . count($refs) . "\n";
    foreach ($refs as $ref) {
        echo "   • {$ref['TABLE_NAME']}.{$ref['COLUMN_NAME']}\n";
    }
    
    echo "\n========================================\n";
    
    if ($count1 == 0 && count($refs) == 0) {
        echo "✅ SAFE TO DELETE!\n\n";
        echo "Reason:\n";
        echo "   • Empty (0 records)\n";
        echo "   • No FK references\n";
        echo "   • Never used kahit nag-run ka na\n\n";
        echo "DELETE command:\n";
        echo "   DROP TABLE tbl_batch_transfer_details;\n";
    } else {
        echo "⚠️  REVIEW FIRST!\n\n";
        if ($count1 > 0) echo "   • Has $count1 records\n";
        if (count($refs) > 0) echo "   • Referenced by other tables\n";
    }
    
} catch (PDOException $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
?>

