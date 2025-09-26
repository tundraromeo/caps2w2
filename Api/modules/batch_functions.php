<?php
/**
 * Batch-related functions for Inventory Transfer System
 * This file contains all batch-related database operations
 */

/**
 * Get transfer batch details for a specific transfer
 */
function getTransferBatchDetails($conn, $data) {
    try {
        $transfer_id = $data['transfer_id'] ?? 0;
        $product_id = $data['product_id'] ?? 0;
        $location_id = $data['location_id'] ?? 0;
        
        // Check if this is for inventory (transfer_id) or store (product_id + location_id)
        if ($transfer_id) {
            // For InventoryTransfer modal - get batch details for specific transfer
            $stmt = $conn->prepare("
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
            ");
            $stmt->execute([$transfer_id, $transfer_id]);
            $batch_details = $stmt->fetchAll(PDO::FETCH_ASSOC);
            return ["success" => true, "data" => $batch_details];
        } elseif ($product_id && $location_id) {
            // For ConvenienceStore and PharmacyInventory modals - get individual batches from tbl_transfer_batch_details
            $stmt = $conn->prepare("
                SELECT 
                    tbd.id as batch_transfer_id,
                    tbd.batch_id,
                    tbd.batch_reference,
                    tbd.quantity as batch_quantity,
                    tbd.srp as batch_srp,
                    tbd.expiration_date,
                    'Consumed' as status,
                    th.date as transfer_date,
                    p.product_name,
                    p.barcode,
                    p.unit_price,
                    p.srp,
                    b.brand,
                    s.supplier_name,
                    l.location_name as location_name,
                    sl.location_name as source_location_name,
                    CONCAT(e.Fname, ' ', e.Lname) as employee_name
                FROM tbl_transfer_batch_details tbd
                JOIN tbl_transfer_header th ON tbd.transfer_header_id = th.transfer_header_id
                JOIN tbl_transfer_dtl td ON th.transfer_header_id = td.transfer_header_id
                JOIN tbl_product p ON td.product_id = p.product_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
                LEFT JOIN tbl_location l ON th.destination_location_id = l.location_id
                LEFT JOIN tbl_location sl ON th.source_location_id = sl.location_id
                LEFT JOIN tbl_employee e ON th.employee_id = e.emp_id
                WHERE td.product_id = ? AND th.destination_location_id = ?
                ORDER BY tbd.id ASC
            ");
            $stmt->execute([$product_id, $location_id]);
            $batch_details = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Calculate totals for store modals
            $total_stock = array_sum(array_column($batch_details, 'batch_quantity'));
            $total_batches = count($batch_details);
            $active_batches = count(array_filter($batch_details, function($item) {
                return $item['status'] === 'Available';
            }));
            $consumed_batches = count(array_filter($batch_details, function($item) {
                return $item['status'] === 'Consumed';
            }));
            
            // Get unique SRP
            $srp = $batch_details[0]['batch_srp'] ?? 0;
            
            $response_data = [
                'batch_details' => $batch_details,
                'summary' => [
                    'total_stock' => $total_stock,
                    'total_transfer_quantity' => $total_stock,
                    'srp' => $srp,
                    'total_batches' => $total_batches,
                    'active_batches' => $active_batches,
                    'consumed_batches' => $consumed_batches
                ]
            ];
            
            return ["success" => true, "data" => $response_data];
        } else {
            return ["success" => false, "message" => "Either Transfer ID or Product ID + Location ID is required"];
        }
    } catch (Exception $e) {
        return ["success" => false, "message" => "Database error: " . $e->getMessage(), "data" => []];
    }
}

/**
 * Get individual batch details for a product (using tbl_batch_transfer_details)
 */
function getIndividualBatchDetails($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? 0;
        $location_id = $data['location_id'] ?? 0;
        
        if (!$product_id || !$location_id) {
            return ["success" => false, "message" => "Product ID and Location ID are required"];
        }
        
        // Get individual batches from tbl_batch_transfer_details for a specific product and location
        $stmt = $conn->prepare("
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
                l.location_name as location_name
            FROM tbl_batch_transfer_details btd
            LEFT JOIN tbl_product p ON btd.product_id = p.product_id
            LEFT JOIN tbl_location l ON btd.location_id = l.location_id
            WHERE btd.product_id = ? AND btd.location_id = ?
            ORDER BY btd.batch_transfer_id ASC
        ");
        $stmt->execute([$product_id, $location_id]);
        $batch_details = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return ["success" => true, "data" => $batch_details];
    } catch (Exception $e) {
        return ["success" => false, "message" => "Database error: " . $e->getMessage(), "data" => []];
    }
}

/**
 * Get batch transfer details by product (using tbl_batch_transfer_details)
 */
function getBatchTransferDetailsByProduct($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? 0;
        $location_id = $data['location_id'] ?? 0;
        
        if (!$product_id || !$location_id) {
            return ['success' => false, 'message' => 'Product ID and Location ID are required'];
        }
        
        // Get individual batches from tbl_batch_transfer_details for modal display
        $stmt = $conn->prepare("
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
                p.unit_price,
                p.srp,
                b.brand,
                s.supplier_name,
                l.location_name
            FROM tbl_batch_transfer_details btd
            LEFT JOIN tbl_product p ON btd.product_id = p.product_id
            LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
            LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
            LEFT JOIN tbl_location l ON btd.location_id = l.location_id
            WHERE btd.product_id = ? AND btd.location_id = ?
            ORDER BY btd.batch_transfer_id ASC
        ");
        $stmt->execute([$product_id, $location_id]);
        $batch_details = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Calculate summary for modal
        $total_stock = array_sum(array_column($batch_details, 'batch_quantity'));
        $total_batches = count($batch_details);
        $available_batches = count(array_filter($batch_details, function($item) {
            return $item['status'] === 'Available';
        }));
        $consumed_batches = count(array_filter($batch_details, function($item) {
            return $item['status'] === 'Consumed';
        }));
        
        $response_data = [
            'batch_details' => $batch_details,
            'summary' => [
                'total_stock' => $total_stock,
                'total_batches' => $total_batches,
                'available_batches' => $available_batches,
                'consumed_batches' => $consumed_batches
            ]
        ];
        
        return ["success" => true, "data" => $response_data];
    } catch (Exception $e) {
        return ["success" => false, "message" => "Database error: " . $e->getMessage(), "data" => []];
    }
}

/**
 * Get batch transfers by location (using tbl_batch_transfer_details)
 */
function getBatchTransfersByLocation($conn, $data) {
    try {
        $location_id = $data['location_id'] ?? 0;
        $location_name = $data['location_name'] ?? '';
        
        if (!$location_id && !$location_name) {
            return ['success' => false, 'message' => 'Location ID or Location Name is required'];
        }
        
        // Get location ID if only name provided
        if ($location_name && !$location_id) {
            $locStmt = $conn->prepare("SELECT location_id FROM tbl_location WHERE location_name LIKE ?");
            $locStmt->execute(["%$location_name%"]);
            $location = $locStmt->fetch(PDO::FETCH_ASSOC);
            if ($location) {
                $location_id = $location['location_id'];
            } else {
                return ['success' => false, 'message' => 'Location not found'];
            }
        }
        
        // Get all batch transfers for this location with detailed information
        $stmt = $conn->prepare("
            SELECT 
                btd.batch_transfer_id,
                btd.product_id,
                btd.batch_id,
                btd.batch_reference,
                btd.quantity_used as batch_quantity,
                btd.unit_cost,
                btd.srp as batch_srp,
                btd.expiration_date,
                btd.status,
                btd.transfer_date,
                btd.created_at,
                p.product_name,
                p.barcode,
                p.category,
                p.unit_price,
                p.srp as product_srp,
                b.brand,
                s.supplier_name,
                l.location_name,
                sl.location_name as source_location_name,
                dl.location_name as destination_location_name,
                th.transfer_header_id,
                th.date as transfer_header_date,
                th.status as transfer_status,
                CONCAT(e.Fname, ' ', e.Lname) as employee_name
            FROM tbl_batch_transfer_details btd
            LEFT JOIN tbl_product p ON btd.product_id = p.product_id
            LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
            LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
            LEFT JOIN tbl_location l ON btd.location_id = l.location_id
            LEFT JOIN tbl_transfer_header th ON btd.transfer_id = th.transfer_header_id
            LEFT JOIN tbl_location sl ON th.source_location_id = sl.location_id
            LEFT JOIN tbl_location dl ON th.destination_location_id = dl.location_id
            LEFT JOIN tbl_employee e ON th.employee_id = e.emp_id
            WHERE btd.location_id = ?
            ORDER BY btd.transfer_date DESC
        ");
        $stmt->execute([$location_id]);
        $batch_transfers = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return ['success' => true, 'data' => $batch_transfers];
    } catch (Exception $e) {
        return ['success' => false, 'message' => 'Database error: ' . $e->getMessage(), 'data' => []];
    }
}

/**
 * Create transfer batch details table
 */
function createTransferBatchDetailsTable($conn) {
    try {
        // First create the transfer_log table if it doesn't exist
        $create_transfer_log_sql = "
            CREATE TABLE IF NOT EXISTS `tbl_transfer_log` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `transfer_id` int(11) NOT NULL,
                `product_id` int(11) NOT NULL,
                `quantity` int(11) NOT NULL,
                `from_location` varchar(255) NOT NULL,
                `to_location` varchar(255) NOT NULL,
                `transfer_date` datetime NOT NULL,
                `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `transfer_id` (`transfer_id`),
                KEY `product_id` (`product_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        $conn->exec($create_transfer_log_sql);
        
        // Create the transfer batch details table if it doesn't exist
        $create_table_sql = "
            CREATE TABLE IF NOT EXISTS `tbl_transfer_batch_details` (
                `id` int(11) NOT NULL AUTO_INCREMENT,
                `product_id` int(11) NOT NULL,
                `batch_id` int(11) NOT NULL,
                `batch_reference` varchar(255) NOT NULL,
                `quantity` int(11) NOT NULL,
                `srp` decimal(10,2) NOT NULL,
                `expiration_date` date DEFAULT NULL,
                `transfer_header_id` int(11) NOT NULL,
                `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (`id`),
                KEY `product_id` (`product_id`),
                KEY `batch_id` (`batch_id`),
                KEY `transfer_header_id` (`transfer_header_id`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        ";
        $conn->exec($create_table_sql);
        
        // Add missing product_id column if it doesn't exist
        try {
            $conn->exec("ALTER TABLE tbl_transfer_batch_details ADD COLUMN product_id int(11) NOT NULL AFTER id");
            $conn->exec("ALTER TABLE tbl_transfer_batch_details ADD KEY product_id (product_id)");
            error_log("Added product_id column to tbl_transfer_batch_details table");
        } catch (Exception $e) {
            // Column might already exist, ignore error
            error_log("Product_id column addition: " . $e->getMessage());
        }
        
        // Remove transfer_id column from batch details table (not needed since batch details should be independent)
        try {
            $conn->exec("ALTER TABLE tbl_transfer_batch_details DROP COLUMN transfer_id");
            error_log("Removed transfer_id column from tbl_transfer_batch_details table");
        } catch (Exception $e) {
            // Column might already be dropped, ignore error
            error_log("Transfer_id column removal: " . $e->getMessage());
        }
        
        // Populate sample batch details for existing transfers
        $populate_stmt = $conn->prepare("
            INSERT IGNORE INTO tbl_transfer_batch_details 
            (product_id, batch_id, batch_reference, quantity, srp, expiration_date)
            SELECT 
                tl.product_id,
                COALESCE(fs.batch_id, 1) as batch_id,
                CONCAT('BR-', tl.transfer_id, '-', tl.product_id) as batch_reference,
                tl.quantity,
                COALESCE(fs.srp, p.srp, 0) as srp,
                COALESCE(fs.expiration_date, DATE_ADD(CURDATE(), INTERVAL 30 DAY)) as expiration_date
            FROM tbl_transfer_log tl
            LEFT JOIN tbl_fifo_stock fs ON tl.product_id = fs.product_id
            LEFT JOIN tbl_product p ON tl.product_id = p.product_id
            WHERE NOT EXISTS (
                SELECT 1 FROM tbl_transfer_batch_details tbd 
                WHERE tbd.product_id = tl.product_id AND tbd.batch_id = COALESCE(fs.batch_id, 1)
            )
            LIMIT 1
        ");
        $populate_stmt->execute();
        
        return ["success" => true, "message" => "Transfer batch details table created successfully"];
    } catch (Exception $e) {
        return ["success" => false, "message" => "Database error: " . $e->getMessage()];
    }
}

/**
 * Get all batches
 */
function getAllBatches($conn) {
    try {
        $stmt = $conn->prepare("
            SELECT DISTINCT
                b.batch_id,
                b.batch_reference,
                b.product_id,
                p.product_name,
                b.quantity,
                b.srp,
                b.expiration_date,
                b.entry_date,
                l.location_name
            FROM tbl_fifo_stock b
            LEFT JOIN tbl_product p ON b.product_id = p.product_id
            LEFT JOIN tbl_location l ON b.location_id = l.location_id
            ORDER BY b.entry_date DESC
        ");
        $stmt->execute();
        $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return ["success" => true, "data" => $batches];
    } catch (Exception $e) {
        return ["success" => false, "message" => "Database error: " . $e->getMessage(), "data" => []];
    }
}

/**
 * Get product batches
 */
function getProductBatches($conn, $data) {
    try {
        $product_id = $data['product_id'] ?? 0;
        
        $stmt = $conn->prepare("
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
        ");
        $stmt->execute([$product_id]);
        $batches = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return ["success" => true, "data" => $batches];
    } catch (Exception $e) {
        return ["success" => false, "message" => "Database error: " . $e->getMessage(), "data" => []];
    }
}

/**
 * Duplicate product batches
 */
function duplicateProductBatches($conn, $data) {
    try {
        $product_id = isset($data['product_id']) ? intval($data['product_id']) : 0;
        $batch_ids = isset($data['batch_ids']) ? $data['batch_ids'] : [22, 23]; // Default to your batch IDs
        
        if ($product_id <= 0) {
            return ["success" => false, "message" => "Invalid product ID"];
        }
        
        $duplicated_batches = [];
        
        foreach ($batch_ids as $batch_id) {
            // Get the original batch details
            $stmt = $conn->prepare("
                SELECT batch_reference, available_quantity, unit_cost, srp, expiration_date, entry_date, location_id
                FROM tbl_fifo_stock 
                WHERE batch_id = ?
            ");
            $stmt->execute([$batch_id]);
            $original_batch = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($original_batch) {
                // Create a new batch with the same details but for the new product
                $new_batch_reference = $original_batch['batch_reference'] . '-COPY-' . $product_id;
                
                $insert_stmt = $conn->prepare("
                    INSERT INTO tbl_fifo_stock 
                    (product_id, batch_reference, available_quantity, unit_cost, srp, expiration_date, entry_date, location_id)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                ");
                
                $insert_stmt->execute([
                    $product_id,
                    $new_batch_reference,
                    $original_batch['available_quantity'],
                    $original_batch['unit_cost'],
                    $original_batch['srp'],
                    $original_batch['expiration_date'],
                    $original_batch['entry_date'],
                    $original_batch['location_id']
                ]);
                
                $new_batch_id = $conn->lastInsertId();
                $duplicated_batches[] = [
                    'original_batch_id' => $batch_id,
                    'new_batch_id' => $new_batch_id,
                    'batch_reference' => $new_batch_reference
                ];
            }
        }
        
        return [
            "success" => true, 
            "message" => "Batches duplicated successfully",
            "duplicated_batches" => $duplicated_batches
        ];
    } catch (Exception $e) {
        return ["success" => false, "message" => "Database error: " . $e->getMessage()];
    }
}

/**
 * Add batch entry
 */
function addBatchEntry($conn, $data) {
    try {
        // Extract batch data
        $batch_reference = $data['batch_reference'] ?? '';
        $product_id = $data['product_id'] ?? 0;
        $quantity = $data['quantity'] ?? 0;
        $unit_cost = $data['unit_cost'] ?? 0;
        $srp = $data['srp'] ?? 0;
        $expiration_date = $data['expiration_date'] ?? null;
        $location_id = $data['location_id'] ?? 0;
        
        // Validation
        if (empty($batch_reference) || $product_id <= 0 || $quantity <= 0) {
            return ["success" => false, "message" => "Missing required fields: batch_reference, product_id, quantity"];
        }
        
        // Insert new batch
        $stmt = $conn->prepare("
            INSERT INTO tbl_fifo_stock 
            (product_id, batch_reference, available_quantity, unit_cost, srp, expiration_date, entry_date, location_id)
            VALUES (?, ?, ?, ?, ?, ?, NOW(), ?)
        ");
        
        $stmt->execute([
            $product_id,
            $batch_reference,
            $quantity,
            $unit_cost,
            $srp,
            $expiration_date,
            $location_id
        ]);
        
        $batch_id = $conn->lastInsertId();
        
        return [
            "success" => true,
            "message" => "Batch entry added successfully",
            "batch_id" => $batch_id,
            "batch_reference" => $batch_reference
        ];
    } catch (Exception $e) {
        return ["success" => false, "message" => "Database error: " . $e->getMessage()];
    }
}

/**
 * Get products oldest batch for transfer
 */
function getProductsOldestBatchForTransfer($conn, $data) {
    try {
        $location_id = $data['location_id'] ?? null;
        
        $sql = "
            SELECT 
                p.product_id,
                p.product_name,
                p.barcode,
                p.unit_price,
                p.srp,
                fs.batch_id,
                fs.batch_reference,
                fs.available_quantity as oldest_batch_quantity,
                fs.expiration_date,
                fs.entry_date,
                SUM(fs.available_quantity) as total_quantity,
                COUNT(fs.batch_id) as batch_count
            FROM tbl_product p
            LEFT JOIN tbl_fifo_stock fs ON p.product_id = fs.product_id
        ";
        
        if ($location_id) {
            $sql .= " WHERE fs.location_id = ? ";
        }
        
        $sql .= "
            GROUP BY p.product_id, fs.batch_id, fs.batch_reference, fs.available_quantity, fs.expiration_date, fs.entry_date
            HAVING fs.entry_date = (
                SELECT MIN(fs2.entry_date) 
                FROM tbl_fifo_stock fs2 
                WHERE fs2.product_id = p.product_id" . ($location_id ? " AND fs2.location_id = ?" : "") . "
            )
            ORDER BY p.product_name ASC
        ";
        
        $stmt = $conn->prepare($sql);
        
        if ($location_id) {
            $stmt->execute([$location_id, $location_id]);
        } else {
            $stmt->execute();
        }
        
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return ["success" => true, "data" => $products];
    } catch (Exception $e) {
        return ["success" => false, "message" => "Database error: " . $e->getMessage(), "data" => []];
    }
}

/**
 * Get products oldest batch
 */
function getProductsOldestBatch($conn, $data) {
    try {
        $location_id = $data['location_id'] ?? null;
        
        $sql = "
            SELECT 
                p.product_id,
                p.product_name,
                p.barcode,
                p.unit_price,
                p.srp,
                fs.batch_id,
                fs.batch_reference,
                fs.available_quantity,
                fs.expiration_date,
                fs.entry_date,
                SUM(fs.available_quantity) as total_quantity,
                COUNT(fs.batch_id) as batch_count
            FROM tbl_product p
            LEFT JOIN tbl_fifo_stock fs ON p.product_id = fs.product_id
        ";
        
        if ($location_id) {
            $sql .= " WHERE fs.location_id = ? ";
        }
        
        $sql .= "
            GROUP BY p.product_id, fs.batch_id, fs.batch_reference, fs.available_quantity, fs.expiration_date, fs.entry_date
            HAVING fs.entry_date = (
                SELECT MIN(fs2.entry_date) 
                FROM tbl_fifo_stock fs2 
                WHERE fs2.product_id = p.product_id" . ($location_id ? " AND fs2.location_id = ?" : "") . "
            )
            ORDER BY p.product_name ASC
        ";
        
        $stmt = $conn->prepare($sql);
        
        if ($location_id) {
            $stmt->execute([$location_id, $location_id]);
        } else {
            $stmt->execute();
        }
        
        $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return ["success" => true, "data" => $products];
    } catch (Exception $e) {
        return ["success" => false, "message" => "Database error: " . $e->getMessage(), "data" => []];
    }
}
?>
