# Combined Reports - Visual User Guide

## 🎯 Quick Overview

This feature allows you to **combine multiple reports** (Stock In, Stock Out, Sales, etc.) into **one single PDF** file.

---

## 📊 Where to Find It

```
┌─────────────────────────────────────────────────────────┐
│          ENGUIO PHARMACY SYSTEM - REPORTS PAGE          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │   📦     │  │   📤     │  │   💰     │            │
│  │ Stock In │  │ Stock Out│  │  Sales   │            │
│  │          │  │          │  │          │            │
│  │ [Generate│  │ [Generate│  │ [Generate│            │
│  │ [Combine │  │ [Combine │  │ [Combine │  ◄── Click any of these
│  │ [Print]  │  │ [Print]  │  │ [Print]  │            │
│  └──────────┘  └──────────┘  └──────────┘            │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐            │
│  │   👤     │  │   📋     │  │   📊     │            │
│  │ Cashier  │  │Inventory │  │   All    │            │
│  │Performance│  │ Balance  │  │ Reports  │            │
│  └──────────┘  └──────────┘  └──────────┘            │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 The Combine Reports Modal

### Step 1: Modal Opens

```
┌────────────────────────────────────────────────────────────┐
│  📋 Combine Multiple Reports into One PDF             [X] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  Download Stock In, Stock Out, Sales, and other reports   │
│  in a single combined PDF file                            │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ✨ Pro Tip: Select multiple report types below to   │ │
│  │    create a comprehensive combined report            │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  QUICK SELECT                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │
│  │ Today  │ │Yesterday│ │This Week│ │Last Week│          │
│  └────────┘ └────────┘ └────────┘ └────────┘           │
│  ┌────────┐ ┌────────┐                                   │
│  │This    │ │Last     │                                   │
│  │Month   │ │Month    │                                   │
│  └────────┘ └────────┘                                   │
│                                                            │
│  CUSTOM DATE RANGE                                        │
│  Start Date: [2025-10-01]  End Date: [2025-10-23]       │
│                                                            │
│  [🔍 Check Available Data] ◄── Optional: Check DB        │
│                                                            │
│  REPORT TYPES TO COMBINE                                  │
│  ☐ 📦 Stock In Report                                    │
│  ☐ 📤 Stock Out Report                                   │
│  ☐ 💰 Sales Report                                       │
│  ☐ 👤 Cashier Performance Report                         │
│  ☐ 📋 Inventory Balance Report                           │
│  ─────────────────────────────────────────────────────── │
│  ☐ 📊 All Reports (Select All Types)                     │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ✅ PDF will include: No reports selected             │ │
│  │ 📅 Date Range: 2025-10-01 to 2025-10-23             │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  [📋 Download Combined PDF (0 Selected)]    [✕ Cancel]   │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

### Step 2: User Makes Selections

```
┌────────────────────────────────────────────────────────────┐
│  📋 Combine Multiple Reports into One PDF             [X] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  QUICK SELECT                                             │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐           │
│  │ Today  │ │Yesterday│ │[THIS  ]│ │Last Week│          │
│  └────────┘ └────────┘ │[WEEK] │ └────────┘  ◄── Clicked!
│                         └────────┘                         │
│  (Date range auto-fills to last 7 days)                   │
│                                                            │
│  CUSTOM DATE RANGE                                        │
│  Start Date: [2025-10-17]  End Date: [2025-10-23]       │
│                                                            │
│  REPORT TYPES TO COMBINE                                  │
│  ☑ 📦 Stock In Report            ✓ SELECTED  ◄── Checked │
│  ☑ 📤 Stock Out Report           ✓ SELECTED  ◄── Checked │
│  ☑ 💰 Sales Report                ✓ SELECTED  ◄── Checked │
│  ☐ 👤 Cashier Performance Report                         │
│  ☐ 📋 Inventory Balance Report                           │
│  ─────────────────────────────────────────────────────── │
│  ☐ 📊 All Reports (Select All Types)                     │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │ ✅ PDF will include: Stock In Report, Stock Out      │ │
│  │    Report, Sales Report                               │ │
│  │ 📅 Date Range: 2025-10-17 to 2025-10-23             │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  [📋 Download Combined PDF (3 Selected)]    [✕ Cancel]   │
│         ▲                                                  │
│         └─ Button now enabled!                            │
└────────────────────────────────────────────────────────────┘
```

### Step 3: Generating PDF

```
┌────────────────────────────────────────────────────────────┐
│  📋 Combine Multiple Reports into One PDF             [X] │
├────────────────────────────────────────────────────────────┤
│                                                            │
│                    ┌─────────────────┐                    │
│                    │                 │                    │
│                    │   🔄 Loading   │                    │
│                    │                 │                    │
│                    │ Generating PDF  │                    │
│                    │                 │                    │
│                    └─────────────────┘                    │
│                                                            │
│  [⏳ Generating PDF...]                   [✕ Cancel]      │
│         ▲                                                  │
│         └─ Button disabled during generation              │
└────────────────────────────────────────────────────────────┘
```

### Step 4: PDF Downloaded!

```
┌────────────────────────────────────────────────────────────┐
│                                                            │
│           ✅ PDF Downloaded Successfully!                 │
│                                                            │
│  File: Combined_Reports_Multiple_Reports_                 │
│        2025-10-17_to_2025-10-23.pdf                       │
│                                                            │
│  Check your Downloads folder                              │
│                                                            │
└────────────────────────────────────────────────────────────┘

(Modal closes automatically)
```

---

## 📄 What the PDF Looks Like

### Page 1: Header & First Report

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│     ╔═══════════════════════════════════════════╗      │
│     ║   ENGUIO PHARMACY SYSTEM                  ║      │
│     ║   Combined Reports                        ║      │
│     ╚═══════════════════════════════════════════╝      │
│                                                         │
│   ┌───────────────────────────────────────────────┐    │
│   │ Report Information                            │    │
│   │                                               │    │
│   │ Date Range: 2025-10-17 to 2025-10-23        │    │
│   │ Generated: 10/23/2025 at 2:30 PM            │    │
│   │ Generated By: Admin                          │    │
│   │ Report Types: Stock In, Stock Out, Sales     │    │
│   │ Total Records: 456 records                   │    │
│   └───────────────────────────────────────────────┘    │
│                                                         │
│   ┌───────────────────────────────────────────────┐    │
│   │ 📦 Stock In Report                            │    │
│   │ 125 records found for this report type       │    │
│   └───────────────────────────────────────────────┘    │
│                                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │ Date     │ Time  │ Product    │ Quantity │...   │  │
│   ├─────────────────────────────────────────────────┤  │
│   │10/17/2025│09:30AM│Medicine A  │  +50     │...   │  │
│   │10/17/2025│10:15AM│Medicine B  │  +30     │...   │  │
│   │10/17/2025│11:00AM│Supplies C  │  +100    │...   │  │
│   │   ...    │  ...  │    ...     │   ...    │...   │  │
│   └─────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Page 2: More Reports

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   ┌───────────────────────────────────────────────┐    │
│   │ 📤 Stock Out Report                           │    │
│   │ 198 records found for this report type       │    │
│   └───────────────────────────────────────────────┘    │
│                                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │ Date     │ Time  │ Product    │ Quantity │...   │  │
│   ├─────────────────────────────────────────────────┤  │
│   │10/17/2025│01:30PM│Medicine A  │   -5     │...   │  │
│   │10/17/2025│02:15PM│Medicine D  │   -12    │...   │  │
│   │10/18/2025│09:00AM│Supplies E  │   -8     │...   │  │
│   │   ...    │  ...  │    ...     │   ...    │...   │  │
│   └─────────────────────────────────────────────────┘  │
│                                                         │
│   ┌───────────────────────────────────────────────┐    │
│   │ 💰 Sales Report                               │    │
│   │ 133 records found for this report type       │    │
│   └───────────────────────────────────────────────┘    │
│                                                         │
│   ┌─────────────────────────────────────────────────┐  │
│   │ Date     │Transaction│Amount    │Items │...     │  │
│   ├─────────────────────────────────────────────────┤  │
│   │10/17/2025│ TXN001   │ ₱1,250.00│  15  │...     │  │
│   │10/17/2025│ TXN002   │ ₱850.00  │  8   │...     │  │
│   │   ...    │   ...    │   ...    │ ...  │...     │  │
│   └─────────────────────────────────────────────────┘  │
│                                                         │
│   ┌───────────────────────────────────────────────┐    │
│   │ Generated by ENGUIO Pharmacy System           │    │
│   │ This is a computer-generated document.        │    │
│   └───────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 💡 Common Use Cases

### Use Case 1: Daily Operations Summary

```
📅 Date Range: Today
☑ Stock In
☑ Stock Out  
☑ Sales
☑ Cashier Performance

Result: Complete daily operations report
```

### Use Case 2: Weekly Management Report

```
📅 Date Range: This Week
☑ All Reports (checkbox)

Result: Comprehensive weekly summary for management
```

### Use Case 3: Monthly Audit Report

```
📅 Date Range: October 1 - October 31
☑ Stock In
☑ Stock Out
☑ Inventory Balance

Result: Full inventory audit trail for the month
```

### Use Case 4: Sales Analysis

```
📅 Date Range: Last Month
☑ Sales
☑ Cashier Performance

Result: Sales performance and staff metrics
```

---

## 🎨 Visual Selection Guide

### Before Selection (Empty State)

```
┌──────────────────────────────────────────────────┐
│ REPORT TYPES TO COMBINE                          │
│                                                   │
│  ☐ 📦 Stock In Report                           │
│  ☐ 📤 Stock Out Report                          │
│  ☐ 💰 Sales Report                              │
│  ☐ 👤 Cashier Performance Report                │
│  ☐ 📋 Inventory Balance Report                  │
│  ──────────────────────────────────────────────  │
│  ☐ 📊 All Reports (Select All Types)            │
│                                                   │
├──────────────────────────────────────────────────┤
│ ❌ No reports selected - please check boxes     │
│    above                                          │
└──────────────────────────────────────────────────┘
   [📋 Download Combined PDF (Disabled)]
```

### With Selections (Active State)

```
┌──────────────────────────────────────────────────┐
│ REPORT TYPES TO COMBINE                          │
│                                                   │
│  ☑ 📦 Stock In Report          ✓ SELECTED       │
│  ☑ 📤 Stock Out Report         ✓ SELECTED       │
│  ☐ 💰 Sales Report                              │
│  ☐ 👤 Cashier Performance Report                │
│  ☐ 📋 Inventory Balance Report                  │
│  ──────────────────────────────────────────────  │
│  ☐ 📊 All Reports (Select All Types)            │
│                                                   │
├──────────────────────────────────────────────────┤
│ ✅ PDF will include: Stock In Report, Stock Out │
│    Report                                         │
│ 📅 Date Range: 2025-10-01 to 2025-10-23        │
└──────────────────────────────────────────────────┘
   [📋 Download Combined PDF (2 Selected)] ◄── ENABLED
```

### All Reports Selected

```
┌──────────────────────────────────────────────────┐
│ REPORT TYPES TO COMBINE                          │
│                                                   │
│  ☐ 📦 Stock In Report                           │
│  ☐ 📤 Stock Out Report                          │
│  ☐ 💰 Sales Report                              │
│  ☐ 👤 Cashier Performance Report                │
│  ☐ 📋 Inventory Balance Report                  │
│  ──────────────────────────────────────────────  │
│  ☑ 📊 All Reports (Select All Types) ✓ ALL     │
│                                                   │
├──────────────────────────────────────────────────┤
│ ✅ PDF will include: All Report Types (Stock    │
│    In, Stock Out, Sales, Cashier Performance,   │
│    Inventory Balance)                            │
│ 📅 Date Range: 2025-10-01 to 2025-10-23        │
└──────────────────────────────────────────────────┘
   [📋 Download Combined PDF (All Types)] ◄── ENABLED
```

---

## 🔍 Data Availability Check

### Before Checking

```
┌──────────────────────────────────────────────────┐
│ CUSTOM DATE RANGE                                │
│ Start Date: [2025-10-01]  End Date: [2025-10-23]│
│                                                   │
│ [🔍 Check Available Data] ◄── Click to check    │
└──────────────────────────────────────────────────┘
```

### After Checking (With Data)

```
┌──────────────────────────────────────────────────┐
│ CUSTOM DATE RANGE                                │
│ Start Date: [2025-10-01]  End Date: [2025-10-23]│
│                                                   │
│ [⏳ Checking...]                                 │
│                                                   │
│ ┌────────────────────────────────────────────┐  │
│ │ AVAILABLE DATA IN DATABASE                  │  │
│ │                                             │  │
│ │ 📦 Stock In Reports                         │  │
│ │    125 records | 2025-10-01 to 2025-10-23  │  │
│ │                                             │  │
│ │ 📤 Stock Out Reports                        │  │
│ │    198 records | 2025-10-15 to 2025-10-23  │  │
│ │                                             │  │
│ │ 💰 Sales Reports                            │  │
│ │    No data                                   │  │
│ │                                             │  │
│ │ 💡 Tip: Use the date ranges above to select│  │
│ │    a period with actual data                │  │
│ │                                             │  │
│ │ [📅 Use Date Range with Data]               │  │
│ └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

---

## 📱 Responsive Design

### Desktop View

```
┌─────────────────────────────────────────────────────┐
│  [Large modal - 600px wide, centered on screen]    │
│  All elements visible, comfortable spacing          │
└─────────────────────────────────────────────────────┘
```

### Tablet View

```
┌──────────────────────────────────────────┐
│  [Medium modal - adapts to screen]       │
│  Buttons may stack, still readable       │
└──────────────────────────────────────────┘
```

### Mobile View

```
┌─────────────────────────┐
│  [Full screen modal]    │
│  Stacked layout         │
│  Touch-friendly buttons │
└─────────────────────────┘
```

---

## ✨ Key Visual Indicators

### Button States

```
Enabled:   [📋 Download Combined PDF]  ◄── Blue background
Disabled:  [📋 Download Combined PDF]  ◄── Gray background
Loading:   [⏳ Generating PDF...]       ◄── Spinner animation
```

### Checkbox States

```
Unchecked:  ☐ Report Name
Checked:    ☑ Report Name  ✓ SELECTED  ◄── Green badge
```

### Selection Summary

```
No selection:
┌────────────────────────────────────────────┐
│ ❌ No reports selected                    │  ◄── Red background
└────────────────────────────────────────────┘

With selection:
┌────────────────────────────────────────────┐
│ ✅ PDF will include: [report names]       │  ◄── Green background
│ 📅 Date Range: [dates]                    │
└────────────────────────────────────────────┘
```

---

## 🎯 Success Flow Summary

```
1. Click Button          →  2. Select Date      →  3. Select Reports
   
   [Combine Reports]        📅 [This Week]         ☑ Stock In
                                                    ☑ Stock Out
                                                    ☑ Sales

        ↓                         ↓                       ↓

4. Confirm Selection    →  5. Generate PDF     →  6. Download Complete
   
   ✅ 3 reports selected     ⏳ Generating...        ✅ PDF Downloaded!
   [Download PDF]                                      Check Downloads
```

---

## 📊 File Output Example

```
Downloads Folder:
├── Combined_Reports_Multiple_Reports_2025-10-17_to_2025-10-23.pdf
│   Size: 2.4 MB
│   Pages: 15
│   Contains: Stock In, Stock Out, Sales data
│
└── Combined_Reports_stock_in_stock_out_2025-10-01_to_2025-10-15.pdf
    Size: 1.1 MB
    Pages: 8
    Contains: Stock In, Stock Out data
```

---

## 💬 User Feedback Messages

### Success

```
Console:
✅ PDF downloaded successfully: Combined_Reports_...pdf
✅ Total pages: 15
```

### Error

```
Alert Box:
❌ Error generating combined PDF: Network Error

Console:
❌ Error combining reports: Failed to fetch
```

### No Selection

```
Alert Box:
⚠️ Please select at least one report type to combine
```

---

**Visual Guide Complete!** 🎉

For more details, see:
- `COMBINED_REPORTS_GUIDE.md` - Full user guide
- `COMBINED_REPORTS_IMPLEMENTATION_SUMMARY.md` - Technical details

