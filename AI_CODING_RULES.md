# 🤖 AI Coding Rules for Enguio Inventory System

## 📌 Purpose
This file contains mandatory coding rules that MUST be followed by all AI agents, developers, and automated tools working on this project.

---

## 🚨 CRITICAL RULES (NEVER VIOLATE)

### ⚠️ Rule #1: NO HARDCODED API BASE URLS

**Rule:** All API base URLs MUST use environment variables.  
**Status:** ✅ Currently enforced across 70+ files  
**Verification:** Run `./verify_env_implementation.sh`

#### ✅ CORRECT PATTERNS:

**Method 1: Using apiConfig (Recommended)**
```javascript
import { getApiUrl, API_BASE_URL } from '@/app/lib/apiConfig';

// For single endpoint
const url = getApiUrl('backend.php');

// For dynamic endpoints
const url = `${API_BASE_URL}/${endpointName}`;
```

**Method 2: Using apiHandler (Best Practice)**
```javascript
import apiHandler from '@/app/lib/apiHandler';

const response = await apiHandler.callAPI('backend.php', 'get_products', {
  category_id: 1
});
```

**Method 3: Direct Environment Variable (Acceptable)**
```javascript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2e2/Api';
const url = `${API_BASE_URL}/backend.php`;

const response = await fetch(url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ action: 'get_products' })
});
```

#### ❌ INCORRECT PATTERNS (DO NOT USE):

```javascript
// ❌ WRONG - Hardcoded URL without environment variable
const url = "http://localhost/caps2e2/Api/backend.php";

// ❌ WRONG - Hardcoded base URL
const API_BASE = "http://localhost/caps2e2/Api";
const url = `${API_BASE}/backend.php`;

// ❌ WRONG - Direct fetch with hardcoded URL
fetch('http://localhost/caps2e2/Api/sales_api.php', {...})
```

#### 🔍 Detection Command:
```bash
# Find hardcoded URLs (should return 0 results)
grep -r "http://localhost/caps2e2/Api" app/ --include="*.js" | grep -v "NEXT_PUBLIC_API_BASE_URL" | grep -v "apiConfig.js"
```

---

### ⚠️ Rule #2: NO HARDCODED DATABASE CREDENTIALS

**Rule:** All database credentials MUST be stored in `.env` file and accessed via environment variables.  
**Status:** ✅ Currently enforced in `Api/conn.php`  
**File:** Backend `.env` in project root

#### ✅ CORRECT PATTERN (PHP):

```php
<?php
/**
 * Database Connection - CORRECT METHOD
 */

// Load environment variables
require_once __DIR__ . '/../simple_dotenv.php';
$dotenv = new SimpleDotEnv(__DIR__ . '/..');
$dotenv->load();

// Get credentials from environment
$servername = $_ENV['DB_HOST'] ?? 'localhost';
$port = $_ENV['DB_PORT'] ?? '3306';
$dbname = $_ENV['DB_DATABASE'];
$username = $_ENV['DB_USER'];
$password = $_ENV['DB_PASS'] ?? '';
$charset = $_ENV['DB_CHARSET'] ?? 'utf8mb4';

// Create connection
$dsn = "mysql:host=$servername;port=$port;dbname=$dbname;charset=$charset";
$conn = new PDO($dsn, $username, $password, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false
]);
?>
```

**Or simply include the existing connection file:**
```php
<?php
// BEST PRACTICE - Use the centralized connection
require_once __DIR__ . '/conn.php';

// Then use it
$conn = getDatabaseConnection(); // Returns PDO
// OR
$mysqli_conn = getMySQLiConnection(); // Returns MySQLi
?>
```

#### ❌ INCORRECT PATTERNS (DO NOT USE):

```php
// ❌ WRONG - Hardcoded credentials
<?php
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "enguio2";

$conn = new mysqli($servername, $username, $password, $dbname);
?>

// ❌ WRONG - Hardcoded PDO connection
<?php
$conn = new PDO("mysql:host=localhost;dbname=enguio2", "root", "");
?>

// ❌ WRONG - Credentials in array
<?php
$config = [
    'host' => 'localhost',
    'user' => 'root',
    'pass' => '',
    'db' => 'enguio2'
];
?>
```

#### 🔍 Detection Command:
```bash
# Find hardcoded DB credentials (should return 0 results except conn.php)
grep -r "new mysqli(\"localhost\"" Api/ --include="*.php"
grep -r "mysql:host=localhost" Api/ --include="*.php" | grep -v "\$_ENV" | grep -v "conn.php"
```

---

## 📋 ENVIRONMENT VARIABLES

### Frontend Variables (`.env.local`)

Located in project root: `/home/quasar/Capstone/.env.local`

```env
# Required: API Base URL
NEXT_PUBLIC_API_BASE_URL=http://localhost/caps2e2/Api

# Optional: App Configuration
NEXT_PUBLIC_APP_NAME="Enguio Inventory System"
NEXT_PUBLIC_APP_VERSION="1.0.0"
```

**Notes:**
- Must start with `NEXT_PUBLIC_` to be accessible in browser
- No trailing slash on URL
- Gitignored (never commit)

### Backend Variables (`.env`)

Located in project root: `/home/quasar/Capstone/.env`

```env
# Required: Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=enguio2
DB_USER=root
DB_PASS=
DB_CHARSET=utf8mb4

# Optional: Application Environment
APP_ENV=development
```

**Notes:**
- Used by PHP backend via `simple_dotenv.php`
- Loaded by `Api/conn.php`
- Gitignored (never commit)

---

## 🎯 KEY FILES STRUCTURE

### Frontend Configuration
```
app/
├── lib/
│   ├── apiConfig.js         # Centralized API configuration (NEW)
│   └── apiHandler.js        # API handler with env support (UPDATED)
├── hooks/
│   └── useAPI.js           # React hook using apiHandler
└── [components...]         # All use environment variables
```

### Backend Configuration
```
Api/
├── conn.php                # Database connection using env vars
├── [api files...]          # All include conn.php
└── modules/
    └── [module files...]   # All use conn.php
```

### Environment Files
```
Capstone/
├── .env.local              # Frontend env vars (gitignored)
├── .env                    # Backend env vars (gitignored)
├── .env.example            # Template for deployment
└── simple_dotenv.php       # PHP env loader
```

---

## 🤖 AI AGENT INSTRUCTIONS

### When Creating New Frontend Files:

1. **For API calls, ALWAYS use one of these patterns:**
   ```javascript
   // Pattern 1: Import apiConfig
   import { getApiUrl } from '@/app/lib/apiConfig';
   const url = getApiUrl('your_api.php');
   
   // Pattern 2: Import apiHandler
   import apiHandler from '@/app/lib/apiHandler';
   const response = await apiHandler.callAPI('your_api.php', 'action', data);
   
   // Pattern 3: Use env var directly
   const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/your_api.php`;
   ```

2. **NEVER write:**
   ```javascript
   const url = "http://localhost/caps2e2/Api/your_api.php"; // ❌ WRONG
   ```

### When Creating New Backend Files:

1. **For database connections, ALWAYS use:**
   ```php
   <?php
   require_once __DIR__ . '/conn.php';
   $conn = getDatabaseConnection();
   ?>
   ```

2. **NEVER create new connections:**
   ```php
   $conn = new mysqli("localhost", "root", "", "enguio2"); // ❌ WRONG
   ```

### When Modifying Existing Files:

1. **Check for violations:**
   - Scan for hardcoded URLs
   - Scan for hardcoded credentials
   - Suggest fixes if found

2. **Maintain consistency:**
   - Use existing patterns
   - Don't introduce new patterns
   - Follow the established structure

### When User Asks to Add Features:

1. **Automatically apply proper patterns** (don't ask permission)
2. **Use environment variables by default**
3. **Import from apiConfig or use apiHandler**
4. **Include conn.php for database access**

---

## ✅ PRE-COMMIT VERIFICATION

Before any code changes, verify:

### Automated Check (Recommended):
```bash
./verify_env_implementation.sh
```

Expected output:
```
✅ .env.local exists
✅ .env.example exists
✅ apiConfig.js exists
✅ apiHandler.js imports apiConfig
✅ 70+ files using NEXT_PUBLIC_API_BASE_URL
✅ 0 hardcoded URLs found
✅ conn.php uses environment variables
OVERALL: ✅ ALL CHECKS PASSED
```

### Manual Checks:

1. **Check for hardcoded URLs:**
   ```bash
   grep -r "http://localhost/caps2e2/Api" app/ --include="*.js" | grep -v "NEXT_PUBLIC_API_BASE_URL"
   ```
   Expected: 0 results (or only in apiConfig.js as fallback)

2. **Check for hardcoded DB credentials:**
   ```bash
   grep -r "new mysqli(\"localhost\"" Api/ --include="*.php"
   grep -r "\"mysql:host=localhost\"" Api/ --include="*.php" | grep -v "\$_ENV"
   ```
   Expected: 0 results (or only in conn.php)

3. **Verify environment files exist:**
   ```bash
   ls -la .env.local .env .env.example
   ```
   Expected: All files should exist

---

## 🔧 FIXING VIOLATIONS

### Fix Hardcoded URLs:

**Before:**
```javascript
const API_URL = "http://localhost/caps2e2/Api/backend.php";
fetch(API_URL, {...})
```

**After:**
```javascript
import { getApiUrl } from '@/app/lib/apiConfig';
const API_URL = getApiUrl('backend.php');
fetch(API_URL, {...})
```

### Fix Hardcoded DB Credentials:

**Before:**
```php
$conn = new mysqli("localhost", "root", "", "enguio2");
```

**After:**
```php
require_once __DIR__ . '/conn.php';
$conn = getMySQLiConnection();
```

---

## 📊 CURRENT IMPLEMENTATION STATUS

✅ **Environment Variables:** FULLY IMPLEMENTED  
✅ **Files Using Env Vars:** 70+ frontend files  
✅ **Hardcoded URLs:** 0 remaining  
✅ **Database Connection:** Uses env vars  
✅ **Verification Script:** Available  
✅ **Documentation:** Complete  

**Last Verified:** October 9, 2025  
**Status:** ✅ Production Ready

---

## 📚 REFERENCE DOCUMENTATION

- `START_HERE_ENV_SETUP.md` - Quick start guide
- `API_ENV_SETUP.md` - Complete setup documentation
- `ENV_IMPLEMENTATION_STATUS.md` - Detailed implementation status
- `ENV_VERIFICATION_REPORT.txt` - Verification report
- `.cursorrules` - Cursor AI specific rules
- `verify_env_implementation.sh` - Verification script

---

## 🎯 EXAMPLES FOR COMMON SCENARIOS

### Scenario 1: Creating New API Endpoint

```javascript
// ✅ CORRECT
import { getApiUrl } from '@/app/lib/apiConfig';

export async function fetchCustomData() {
  const url = getApiUrl('custom_api.php');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'get_data' })
  });
  return response.json();
}
```

### Scenario 2: Creating New PHP API File

```php
<?php
// ✅ CORRECT
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");

require_once __DIR__ . '/conn.php';

$conn = getDatabaseConnection();
$action = $_POST['action'] ?? '';

switch ($action) {
    case 'get_data':
        $stmt = $conn->prepare("SELECT * FROM products");
        $stmt->execute();
        $data = $stmt->fetchAll();
        echo json_encode(['success' => true, 'data' => $data]);
        break;
    default:
        echo json_encode(['success' => false, 'message' => 'Invalid action']);
}
?>
```

### Scenario 3: Adding New React Component with API Call

```javascript
// ✅ CORRECT
import { useState, useEffect } from 'react';
import { useAPI } from '@/app/hooks/useAPI';

export default function MyComponent() {
  const { api, loading } = useAPI();
  const [data, setData] = useState([]);
  
  useEffect(() => {
    const fetchData = async () => {
      const response = await api.getProducts({ category: 'electronics' });
      if (response.success) {
        setData(response.data);
      }
    };
    fetchData();
  }, []);
  
  return <div>{/* render data */}</div>;
}
```

---

## 🚨 VIOLATION EXAMPLES (DO NOT USE)

### ❌ Violation 1: Hardcoded URL in Fetch
```javascript
// WRONG - Will be rejected
const response = await fetch('http://localhost/caps2e2/Api/backend.php', {
  method: 'POST',
  body: JSON.stringify({ action: 'get_products' })
});
```

### ❌ Violation 2: Hardcoded API Base
```javascript
// WRONG - Will be rejected
const API_BASE = "http://localhost/caps2e2/Api";
const endpoints = {
  sales: `${API_BASE}/sales_api.php`,
  products: `${API_BASE}/products_api.php`
};
```

### ❌ Violation 3: Hardcoded DB in PHP
```php
// WRONG - Will be rejected
<?php
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "enguio2";
$conn = new mysqli($servername, $username, $password, $dbname);
?>
```

---

## 🎓 TRAINING EXAMPLES FOR AI

When an AI agent encounters code that needs fixing:

### Example 1: User provides code with hardcoded URL

**User says:** "Add this code to fetch products"
```javascript
fetch('http://localhost/caps2e2/Api/products_api.php', {...})
```

**AI should respond:** "I'll add that, but I'll update it to use environment variables first:"
```javascript
import { getApiUrl } from '@/app/lib/apiConfig';
fetch(getApiUrl('products_api.php'), {...})
```

### Example 2: User creates new PHP file

**User says:** "Create a new API file for reports"

**AI should automatically use:**
```php
<?php
require_once __DIR__ . '/conn.php';
$conn = getDatabaseConnection();
// ... rest of code
?>
```

**NOT:**
```php
<?php
$conn = new mysqli("localhost", "root", "", "enguio2");
// ... rest of code
?>
```

---

## 🔒 SECURITY NOTES

1. **`.env.local` is gitignored** - Never commit
2. **`.env` is gitignored** - Never commit
3. **`.env.example` is committed** - Template only, no real credentials
4. **Never log environment variables** - Security risk
5. **Never expose credentials in error messages** - Use generic messages in production

---

## 📞 SUPPORT

If violations are found:
1. Run `./verify_env_implementation.sh` to identify issues
2. Check this file for correct patterns
3. Review reference documentation
4. Fix according to examples provided

---

**Version:** 1.0.0  
**Last Updated:** October 9, 2025  
**Status:** ✅ Enforced  
**Compliance:** Mandatory for all AI agents and developers

