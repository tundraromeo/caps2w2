# ⚡ Quick Start - 5 Minute Setup

## 🎯 Goal
Secure your database credentials using environment variables instead of hardcoding them.

---

## 🚀 3-Step Setup

### Step 1: Install Composer
```
Download: https://getcomposer.org/Composer-Setup.exe
Install it, then close/reopen your terminal
```

### Step 2: Run Setup Script
```powershell
cd C:\xampp\htdocs\caps2e2
.\setup.ps1
```

### Step 3: Test It
```
1. Start XAMPP (Apache + MySQL)
2. Visit: http://localhost/caps2e2/test_env_connection.php
3. You should see: "success": true
```

---

## 🔧 Manual Setup (if script doesn't work)

### Create .env file:
```powershell
# In PowerShell:
@"
DB_HOST=localhost
DB_PORT=3306
DB_DATABASE=engiuo2
DB_USERNAME=root
DB_PASSWORD=
DB_CHARSET=utf8mb4
APP_ENV=development
APP_DEBUG=true
"@ | Out-File -FilePath .env -Encoding UTF8
```

### Install dependencies:
```powershell
composer install
```

---

## 📁 What Changed

**Before:** Credentials in `Api/conn.php`
```php
$username = "root";
$password = "";
```

**After:** Credentials in `.env` file
```env
DB_USERNAME=root
DB_PASSWORD=
```

---

## 🔒 Security Benefits

✅ Credentials NOT in code  
✅ `.env` NOT committed to Git  
✅ Different configs for dev/production  
✅ Secure error handling  

---

## 📚 Full Documentation

| File | Purpose |
|------|---------|
| **SETUP_SUMMARY.md** | Complete overview |
| **WINDOWS_SETUP_GUIDE.md** | Step-by-step Windows guide |
| **ENV_SETUP_INSTRUCTIONS.md** | Production deployment |
| **setup.ps1** | Automated setup script |

---

## 🐛 Troubleshooting

**Problem:** "composer: command not found"  
**Fix:** Install Composer and restart terminal

**Problem:** ".env file not found"  
**Fix:** Run `.\setup.ps1` or create manually

**Problem:** "Connection failed"  
**Fix:** Check credentials in `.env` match your database

---

## ✅ Checklist

- [ ] Composer installed
- [ ] `.env` file created
- [ ] Run `composer install`
- [ ] Test connection works
- [ ] Read SETUP_SUMMARY.md

---

**🎉 That's it! Your database is now secure!**

Time: ~5 minutes | Difficulty: Easy | Status: Production-ready
