<?php
/**
 * Create the correct .env file for the Enguio system
 */

$envContent = '# ========================================
# ENGUIO System Environment Configuration
# ========================================
# 
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=enguio2
DB_USER=root
DB_PASS=

# Application Configuration
APP_ENV=development
APP_DEBUG=true

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002

# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost/caps2e2/Api

# Session Configuration
SESSION_LIFETIME=3600
SESSION_NAME=ENGUIO_SESSION

# Security
SECRET_KEY=your-secret-key-here

# Logging
LOG_ERRORS=true
ERROR_LOG_PATH=php_errors.log
';

try {
    $result = file_put_contents('.env', $envContent);
    if ($result !== false) {
        echo "✅ .env file created successfully!\n";
        echo "📁 Location: " . realpath('.env') . "\n";
        echo "📝 Content preview:\n";
        echo substr($envContent, 0, 200) . "...\n";
    } else {
        echo "❌ Failed to create .env file\n";
    }
} catch (Exception $e) {
    echo "❌ Error creating .env file: " . $e->getMessage() . "\n";
}
?>
