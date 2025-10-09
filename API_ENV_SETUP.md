# API Environment Configuration Guide

## 🎯 Overview

All API endpoints in this project now use environment variables. This makes it easy to deploy to different environments (local, staging, production) by simply changing the `.env.local` file.

---

## 📁 File Structure

```
Capstone/
├── .env.local              # Your local configuration (gitignored)
├── .env.example            # Template for new deployments
├── app/
│   └── lib/
│       ├── apiConfig.js    # Centralized API configuration
│       └── apiHandler.js   # API handler (uses apiConfig)
```

---

## 🚀 Quick Start

### 1. Initial Setup

Copy the example environment file:

```bash
cp .env.example .env.local
```

### 2. Configure Your Environment

Edit `.env.local` with your API base URL:

```env
# For local XAMPP
NEXT_PUBLIC_API_BASE_URL=http://localhost/caps2e2/Api

# For local WAMP
NEXT_PUBLIC_API_BASE_URL=http://localhost/caps2e2/Api

# For production
NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com/Api
```

**Important:** Do NOT include a trailing slash!

### 3. Restart Development Server

After changing `.env.local`, restart the Next.js server:

```bash
npm run dev
```

---

## 📝 Usage Examples

### Method 1: Using apiConfig (Recommended)

```javascript
import { getApiUrl, API_BASE_URL } from '@/app/lib/apiConfig';

// Get full URL for an endpoint
const url = getApiUrl('backend.php');
console.log(url); // http://localhost/caps2e2/Api/backend.php

// Or use base URL directly
const customUrl = `${API_BASE_URL}/custom_api.php`;
```

### Method 2: Using Named Endpoints

```javascript
import { getNamedApiUrl, API_ENDPOINTS } from '@/app/lib/apiConfig';

// Use predefined endpoint names
const salesUrl = getNamedApiUrl('SALES');
console.log(salesUrl); // http://localhost/caps2e2/Api/sales_api.php

// See all available endpoints
console.log(API_ENDPOINTS);
```

### Method 3: Direct Environment Variable

```javascript
// In any component or file
const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost/caps2e2/Api';
const url = `${apiBaseUrl}/backend.php`;
```

### Method 4: Using apiHandler (Best for API calls)

```javascript
import apiHandler from '@/app/lib/apiHandler';

// API handler automatically uses the configured base URL
const response = await apiHandler.callAPI('backend.php', 'get_products');
```

---

## 🔧 Configuration Options

### Available Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `NEXT_PUBLIC_API_BASE_URL` | Yes | Base URL for all API endpoints | `http://localhost/caps2e2/Api` |
| `DB_HOST` | No | Database host (for backend) | `localhost` |
| `DB_NAME` | No | Database name | `your_database` |
| `DB_USER` | No | Database user | `root` |
| `DB_PASS` | No | Database password | `yourpassword` |

### API Endpoints Reference

The following endpoints are available in `API_ENDPOINTS`:

- **Main Backend:** `BACKEND`, `LOGIN`
- **Sales:** `SALES`
- **Transfers:** `TRANSFER`, `FIFO_TRANSFER`, `BATCH_TRANSFER`, `INVENTORY_TRANSFER`
- **Store Management:** `CONVENIENCE`, `PHARMACY`
- **Purchase Orders:** `PURCHASE_ORDER`, `PURCHASE_ORDER_SIMPLE`, `CREATE_PURCHASE_ORDER`
- **Stock Management:** `STOCK_ADJUSTMENT`, `STOCK_SUMMARY`, `BATCH_TRACKING`
- **Returns:** `POS_RETURN`, `POS_EXCHANGE`
- **Reports:** `DASHBOARD_SALES`, `DASHBOARD_RETURN`, `DASHBOARD_TRANSFER`, `COMBINED_REPORTS`
- **Printing:** `PRINT_RECEIPT`, `QZ_TRAY_RECEIPT`
- **Other:** `BARCODE`, `INVENTORY`, `PRODUCTS`, `BATCH_FUNCTIONS`

---

## 🌍 Deployment Scenarios

### Local Development (XAMPP)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost/caps2e2/Api
```

### Local Development (Custom Port)

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8080/caps2e2/Api
```

### Production (Shared Hosting)

```env
NEXT_PUBLIC_API_BASE_URL=https://yourdomain.com/api
```

### Production (VPS/Dedicated Server)

```env
NEXT_PUBLIC_API_BASE_URL=https://api.yourdomain.com
```

### Staging Environment

```env
NEXT_PUBLIC_API_BASE_URL=https://staging.yourdomain.com/api
```

---

## ✅ Updated Files

All the following files now use the centralized API configuration:

### Core Configuration
- ✅ `app/lib/apiConfig.js` - New centralized configuration
- ✅ `app/lib/apiHandler.js` - Updated to use apiConfig
- ✅ `app/hooks/useAPI.js` - Uses apiHandler

### Frontend Pages
- ✅ `app/page.js` - Login page
- ✅ `app/admin/page.js` - Admin dashboard
- ✅ `app/pharmacy-dashboard/page.js` - Pharmacy dashboard
- ✅ `app/POS_convenience/page.js` - POS system
- ✅ `app/Inventory_Con/page.js` - Inventory login

### Admin Components
- ✅ `app/admin/components/Dashboard.js`
- ✅ `app/admin/components/Warehouse.js`
- ✅ `app/admin/components/ConvenienceStore.js`
- ✅ `app/admin/components/PharmacyStore.js`
- ✅ `app/admin/components/UserManagement.js`
- ✅ `app/admin/components/Reports.js`
- ✅ `app/admin/components/ReturnManagement.js`
- ✅ `app/admin/components/TransactionManager.js`
- ✅ `app/admin/components/StoreSettings.js`
- ✅ `app/admin/components/Logs.js`

### Inventory Components
- ✅ `app/Inventory_Con/Warehouse.js`
- ✅ `app/Inventory_Con/PharmacyInventory.js`
- ✅ `app/Inventory_Con/ConvenienceStore.js`
- ✅ `app/Inventory_Con/CreatePurchaseOrder.js` - **Fixed hardcoded URLs**
- ✅ `app/Inventory_Con/Reports.js`
- ✅ `app/Inventory_Con/ReturnManagement.js`
- ✅ `app/Inventory_Con/ReturnApprovalManager.js`

### Services
- ✅ `app/admin/components/RealtimeNotificationService.js`
- ✅ `app/admin/components/ReturnNotificationService.js`
- ✅ `app/admin/components/SystemUpdateService.js`
- ✅ `app/admin/components/WarehouseNotificationService.js`
- ✅ `app/POS_convenience/qz-tray-integration.js`
- ✅ `public/qz-tray-integration.js`

---

## 🛠️ Troubleshooting

### Issue: API calls returning 404

**Solution:** Check that your API base URL is correct:

```javascript
import { getApiConfigStatus } from '@/app/lib/apiConfig';
console.log(getApiConfigStatus());
```

### Issue: Changes not taking effect

**Solution:** Restart the Next.js development server:

```bash
# Stop the server (Ctrl+C)
# Then start again
npm run dev
```

### Issue: Environment variable undefined

**Solution:** 
1. Ensure `.env.local` exists in the project root
2. Variable must start with `NEXT_PUBLIC_` to be available in browser
3. Restart the development server after changes

### Issue: CORS errors

**Solution:** Make sure your PHP backend has proper CORS headers. Check the API files in the `Api/` directory.

---

## 🔒 Security Notes

1. **.env.local is gitignored** - Never commit this file
2. **Use .env.example** - Commit this as a template
3. **Sensitive data** - Never put passwords or API keys in `NEXT_PUBLIC_` variables
4. **Backend security** - Configure PHP backend separately for database credentials

---

## 📚 Additional Resources

- [Next.js Environment Variables](https://nextjs.org/docs/basic-features/environment-variables)
- [API Handler Documentation](./app/lib/apiHandler.js)
- [API Config Documentation](./app/lib/apiConfig.js)

---

## 🎉 Benefits

### Before (Hardcoded URLs)
```javascript
// ❌ Had to change URLs in multiple files
const url = 'http://localhost/caps2e2/Api/backend.php';
```

### After (Environment Variables)
```javascript
// ✅ Change once in .env.local
import { getApiUrl } from '@/app/lib/apiConfig';
const url = getApiUrl('backend.php');
```

### Key Advantages:
- ✅ **Single source of truth** - Change API URL in one place
- ✅ **Easy deployment** - Just update .env.local on new server
- ✅ **Environment-specific** - Different URLs for dev/staging/prod
- ✅ **Better security** - No hardcoded URLs in code
- ✅ **Team friendly** - Each developer can use their own setup

---

## 📞 Support

If you encounter issues:
1. Check this guide
2. Verify your `.env.local` file
3. Ensure the development server is restarted
4. Check browser console for errors
5. Review the API configuration status

---

**Last Updated:** October 9, 2025  
**Version:** 1.0.0

