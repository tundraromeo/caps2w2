<?php
require_once __DIR__ . '/Api/conn.php';

$transfer_id = 91; // From sample data above

echo "=== Testing get_product_details query ===\n";
echo "Transfer ID: $transfer_id\n\n";

// Test the FIXED query
$stmt = $conn->prepare("
    SELECT DISTINCT
        tbd.batch_id,
        tbd.batch_reference,
        tbd.quantity as batch_quantity,
        tbd.srp as batch_srp,
        tbd.expiration_date,
        tbd.created_at,
        p.product_id,
        p.product_name
    FROM tbl_transfer_batch_details tbd
    LEFT JOIN tbl_transfer_dtl td ON tbd.product_id = td.product_id
    LEFT JOIN tbl_product p ON tbd.product_id = p.product_id
    WHERE td.transfer_header_id = ?
    ORDER BY tbd.expiration_date ASC, tbd.id ASC
");
$stmt->execute([$transfer_id]);
$batch_details = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Batch Details Found: " . count($batch_details) . "\n";
if (count($batch_details) > 0) {
    print_r($batch_details);
} else {
    echo "NO BATCH DETAILS FOUND!\n\n";
    
    // Let's debug why
    echo "=== Debugging: Check if product exists in transfer ===\n";
    $debug1 = $conn->prepare("SELECT * FROM tbl_transfer_dtl WHERE transfer_header_id = ?");
    $debug1->execute([$transfer_id]);
    $dtl = $debug1->fetchAll(PDO::FETCH_ASSOC);
    echo "Transfer Details: " . count($dtl) . " products\n";
    print_r($dtl);
    
    if (count($dtl) > 0) {
        $product_id = $dtl[0]['product_id'];
        echo "\n=== Checking batch details for product_id: $product_id ===\n";
        $debug2 = $conn->prepare("SELECT * FROM tbl_transfer_batch_details WHERE product_id = ?");
        $debug2->execute([$product_id]);
        $batches = $debug2->fetchAll(PDO::FETCH_ASSOC);
        echo "Batch Details for this product: " . count($batches) . "\n";
        print_r($batches);
    }
}

echo "\n=== Testing get_transfer_batch_details query (convenience_store_api.php) ===\n";
$stmt2 = $conn->prepare("
    SELECT DISTINCT
        tbd.id,
        tbd.product_id,
        tbd.batch_id,
        tbd.batch_reference,
        tbd.quantity as batch_quantity,
        tbd.srp as batch_srp,
        tbd.expiration_date,
        tbd.created_at as transfer_date,
        p.product_name,
        p.barcode,
        th.source_location_id,
        th.destination_location_id,
        sl.location_name as source_location_name,
        dl.location_name as destination_location_name
    FROM tbl_transfer_batch_details tbd
    LEFT JOIN tbl_product p ON tbd.product_id = p.product_id
    LEFT JOIN tbl_transfer_dtl td ON tbd.product_id = td.product_id
    LEFT JOIN tbl_transfer_header th ON td.transfer_header_id = th.transfer_header_id
    LEFT JOIN tbl_location sl ON th.source_location_id = sl.location_id
    LEFT JOIN tbl_location dl ON th.destination_location_id = dl.location_id
    WHERE th.transfer_header_id = ?
    ORDER BY tbd.expiration_date ASC, tbd.id ASC
");
$stmt2->execute([$transfer_id]);
$batch_details2 = $stmt2->fetchAll(PDO::FETCH_ASSOC);

echo "Batch Details Found: " . count($batch_details2) . "\n";
if (count($batch_details2) > 0) {
    print_r($batch_details2);
} else {
    echo "NO BATCH DETAILS FOUND!\n";
}
?>

