/**
 * Test Script to Verify API Connections
 * Run this to test if all PHP APIs are properly connected to the frontend
 */

// This would normally be run in a Node.js environment or browser console
// For browser testing, you can copy-paste sections into the browser console

const API_BASE_URL = 'http://localhost/Enguio_Project/Api';

// Test function to check API endpoint
async function testAPIEndpoint(endpoint, action, data = {}) {
  const url = `${API_BASE_URL}/${endpoint}`;
  
  try {
    console.log(`🧪 Testing: ${endpoint} - ${action}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, ...data }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ SUCCESS: ${endpoint} - ${action}`);
      return { success: true, endpoint, action, data: result };
    } else {
      console.log(`⚠️ FAILED: ${endpoint} - ${action} - ${result.message}`);
      return { success: false, endpoint, action, error: result.message };
    }
  } catch (error) {
    console.log(`❌ ERROR: ${endpoint} - ${action} - ${error.message}`);
    return { success: false, endpoint, action, error: error.message };
  }
}

// Test all API endpoints
async function runAllTests() {
  console.log('🚀 Starting API Connection Tests...\n');
  
  const tests = [
    // Backend API tests
    { endpoint: 'backend.php', action: 'test_connection' },
    { endpoint: 'backend.php', action: 'get_categories' },
    { endpoint: 'backend.php', action: 'get_locations' },
    { endpoint: 'backend.php', action: 'get_suppliers' },
    
    // Sales API tests
    { endpoint: 'sales_api.php', action: 'get_discounts' },
    { endpoint: 'sales_api.php', action: 'get_pos_inventory' },
    
    // Purchase Order API tests
    { endpoint: 'purchase_order_api_simple_clean.php', action: 'test' },
    { endpoint: 'purchase_order_api_simple_clean.php', action: 'suppliers' },
    
    // Stock Adjustment API tests
    { 
      endpoint: 'stock_adjustment_consolidated.php', 
      action: 'get_all_stock_adjustment_data',
      data: {
        start_date: '2024-01-01',
        end_date: '2024-12-31'
      }
    },
    
    // Convenience Store API tests
    { endpoint: 'convenience_store_api.php', action: 'get_products' },
    
    // Pharmacy API tests
    { endpoint: 'pharmacy_api.php', action: 'get_products' },
    
    // POS Return API tests
    { endpoint: 'pos_return_api.php', action: 'get_pending_returns' },
    
    // Transfer API tests
    { endpoint: 'transfer_api.php', action: 'get_locations' },
    
    // FIFO Transfer API tests
    { endpoint: 'fifo_transfer_api.php', action: 'available_products' },
  ];

  const results = [];
  
  for (const test of tests) {
    const result = await testAPIEndpoint(test.endpoint, test.action, test.data);
    results.push(result);
    
    // Add delay between requests to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Summary
  console.log('\n📊 TEST SUMMARY:');
  console.log('================');
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  console.log(`✅ Successful: ${successful}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📈 Success Rate: ${((successful / results.length) * 100).toFixed(1)}%`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Tests:');
    results.filter(r => !r.success).forEach(result => {
      console.log(`   - ${result.endpoint} (${result.action}): ${result.error}`);
    });
  }
  
  console.log('\n🎉 API Connection Tests Complete!');
  return results;
}

// Browser-friendly test function
function testInBrowser() {
  console.log('🌐 Running browser-compatible API tests...');
  
  // Test the main backend connection
  fetch('http://localhost/Enguio_Project/Api/backend.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'test_connection' })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('✅ Backend API connection successful!');
      console.log('📅 Server time:', data.timestamp);
      console.log('🗄️ Database:', data.database);
    } else {
      console.log('❌ Backend API connection failed:', data.message);
    }
  })
  .catch(error => {
    console.log('❌ Backend API error:', error.message);
  });
  
  // Test categories
  fetch('http://localhost/Enguio_Project/Api/backend.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get_categories' })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      console.log('✅ Categories loaded:', data.data?.length || 0, 'categories');
    } else {
      console.log('❌ Categories failed:', data.message);
    }
  })
  .catch(error => {
    console.log('❌ Categories error:', error.message);
  });
}

// Export for Node.js usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { testAPIEndpoint, runAllTests, testInBrowser };
}

// Instructions for manual testing
console.log(`
🧪 API CONNECTION TEST INSTRUCTIONS:

1. BROWSER TESTING:
   - Open browser developer console
   - Copy and paste this entire file
   - Run: testInBrowser()

2. NODE.JS TESTING:
   - Make sure your PHP server is running
   - Run: node test_api_connections.js
   - Or import and run: runAllTests()

3. COMPONENT TESTING:
   - Import the API hooks in your components
   - Use the example component: app/examples/APIUsageExample.js
   - Check browser network tab for API calls

4. TROUBLESHOOTING:
   - Verify XAMPP/PHP server is running
   - Check if database 'enguio2' exists
   - Ensure CORS headers are set in PHP files
   - Check browser console for detailed errors

📍 Expected Results:
- test_connection should return success with timestamp
- get_categories should return array of categories
- get_locations should return array of locations
- Other endpoints may return empty arrays if no data exists

🚀 Start testing now!
`);
