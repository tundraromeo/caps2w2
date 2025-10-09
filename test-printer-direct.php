<?php
/**
 * Direct Printer Test Script
 * Simple test to verify if PHP can print to your thermal printer
 */

// Set printer name here - CHANGE THIS TO YOUR PRINTER NAME
$printerName = 'POS-58';

echo "<!DOCTYPE html>
<html>
<head>
    <title>Direct Printer Test</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .success { color: #28a745; font-weight: bold; }
        .error { color: #dc3545; font-weight: bold; }
        .warning { color: #ffc107; font-weight: bold; }
        code {
            background: #f4f4f4;
            padding: 2px 8px;
            border-radius: 4px;
            font-family: monospace;
        }
        pre {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            overflow-x: auto;
        }
        button {
            background: #667eea;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 20px;
        }
        button:hover {
            background: #5568d3;
        }
    </style>
</head>
<body>
    <div class='container'>
        <h1>🖨️ Direct Printer Test</h1>
        <p>Testing printer: <code>$printerName</code></p>
        <hr style='margin: 20px 0;'>
";

// Create test receipt content
$receipt = "================================\n";
$receipt .= "      PRINTER TEST RECEIPT      \n";
$receipt .= "================================\n";
$receipt .= "Date: " . date('Y-m-d H:i:s') . "\n";
$receipt .= "Printer: $printerName\n";
$receipt .= "--------------------------------\n";
$receipt .= "Test Item 1          ₱100.00\n";
$receipt .= "Test Item 2          ₱200.00\n";
$receipt .= "--------------------------------\n";
$receipt .= "TOTAL:               ₱300.00\n";
$receipt .= "================================\n";
$receipt .= "  Thank you for testing!  \n";
$receipt .= "\n\n\n\n";

// Convert to Windows line endings
$formatted = str_replace("\n", "\r\n", $receipt);

// Create temp file
$tempFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'test_receipt_' . time() . '.txt';
file_put_contents($tempFile, $formatted);

echo "<h2>Step 1: Creating Test Receipt</h2>";
echo "<p class='success'>✅ Test receipt created</p>";
echo "<pre>" . htmlspecialchars($receipt) . "</pre>";

echo "<h2>Step 2: Checking shell_exec()</h2>";
if (!function_exists('shell_exec')) {
    echo "<p class='error'>❌ shell_exec() is not available</p>";
    echo "<p>You need to enable it in php.ini</p>";
    exit;
}

$disabled = explode(',', ini_get('disable_functions'));
if (in_array('shell_exec', $disabled)) {
    echo "<p class='error'>❌ shell_exec() is disabled in php.ini</p>";
    echo "<p>Remove 'shell_exec' from disable_functions in php.ini and restart Apache</p>";
    exit;
}
echo "<p class='success'>✅ shell_exec() is enabled</p>";

echo "<h2>Step 3: Testing Print Commands</h2>";

$methods = [];

// Method 1: Windows PRINT command
echo "<h3>Method 1: Windows PRINT command</h3>";
$command = 'print /D:"' . $printerName . '" "' . $tempFile . '" 2>&1';
echo "<p><strong>Command:</strong> <code>" . htmlspecialchars($command) . "</code></p>";

$output = shell_exec($command);
$lower = strtolower((string)$output);

if ($output === null || (strpos($lower, 'error') === false && strpos($lower, 'denied') === false && strpos($lower, 'not found') === false)) {
    echo "<p class='success'>✅ Method 1 SUCCESS - Receipt should be printing!</p>";
    $methods[] = 'print_command';
} else {
    echo "<p class='error'>❌ Method 1 FAILED</p>";
    echo "<p><strong>Output:</strong></p>";
    echo "<pre>" . htmlspecialchars($output) . "</pre>";
}

// Method 2: COPY command with localhost share
echo "<h3>Method 2: COPY command (localhost share)</h3>";
$command = 'copy /b "' . $tempFile . '" "\\\\localhost\\' . $printerName . '" 2>&1';
echo "<p><strong>Command:</strong> <code>" . htmlspecialchars($command) . "</code></p>";

$output = shell_exec($command);
$lower = strtolower((string)$output);

if ($output === null || (strpos($lower, 'error') === false && strpos($lower, 'denied') === false && strpos($lower, 'not found') === false)) {
    echo "<p class='success'>✅ Method 2 SUCCESS - Receipt should be printing!</p>";
    $methods[] = 'copy_localhost';
} else {
    echo "<p class='error'>❌ Method 2 FAILED</p>";
    echo "<p><strong>Output:</strong></p>";
    echo "<pre>" . htmlspecialchars($output) . "</pre>";
}

// Method 3: List available printers
echo "<h3>Available Printers:</h3>";
$printerList = shell_exec('wmic printer get name 2>&1');
if ($printerList) {
    echo "<pre>" . htmlspecialchars($printerList) . "</pre>";
    echo "<p class='warning'>⚠️ Make sure your printer name matches exactly (case-sensitive)</p>";
} else {
    echo "<p class='error'>❌ Cannot retrieve printer list</p>";
    echo "<p>This might mean:</p>";
    echo "<ul>";
    echo "<li>XAMPP is not running as Administrator</li>";
    echo "<li>No printers are installed</li>";
    echo "<li>Printer is not shared</li>";
    echo "</ul>";
}

// Clean up
@unlink($tempFile);

echo "<h2>📊 Test Results Summary</h2>";
if (count($methods) > 0) {
    echo "<p class='success'><strong>✅ SUCCESS!</strong> Printing is working using: " . implode(', ', $methods) . "</p>";
    echo "<p>Your POS system should be able to print receipts now.</p>";
    echo "<p><strong>Next steps:</strong></p>";
    echo "<ol>";
    echo "<li>Make sure <code>\$printerName = '$printerName';</code> in <code>print-receipt-fixed-width.php</code> (line 149)</li>";
    echo "<li>Make sure printer is ON and has paper</li>";
    echo "<li>Test from your POS system</li>";
    echo "</ol>";
} else {
    echo "<p class='error'><strong>❌ FAILED!</strong> Printing is not working.</p>";
    echo "<p><strong>Troubleshooting steps:</strong></p>";
    echo "<ol>";
    echo "<li>Check if printer name is correct (see available printers above)</li>";
    echo "<li>Make sure printer is shared:
        <ul>
            <li>Control Panel > Devices and Printers</li>
            <li>Right-click printer > Printer properties > Sharing</li>
            <li>Check 'Share this printer'</li>
        </ul>
    </li>";
    echo "<li>Run XAMPP as Administrator:
        <ul>
            <li>Close XAMPP</li>
            <li>Right-click xampp-control.exe</li>
            <li>Click 'Run as administrator'</li>
            <li>Start Apache again</li>
        </ul>
    </li>";
    echo "<li>Check Windows Firewall/Antivirus settings</li>";
    echo "<li>Test manual print from Command Prompt (Run as Admin):
        <pre>echo Test > test.txt\nprint /D:\"$printerName\" test.txt</pre>
    </li>";
    echo "</ol>";
}

echo "
        <hr style='margin: 30px 0;'>
        <p><strong>Need more help?</strong> Check <code>PRINTER_TROUBLESHOOTING_GUIDE.md</code></p>
        <button onclick='location.reload()'>🔄 Run Test Again</button>
    </div>
</body>
</html>";
?>

