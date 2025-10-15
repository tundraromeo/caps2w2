<?php
/**
 * Cleanup script to remove duplicate batch entries with the same batch_reference
 * Keeps only the first batch entry for each unique batch_reference
 */

require_once 'conn.php';
require_once 'cors.php';

header('Content-Type: application/json');

try {
    // Find duplicate batch references
    $findDuplicatesStmt = $conn->prepare("
        SELECT batch_reference, COUNT(*) as count, 
               GROUP_CONCAT(batch_id ORDER BY batch_id ASC) as batch_ids
        FROM tbl_batch
        WHERE batch_reference IS NOT NULL AND batch_reference != ''
        GROUP BY batch_reference
        HAVING count > 1
    ");
    $findDuplicatesStmt->execute();
    $duplicates = $findDuplicatesStmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($duplicates)) {
        echo json_encode([
            'success' => true,
            'message' => 'No duplicate batch references found',
            'duplicates_found' => 0,
            'records_cleaned' => 0
        ]);
        exit;
    }
    
    $totalCleaned = 0;
    $cleanupDetails = [];
    
    // Start transaction
    $conn->beginTransaction();
    
    foreach ($duplicates as $duplicate) {
        $batch_reference = $duplicate['batch_reference'];
        $batch_ids = explode(',', $duplicate['batch_ids']);
        
        // Keep the first batch_id, delete the rest
        $keepBatchId = $batch_ids[0];
        $deleteBatchIds = array_slice($batch_ids, 1);
        
        if (empty($deleteBatchIds)) {
            continue;
        }
        
        // Update tbl_fifo_stock to use the kept batch_id
        $updateFifoStmt = $conn->prepare("
            UPDATE tbl_fifo_stock 
            SET batch_id = ? 
            WHERE batch_id IN (" . implode(',', array_fill(0, count($deleteBatchIds), '?')) . ")
        ");
        $params = array_merge([$keepBatchId], $deleteBatchIds);
        $updateFifoStmt->execute($params);
        
        // Update tbl_stock_movements to use the kept batch_id
        $updateMovementStmt = $conn->prepare("
            UPDATE tbl_stock_movements 
            SET batch_id = ? 
            WHERE batch_id IN (" . implode(',', array_fill(0, count($deleteBatchIds), '?')) . ")
        ");
        $updateMovementStmt->execute($params);
        
        // Delete duplicate batch records
        $deleteBatchStmt = $conn->prepare("
            DELETE FROM tbl_batch 
            WHERE batch_id IN (" . implode(',', array_fill(0, count($deleteBatchIds), '?')) . ")
        ");
        $deleteBatchStmt->execute($deleteBatchIds);
        
        $cleanedCount = count($deleteBatchIds);
        $totalCleaned += $cleanedCount;
        
        $cleanupDetails[] = [
            'batch_reference' => $batch_reference,
            'kept_batch_id' => $keepBatchId,
            'deleted_batch_ids' => $deleteBatchIds,
            'records_deleted' => $cleanedCount
        ];
    }
    
    // Commit transaction
    $conn->commit();
    
    echo json_encode([
        'success' => true,
        'message' => "Successfully cleaned up $totalCleaned duplicate batch records",
        'duplicates_found' => count($duplicates),
        'records_cleaned' => $totalCleaned,
        'details' => $cleanupDetails
    ]);
    
} catch (Exception $e) {
    // Rollback on error
    if ($conn->inTransaction()) {
        $conn->rollBack();
    }
    
    echo json_encode([
        'success' => false,
        'message' => 'Error cleaning up duplicates: ' . $e->getMessage()
    ]);
}

