<?php
/**
 * Local Development Configuration
 * Copy this to .env in the backend directory for local development
 */

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_PORT', '3306');
define('DB_DATABASE', 'enguio2');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_CHARSET', 'utf8mb4');

// Application Environment
define('APP_ENV', 'development');

// CORS Configuration - Allow local development origins
define('CORS_ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://127.0.0.1:3001');

// API Configuration
define('API_BASE_URL', 'http://localhost/caps2w2/backend/Api');
?>
