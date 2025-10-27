<?php
// CORS headers MUST be first - before any other output
require_once __DIR__ . '/cors.php';
require_once __DIR__ . '/conn.php';

$data = json_decode(file_get_contents('php://input'), true);
$action = $data['action'] ?? null;

$conn = getDatabaseConnection();
$response = null;

switch ($action) {
    case 'check_product_name':
        $response = checkProductNameWarehouse($conn, $data);
        break;
    default:
        $response = ['success' => false, 'error' => 'Unknown action'];
        break;
}

echo json_encode($response);

function checkProductNameWarehouse($conn, $data) {
    try {
        $product_name = $data['product_name'] ?? '';
        $location_name = $data['location_name'] ?? 'WAREHOUSE';
        $location_id = $data['location_id'] ?? null;
        
        // DEBUG: Log the input parameters
        // error_log("DEBUG: checkProductNameWarehouse called with:");
        // error_log("  product_name: " . $product_name);
        // error_log("  location_name: " . $location_name);
        // error_log("  location_id: " . ($location_id ?? 'null'));
        
        if (empty($product_name)) {
            return [
                "success" => false,
                "message" => "Product name is required"
            ];
        }
        
        // Build the query to find product by exact name match in warehouse
        $sql = "
            SELECT 
                p.product_id,
                p.product_name,
                p.category_id,
                c.category_name as category,
                p.barcode,
                p.description,
                COALESCE((SELECT SUM(fs.available_quantity) FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id), 0) as quantity,
                COALESCE((SELECT fs.srp FROM tbl_fifo_stock fs WHERE fs.product_id = p.product_id AND fs.available_quantity > 0 ORDER BY fs.expiration_date ASC LIMIT 1), 0) as srp,
                p.prescription,
                p.bulk,
                p.expiration,
                p.status,
                p.location_id,
                l.location_name,
                p.brand_id,
                COALESCE(b.brand, '') as brand,
                p.supplier_id,
                COALESCE(s.supplier_name, '') as supplier_name,
                p.product_type,
                p.boxes,
                p.strips_per_box,
                p.tablets_per_strip,
                p.pieces_per_pack
            FROM tbl_product p
            LEFT JOIN tbl_category c ON p.category_id = c.category_id
            LEFT JOIN tbl_location l ON p.location_id = l.location_id
            LEFT JOIN tbl_brand b ON p.brand_id = b.brand_id
            LEFT JOIN tbl_supplier s ON p.supplier_id = s.supplier_id
            WHERE p.product_name = ? 
            AND p.status = 'active'
        ";
        
        $params = [$product_name];
        
        // Add location filter if provided
        if ($location_id) {
            $sql .= " AND p.location_id = ?";
            $params[] = $location_id;
        } elseif (!empty($location_name)) {
            $sql .= " AND l.location_name = ?";
            $params[] = $location_name;
        }
        
        // DEBUG: Log the SQL query and parameters
        // error_log("DEBUG: SQL Query: " . $sql);
        // error_log("DEBUG: Parameters: " . json_encode($params));
        
        $stmt = $conn->prepare($sql);
        $stmt->execute($params);
        $product = $stmt->fetch(PDO::FETCH_ASSOC);
        
        // DEBUG: Log the result
        // error_log("DEBUG: Query result: " . ($product ? "FOUND" : "NOT FOUND"));
        if ($product) {
            // error_log("DEBUG: Product found: " . json_encode($product));
        }
        
        if ($product) {
            return [
                "success" => true,
                "found" => true,
                "product" => $product,
                "message" => "Product found in warehouse"
            ];
        } else {
            // DEBUG: Try a LIKE search as fallback to see if there are similar products
            // error_log("DEBUG: Exact match failed, trying LIKE search...");
            $likeSql = str_replace("p.product_name = ?", "LOWER(p.product_name) LIKE LOWER(?)", $sql);
            $likeParams = $params;
            $likeParams[0] = "%{$product_name}%"; // Replace first parameter with LIKE pattern
            
            // error_log("DEBUG: LIKE SQL Query: " . $likeSql);
            // error_log("DEBUG: LIKE Parameters: " . json_encode($likeParams));
            
            $likeStmt = $conn->prepare($likeSql);
            $likeStmt->execute($likeParams);
            $likeProduct = $likeStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($likeProduct) {
                // error_log("DEBUG: LIKE search found product: " . json_encode($likeProduct));
                return [
                    "success" => true,
                    "found" => true,
                    "product" => $likeProduct,
                    "message" => "Product found in warehouse (LIKE search)"
                ];
            }
            
            return [
                "success" => true,
                "found" => false,
                "product" => null,
                "message" => "Product not found in warehouse: $product_name"
            ];
        }
        
    } catch (Exception $e) {
        return [
            "success" => false,
            "message" => "Error checking product name: " . $e->getMessage()
        ];
    }
}
?>
