# 🖨️ QZ Tray Setup Guide - Tagalog Version

## 📋 Ano ang QZ Tray?

Ang QZ Tray ay isang programa na tumutulong sa iyong website na mag-print sa local printer, kahit naka-host online ang website mo sa Namecheap.

**Mga Benepisyo:**
- ✅ Gumagana kahit online ang website
- ✅ Direct printing sa thermal printer
- ✅ Libre para sa basic use
- ✅ Secure at mabilis

---

## 🚀 Hakbang 1: I-download at I-install ang QZ Tray

### 1.1 Download

1. Pumunta sa: **https://qz.io/download/**
2. I-download ang Windows installer
3. I-run ang installer at sundin ang instructions

### 1.2 I-start ang QZ Tray

1. Pagkatapos mag-install, i-launch ang **QZ Tray** sa Start Menu
2. Makikita mo ang QZ icon sa system tray (baba-kanan ng screen)
3. Right-click sa icon para makita ang menu
4. Siguraduhing "Connected" ang status

### 1.3 I-set na Auto-start

1. Right-click sa QZ Tray icon
2. I-check ang **"Launch on Startup"**
3. Automatic na mag-start ang QZ Tray kapag nag-on ang computer

---

## 🖨️ Hakbang 2: I-setup ang Printer

### 2.1 Check kung Connected ang Printer

Siguraduhing ang **POS-58** printer mo ay:
- ✅ Nakaconnect sa USB
- ✅ Naka-on
- ✅ May papel
- ✅ Naka-install sa Windows

### 2.2 Test ang Printer

1. Buksan ang **Settings** → **Devices** → **Printers & scanners**
2. Hanapin ang **POS-58** printer
3. I-click at piliin ang **"Manage"**
4. I-click ang **"Print test page"**
5. Dapat mag-print ng test page

---

## 🧪 Hakbang 3: I-test ang QZ Tray

### 3.1 Buksan ang Test Page

1. Siguraduhing naka-on ang XAMPP Apache
2. Buksan ang browser at pumunta sa:
   ```
   http://localhost/caps2e2/qz-tray-test.html
   ```

### 3.2 I-test ang Connection

1. I-click ang **"Connect to QZ Tray"** button
2. Dapat makita: ✅ "Connected to QZ Tray successfully!"
3. Lalabas ang listahan ng available printers

### 3.3 Piliin ang Printer

1. I-click ang **POS-58** sa printer list
2. Magiging green ang highlight
3. Lalabas ang preview ng test receipt

### 3.4 I-test ang Printing

1. I-click ang **"Test Print"** button
2. Dapat mag-print ang printer ng test receipt
3. Kung successful: ✅ "Test receipt printed successfully!"

**Kung may problema:**
- ❌ "QZ Tray is not running" → I-start ang QZ Tray
- ❌ "No printers found" → Check kung naka-install ang printer
- ❌ Hindi nag-print → Check kung may papel at online ang printer

---

## 🌐 Hakbang 4: I-upload sa Namecheap

### 4.1 Upload ang PHP File

1. Gumamit ng FTP (FileZilla) para mag-connect sa Namecheap
2. Pumunta sa `Api` folder ng website mo
3. I-upload ang file: `Api/qz-tray-receipt.php`

### 4.2 Test ang PHP Script

1. Buksan sa browser:
   ```
   https://your-domain.com/Api/qz-tray-receipt.php
   ```
2. Dapat may JSON response (kahit may error message)

---

## ✅ Hakbang 5: I-test sa POS System

### 5.1 Local Testing (XAMPP)

1. Siguraduhing naka-on ang QZ Tray
2. I-start ang dev server:
   ```bash
   npm run dev
   ```
3. Buksan ang POS: `http://localhost:3000/POS_convenience`
4. Mag-add ng items at mag-checkout
5. Dapat automatic mag-print ng receipt

### 5.2 Online Testing (Namecheap)

1. Siguraduhing naka-on ang QZ Tray sa computer mo
2. I-upload lahat ng files sa Namecheap
3. Buksan ang online POS: `https://your-domain.com/POS_convenience`
4. Mag-add ng items at mag-checkout
5. Dapat mag-print sa local printer mo via QZ Tray

---

## 🔧 Troubleshooting - Mga Solusyon

### Problema: "QZ Tray is not running"

**Solusyon:**
1. I-start ang QZ Tray application
2. Check sa system tray kung may QZ icon
3. Right-click → verify na "Connected"

### Problema: Hindi lumalabas ang printer

**Solusyon:**
1. Check kung naka-install ang printer sa Windows
2. Buksan ang Settings → Printers & scanners
3. Verify na nandoon ang printer at online
4. I-click ang "Refresh Printers" sa test page

### Problema: Nag-send ng print job pero walang lumalabas

**Solusyon:**
1. Check kung may papel ang printer
2. Check kung online ang printer (walang error)
3. Buksan ang Windows Print Queue at check kung may stuck jobs
4. I-restart ang printer at subukan ulit

### Problema: CORS error sa PHP script

**Solusyon:**
1. May CORS headers na ang PHP script
2. Kung may error pa rin, check ang Namecheap hosting settings
3. Siguraduhing accessible ang Api folder

---

## 📊 Checklist - Bago Gamitin

Siguraduhing lahat ay naka-check:

- [ ] ✅ QZ Tray installed at running
- [ ] ✅ QZ Tray naka-set na auto-start
- [ ] ✅ Printer (POS-58) installed at working
- [ ] ✅ Test page nag-print successfully
- [ ] ✅ qz-tray-receipt.php uploaded sa Namecheap
- [ ] ✅ POS system updated
- [ ] ✅ Test sale nag-print (local)
- [ ] ✅ Test sale nag-print (online)

---

## 💡 Mga Tips

### 1. Panatilihing Running ang QZ Tray
- I-enable ang "Launch on Startup"
- Check sa system tray kung running

### 2. Alagaan ang Printer
- I-update ang printer drivers
- Regular na linisin ang printer head
- Laging may spare thermal paper rolls

### 3. Regular Testing
- Gamitin ang qz-tray-test.html para sa quick tests
- I-test pagkatapos ng updates
- Verify na gumagana both local at online

### 4. Backup Plan
- Kung mag-fail ang QZ Tray, automatic na gagamit ng server printing
- May email receipt option din (already implemented)
- Itago ang printer manual para sa troubleshooting

---

## 🎯 Paano Gumagana ang Sistema

### Local XAMPP
```
POS → PHP Script → Windows Print Command → Printer
```

### Online Namecheap
```
POS → PHP Script → QZ Tray → Local Printer
```

### Pagkakaiba

| Feature | Local XAMPP | Online (Namecheap) |
|---------|-------------|-------------------|
| Printing Method | Server-side | Client-side (QZ Tray) |
| Kailangan ng Admin | Oo | Hindi |
| Kailangan ng QZ Tray | Hindi | Oo |
| Pwede Remote | Hindi | Oo |
| Setup | Medium | Easy |

---

## 🎉 Success!

Kung nag-print na ang receipt from online POS, congratulations! Fully configured na ang system mo!

**Susunod na Gagawin:**
- I-train ang staff sa POS system
- Monitor ang printer performance
- I-update ang QZ Tray regularly
- Enjoy seamless printing! 🖨️✨

---

## 📞 Mga Links

- **QZ Tray Download:** https://qz.io/download/
- **QZ Tray Docs:** https://qz.io/docs/
- **Test Page:** http://localhost/caps2e2/qz-tray-test.html
- **POS System:** http://localhost:3000/POS_convenience

---

## 🆘 Kung May Tanong

1. Check muna ang troubleshooting section sa taas
2. I-test ang printer using qz-tray-test.html
3. Verify na running ang QZ Tray
4. Check ang printer sa Windows Settings

---

**Huling Update:** October 9, 2025  
**Version:** 1.0  
**Para sa:** Enguio's Pharmacy POS System

