# 🌐 HOSTING PRINT SETUP GUIDE

## Para sa Namehost (Linux Hosting)

### ❌ PROBLEMA:
- Linux hosting walang Windows print commands
- Walang physical printer access
- Walang shell_exec permissions

### ✅ SOLUSYON:
- Cloud print service
- Webhook to local printer
- Email receipts
- PDF receipts

---

## 🚀 SETUP STEPS:

### **STEP 1: I-upload ang files sa Namehost**
```
Files to upload:
- cloud-print-receipt.php
- print-webhook.php (sa local server)
- Updated POS system
```

### **STEP 2: I-configure ang cloud print**
```php
// Sa cloud-print-receipt.php, i-update ang webhook URL:
$webhookUrl = 'https://your-local-server.com/print-webhook.php';
```

### **STEP 3: I-setup ang local webhook server**
```php
// Sa local server, i-upload ang print-webhook.php
// I-configure ang webhook URL sa cloud-print-receipt.php
```

### **STEP 4: I-test ang setup**
```javascript
// Test sa browser console:
fetch('https://yournamehost.com/cloud-print-receipt.php', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    date: '2024-01-15',
    time: '14:30:00',
    transactionId: 'TEST123',
    cashier: 'Test User',
    terminalName: 'POS',
    items: [{ name: 'Test Item', quantity: 1, price: 10.00 }],
    subtotal: 10.00,
    grandTotal: 10.00,
    paymentMethod: 'CASH',
    amountPaid: 10.00,
    change: 0
  })
})
.then(r => r.json())
.then(console.log);
```

---

## 🔧 ALTERNATIVE SOLUTIONS:

### **OPTION 1: Email Receipts**
```php
// I-configure ang email sa cloud-print-receipt.php
$to = 'receipts@yourstore.com';
$subject = 'Receipt - ' . $transactionId;
$message = $receipt;
```

### **OPTION 2: PDF Receipts**
```php
// I-generate ang PDF receipt
$pdf = generatePDFReceipt($receipt);
$pdfFile = '/tmp/receipt_' . $transactionId . '.pdf';
file_put_contents($pdfFile, $pdf);
```

### **OPTION 3: Cloud Print Service**
```php
// I-use ang Google Cloud Print o ibang service
$cloudPrint = new GoogleCloudPrint();
$cloudPrint->print($receipt, $printerId);
```

---

## 📋 CHECKLIST:

- [ ] I-upload ang cloud-print-receipt.php sa Namehost
- [ ] I-configure ang webhook URL
- [ ] I-setup ang local webhook server
- [ ] I-test ang cloud print
- [ ] I-configure ang email receipts (backup)
- [ ] I-update ang POS system

---

## 🆘 TROUBLESHOOTING:

### **Error: "Webhook failed"**
- I-check ang webhook URL
- I-check ang local server status
- I-check ang firewall settings

### **Error: "Email sending failed"**
- I-configure ang SMTP settings
- I-check ang email permissions
- I-use ang PHPMailer library

### **Error: "Printing failed"**
- I-check ang local printer status
- I-check ang webhook permissions
- I-use ang email backup

---

## 💡 RECOMMENDATIONS:

### **Para sa Production:**
1. **Use cloud print service** (Google Cloud Print, etc.)
2. **I-setup ang local webhook server** (sa office/store)
3. **I-configure ang email receipts** (backup)
4. **I-test ang setup** thoroughly

### **Para sa Development:**
1. **Keep local printing** (current setup)
2. **I-test ang cloud print** sa staging
3. **I-deploy sa production** when ready

---

## 📞 NEED HELP?

1. I-configure ang webhook URL
2. I-setup ang local webhook server
3. I-test ang cloud print
4. I-configure ang email receipts

**Ang cloud print ay magiging working sa Namehost hosting!** 🌐
