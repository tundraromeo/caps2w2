<?php
// Debug script for return approval process
header('Content-Type: application/json');

// Include database connection
require_once 'Api/conn.php';

try {
    echo "<h2>🔍 Return Approval Debug Report</h2>";
    
    // 1. Check if there are pending returns
    echo "<h3>1. Checking Pending Returns:</h3>";
    $stmt = $conn->prepare("SELECT * FROM tbl_pos_returns WHERE status = 'pending' LIMIT 5");
    $stmt->execute();
    $pendingReturns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($pendingReturns)) {
        echo "❌ No pending returns found. Creating a test return...<br>";
        
        // Create a test return
        $testReturnId = 'DEBUG_' . time();
        $insertReturnStmt = $conn->prepare("
            INSERT INTO tbl_pos_returns 
            (return_id, original_transaction_id, reason, method, item_condition, location_name, terminal_name, username, total_refund, status)
            VALUES (?, 'TXN_TEST', 'Debug test', 'refund', 'good', 'Convenience Store', 'Debug Terminal', 'debug_user', 50.00, 'pending')
        ");
        $insertReturnStmt->execute([$testReturnId]);
        
        // Create test return item
        $insertItemStmt = $conn->prepare("
            INSERT INTO tbl_pos_return_items 
            (return_id, product_id, quantity, price, total)
            VALUES (?, 1, 5, 10.00, 50.00)
        ");
        $insertItemStmt->execute([$testReturnId]);
        
        echo "✅ Created test return: $testReturnId<br>";
        
        // Get the created return
        $stmt = $conn->prepare("SELECT * FROM tbl_pos_returns WHERE return_id = ?");
        $stmt->execute([$testReturnId]);
        $pendingReturns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    echo "📋 Pending Returns:<br>";
    foreach ($pendingReturns as $return) {
        echo "- Return ID: {$return['return_id']}, Amount: {$return['total_refund']}, Location: {$return['location_name']}<br>";
    }
    
    // 2. Check return items
    echo "<h3>2. Checking Return Items:</h3>";
    foreach ($pendingReturns as $return) {
        $itemStmt = $conn->prepare("SELECT * FROM tbl_pos_return_items WHERE return_id = ?");
        $itemStmt->execute([$return['return_id']]);
        $items = $itemStmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "Return {$return['return_id']} items:<br>";
        foreach ($items as $item) {
            echo "- Product ID: {$item['product_id']}, Qty: {$item['quantity']}, Price: {$item['price']}<br>";
        }
    }
    
    // 3. Test approval process
    echo "<h3>3. Testing Approval Process:</h3>";
    $testReturn = $pendingReturns[0];
    $returnId = $testReturn['return_id'];
    
    // Simulate approval
    $approvalData = [
        'action' => 'approve_return',
        'return_id' => $returnId,
        'approved_by' => 1,
        'approved_by_username' => 'debug_admin',
        'notes' => 'Debug approval test'
    ];
    
    echo "🔄 Processing approval for return: $returnId<br>";
    
    // Start transaction
    $conn->beginTransaction();
    
    try {
        // Get return details
        $stmt = $conn->prepare("
            SELECT pr.*, pri.product_id, pri.quantity, pri.price, pri.total
            FROM tbl_pos_returns pr
            LEFT JOIN tbl_pos_return_items pri ON pr.return_id = pri.return_id
            WHERE pr.return_id = ? AND pr.status = 'pending'
        ");
        $stmt->execute([$returnId]);
        $returnData = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($returnData)) {
            throw new Exception("Return not found or already processed");
        }
        
        $returnHeader = $returnData[0];
        $location_name = $returnHeader['location_name'];
        
        // Get location ID
        $locationStmt = $conn->prepare("SELECT location_id FROM tbl_location WHERE location_name = ? LIMIT 1");
        $locationStmt->execute([$location_name]);
        $locationResult = $locationStmt->fetch(PDO::FETCH_ASSOC);
        $returnLocationId = $locationResult ? $locationResult['location_id'] : 4;
        
        echo "📍 Location: $location_name (ID: $returnLocationId)<br>";
        
        // Process each return item
        foreach ($returnData as $item) {
            if (!$item['product_id']) continue;
            
            echo "🔄 Processing item: Product {$item['product_id']}, Qty: {$item['quantity']}<br>";
            
            // Update product stock
            $stmt = $conn->prepare("
                UPDATE tbl_product 
                SET quantity = quantity + ?
                WHERE product_id = ? AND location_id = ?
            ");
            $stmt->execute([$item['quantity'], $item['product_id'], $returnLocationId]);
            echo "✅ Updated product stock<br>";
            
            // Create transfer header
            $transferHeaderId = 9000000 + intval(substr($returnId, -6));
            
            $checkTransferHeaderStmt = $conn->prepare("
                SELECT transfer_header_id FROM tbl_transfer_header WHERE transfer_header_id = ?
            ");
            $checkTransferHeaderStmt->execute([$transferHeaderId]);
            
            if (!$checkTransferHeaderStmt->fetch()) {
                $insertTransferHeaderStmt = $conn->prepare("
                    INSERT INTO tbl_transfer_header 
                    (transfer_header_id, date, source_location_id, destination_location_id, employee_id, status)
                    VALUES (?, CURDATE(), ?, ?, ?, 'approved')
                ");
                $insertTransferHeaderStmt->execute([
                    $transferHeaderId,
                    $returnLocationId,
                    $returnLocationId,
                    1
                ]);
                echo "✅ Created transfer header: $transferHeaderId<br>";
            }
            
            // Add to batch transfer details
            $checkBatchTransferStmt = $conn->prepare("
                SELECT batch_transfer_id, quantity_used 
                FROM tbl_batch_transfer_details 
                WHERE product_id = ? AND location_id = ? 
                ORDER BY batch_transfer_id DESC 
                LIMIT 1
            ");
            $checkBatchTransferStmt->execute([$item['product_id'], $returnLocationId]);
            $existingBatchTransfer = $checkBatchTransferStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($existingBatchTransfer) {
                $updateBatchTransferStmt = $conn->prepare("
                    UPDATE tbl_batch_transfer_details 
                    SET quantity_used = quantity_used + ?, 
                        transfer_date = NOW(),
                        status = 'Available'
                    WHERE batch_transfer_id = ?
                ");
                $updateBatchTransferStmt->execute([$item['quantity'], $existingBatchTransfer['batch_transfer_id']]);
                echo "✅ Updated existing batch transfer: {$existingBatchTransfer['batch_transfer_id']}<br>";
            } else {
                // Create new batch transfer detail
                $getBatchStmt = $conn->prepare("
                    SELECT b.batch_id, b.batch_reference
                    FROM tbl_batch b
                    WHERE b.location_id = ?
                    ORDER BY b.batch_id DESC 
                    LIMIT 1
                ");
                $getBatchStmt->execute([$returnLocationId]);
                $batchInfo = $getBatchStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($batchInfo) {
                    $insertBatchTransferStmt = $conn->prepare("
                        INSERT INTO tbl_batch_transfer_details 
                        (product_id, batch_id, batch_reference, quantity_used, unit_cost, srp, expiration_date, status, location_id, transfer_date)
                        VALUES (?, ?, ?, ?, ?, ?, ?, 'Available', ?, NOW())
                    ");
                    $insertBatchTransferStmt->execute([
                        $item['product_id'],
                        $batchInfo['batch_id'],
                        $batchInfo['batch_reference'],
                        $item['quantity'],
                        $item['price'],
                        $item['price'],
                        date('Y-m-d', strtotime('+1 year')),
                        $returnLocationId
                    ]);
                    echo "✅ Created new batch transfer detail<br>";
                } else {
                    echo "❌ No batch found for location $returnLocationId<br>";
                }
            }
        }
        
        // Update return status
        $stmt = $conn->prepare("
            UPDATE tbl_pos_returns 
            SET status = 'approved', approved_by = ?, approved_by_username = ?, approved_at = NOW(), notes = ?
            WHERE return_id = ?
        ");
        $stmt->execute([1, 'debug_admin', 'Debug approval test', $returnId]);
        echo "✅ Updated return status to approved<br>";
        
        $conn->commit();
        echo "<br>🎉 Approval process completed successfully!<br>";
        
    } catch (Exception $e) {
        $conn->rollback();
        echo "❌ Error: " . $e->getMessage() . "<br>";
    }
    
    // 4. Check results
    echo "<h3>4. Checking Results:</h3>";
    
    // Check batch transfer details
    $batchStmt = $conn->prepare("SELECT * FROM tbl_batch_transfer_details WHERE location_id = ? ORDER BY batch_transfer_id DESC LIMIT 3");
    $batchStmt->execute([$returnLocationId]);
    $batchDetails = $batchStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "📊 Latest Batch Transfer Details:<br>";
    foreach ($batchDetails as $batch) {
        echo "- Product: {$batch['product_id']}, Qty Used: {$batch['quantity_used']}, Status: {$batch['status']}, Location: {$batch['location_id']}<br>";
    }
    
    // Check transfer log
    $logStmt = $conn->prepare("SELECT * FROM tbl_transfer_log ORDER BY transfer_id DESC LIMIT 3");
    $logStmt->execute();
    $transferLogs = $logStmt->fetchAll(PDO::FETCH_ASSOC);
    
    echo "📋 Latest Transfer Logs:<br>";
    foreach ($transferLogs as $log) {
        echo "- Transfer: {$log['transfer_id']}, Product: {$log['product_id']}, Qty: {$log['quantity']}, From: {$log['from_location']}, To: {$log['to_location']}<br>";
    }
    
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage();
}
?>

