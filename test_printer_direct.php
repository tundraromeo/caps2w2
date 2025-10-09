<?php
// Direct printer test
echo "<h2>🖨️ DIRECT PRINTER TEST</h2>";

// Test 1: Check if printer exists
echo "<h3>Test 1: Check Printer Exists</h3>";
$command = 'wmic printer get name,status,workoffline | findstr "POS-58"';
$output = shell_exec($command);
echo "<pre>Command: $command</pre>";
echo "<pre>Output: " . ($output ?: "No output") . "</pre>";

// Test 2: Try to print a simple text file
echo "<h3>Test 2: Direct Print Test</h3>";
$testFile = "test_print_" . time() . ".txt";
$testContent = "TEST PRINT\n================\nDate: " . date('Y-m-d H:i:s') . "\nThis is a test print from PHP\n================\n";

// Create test file
file_put_contents($testFile, $testContent);
echo "<p>✅ Created test file: $testFile</p>";

// Try to print using Windows PRINT command
echo "<h4>Method 1: Windows PRINT command</h4>";
$printCommand = 'print /D:"POS-58" "' . $testFile . '" 2>&1';
echo "<pre>Command: $printCommand</pre>";
$printOutput = shell_exec($printCommand);
echo "<pre>Output: " . ($printOutput ?: "No output") . "</pre>";

// Try to print using COPY command
echo "<h4>Method 2: COPY command</h4>";
$copyCommand = 'copy /b "' . $testFile . '" "\\\\localhost\\POS-58" 2>&1';
echo "<pre>Command: $copyCommand</pre>";
$copyOutput = shell_exec($copyCommand);
echo "<pre>Output: " . ($copyOutput ?: "No output") . "</pre>";

// Check print queue
echo "<h3>Test 3: Check Print Queue</h3>";
$queueCommand = 'powershell "Get-Printer -Name \'POS-58\' | Select-Object Name, PrinterStatus, DriverName" 2>&1';
echo "<pre>Command: $queueCommand</pre>";
$queueOutput = shell_exec($queueCommand);
echo "<pre>Output: " . ($queueOutput ?: "No output") . "</pre>";

// Clean up
unlink($testFile);
echo "<p>🧹 Cleaned up test file</p>";

echo "<hr>";
echo "<h3>🔍 MANUAL CHECKS NEEDED:</h3>";
echo "<ol>";
echo "<li>Check Windows Settings > Devices > Printers</li>";
echo "<li>Find POS-58 printer</li>";
echo "<li>Check if it shows 'Ready' (green) or 'Offline' (gray)</li>";
echo "<li>Right-click > Manage > Print test page</li>";
echo "<li>Check if printer has paper</li>";
echo "<li>Check USB connection</li>";
echo "</ol>";
?>

<style>
body { font-family: Arial, sans-serif; margin: 20px; }
pre { background: #f5f5f5; padding: 10px; border: 1px solid #ddd; }
</style>
