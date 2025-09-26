<?php
/**
 * Simple Batch Functions
 * Clean, easy-to-understand batch operations
 */

require_once 'Database.php';
require_once 'ApiHelper.php';

class BatchService {
    private $db;
    
    public function __construct() {
        $this->db = new Database();
    }
    
    /**
     * Get batch details for a transfer
     */
    public function getTransferBatchDetails($transferId) {
        $sql = "
            SELECT DISTINCT
                tbd.id,
                tbd.batch_id,
                tbd.batch_reference,
                tbd.quantity as batch_quantity,
                tbd.srp as batch_srp,
                tbd.expiration_date,
                fs.unit_cost,
                fs.available_quantity
            FROM tbl_transfer_batch_details tbd
            LEFT JOIN tbl_fifo_stock fs ON tbd.batch_id = fs.batch_id
            LEFT JOIN tbl_transfer_dtl td ON tbd.product_id = td.product_id AND td.transfer_header_id = ?
            WHERE td.transfer_header_id = ?
            ORDER BY tbd.id ASC
        ";
        
        $batches = $this->db->select($sql, [$transferId, $transferId]);
        return $batches;
    }
    
    /**
     * Get batch details by product and location
     */
    public function getBatchDetailsByProductLocation($productId, $locationId) {
        $sql = "
            SELECT 
                btd.batch_transfer_id,
                btd.batch_id,
                btd.batch_reference,
                btd.quantity_used as batch_quantity,
                btd.unit_cost,
                btd.srp as batch_srp,
                btd.expiration_date,
                btd.status,
                btd.transfer_date,
                p.product_name,
                p.barcode,
                l.location_name
            FROM tbl_batch_transfer_details btd
            LEFT JOIN tbl_product p ON btd.product_id = p.product_id
            LEFT JOIN tbl_location l ON btd.location_id = l.location_id
            WHERE btd.product_id = ? AND btd.location_id = ?
            ORDER BY btd.batch_transfer_id ASC
        ";
        
        $batches = $this->db->select($sql, [$productId, $locationId]);
        
        // Calculate summary
        $summary = [
            'total_stock' => array_sum(array_column($batches, 'batch_quantity')),
            'total_batches' => count($batches),
            'available_batches' => count(array_filter($batches, function($item) {
                return $item['status'] === 'Available';
            })),
            'consumed_batches' => count(array_filter($batches, function($item) {
                return $item['status'] === 'Consumed';
            }))
        ];
        
        return [
            'batch_details' => $batches,
            'summary' => $summary
        ];
    }
    
    /**
     * Get all batches for a product
     */
    public function getProductBatches($productId) {
        $sql = "
            SELECT DISTINCT
                fs.batch_id,
                fs.batch_reference,
                fs.available_quantity,
                fs.unit_cost,
                fs.srp,
                fs.expiration_date,
                fs.entry_date,
                l.location_name
            FROM tbl_fifo_stock fs
            LEFT JOIN tbl_location l ON fs.location_id = l.location_id
            WHERE fs.product_id = ?
            ORDER BY fs.entry_date ASC
        ";
        
        return $this->db->select($sql, [$productId]);
    }
    
    /**
     * Get batches by location
     */
    public function getBatchesByLocation($locationId) {
        $sql = "
            SELECT 
                fs.batch_id,
                fs.batch_reference,
                fs.available_quantity,
                fs.unit_cost,
                fs.srp,
                fs.expiration_date,
                fs.entry_date,
                p.product_name,
                p.barcode,
                l.location_name
            FROM tbl_fifo_stock fs
            LEFT JOIN tbl_product p ON fs.product_id = p.product_id
            LEFT JOIN tbl_location l ON fs.location_id = l.location_id
            WHERE fs.location_id = ?
            ORDER BY fs.entry_date DESC
        ";
        
        return $this->db->select($sql, [$locationId]);
    }
    
    /**
     * Create new batch entry
     */
    public function createBatchEntry($data) {
        $requiredFields = ['batch_reference', 'product_id', 'quantity', 'location_id'];
        $errors = InputHelper::validateRequired($data, $requiredFields);
        
        if (!empty($errors)) {
            ApiResponse::validationError($errors);
        }
        
        $sql = "
            INSERT INTO tbl_fifo_stock 
            (product_id, batch_reference, available_quantity, unit_cost, srp, expiration_date, entry_date, location_id)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
        ";
        
        $params = [
            InputHelper::getInt($data['product_id']),
            InputHelper::sanitize($data['batch_reference']),
            InputHelper::getInt($data['quantity']),
            InputHelper::getFloat($data['unit_cost'] ?? 0),
            InputHelper::getFloat($data['srp'] ?? 0),
            $data['expiration_date'] ?? null,
            InputHelper::getInt($data['location_id'])
        ];
        
        $batchId = $this->db->insert($sql, $params);
        
        return [
            'batch_id' => $batchId,
            'batch_reference' => $data['batch_reference']
        ];
    }
    
    /**
     * Update batch quantity
     */
    public function updateBatchQuantity($batchId, $newQuantity) {
        $sql = "UPDATE tbl_fifo_stock SET available_quantity = ? WHERE batch_id = ?";
        $affectedRows = $this->db->update($sql, [InputHelper::getInt($newQuantity), InputHelper::getInt($batchId)]);
        
        if ($affectedRows === 0) {
            ApiResponse::notFound('Batch not found');
        }
        
        return $affectedRows;
    }
    
    /**
     * Consume batch stock (reduce quantity)
     */
    public function consumeBatchStock($batchId, $quantityToConsume) {
        $this->db->beginTransaction();
        
        try {
            // Get current quantity
            $currentBatch = $this->db->selectOne(
                "SELECT available_quantity FROM tbl_fifo_stock WHERE batch_id = ?", 
                [InputHelper::getInt($batchId)]
            );
            
            if (!$currentBatch) {
                ApiResponse::notFound('Batch not found');
            }
            
            $currentQuantity = InputHelper::getInt($currentBatch['available_quantity']);
            $consumeQuantity = InputHelper::getInt($quantityToConsume);
            
            if ($consumeQuantity > $currentQuantity) {
                ApiResponse::error('Insufficient stock. Available: ' . $currentQuantity);
            }
            
            $newQuantity = $currentQuantity - $consumeQuantity;
            $this->updateBatchQuantity($batchId, $newQuantity);
            
            $this->db->commit();
            
            return [
                'batch_id' => $batchId,
                'consumed_quantity' => $consumeQuantity,
                'remaining_quantity' => $newQuantity
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            ApiResponse::error('Failed to consume batch stock: ' . $e->getMessage());
        }
    }
    
    /**
     * Get batch summary statistics
     */
    public function getBatchSummary($productId = null, $locationId = null) {
        $whereConditions = [];
        $params = [];
        
        if ($productId) {
            $whereConditions[] = "fs.product_id = ?";
            $params[] = InputHelper::getInt($productId);
        }
        
        if ($locationId) {
            $whereConditions[] = "fs.location_id = ?";
            $params[] = InputHelper::getInt($locationId);
        }
        
        $whereClause = !empty($whereConditions) ? "WHERE " . implode(" AND ", $whereConditions) : "";
        
        $sql = "
            SELECT 
                COUNT(*) as total_batches,
                SUM(fs.available_quantity) as total_quantity,
                AVG(fs.unit_cost) as avg_unit_cost,
                AVG(fs.srp) as avg_srp,
                COUNT(DISTINCT fs.product_id) as unique_products,
                COUNT(DISTINCT fs.location_id) as unique_locations
            FROM tbl_fifo_stock fs
            {$whereClause}
        ";
        
        return $this->db->selectOne($sql, $params);
    }
}
?>
