<?php
/**
 * Simple .env file loader without Composer
 * This is a basic implementation that loads environment variables from .env file
 */

class SimpleDotEnv {
    private $path;
    private $variables = [];
    
    public function __construct($path) {
        $this->path = rtrim($path, '/');
    }
    
    public function load() {
        $file = $this->path . '/.env';
        
        if (!file_exists($file)) {
            throw new Exception('.env file not found at: ' . $file);
        }
        
        $lines = file($file, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        
        foreach ($lines as $line) {
            // Skip comments
            if (strpos(trim($line), '#') === 0) {
                continue;
            }
            
            // Parse KEY=VALUE
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                
                // Remove quotes if present
                if ((substr($value, 0, 1) === '"' && substr($value, -1) === '"') ||
                    (substr($value, 0, 1) === "'" && substr($value, -1) === "'")) {
                    $value = substr($value, 1, -1);
                }
                
                // Set environment variable
                $_ENV[$key] = $value;
                $_SERVER[$key] = $value;
                $this->variables[$key] = $value;
            }
        }
        
        return $this->variables;
    }
    
    public function required($variables) {
        if (!is_array($variables)) {
            $variables = [$variables];
        }
        foreach ($variables as $variable) {
            if (!isset($_ENV[$variable]) || empty($_ENV[$variable])) {
                throw new Exception("Environment variable {$variable} is required but not set");
            }
        }
        return $this;
    }
    
    public function notEmpty() {
        // This is a placeholder for the notEmpty() method
        // In our simple implementation, we'll check in the required() method
        return $this;
    }
}
?>
