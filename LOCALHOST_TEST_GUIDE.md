# Test QZ Tray sa Localhost

## Quick Steps

### 1. Start your local server
```bash
cd frontend
npm run dev
```

### 2. Open QZ Tray
- Open QZ Tray application (make sure it's running)
- Look for QZ Tray icon in system tray

### 3. Open POS System
- Go to: `http://localhost:3000/POS_convenience`
- Wait 3 seconds
- Check top-right corner for printer status

### 4. Status Indicators

**🖨️ Green "QZ Tray Ready"** = Connected! Automatic printing works
- You can checkout and it will print automatically

**🔄 Yellow "Connecting..."** = Auto-connecting
- Wait, it will connect in 3 seconds

**⚠️ Orange "Browser Print Ready"** = No QZ Tray
- Will use browser print (shows dialog)

**❌ Red** = Connection failed
- Click to try connecting manually

### 5. Test Printing

**Option A: Test Connection**
- Click printer status indicator
- Should print test receipt automatically

**Option B: Real Transaction**
- Add items to cart
- Checkout
- Receipt will print automatically (if QZ Tray connected)

### 6. Check Console (F12)
```
✅ QZ Tray connected!
or
❌ QZ Tray connection failed
```

## Troubleshooting

### If QZ Tray not connecting:
1. Make sure QZ Tray is running
2. Check browser console (F12)
3. Click printer indicator to manually connect
4. Look for QZ Tray popup - click "Allow"

### If using browser print:
1. Browser print works automatically
2. Print dialog will open
3. Click "Print" to print
4. Works on any browser!

## Status Check

Open browser console (F12) and you'll see:
- `🚀 Initializing printer integration...`
- `✅ QZ Tray connected successfully` or
- `⚠️ QZ Tray not available, using browser print fallback`

## What Works Where

| Location | QZ Tray | Browser Print |
|----------|---------|---------------|
| localhost:3000 | ✅ Yes | ✅ Yes |
| localhost:80 | ✅ Yes | ✅ Yes |
| Vercel (online) | ⚠️ Needs setup | ✅ Yes |
| Mobile | ❌ No | ✅ Yes |

## Quick Test

1. Start dev server: `npm run dev`
2. Open: `http://localhost:3000/POS_convenience`
3. Check status: Top-right corner
4. Test: Click printer icon
5. Result: Should print automatically!

That's it! 🎉

