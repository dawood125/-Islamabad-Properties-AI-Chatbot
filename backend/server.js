require("dotenv").config();

console.log("\n🔍 Environment:");
console.log(
  "   GROQ_API_KEY:",
  process.env.GROQ_API_KEY
    ? `✅ (${process.env.GROQ_API_KEY.substring(0, 10)}...)`
    : "❌ MISSING"
);

const express = require("express");
const cors = require("cors");
const { properties } = require("./data/properties");
const { company } = require("./config/company");

const app = express();
app.use(cors());
app.use(express.json());

// ============ LOAD CHATBOT ============
let chatHandler;
let getBookingsHandler;
let chatMode = "keyword";

if (process.env.GROQ_API_KEY) {
  const { processChatGrok, testGroqConnection, getBookings } = require("./chatbot-grok");
  chatHandler = processChatGrok;
  getBookingsHandler = getBookings;
  chatMode = "groq-ai";
  testGroqConnection();
} else {
  const { processChat } = require("./chatbot");
  chatHandler = processChat;
  getBookingsHandler = () => [];
  console.log("⚠️ No GROQ_API_KEY — keyword mode");
}

// ============ CHAT ENDPOINT ============
app.post("/api/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({
        success: false,
        text: "Please type a message.",
        properties: [],
        quickReplies: [],
      });
    }

    console.log(`\n${"─".repeat(50)}`);
    console.log(`📩 "${message}" [${sessionId || "default"}]`);

    const start = Date.now();
    const response = await chatHandler(message, sessionId || "default");
    const ms = Date.now() - start;

    console.log(`📤 ${ms}ms | ${response.properties?.length || 0} props`);

    res.json({
      success: true,
      text: response.text,
      properties: response.properties || [],
      quickReplies: response.quickReplies || [],
      action: response.action || null,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("💥", error.message);
    res.status(500).json({
      success: false,
      text: "Sorry, something went wrong. Please try again.",
      properties: [],
      quickReplies: ["Start Over"],
    });
  }
});

// ============ COMPANY INFO ============
app.get("/api/company", (req, res) => {
  res.json({ success: true, company });
});

// ============ PROPERTIES ============
app.get("/api/properties", (req, res) => {
  res.json({ success: true, count: properties.length, properties });
});

// ============ SINGLE PROPERTY ============
app.get("/api/properties/:id", (req, res) => {
  const property = properties.find((p) => p.id === parseInt(req.params.id));
  if (!property) {
    return res.status(404).json({ success: false, message: "Property not found" });
  }
  const agent = company.agents.find((a) => a.id === property.agentId);
  res.json({ success: true, property, agent });
});

// ============ BOOKINGS (Admin) ============
app.get("/api/bookings", (req, res) => {
  const bookings = getBookingsHandler();
  res.json({
    success: true,
    count: bookings.length,
    bookings: bookings.reverse(),
  });
});

// ============ HEALTH CHECK ============
app.get("/api/health", (req, res) => {
  res.json({
    status: "running",
    company: company.name,
    mode: chatMode,
    properties: properties.length,
    bookings: getBookingsHandler().length,
  });
});

// ============ ADMIN PAGE (Simple HTML) ============
app.get("/admin", (req, res) => {
  const bookings = getBookingsHandler();
  const html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>${company.name} — Admin Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { font-family: 'Segoe UI', sans-serif; background: #0b141a; color: #e9edef; padding: 20px; }
      .header { text-align: center; padding: 20px 0 30px; }
      .header h1 { font-size: 24px; color: #25d366; }
      .header p { color: #8696a0; margin-top: 5px; }
      .stats { display: flex; gap: 15px; justify-content: center; flex-wrap: wrap; margin-bottom: 30px; }
      .stat-card { background: #1f2c34; padding: 20px 30px; border-radius: 12px; text-align: center; min-width: 150px; }
      .stat-card .number { font-size: 32px; font-weight: 700; color: #25d366; }
      .stat-card .label { font-size: 13px; color: #8696a0; margin-top: 4px; }
      h2 { font-size: 18px; margin-bottom: 15px; color: #e9edef; }
      .booking-card { background: #1f2c34; border-radius: 12px; padding: 16px; margin-bottom: 12px; border-left: 4px solid #25d366; }
      .booking-id { color: #25d366; font-weight: 700; font-size: 14px; }
      .booking-detail { color: #8696a0; font-size: 13px; margin-top: 4px; line-height: 1.6; }
      .booking-detail strong { color: #e9edef; }
      .no-bookings { text-align: center; color: #8696a0; padding: 40px; }
      .badge { display: inline-block; background: #25d366; color: #000; padding: 2px 10px; border-radius: 10px; font-size: 11px; font-weight: 700; }
      .refresh-btn { display: block; margin: 20px auto; padding: 10px 30px; background: #25d366; color: #000; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
    </style>
  </head>
  <body>
    <div class="header">
      <h1>🏢 ${company.name}</h1>
      <p>Admin Dashboard — Booking Management</p>
    </div>
    
    <div class="stats">
      <div class="stat-card">
        <div class="number">${properties.length}</div>
        <div class="label">Properties Listed</div>
      </div>
      <div class="stat-card">
        <div class="number">${bookings.length}</div>
        <div class="label">Total Bookings</div>
      </div>
      <div class="stat-card">
        <div class="number">${bookings.filter((b) => b.status === "confirmed").length}</div>
        <div class="label">Confirmed</div>
      </div>
      <div class="stat-card">
        <div class="number">${company.agents.length}</div>
        <div class="label">Active Agents</div>
      </div>
    </div>

    <h2>📋 Recent Bookings</h2>
    ${
      bookings.length === 0
        ? '<div class="no-bookings">No bookings yet. Start chatting with the bot to create bookings!</div>'
        : bookings
            .reverse()
            .map(
              (b) => `
      <div class="booking-card">
        <div class="booking-id">${b.bookingId} <span class="badge">${b.status}</span></div>
        <div class="booking-detail">
          <strong>🏠 Property:</strong> ${b.propertyTitle}<br>
          <strong>💰 Price:</strong> PKR ${b.propertyPrice}<br>
          <strong>💵 Booking Amount:</strong> PKR ${(b.bookingAmount || 0).toLocaleString()}<br>
          <strong>👤 Customer:</strong> ${b.customerName}<br>
          <strong>📱 Phone:</strong> ${b.customerPhone}<br>
          <strong>📧 Email:</strong> ${b.customerEmail}<br>
          <strong>👨‍💼 Agent:</strong> ${b.assignedAgent} (${b.agentPhone})<br>
          <strong>📅 Booked:</strong> ${new Date(b.bookedAt).toLocaleString()}
        </div>
      </div>
    `
            )
            .join("")
    }
    
    <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
  </body>
  </html>`;

  res.send(html);
});

// ============ START ============
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🏢 ${company.name}`);
  console.log(`📡 http://localhost:${PORT}`);
  console.log(`🖥️  Admin: http://localhost:${PORT}/admin`);
  console.log(`📊 ${properties.length} properties`);
  console.log(`🤖 ${chatMode.toUpperCase()}`);
  console.log(`\n✅ Ready!\n`);
});