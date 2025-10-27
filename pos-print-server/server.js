import express from "express";
import bodyParser from "body-parser";
import net from "net";

const app = express();

// Enable CORS for all requests
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(bodyParser.json());

// Function to send data to network printer
function sendToPrinter(printerIP, printerPort, data) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    const timeout = 5000;

    socket.setTimeout(timeout);

    socket.on("connect", () => {
      // Send ESC/POS initialization commands
      const escPosInit = "\x1B\x40"; // Initialize printer
      const escPosFeed = "\x1B\x64\x05"; // Feed 5 lines
      
      const fullData = escPosInit + data + escPosFeed;
      
      socket.write(fullData, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });

    socket.on("timeout", () => {
      socket.destroy();
      reject(new Error("Connection timeout"));
    });

    socket.on("error", (err) => {
      reject(err);
    });

    socket.on("close", () => {
    });

    // Attempt to connect
    socket.connect(printerPort, printerIP);
  });
}

app.post("/print", async (req, res) => {
  try {
    const { text, printerIP, printerPort = 9100, testMode = false } = req.body;
    
    if (!text) {
      return res.status(400).send("Missing text");
    }

    if (testMode) {
      // Test mode - just log without trying to print
      res.json({ 
        success: true, 
        message: "Printed successfully (TEST MODE - no actual print)",
        testMode: true
      });
      return;
    }

    if (printerIP) {
      // Send to network printer
      await sendToPrinter(printerIP, printerPort, text);
      res.json({ success: true, message: "Printed successfully" });
    } else {
      // Just log if no printer IP specified
      res.json({ success: true, message: "Print data received (no printer specified)" });
    }
  } catch (error) {
    console.error("❌ Print error:", error);
    res.status(500).json({ 
      success: false, 
      message: `Print failed: ${error.message}`,
      hint: "Use testMode: true to test without a real printer"
    });
  }
});

app.get("/", (req, res) => {
  res.send("🖨️ POS Print Server Running<br><br>Send POST request to /print with:<br>{ text: 'receipt content', printerIP: '192.168.1.100' }");
});

app.listen(9100, () => {
});

