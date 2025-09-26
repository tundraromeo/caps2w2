<?php
// Modular Backend API
// This file uses separate module files for better organization

// Start output buffering to prevent unwanted output
ob_start();

session_start();

// CORS and content-type headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Disable error display to prevent HTML in JSON response
ini_set('display_errors', 0);
error_reporting(E_ALL);

// Log errors to a file for debugging
ini_set('log_errors', 1);
ini_set('error_log', 'php_errors.log');

// Database connection using PDO
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "enguio2";

try {
    $conn = new PDO("mysql:host=$servername;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Database connection error: " . $e->getMessage()
    ]);
    exit;
}

// Clear any output that might have been generated
ob_clean();

// Read and decode incoming JSON request
$rawData = file_get_contents("php://input");
error_log("Raw input: " . $rawData);

$data = json_decode($rawData, true);

// Check if JSON is valid
if (json_last_error() !== JSON_ERROR_NONE) {
    error_log("JSON decode error: " . json_last_error_msg());
    echo json_encode([
        "success" => false,
        "message" => "Invalid JSON input: " . json_last_error_msg(),
        "raw" => $rawData
    ]);
    exit;
}

// Check if 'action' is set
if (!isset($data['action'])) {
    echo json_encode([
        "success" => false,
        "message" => "Missing action"
    ]);
    exit;
}

// Action handler
$action = $data['action'];
error_log("Processing action: " . $action);

try {
    switch ($action) {
        // Test connection
        case 'test_connection':
            echo json_encode([
                "success" => true,
                "message" => "Modular API connection successful",
                "timestamp" => date('Y-m-d H:i:s'),
                "database" => "Connected to enguio2 database",
                "modules" => ["inventory", "sales", "barcode", "locations", "discounts"]
            ]);
            break;
            
        // Inventory Management
        case 'get_pos_inventory':
            require_once 'modules/inventory.php';
            get_pos_inventory($conn, $data);
            break;
            
        case 'reduce_product_stock':
            require_once 'modules/inventory.php';
            reduce_product_stock($conn, $data);
            break;
            
        case 'update_product_stock':
            require_once 'modules/inventory.php';
            update_product_stock($conn, $data);
            break;
            
        // Sales Management
        case 'save_pos_sale':
            require_once 'modules/sales.php';
            save_pos_sale($conn, $data);
            break;
            
        case 'get_today_sales':
            require_once 'modules/sales.php';
            get_today_sales($conn, $data);
            break;
            
        case 'get_recent_transactions':
            require_once 'modules/sales.php';
            get_recent_transactions($conn, $data);
            break;
            
        // Barcode Management
        case 'check_barcode':
            require_once 'modules/barcode.php';
            check_barcode($conn, $data);
            break;
            
        // Location Management
        case 'get_locations':
            require_once 'modules/locations.php';
            get_locations($conn, $data);
            break;
            
        // Discount Management
        case 'get_discounts':
            require_once 'modules/discounts.php';
            get_discounts($conn, $data);
            break;
            
        // Default case for unknown actions
        default:
            echo json_encode([
                "success" => false,
                "message" => "Unknown action: $action",
                "available_actions" => [
                    "test_connection",
                    "get_pos_inventory",
                    "reduce_product_stock", 
                    "update_product_stock",
                    "save_pos_sale",
                    "get_today_sales",
                    "get_recent_transactions",
                    "check_barcode",
                    "get_locations",
                    "get_discounts"
                ]
            ]);
            break;
    }
} catch (Exception $e) {
    echo json_encode([
        "success" => false,
        "message" => "Server error: " . $e->getMessage()
    ]);
}

// Flush the output buffer to ensure clean JSON response
ob_end_flush();
?>
