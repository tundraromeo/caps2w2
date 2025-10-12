<?php
/**
 * Unified Database Connection
 * Single source of truth for all database connections
 * Uses environment variables from .env file
 */

// Load configuration
require_once __DIR__ . '/config.php';

// Get database credentials from configuration
$servername = Config::get('DB_HOST');
$port = Config::get('DB_PORT');
$dbname = Config::get('DB_NAME');
$username = Config::get('DB_USERNAME');
$password = Config::get('DB_PASSWORD');
$charset = Config::get('DB_CHARSET');
$socket = Config::get('DB_SOCKET');

// Create PDO connection (primary connection type)
try {
    // Use socket if provided, otherwise use host and port
    if (!empty($socket)) {
        $dsn = "mysql:unix_socket=$socket;dbname=$dbname;charset=$charset";
    } else {
        $dsn = "mysql:host=$servername;port=$port;dbname=$dbname;charset=$charset";
    }
    
    $conn = new PDO($dsn, $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES $charset",
        PDO::ATTR_TIMEOUT => 10, // Connection timeout in seconds
        PDO::MYSQL_ATTR_USE_BUFFERED_QUERY => true
    ]);
    
} catch(PDOException $e) {
    // Log error securely without exposing credentials
    error_log("Database connection failed: " . $e->getMessage());

    header("Content-Type: application/json");

    echo json_encode([
        "success" => false,
        "message" => Config::isDebug()
            ? "Connection failed: " . $e->getMessage()
            : "Database connection failed. Please contact support."
    ]);
    exit;
}

/**
 * Helper function to get PDO database connection
 * Provides singleton pattern for efficiency
 * 
 * @return PDO Database connection object
 */
function getDatabaseConnection() {
    global $conn;
    return $conn;
}

/**
 * Helper function to get MySQLi connection (for legacy files like login.php)
 * Creates MySQLi connection with same credentials from .env
 * 
 * @return mysqli MySQLi connection object
 */
function getMySQLiConnection() {
    global $servername, $username, $password, $dbname, $port, $charset;
    
    try {
        $mysqli_conn = new mysqli($servername, $username, $password, $dbname, $port);
        
        if ($mysqli_conn->connect_error) {
            throw new Exception("Connection failed: " . $mysqli_conn->connect_error);
        }
        
        $mysqli_conn->set_charset($charset);
        return $mysqli_conn;
        
    } catch(Exception $e) {
        error_log("MySQLi connection failed: " . $e->getMessage());

        header("Content-Type: application/json");

        echo json_encode([
            "success" => false,
            "message" => Config::isDebug()
                ? "Connection failed: " . $e->getMessage()
                : "Database connection failed. Please contact support."
        ]);
        exit;
    }
}
?>