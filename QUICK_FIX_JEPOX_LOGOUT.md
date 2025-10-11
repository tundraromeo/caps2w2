# 🚀 Quick Fix: Logout jepox User

## Problem:
- jepox shows as ONLINE sa database (login_id 41)
- Pero hindi naman nag-login si jepox
- Stale record na hindi na-clear

## Solution: Use Existing Logout API

### Option 1: Manual API Call (Easiest)

**Run this sa browser o Postman:**

```bash
POST http://localhost/caps2e2/Api/login.php
Content-Type: application/json

{
    "action": "logout",
    "emp_id": 2
}
```

### Option 2: Direct Database Fix (Fastest)

**Sa phpMyAdmin SQL tab:**

```sql
-- I-fix ang jepox record
UPDATE tbl_login 
SET status = 'offline', 
    logout_time = '23:16:48', 
    logout_date = '2025-09-29'
WHERE login_id = 41 AND username = 'jepox';

-- Verify
SELECT login_id, username, status, logout_time, logout_date
FROM tbl_login 
WHERE username = 'jepox' 
ORDER BY login_id DESC;
```

### Option 3: Use Test Script

**Run the test file:**
1. Open browser: `http://localhost/caps2e2/TEST_LOGOUT_API.php`
2. Adjust `emp_id` if needed
3. Check result

---

## ✅ After Fix:

1. **jepox will show OFFLINE** 🔴
2. **Admin makikita na offline na** ✅
3. **Login Logs Report accurate na** ✅

---

## 🔍 Why This Happened:

**Existing logout system is working**, pero:
- May **stale session** na hindi na-clear
- Browser crash or network disconnect
- Session na hindi properly terminated

**The logout function exists and works!** 
**Kailangan lang i-call para sa jepox user!**

---

## 🎯 For Future Prevention:

**Add the `last_seen` column** para auto-cleanup:

```sql
ALTER TABLE tbl_login 
ADD COLUMN last_seen DATETIME DEFAULT CURRENT_TIMESTAMP AFTER status;

CREATE INDEX idx_last_seen ON tbl_login(last_seen);

UPDATE tbl_login SET last_seen = CURRENT_TIMESTAMP WHERE status = 'online';
```

**Then automatic na ang cleanup!** 🚀

---

**Choose Option 2 para mabilis!** (Choose Option 2 for quick fix!)
