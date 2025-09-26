<?php
// Check transfer data
require_once 'Api/conn.php';

echo "<h2>🔍 Transfer Data Check</h2>";

// Check transfer headers
echo "<h3>1. Transfer Headers (Return-related):</h3>";
$stmt = $conn->prepare("SELECT * FROM tbl_transfer_header WHERE transfer_header_id >= 71 ORDER BY transfer_header_id DESC");
$stmt->execute();
$headers = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($headers)) {
    echo "❌ No return transfer headers found.<br>";
} else {
    foreach ($headers as $header) {
        echo "<div style='border: 1px solid #ccc; padding: 10px; margin: 5px;'>";
        echo "<strong>Transfer ID:</strong> {$header['transfer_header_id']}<br>";
        echo "<strong>Date:</strong> {$header['date']}<br>";
        echo "<strong>Source Location:</strong> {$header['source_location_id']}<br>";
        echo "<strong>Destination Location:</strong> {$header['destination_location_id']}<br>";
        echo "<strong>Employee ID:</strong> {$header['employee_id']}<br>";
        echo "<strong>Status:</strong> {$header['status']}<br>";
        echo "</div>";
    }
}

// Check transfer details
echo "<h3>2. Transfer Details:</h3>";
$stmt = $conn->prepare("SELECT * FROM tbl_transfer_dtl WHERE transfer_header_id >= 71 ORDER BY transfer_header_id DESC");
$stmt->execute();
$details = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($details)) {
    echo "❌ No return transfer details found.<br>";
} else {
    foreach ($details as $detail) {
        echo "<div style='border: 1px solid #ccc; padding: 10px; margin: 5px;'>";
        echo "<strong>Transfer Header ID:</strong> {$detail['transfer_header_id']}<br>";
        echo "<strong>Product ID:</strong> {$detail['product_id']}<br>";
        echo "<strong>Quantity:</strong> {$detail['qty']}<br>";
        echo "</div>";
    }
}

// Check batch transfer details
echo "<h3>3. Batch Transfer Details (Location 4):</h3>";
$stmt = $conn->prepare("SELECT * FROM tbl_batch_transfer_details WHERE location_id = 4 ORDER BY batch_transfer_id DESC LIMIT 10");
$stmt->execute();
$batchDetails = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($batchDetails)) {
    echo "❌ No batch transfer details found for location 4.<br>";
} else {
    foreach ($batchDetails as $batch) {
        echo "<div style='border: 1px solid #ccc; padding: 10px; margin: 5px;'>";
        echo "<strong>Batch Transfer ID:</strong> {$batch['batch_transfer_id']}<br>";
        echo "<strong>Product ID:</strong> {$batch['product_id']}<br>";
        echo "<strong>Quantity Used:</strong> {$batch['quantity_used']}<br>";
        echo "<strong>Status:</strong> {$batch['status']}<br>";
        echo "<strong>Location ID:</strong> {$batch['location_id']}<br>";
        echo "<strong>Transfer Date:</strong> {$batch['transfer_date']}<br>";
        echo "</div>";
    }
}

// Check transfer logs
echo "<h3>4. Transfer Logs (Return-related):</h3>";
$stmt = $conn->prepare("SELECT * FROM tbl_transfer_log WHERE from_location = 'Customer Return' ORDER BY transfer_id DESC LIMIT 5");
$stmt->execute();
$logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

if (empty($logs)) {
    echo "❌ No return transfer logs found.<br>";
} else {
    foreach ($logs as $log) {
        echo "<div style='border: 1px solid #ccc; padding: 10px; margin: 5px;'>";
        echo "<strong>Transfer ID:</strong> {$log['transfer_id']}<br>";
        echo "<strong>Product ID:</strong> {$log['product_id']}<br>";
        echo "<strong>Product Name:</strong> {$log['product_name']}<br>";
        echo "<strong>From:</strong> {$log['from_location']}<br>";
        echo "<strong>To:</strong> {$log['to_location']}<br>";
        echo "<strong>Quantity:</strong> {$log['quantity']}<br>";
        echo "<strong>Date:</strong> {$log['transfer_date']}<br>";
        echo "</div>";
    }
}

echo "<h3>5. Summary:</h3>";
echo "<p>Transfer header IDs for returns now start from 71 (much simpler than 9000000!).</p>";
echo "<p>These IDs are used to track the return process and ensure quantities are properly added to store inventory.</p>";
?>
