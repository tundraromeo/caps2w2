<?php
require_once __DIR__ . '/Api/conn.php';

echo "=== tbl_transfer_batch_details Structure ===\n";
$result = $conn->query('DESCRIBE tbl_transfer_batch_details');
while($row = $result->fetch(PDO::FETCH_ASSOC)) {
    echo $row['Field'] . " - " . $row['Type'] . "\n";
}

echo "\n=== Sample Data from tbl_transfer_batch_details ===\n";
$result2 = $conn->query('SELECT * FROM tbl_transfer_batch_details LIMIT 5');
$data = $result2->fetchAll(PDO::FETCH_ASSOC);
echo "Total rows found: " . count($data) . "\n";
if (count($data) > 0) {
    print_r($data[0]);
} else {
    echo "NO DATA FOUND IN tbl_transfer_batch_details!\n";
}

echo "\n=== tbl_transfer_header Structure ===\n";
$result3 = $conn->query('DESCRIBE tbl_transfer_header');
while($row = $result3->fetch(PDO::FETCH_ASSOC)) {
    echo $row['Field'] . " - " . $row['Type'] . "\n";
}

echo "\n=== Sample Data from tbl_transfer_header ===\n";
$result4 = $conn->query('SELECT * FROM tbl_transfer_header LIMIT 5');
$data2 = $result4->fetchAll(PDO::FETCH_ASSOC);
echo "Total rows found: " . count($data2) . "\n";
if (count($data2) > 0) {
    print_r($data2[0]);
}

echo "\n=== tbl_transfer_dtl Structure ===\n";
$result5 = $conn->query('DESCRIBE tbl_transfer_dtl');
while($row = $result5->fetch(PDO::FETCH_ASSOC)) {
    echo $row['Field'] . " - " . $row['Type'] . "\n";
}

echo "\n=== Sample Data from tbl_transfer_dtl ===\n";
$result6 = $conn->query('SELECT * FROM tbl_transfer_dtl LIMIT 5');
$data3 = $result6->fetchAll(PDO::FETCH_ASSOC);
echo "Total rows found: " . count($data3) . "\n";
if (count($data3) > 0) {
    print_r($data3[0]);
}
?>

