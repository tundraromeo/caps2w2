<?php
/**
 * Product Units API
 * Handles multi-unit product operations (tablets, packs, boxes)
 */

// Include proper CORS configuration
require_once __DIR__ . '/cors.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/conn.php';

try {
    $conn = getDatabaseConnection();
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Database connection failed: " . $e->getMessage()
    ]);
    exit();
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);

if (json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid JSON input"
    ]);
    exit();
}

$action = $data['action'] ?? '';

try {
    switch ($action) {
        
        /**
         * Get all units for a specific product
         */
        case 'get_product_units':
            $product_id = $data['product_id'] ?? 0;
            
            if (!$product_id) {
                echo json_encode([
                    "success" => false,
                    "message" => "Product ID is required"
                ]);
                break;
            }
            
            $stmt = $conn->prepare("
                SELECT 
                    pu.unit_id,
                    pu.product_id,
                    pu.unit_name,
                    pu.unit_quantity,
                    pu.unit_price,
                    pu.is_base_unit,
                    pu.barcode,
                    pu.status,
                    p.product_name,
                    p.allow_multi_unit,
                    p.default_unit,
                    -- Calculate available stock in this unit
                    FLOOR(
                        COALESCE(
                            (SELECT SUM(tbd.quantity) 
                             FROM tbl_transfer_batch_details tbd 
                             WHERE tbd.product_id = p.product_id
                            ),
                            0
                        ) / pu.unit_quantity
                    ) as available_in_unit
                FROM tbl_product_units pu
                JOIN tbl_product p ON pu.product_id = p.product_id
                WHERE pu.product_id = ? 
                AND pu.status = 'active'
                ORDER BY pu.unit_quantity ASC
            ");
            
            $stmt->execute([$product_id]);
            $units = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                "success" => true,
                "data" => $units,
                "count" => count($units)
            ]);
            break;
            
        /**
         * Get products with their units for POS
         */
        case 'get_products_with_units':
            $location_name = $data['location_name'] ?? 'Convenience Store';
            $search = $data['search'] ?? '';
            
            $where = "l.location_name LIKE ?";
            $params = ["%$location_name%"];
            
            if (!empty($search)) {
                $where .= " AND (p.product_name LIKE ? OR p.barcode LIKE ? OR pu.barcode LIKE ?)";
                $searchParam = "%$search%";
                $params = array_merge($params, [$searchParam, $searchParam, $searchParam]);
            }
            
            $stmt = $conn->prepare("
                SELECT 
                    p.product_id,
                    p.product_name,
                    p.barcode as product_barcode,
                    p.allow_multi_unit,
                    p.default_unit,
                    c.category_name,
                    b.brand,
                    l.location_name,
                    -- Get total stock in base units
                    COALESCE(
                        (SELECT SUM(tbd.quantity) 
                         FROM tbl_transfer_batch_details tbd 
                         WHERE tbd.product_id = p.product_id 
                         AND tbd.location_id = l.location_id
                        ),
                        0
                    ) as total_base_quantity,
                    -- Get units as JSON array
                    CONCAT('[',
                        GROUP_CONCAT(
                            DISTINCT
                            JSON_OBJECT(
                                'unit_id', pu.unit_id,
                                'unit_name', pu.unit_name,
                                'unit_quantity', pu.unit_quantity,
                                'unit_price', pu.unit_price,
                                'is_base_unit', pu.is_base_unit,
                                'barcode', pu.barcode,
                                'available_stock', FLOOR(
                                    COALESCE(
                                        (SELECT SUM(tbd.quantity) 
                                         FROM tbl_transfer_batch_details tbd 
                                         WHERE tbd.product_id = p.product_id 
                                         AND tbd.location_id = l.location_id
                                        ),
                                        0
                                    ) / pu.unit_quantity
                                )
                            )
                            ORDER BY pu.unit_quantity ASC
                            SEPARATOR ','
                        ),
                    ']') as units
                FROM tbl_product p
                LEFT JOIN tbl_category c ON p.category_id = c.category_id
                LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
                LEFT JOIN tbl_location l ON p.location_id = l.location_id
                LEFT JOIN tbl_product_units pu ON p.product_id = pu.product_id AND pu.status = 'active'
                WHERE $where
                AND p.status = 'active'
                AND p.allow_multi_unit = 1
                GROUP BY p.product_id
                HAVING total_base_quantity > 0
                ORDER BY p.product_name ASC
            ");
            
            $stmt->execute($params);
            $products = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Parse JSON units for each product
            foreach ($products as &$product) {
                $product['units'] = json_decode($product['units'], true) ?? [];
            }
            
            echo json_encode([
                "success" => true,
                "data" => $products,
                "count" => count($products)
            ]);
            break;
            
        /**
         * Add or update product units
         */
        case 'save_product_units':
            $product_id = $data['product_id'] ?? 0;
            $units = $data['units'] ?? [];
            
            if (!$product_id || empty($units)) {
                echo json_encode([
                    "success" => false,
                    "message" => "Product ID and units are required"
                ]);
                break;
            }
            
            $conn->beginTransaction();
            
            try {
                // Enable multi-unit for the product
                $updateProduct = $conn->prepare("
                    UPDATE tbl_product 
                    SET allow_multi_unit = 1, 
                        default_unit = ? 
                    WHERE product_id = ?
                ");
                $updateProduct->execute([$units[0]['unit_name'] ?? 'piece', $product_id]);
                
                // Delete existing units
                $deleteUnits = $conn->prepare("DELETE FROM tbl_product_units WHERE product_id = ?");
                $deleteUnits->execute([$product_id]);
                
                // Insert new units
                $insertUnit = $conn->prepare("
                    INSERT INTO tbl_product_units 
                    (product_id, unit_name, unit_quantity, unit_price, is_base_unit, barcode, status) 
                    VALUES (?, ?, ?, ?, ?, ?, 'active')
                ");
                
                foreach ($units as $unit) {
                    $insertUnit->execute([
                        $product_id,
                        $unit['unit_name'],
                        $unit['unit_quantity'],
                        $unit['unit_price'],
                        $unit['is_base_unit'] ?? 0,
                        $unit['barcode'] ?? null
                    ]);
                }
                
                $conn->commit();
                
                echo json_encode([
                    "success" => true,
                    "message" => "Product units saved successfully"
                ]);
                
            } catch (Exception $e) {
                $conn->rollBack();
                throw $e;
            }
            break;
            
        /**
         * Bulk add standard units for all medicine products
         */
        case 'bulk_add_standard_units':
            $conn->beginTransaction();
            
            try {
                // First, ensure all medicine products have allow_multi_unit enabled
                $updateProduct = $conn->prepare("
                    UPDATE tbl_product 
                    SET allow_multi_unit = 1, default_unit = 'tablet'
                    WHERE product_type = 'Medicine'
                ");
                $updateProduct->execute();
                
                // Remove any existing units for medicine products to avoid duplicates
                $deleteUnits = $conn->prepare("
                    DELETE FROM tbl_product_units 
                    WHERE product_id IN (
                        SELECT product_id FROM tbl_product WHERE product_type = 'Medicine'
                    )
                ");
                $deleteUnits->execute();
                
                // Add Tablet as base unit (quantity = 1)
                $insertTablet = $conn->prepare("
                    INSERT INTO tbl_product_units (product_id, unit_name, unit_quantity, is_base_unit, status)
                    SELECT product_id, 'tablet', 1, 1, 'active' 
                    FROM tbl_product 
                    WHERE product_type = 'Medicine'
                ");
                $insertTablet->execute();
                
                // Add Strip unit (quantity = 10 tablets)
                $insertStrip = $conn->prepare("
                    INSERT INTO tbl_product_units (product_id, unit_name, unit_quantity, is_base_unit, status)
                    SELECT product_id, 'strip', 10, 0, 'active' 
                    FROM tbl_product 
                    WHERE product_type = 'Medicine'
                ");
                $insertStrip->execute();
                
                // Add Box unit (quantity = 100 tablets)
                $insertBox = $conn->prepare("
                    INSERT INTO tbl_product_units (product_id, unit_name, unit_quantity, is_base_unit, status)
                    SELECT product_id, 'box', 100, 0, 'active' 
                    FROM tbl_product 
                    WHERE product_type = 'Medicine'
                ");
                $insertBox->execute();
                
                // Get count of products updated
                $countStmt = $conn->prepare("
                    SELECT COUNT(DISTINCT p.product_id) as products_updated,
                           COUNT(pu.unit_id) as total_units_added
                    FROM tbl_product p
                    JOIN tbl_product_units pu ON p.product_id = pu.product_id
                    WHERE p.product_type = 'Medicine'
                ");
                $countStmt->execute();
                $result = $countStmt->fetch(PDO::FETCH_ASSOC);
                
                $conn->commit();
                
                echo json_encode([
                    "success" => true,
                    "message" => "Standard units (Tablet, Strip, Box) added successfully for all medicine products",
                    "data" => $result
                ]);
                
            } catch (Exception $e) {
                $conn->rollBack();
                throw $e;
            }
            break;
            
        /**
         * Calculate unit conversion
         */
        case 'convert_unit':
            $product_id = $data['product_id'] ?? 0;
            $from_unit = $data['from_unit'] ?? '';
            $to_unit = $data['to_unit'] ?? '';
            $quantity = $data['quantity'] ?? 1;
            
            if (!$product_id || !$from_unit || !$to_unit) {
                echo json_encode([
                    "success" => false,
                    "message" => "Product ID, from_unit, and to_unit are required"
                ]);
                break;
            }
            
            $stmt = $conn->prepare("
                SELECT unit_quantity, unit_name 
                FROM tbl_product_units 
                WHERE product_id = ? 
                AND unit_name IN (?, ?)
                AND status = 'active'
            ");
            $stmt->execute([$product_id, $from_unit, $to_unit]);
            $units = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            $from_qty = 1;
            $to_qty = 1;
            
            foreach ($units as $unit) {
                if ($unit['unit_name'] === $from_unit) {
                    $from_qty = $unit['unit_quantity'];
                } elseif ($unit['unit_name'] === $to_unit) {
                    $to_qty = $unit['unit_quantity'];
                }
            }
            
            $converted_quantity = ($quantity * $from_qty) / $to_qty;
            
            echo json_encode([
                "success" => true,
                "data" => [
                    "from_unit" => $from_unit,
                    "to_unit" => $to_unit,
                    "original_quantity" => $quantity,
                    "converted_quantity" => $converted_quantity,
                    "base_quantity" => $quantity * $from_qty
                ]
            ]);
            break;
            
        default:
            echo json_encode([
                "success" => false,
                "message" => "Invalid action: $action"
            ]);
            break;
    }
    
} catch (Exception $e) {
    // error_log("Product Units API Error: " . $e->getMessage());
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}

$conn = null;
?>

