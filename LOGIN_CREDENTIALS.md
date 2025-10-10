# 🔐 ENGUIO System - Login Credentials

## ✅ Login Status: WORKING

**API URL:** `http://localhost/Enguio_Project/Api/login.php`

---

## 👥 Available User Accounts

### 1. Inventory Manager Account ✅ (Plain Text Password)
```
Username: ezay
Password: 1234
Role: inventory
Status: Active
Full Name: ezay Gutierrez
```

**✅ TESTED & WORKING**

---

### 2. Admin Account 🔒 (Hashed Password)
```
Username: clyde
Password: [HASHED - Need to reset or contact admin]
Role: admin
Status: Active
Full Name: Clyde Gasolina
```

**Note:** Password is hashed with bcrypt. You'll need to either:
- Reset the password in the database
- Contact the person who set it up
- Create a new admin account

---

### 3. Cashier Account 🔒 (Hashed Password)
```
Username: jepox
Password: [HASHED - Need to reset or contact admin]
Role: cashier
Status: Active
Full Name: Junel Cajoles
```

**Note:** Password is hashed with bcrypt.

---

## 🚀 How to Login

### Via API (curl):
```bash
curl -X POST http://localhost/Enguio_Project/Api/login.php \
  -H "Content-Type: application/json" \
  -d '{
    "action": "login",
    "username": "ezay",
    "password": "1234",
    "captcha": "10",
    "captchaAnswer": "10",
    "route": "admin"
  }'
```

### Via Web Browser:
1. Open: `http://localhost:3000` (or your frontend URL)
2. Enter username: `ezay`
3. Enter password: `1234`
4. Solve the captcha
5. Click Login

---

## 🔧 How to Reset Passwords for Hashed Accounts

If you need to reset passwords for `clyde` or `jepox`:

### Option 1: Set Plain Text Password (Quick)
```sql
-- For admin account (clyde)
UPDATE tbl_employee SET password = 'admin123' WHERE username = 'clyde';

-- For cashier account (jepox)
UPDATE tbl_employee SET password = 'cashier123' WHERE username = 'jepox';
```

### Option 2: Set Hashed Password (Secure)
Use this PHP script to generate a bcrypt hash:

```php
<?php
// Generate hashed password
$password = 'your_new_password';
$hash = password_hash($password, PASSWORD_BCRYPT);
echo "Hashed password: " . $hash;
?>
```

Then update in database:
```sql
UPDATE tbl_employee 
SET password = '$2y$10$your_generated_hash_here' 
WHERE username = 'clyde';
```

### Option 3: Use XAMPP MySQL Admin
```bash
# Open in browser
http://localhost/phpmyadmin

# Navigate to:
Database: enguio2
Table: tbl_employee
Edit the password field for the user
```

---

## 🎯 Quick Reset via Command Line

To set plain text passwords for all accounts:

```bash
# Run XAMPP MySQL
/opt/lampp/bin/mysql -u root enguio2

# Then execute:
UPDATE tbl_employee SET password = 'admin123' WHERE username = 'clyde';
UPDATE tbl_employee SET password = 'cashier123' WHERE username = 'jepox';
UPDATE tbl_employee SET password = '1234' WHERE username = 'ezay';
```

---

## 📊 User Roles & Permissions

| Role ID | Role Name | Description |
|---------|-----------|-------------|
| 1 | admin | Full system access |
| 2 | cashier | POS operations |
| 3 | inventory | Inventory management |

---

## ✅ Working Account for Testing

**Use this account for immediate testing:**

```
Username: ezay
Password: 1234
Role: inventory (Inventory Manager)
```

This account is confirmed working and can access:
- Inventory management features
- Stock adjustments
- Product management
- Transfer operations

---

## 🔐 Security Recommendations

### For Development:
1. ✅ Current setup is fine (one plain text password for easy testing)
2. Keep `ezay` with password `1234` for development
3. Reset other accounts as needed

### For Production:
1. ⚠️ **IMPORTANT:** Change all plain text passwords to hashed
2. Use strong passwords (minimum 8 characters, mixed case, numbers, symbols)
3. Remove or disable unused accounts
4. Enable password expiration policies
5. Add two-factor authentication (future enhancement)

---

## 🆘 Troubleshooting Login Issues

### "Invalid username or password"
- ✅ **Solution:** Use `ezay` / `1234` (confirmed working)
- Check that username is lowercase
- Verify captcha answer is correct

### "User is inactive"
- Check user status in database: `SELECT status FROM tbl_employee WHERE username = 'your_username';`
- Update if needed: `UPDATE tbl_employee SET status = 'Active' WHERE username = 'your_username';`

### "Invalid captcha"
- Ensure captcha and captchaAnswer match
- Example: If question is "What is 5 + 3?", captchaAnswer should be "8"

### Database Connection Error
- ✅ Already fixed: DB_HOST changed to 127.0.0.1
- Verify XAMPP MySQL is running: `sudo /opt/lampp/lampp status`

---

## 📝 Create New User Account

To create a new admin account:

```sql
INSERT INTO tbl_employee (username, password, Fname, Lname, role_id, status) 
VALUES ('newadmin', 'password123', 'New', 'Admin', 1, 'Active');
```

Or with hashed password:
```sql
-- First generate hash in PHP:
-- $hash = password_hash('password123', PASSWORD_BCRYPT);

INSERT INTO tbl_employee (username, password, Fname, Lname, role_id, status) 
VALUES ('newadmin', '$2y$10$your_hash_here', 'New', 'Admin', 1, 'Active');
```

---

## 🎉 Summary

✅ **Login is working!**
✅ **Working credentials:** ezay / 1234
✅ **API endpoint:** http://localhost/Enguio_Project/Api/login.php
✅ **Database connected:** MySQL via XAMPP
✅ **Total active users:** 3

**Need help resetting other passwords? Just ask!**

---

**Last Updated:** October 2025  
**Status:** ✅ Fully Functional
