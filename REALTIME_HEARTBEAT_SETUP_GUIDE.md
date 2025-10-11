# ❤️ Real-Time Heartbeat System - Complete Guide

## 🎯 Purpose
This system provides **real-time detection** of employee online/offline status through automatic heartbeat signals. The system now accurately tracks who is truly logged in and automatically marks users as offline if they close their browser or lose connection.

## 🚀 What Was Implemented

### 1. Database Changes
- ✅ Added `last_seen` column to `tbl_login` table
- ✅ Tracks the last heartbeat timestamp for each logged-in user
- ✅ Indexed for optimal query performance

### 2. Backend Components

#### **Api/heartbeat.php** - Heartbeat Endpoint
Handles three main actions:
- `heartbeat` - Updates last_seen timestamp (called every 30 seconds by frontend)
- `check_status` - Checks if a user is still online (last_seen within 2 minutes)
- `auto_cleanup` - Automatically marks users as offline if no heartbeat for > 2 minutes

#### **Api/login.php** - Updated Login
- Now sets initial `last_seen` timestamp when user logs in
- Status starts as 'online' with current timestamp

#### **Api/modules/reports.php** - Updated Login Logs Report
- Real-time detection: User is "ONLINE" only if `last_seen` within 120 seconds
- Automatically shows users as "OFFLINE" if no heartbeat received
- No more false positives from stale database records!

### 3. Frontend Components

#### **app/lib/HeartbeatService.js** - Heartbeat Service
A singleton service that:
- Sends heartbeat every 30 seconds automatically
- Also sends heartbeat on user activity (mouse move, keyboard)
- Stops heartbeat on logout or component unmount
- Shows real-time console logs for debugging

#### **Updated App Pages**
All main entry points now integrate the heartbeat:
- ✅ `app/Inventory_Con/page.js` - Inventory users
- ✅ `app/admin/page.js` - Admin users  
- ✅ `app/POS_convenience/page.js` - Cashier users

## 📋 Setup Instructions

### Step 1: Run Database Migration

Run this SQL file in phpMyAdmin or MySQL:

```bash
mysql -u root enguio2 < add_last_seen_column.sql
```

Or manually in phpMyAdmin:
1. Open phpMyAdmin
2. Select `enguio2` database
3. Go to SQL tab
4. Paste contents of `add_last_seen_column.sql`
5. Click "Go"

### Step 2: Restart Development Server

```bash
# Stop the dev server (Ctrl+C)
npm run dev
```

### Step 3: Test the System

#### Test 1: Login Detection
1. Login as Admin user → Should immediately show as ONLINE ✅
2. Check Admin Dashboard → Login Logs Report
3. Verify "Currently Online" count shows 1 user

#### Test 2: Multiple Users
1. Login as Admin (browser 1)
2. Login as Inventory user (browser 2)
3. Check Login Logs Report → Should show 2 users online

#### Test 3: Real-Time Offline Detection
1. Login as Cashier user
2. Verify they show as ONLINE
3. Close the cashier browser **without logging out**
4. Wait 2-3 minutes
5. Refresh Login Logs Report
6. Cashier should now show as OFFLINE 🔴

#### Test 4: Activity Detection
1. Login and go idle
2. Heartbeat continues every 30 seconds
3. Move mouse or press any key
4. Immediate heartbeat sent
5. User remains ONLINE ✅

## 🔍 How It Works

### Timeline
```
User Logs In
    ↓
status = 'online', last_seen = NOW()
    ↓
Heartbeat Service Starts
    ↓
Every 30 seconds → Send heartbeat → Update last_seen
    ↓
On Activity (mouse/keyboard) → Send heartbeat → Update last_seen
    ↓
Backend checks: last_seen within 120 seconds?
    ├─ YES → User is ONLINE 🟢
    └─ NO  → User is OFFLINE 🔴
    ↓
User Closes Browser / Loses Connection
    ↓
Heartbeats stop
    ↓
After 2 minutes of no heartbeat
    ↓
System automatically shows user as OFFLINE
```

### Detection Rules
- **ONLINE** = `status = 'online'` AND `last_seen` within last 2 minutes
- **OFFLINE** = `status = 'offline'` OR `last_seen` > 2 minutes ago

## 📊 Login Logs Report Behavior

### Before This Update
❌ Users showed as "online" even when not logged in
❌ Stale database records caused incorrect counts
❌ No real-time detection

### After This Update
✅ Only shows users who are actively sending heartbeats
✅ Automatically detects when users go offline
✅ Real-time updates every 10 seconds in the report
✅ Accurate "Currently Online" count

## 🔧 Configuration

### Heartbeat Interval
Located in `app/lib/HeartbeatService.js`:
```javascript
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
```

### Online Timeout Threshold
Located in `Api/heartbeat.php` and `Api/modules/reports.php`:
```php
// Consider online if last_seen within 120 seconds (2 minutes)
TIMESTAMPDIFF(SECOND, last_seen, NOW()) <= 120
```

You can adjust these values:
- **Shorter interval** = More accurate but more server load
- **Longer timeout** = More forgiving for slow connections

## 🐛 Debugging

### Check Heartbeat in Browser Console
Open browser console (F12) and look for:
```
💓 Starting heartbeat service for admin user
💓 Heartbeat sent: 2025-10-10 14:30:25
💓 Heartbeat sent: 2025-10-10 14:30:55
💓 Heartbeat sent: 2025-10-10 14:31:25
```

### Check Database Directly
```sql
SELECT 
    emp_id,
    username,
    status,
    last_seen,
    TIMESTAMPDIFF(SECOND, last_seen, NOW()) as seconds_since_seen
FROM tbl_login
WHERE login_date = CURDATE()
AND status = 'online'
ORDER BY last_seen DESC;
```

### Common Issues

**Issue**: User shows as offline even though logged in
**Solution**: 
- Check browser console for heartbeat errors
- Verify `Api/heartbeat.php` is accessible
- Check that `last_seen` column exists in database

**Issue**: All users show as offline
**Solution**:
- Run the database migration again
- Restart development server
- Clear browser cache and re-login

**Issue**: Heartbeat service not starting
**Solution**:
- Check that `user_data` exists in sessionStorage
- Verify HeartbeatService import is correct
- Check browser console for errors

## 📱 Mobile / Tablet Considerations

The heartbeat service works on mobile devices too:
- Sends heartbeat every 30 seconds
- Also triggers on touch events
- Automatically stops when app goes to background

## 🎉 Benefits

✅ **Real-Time Accuracy** - Know exactly who is online right now
✅ **Automatic Detection** - No manual intervention needed
✅ **Network Resilience** - Detects connection loss automatically  
✅ **Activity Tracking** - Shows true active users, not just logged-in
✅ **Clean Logout** - Automatically marks users offline after disconnect
✅ **Performance Optimized** - Minimal server load with 30-second intervals

## 📝 Files Modified/Created

### Created
- `Api/heartbeat.php` - Heartbeat endpoint
- `app/lib/HeartbeatService.js` - Frontend heartbeat service
- `add_last_seen_column.sql` - Database migration
- `REALTIME_HEARTBEAT_SETUP_GUIDE.md` - This guide

### Modified
- `Api/login.php` - Added last_seen to login
- `Api/modules/reports.php` - Real-time online detection
- `app/Inventory_Con/page.js` - Integrated heartbeat
- `app/admin/page.js` - Integrated heartbeat
- `app/POS_convenience/page.js` - Integrated heartbeat

## 🚀 Future Enhancements (Optional)

1. **Auto-Cleanup Cron Job** - Run `auto_cleanup` action every 5 minutes
2. **Online Status Indicator** - Show green/red dot next to user names
3. **Idle Detection** - Distinguish between active and idle users
4. **Session Timeout** - Force logout after X hours of inactivity
5. **Network Status** - Show connection quality (good/poor/disconnected)

---

## ✅ Testing Checklist

- [ ] Database migration completed successfully
- [ ] Development server restarted
- [ ] Admin user can login and shows as ONLINE
- [ ] Inventory user can login and shows as ONLINE  
- [ ] Cashier user can login and shows as ONLINE
- [ ] Browser console shows heartbeat messages
- [ ] Multiple users show correct count in Login Logs Report
- [ ] User shows OFFLINE after closing browser (wait 2 minutes)
- [ ] Logout properly stops heartbeat service
- [ ] No console errors or warnings

---

**Implementation Date**: October 10, 2025  
**Status**: ✅ Complete and Ready for Testing  
**Real-Time Heartbeat System**: ACTIVE 💓

