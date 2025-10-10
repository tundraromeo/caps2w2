<?php
/**
 * Simple PHP Backend Test
 * Tests if the PHP backend is working correctly
 */

// Test 1: Check if backend.php exists and is accessible
echo "=== PHP Backend Test ===\n";

// Test 2: Check environment variables
echo "1. Testing environment variables...\n";
if (file_exists('.env')) {
    echo "   ✓ .env file exists\n";
} else {
    echo "   ✗ .env file missing\n";
}

if (file_exists('.env.local')) {
    echo "   ✓ .env.local file exists\n";
} else {
    echo "   ✗ .env.local file missing\n";
}

// Test 3: Check API files
echo "\n2. Testing API files...\n";
$apiFiles = [
    'Api/backend.php',
    'Api/conn.php',
    'Api/simple_dotenv.php'
];

foreach ($apiFiles as $file) {
    if (file_exists($file)) {
        echo "   ✓ $file exists\n";
    } else {
        echo "   ✗ $file missing\n";
    }
}

// Test 4: Test backend.php via HTTP request simulation
echo "\n3. Testing backend.php connectivity...\n";

// Simulate a test_connection request
$testData = json_encode(['action' => 'test_connection']);

// Check if we can include the backend file
try {
    // Set up environment for testing
    $_SERVER['REQUEST_METHOD'] = 'POST';
    $_SERVER['HTTP_ORIGIN'] = 'http://localhost:3000';
    $_SERVER['CONTENT_TYPE'] = 'application/json';
    
    // Capture output
    ob_start();
    
    // Include the backend file
    include 'Api/backend.php';
    
    $output = ob_get_clean();
    
    if (!empty($output)) {
        echo "   ✓ backend.php executed successfully\n";
        echo "   Response: " . substr($output, 0, 100) . "...\n";
    } else {
        echo "   ⚠ backend.php executed but no output\n";
    }
    
} catch (Exception $e) {
    echo "   ✗ Error executing backend.php: " . $e->getMessage() . "\n";
}

echo "\n=== Test Complete ===\n";
?>
