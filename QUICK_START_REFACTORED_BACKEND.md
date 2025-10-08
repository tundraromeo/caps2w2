# ⚡ Quick Start - Refactored Backend

## 🎯 5-Minute Setup Guide

Your backend has been refactored! Here's how to start using it in 5 minutes.

---

## ✅ Step 1: Verify Files Exist (30 seconds)

Check that these new files were created:

```
✅ Api/config/database.php
✅ Api/core/helpers.php
✅ Api/backend_refactored.php
✅ Api/REFACTORING_GUIDE.md
```

**Quick check:**
```bash
ls Api/config/database.php
ls Api/core/helpers.php
ls Api/backend_refactored.php
```

---

## ✅ Step 2: Ensure .env File Exists (1 minute)

Check if `.env` file exists in project root:

```bash
# Check if .env exists
ls .env
```

If it doesn't exist, create it:

```bash
# Create .env file
echo DB_HOST=localhost > .env
echo DB_PORT=3306 >> .env
echo DB_DATABASE=enguio2 >> .env
echo DB_USERNAME=root >> .env
echo DB_PASSWORD= >> .env
echo DB_CHARSET=utf8mb4 >> .env
echo APP_ENV=development >> .env
```

Or manually create `.env` with:
```env
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=enguio2
DB_USERNAME=root
DB_PASSWORD=
DB_CHARSET=utf8mb4
APP_ENV=development
```

---

## ✅ Step 3: Test the Refactored Backend (2 minutes)

### Option A: Using Browser

Visit: `http://localhost/caps2e2/Api/backend_refactored.php`

You should see:
```json
{
  "success": false,
  "message": "No action specified"
}
```

This is good! It means the backend is working.

### Option B: Using curl

```bash
curl -X POST http://localhost/caps2e2/Api/backend_refactored.php \
  -H "Content-Type: application/json" \
  -d '{"action":"test_connection"}'
```

Expected response:
```json
{
  "success": true,
  "message": "Connection successful"
}
```

---

## ✅ Step 4: Update Frontend (1 minute)

### For Testing (Temporary):

Update your frontend API URL to test:

**JavaScript/React:**
```javascript
// In your API configuration file
const API_URL = 'http://localhost/caps2e2/Api/backend_refactored.php';
```

**Or in apiHandler.js:**
```javascript
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 
  'http://localhost/caps2e2/Api/backend_refactored.php';
```

### For Production (After Testing):

Once you've verified everything works:

```bash
# Backup original
mv Api/backend.php Api/backend_old.php

# Use refactored version
mv Api/backend_refactored.php Api/backend.php
```

Now your frontend URL stays the same!

---

## ✅ Step 5: Verify Critical Functions (1 minute)

Test these key actions:

### Test Login:
```bash
curl -X POST http://localhost/caps2e2/Api/backend_refactored.php \
  -H "Content-Type: application/json" \
  -d '{
    "action": "login",
    "username": "your_username",
    "password": "your_password",
    "captcha": "1234",
    "captchaAnswer": "1234"
  }'
```

### Test Get Products:
```bash
curl -X POST http://localhost/caps2e2/Api/backend_refactored.php \
  -H "Content-Type: application/json" \
  -d '{"action": "get_products", "location_id": 1}'
```

### Test Get Brands:
```bash
curl -X POST http://localhost/caps2e2/Api/backend_refactored.php \
  -H "Content-Type: application/json" \
  -d '{"action": "get_brands"}'
```

---

## 🎉 Done!

If all tests passed, your refactored backend is ready to use!

---

## 🐛 Troubleshooting

### Issue: "Database connection failed"

**Solution:**
1. Check `.env` file exists
2. Verify database credentials are correct
3. Ensure MySQL is running

```bash
# Check MySQL status
# Windows: Check XAMPP Control Panel
# Linux: sudo systemctl status mysql
```

### Issue: "Handler not found"

**Solution:**
1. Check that module files exist in `Api/modules/`
2. Verify the action name is correct
3. Check spelling in router

### Issue: "CORS error"

**Solution:**
Update `Api/core/helpers.php`:

```php
// Change this line to match your frontend URL
header("Access-Control-Allow-Origin: http://localhost:3000");
```

### Issue: "Invalid JSON input"

**Solution:**
Ensure you're sending proper JSON:
```javascript
fetch(API_URL, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ action: 'your_action' })
})
```

---

## 📊 What Changed?

### Before:
```
Api/backend.php (8900 lines)
└── Everything in one file
```

### After:
```
Api/
├── config/database.php       (Centralized DB)
├── core/helpers.php           (Utilities)
├── backend_refactored.php     (Main router - 185 lines)
└── modules/                   (Existing modules)
```

---

## 🎯 Key Benefits

✅ **98% smaller** main file (8900 → 185 lines)  
✅ **Secure** credentials (.env based)  
✅ **Modular** architecture (easy to maintain)  
✅ **Backward compatible** (no frontend changes needed)  
✅ **Professional** structure (industry standard)  

---

## 📚 Need More Help?

Read the detailed guides:

1. **`REFACTORING_SUMMARY.md`** - Quick overview
2. **`Api/REFACTORING_GUIDE.md`** - Detailed migration guide
3. **`BACKEND_REFACTORING_COMPLETE.md`** - Complete documentation

---

## 🚀 Next Steps

1. ✅ Test all critical features
2. ✅ Monitor error logs (`Api/logs/php_errors.log`)
3. ✅ Update frontend API URL
4. ✅ Deploy to production
5. ✅ Celebrate! 🎉

---

**Your backend is now clean, secure, and maintainable! 🎯**
