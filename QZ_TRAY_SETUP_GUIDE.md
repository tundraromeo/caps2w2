# 🖨️ QZ TRAY SETUP GUIDE

## Para sa Online POS Auto Receipt Printing

### ✅ **ANO ANG QZ TRAY?**
- **Desktop application** na connects web browser to local printer
- **Works with online hosting** (Namecheap, etc.)
- **Supports thermal printers** (POS-58, Epson, etc.)
- **Uses JavaScript** to communicate
- **Works on Chrome/Edge** browsers

---

## 🚀 **INSTALLATION STEPS:**

### **STEP 1: Download QZ Tray**
1. **Go to:** https://qz.io/download/
2. **Download QZ Tray** for Windows
3. **Install QZ Tray** on your computer
4. **Start QZ Tray** (should run in system tray)

### **STEP 2: Configure QZ Tray**
1. **Right-click QZ Tray** in system tray
2. **Click "Settings"**
3. **Enable "Allow unsigned certificates"** (for development)
4. **Add your domain** to allowed origins
5. **Save settings**

### **STEP 3: Test QZ Tray**
1. **Open browser**
2. **Go to:** `http://localhost/caps2e2/qz-tray-setup.html`
3. **Click "Check QZ Tray Status"**
4. **Should show:** ✅ QZ Tray is running!

---

## 🔧 **INTEGRATION WITH POS SYSTEM:**

### **STEP 1: Update POS System**
```javascript
// Replace printReceipt function in POS system
const printReceipt = async () => {
    // Get receipt data
    const receiptData = {
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        transactionId: `TXN${Date.now().toString().slice(-6)}`,
        cashier: 'Admin',
        terminalName: 'POS',
        items: cart.map(item => ({
            name: item.product.name,
            quantity: item.quantity,
            price: item.product.price
        })),
        subtotal: total,
        grandTotal: payableTotal,
        paymentMethod: paymentMethod.toUpperCase(),
        amountPaid: parseFloat(amountPaid),
        change: change
    };
    
    try {
        // Get receipt data from PHP
        const response = await fetch('qz-tray-receipt.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(receiptData)
        });
        
        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                // Send to QZ Tray
                const printResponse = await fetch('http://localhost:9999/api/print', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        printer: 'POS-58',
                        data: result.data.receipt,
                        options: {
                            copies: 1,
                            orientation: 'portrait'
                        }
                    })
                });
                
                if (printResponse.ok) {
                    console.log('✅ Receipt printed successfully!');
                    return { success: true, message: 'Receipt printed successfully!' };
                } else {
                    console.log('❌ Print failed. Check QZ Tray and printer.');
                    return { success: false, message: 'Print failed. Check QZ Tray and printer.' };
                }
            } else {
                console.log('❌ Receipt generation failed: ' + result.message);
                return { success: false, message: result.message };
            }
        } else {
            console.log('❌ Cannot get receipt data from PHP.');
            return { success: false, message: 'Cannot get receipt data from PHP.' };
        }
    } catch (error) {
        console.log('❌ Print error: ' + error.message);
        return { success: false, message: error.message };
    }
};
```

### **STEP 2: Test Integration**
1. **Open POS system**
2. **Add items to cart**
3. **Process payment**
4. **Click Print Receipt**
5. **Should print automatically**

---

## 🔍 **TROUBLESHOOTING:**

### **Error: "QZ Tray is not running"**
- **Fix:** Install and start QZ Tray
- **Check:** QZ Tray icon in system tray

### **Error: "Print failed"**
- **Fix:** Check printer connection
- **Check:** Printer is online
- **Check:** QZ Tray settings

### **Error: "Cannot get receipt data"**
- **Fix:** Check PHP file path
- **Check:** PHP error log
- **Check:** CORS settings

---

## 💡 **BENEFITS:**

### **✅ ADVANTAGES:**
- **Works with online hosting** (Namecheap, etc.)
- **Automatic printing** (no manual steps)
- **Supports thermal printers** (POS-58, etc.)
- **Works on Chrome/Edge** browsers
- **Secure communication** (HTTPS)

### **❌ DISADVANTAGES:**
- **Requires QZ Tray** (desktop application)
- **Need to install** on each computer
- **Browser compatibility** (Chrome/Edge only)

---

## 📞 **NEED HELP?**

1. **Install QZ Tray** from https://qz.io/download/
2. **Configure QZ Tray** settings
3. **Test QZ Tray** with setup page
4. **Integrate with POS** system

**Ang QZ Tray ay magiging working sa online hosting!** 🌐
