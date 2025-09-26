<?php
/**
 * Simple Inventory Transfer Service
 * Clean, easy-to-understand transfer operations
 */

require_once 'Database.php';
require_once 'ApiHelper.php';

class InventoryTransferService {
    private $db;
    
    public function __construct() {
        $this->db = new Database();
    }
    
    /**
     * Create a new transfer
     */
    public function createTransfer($data) {
        $requiredFields = ['source_location_id', 'destination_location_id', 'employee_id', 'products'];
        $errors = InputHelper::validateRequired($data, $requiredFields);
        
        if (!empty($errors)) {
            ApiResponse::validationError($errors);
        }
        
        $this->db->beginTransaction();
        
        try {
            // Create transfer header
            $headerSql = "
                INSERT INTO tbl_transfer_header 
                (source_location_id, destination_location_id, employee_id, date, status)
                VALUES (?, ?, ?, NOW(), 'Pending')
            ";
            
            $transferId = $this->db->insert($headerSql, [
                InputHelper::getInt($data['source_location_id']),
                InputHelper::getInt($data['destination_location_id']),
                InputHelper::getInt($data['employee_id'])
            ]);
            
            // Add transfer details
            $totalProducts = 0;
            foreach ($data['products'] as $product) {
                $detailSql = "
                    INSERT INTO tbl_transfer_dtl 
                    (transfer_header_id, product_id, qty)
                    VALUES (?, ?, ?)
                ";
                
                $this->db->insert($detailSql, [
                    $transferId,
                    InputHelper::getInt($product['product_id']),
                    InputHelper::getInt($product['quantity'])
                ]);
                
                $totalProducts++;
            }
            
            $this->db->commit();
            
            return [
                'transfer_id' => $transferId,
                'total_products' => $totalProducts,
                'status' => 'Pending'
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            ApiResponse::error('Failed to create transfer: ' . $e->getMessage());
        }
    }
    
    /**
     * Execute transfer (move products)
     */
    public function executeTransfer($transferId) {
        $this->db->beginTransaction();
        
        try {
            // Get transfer details
            $transfer = $this->getTransferDetails($transferId);
            if (!$transfer) {
                ApiResponse::notFound('Transfer not found');
            }
            
            // Process each product
            foreach ($transfer['products'] as $product) {
                $this->processProductTransfer($product, $transfer);
            }
            
            // Update transfer status
            $this->db->update(
                "UPDATE tbl_transfer_header SET status = 'Completed' WHERE transfer_header_id = ?",
                [$transferId]
            );
            
            $this->db->commit();
            
            return [
                'transfer_id' => $transferId,
                'status' => 'Completed',
                'products_processed' => count($transfer['products'])
            ];
            
        } catch (Exception $e) {
            $this->db->rollback();
            ApiResponse::error('Failed to execute transfer: ' . $e->getMessage());
        }
    }
    
    /**
     * Get transfer details
     */
    public function getTransferDetails($transferId) {
        $sql = "
            SELECT 
                th.transfer_header_id,
                th.source_location_id,
                th.destination_location_id,
                th.employee_id,
                th.date,
                th.status,
                sl.location_name as source_location,
                dl.location_name as destination_location,
                CONCAT(e.Fname, ' ', e.Lname) as employee_name
            FROM tbl_transfer_header th
            LEFT JOIN tbl_location sl ON th.source_location_id = sl.location_id
            LEFT JOIN tbl_location dl ON th.destination_location_id = dl.location_id
            LEFT JOIN tbl_employee e ON th.employee_id = e.emp_id
            WHERE th.transfer_header_id = ?
        ";
        
        $transfer = $this->db->selectOne($sql, [$transferId]);
        if (!$transfer) {
            return null;
        }
        
        // Get transfer products
        $productsSql = "
            SELECT 
                td.product_id,
                td.qty as quantity,
                p.product_name,
                p.barcode,
                p.unit_price,
                p.srp
            FROM tbl_transfer_dtl td
            LEFT JOIN tbl_product p ON td.product_id = p.product_id
            WHERE td.transfer_header_id = ?
        ";
        
        $transfer['products'] = $this->db->select($productsSql, [$transferId]);
        
        return $transfer;
    }
    
    /**
     * Process individual product transfer
     */
    private function processProductTransfer($product, $transfer) {
        $productId = $product['product_id'];
        $quantity = $product['quantity'];
        $sourceLocationId = $transfer['source_location_id'];
        $destinationLocationId = $transfer['destination_location_id'];
        
        // Check available stock
        $availableStock = $this->getAvailableStock($productId, $sourceLocationId);
        
        if ($availableStock < $quantity) {
            throw new Exception("Insufficient stock for product {$product['product_name']}. Available: {$availableStock}, Required: {$quantity}");
        }
        
        // Get FIFO batches for this product
        $batches = $this->getFifoBatches($productId, $sourceLocationId);
        
        $remainingQuantity = $quantity;
        
        // Process batches in FIFO order
        foreach ($batches as $batch) {
            if ($remainingQuantity <= 0) break;
            
            $batchQuantity = min($remainingQuantity, $batch['available_quantity']);
            
            // Reduce source batch quantity
            $this->db->update(
                "UPDATE tbl_fifo_stock SET available_quantity = available_quantity - ? WHERE batch_id = ?",
                [$batchQuantity, $batch['batch_id']]
            );
            
            // Create destination batch (or update if exists)
            $this->createOrUpdateDestinationBatch($batch, $destinationLocationId, $batchQuantity);
            
            // Record batch transfer details
            $this->recordBatchTransfer($transfer['transfer_header_id'], $productId, $batch, $batchQuantity);
            
            $remainingQuantity -= $batchQuantity;
        }
    }
    
    /**
     * Get available stock for a product at a location
     */
    private function getAvailableStock($productId, $locationId) {
        $sql = "
            SELECT SUM(available_quantity) as total_stock
            FROM tbl_fifo_stock
            WHERE product_id = ? AND location_id = ?
        ";
        
        $result = $this->db->selectOne($sql, [$productId, $locationId]);
        return InputHelper::getInt($result['total_stock'] ?? 0);
    }
    
    /**
     * Get FIFO batches for a product at a location
     */
    private function getFifoBatches($productId, $locationId) {
        $sql = "
            SELECT 
                batch_id,
                batch_reference,
                available_quantity,
                unit_cost,
                srp,
                expiration_date,
                entry_date
            FROM tbl_fifo_stock
            WHERE product_id = ? AND location_id = ? AND available_quantity > 0
            ORDER BY entry_date ASC
        ";
        
        return $this->db->select($sql, [$productId, $locationId]);
    }
    
    /**
     * Create or update destination batch
     */
    private function createOrUpdateDestinationBatch($sourceBatch, $destinationLocationId, $quantity) {
        // Check if batch already exists at destination
        $existingBatch = $this->db->selectOne(
            "SELECT batch_id FROM tbl_fifo_stock WHERE batch_reference = ? AND location_id = ?",
            [$sourceBatch['batch_reference'], $destinationLocationId]
        );
        
        if ($existingBatch) {
            // Update existing batch
            $this->db->update(
                "UPDATE tbl_fifo_stock SET available_quantity = available_quantity + ? WHERE batch_id = ?",
                [$quantity, $existingBatch['batch_id']]
            );
        } else {
            // Create new batch
            $this->db->insert(
                "INSERT INTO tbl_fifo_stock (product_id, batch_reference, available_quantity, unit_cost, srp, expiration_date, entry_date, location_id) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)",
                [
                    $sourceBatch['product_id'] ?? null,
                    $sourceBatch['batch_reference'],
                    $quantity,
                    $sourceBatch['unit_cost'],
                    $sourceBatch['srp'],
                    $sourceBatch['expiration_date'],
                    $destinationLocationId
                ]
            );
        }
    }
    
    /**
     * Record batch transfer details
     */
    private function recordBatchTransfer($transferId, $productId, $batch, $quantity) {
        $sql = "
            INSERT INTO tbl_transfer_batch_details 
            (transfer_header_id, product_id, batch_id, batch_reference, quantity, srp, expiration_date)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        ";
        
        $this->db->insert($sql, [
            $transferId,
            $productId,
            $batch['batch_id'],
            $batch['batch_reference'],
            $quantity,
            $batch['srp'],
            $batch['expiration_date']
        ]);
    }
    
    /**
     * Get transfer history
     */
    public function getTransferHistory($limit = 50) {
        $sql = "
            SELECT 
                th.transfer_header_id,
                th.date,
                th.status,
                sl.location_name as source_location,
                dl.location_name as destination_location,
                CONCAT(e.Fname, ' ', e.Lname) as employee_name,
                COUNT(td.product_id) as total_products,
                SUM(td.qty) as total_quantity
            FROM tbl_transfer_header th
            LEFT JOIN tbl_location sl ON th.source_location_id = sl.location_id
            LEFT JOIN tbl_location dl ON th.destination_location_id = dl.location_id
            LEFT JOIN tbl_employee e ON th.employee_id = e.emp_id
            LEFT JOIN tbl_transfer_dtl td ON th.transfer_header_id = td.transfer_header_id
            GROUP BY th.transfer_header_id
            ORDER BY th.date DESC
            LIMIT ?
        ";
        
        return $this->db->select($sql, [$limit]);
    }
}
?>
