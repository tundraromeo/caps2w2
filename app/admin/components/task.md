Online POS Auto Receipt Printing (QZ Tray)

I want to build or enhance an online POS system that supports automatic receipt printing even when hosted on the internet (e.g., Namecheap or other web hosting). The system should print receipts directly to a local thermal receipt printer during checkout.

Goal

When a POS transaction is completed online, the system should automatically print a receipt to a receipt printer connected to the cashier’s local computer.

Requirements

Backend must be in PHP + MySQL.

POS is hosted online but still prints locally.

Automatic printing on checkout.

Support thermal printers using ESC/POS format.

Works on Chrome or Edge browser.

Fallback option: If printing fails, send receipt via email.

Receipt layout includes:

Store name and address

Order number and date

List of items

Quantity, price, and subtotal

Total, VAT, and change

Footer message

Technical Instructions

Use QZ Tray to connect web browser to local printer.

The system should communicate with QZ Tray using JavaScript.

The backend (PHP) generates receipt data (JSON or HTML).

Trigger auto-print immediately after checkout/payment confirmation.

Must support thermal printers like Epson, XPrinter, POS58, Sunmi, etc.

Use HTTPS to enable secure communication with QZ Tray.

Include manual “Print Receipt” button for testing.

Deliverables

I need:

PHP code that prepares the receipt data.

JavaScript code that sends the print request to QZ Tray.

A sample receipt template.

Installation steps for QZ Tray.

Example thermal printer ESC/POS commands.

Code for email receipt fallback (optional).

Example Flow

User clicks Checkout on POS.

Backend saves order to database.

JavaScript automatically triggers print via QZ Tray.

Receipt prints instantly on the cash register printer.

If printer is offline, send receipt to customer email instead.