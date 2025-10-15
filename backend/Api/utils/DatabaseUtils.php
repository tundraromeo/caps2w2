<?php
/**
 * Centralized Database Utility Functions
 * Eliminates duplicate database connection functions across the codebase
 */

class DatabaseUtils {
    
    /**
     * Get database connection using environment variables
     * @return PDO Database connection
     * @throws Exception If connection fails
     */
    public static function getConnection() {
        // Use the unified connection
        require_once __DIR__ . '/../conn.php';
        global $conn;
        return $conn;
    }
    
    /**
     * Setup API environment (headers, CORS, etc.)
     * Uses environment-based CORS configuration
     */
    public static function setupApiEnvironment() {
        // Start output buffering to prevent unwanted output
        ob_start();

        session_start();

        // Load environment for CORS
        require_once __DIR__ . '/../../simple_dotenv.php';
        $dotenv = new SimpleDotEnv(__DIR__ . '/../..');
        try {
            $dotenv->load();
        } catch (Exception $e) {
            // .env not loaded, will use defaults
        }

        // Get allowed origins from .env
        if (!isset($_ENV['CORS_ALLOWED_ORIGINS']) || empty($_ENV['CORS_ALLOWED_ORIGINS'])) {
            error_log("WARNING: CORS_ALLOWED_ORIGINS not set in .env file. Using development defaults.");
            $corsOriginsEnv = 'http://localhost:3000,http://localhost:3001';
        } else {
            $corsOriginsEnv = $_ENV['CORS_ALLOWED_ORIGINS'];
        }

        $allowedOrigins = array_map('trim', explode(',', $corsOriginsEnv));
        $requestOrigin = $_SERVER['HTTP_ORIGIN'] ?? '';

        if (!empty($requestOrigin) && in_array($requestOrigin, $allowedOrigins)) {
            $corsOrigin = $requestOrigin;
        } else {
            $corsOrigin = $allowedOrigins[0] ?? 'http://localhost:3000';
        }

        // CORS headers
        header("Access-Control-Allow-Origin: $corsOrigin");
        header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization");
        header("Access-Control-Allow-Credentials: true");
        header("Content-Type: application/json");

        // Disable error display to prevent HTML in JSON response
        ini_set('display_errors', 0);
        error_reporting(E_ALL);

        // Log errors to a file for debugging
        ini_set('log_errors', 1);
        ini_set('error_log', __DIR__ . '/../logs/php_errors.log');
    }
    
    /**
     * Clean output buffer
     */
    public static function cleanOutputBuffer() {
        ob_clean();
    }
    
    /**
     * Validate and decode JSON input
     * @return array Decoded JSON data
     * @throws Exception If JSON is invalid
     */
    public static function getJsonInput() {
        $rawData = file_get_contents("php://input");
        
        $data = json_decode($rawData, true);

        // Check if JSON is valid
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Invalid JSON input: " . json_last_error_msg());
        }

        return $data;
    }
    
    /**
     * Validate that action is provided in data
     * @param array $data Input data
     * @return string Action name
     * @throws Exception If action is missing
     */
    public static function validateAction($data) {
        if (!isset($data['action'])) {
            throw new Exception("Missing action");
        }
        return $data['action'];
    }
}
?>
