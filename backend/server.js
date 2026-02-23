require("dotenv").config();

console.log("\n🔍 Environment Check:");
console.log(
  "   GROQ_API_KEY:",
  process.env.GROQ_API_KEY
    ? `✅ Found (${process.env.GROQ_API_KEY.substring(0, 10)}...)`
    : "❌ NOT FOUND"
);

const express = require("express");
const cors = require("cors");
const { properties } = require("./data/properties");

const app = express();
app.use(cors());
app.use(express.json());

// ============ LOAD CHATBOT ============
let chatHandler;
let chatMode = "keyword";

if (process.env.GROQ_API_KEY) {
  const { processChatGrok, testGroqConnection } = require("./chatbot-grok");
  chatHandler = processChatGrok;
  chatMode = "groq-ai";

  // Test on startup
  testGroqConnection().then((works) => {
    if (works) {
      console.log("🤖 Groq AI ready! Using llama-3.3-70b-versatile");
    } else {
      console.log("⚠️ Groq test failed — will fallback to keyword chatbot");
    }
  });
} else {
  const { processChat } = require("./chatbot");
  chatHandler = processChat;
  console.log("⚠️ No GROQ_API_KEY — using keyword chatbot");
}

// ============ CHAT ENDPOINT ============
app.post("/api/chat", async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({
        success: false,
        text: "Please type a message.",
        properties: [],
        quickReplies: [],
      });
    }

    console.log(`\n${"─".repeat(50)}`);
    console.log(`📩 "${message}"`);

    const startTime = Date.now();
    const response = await chatHandler(message);
    const duration = Date.now() - startTime;

    console.log(
      `📤 Reply in ${duration}ms | ${
        response.properties?.length || 0
      } properties`
    );

    res.json({
      success: true,
      text: response.text,
      properties: response.properties || [],
      quickReplies: response.quickReplies || [],
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("💥 Server Error:", error.message);
    res.status(500).json({
      success: false,
      text: "Sorry, something went wrong. Please try again.",
      properties: [],
      quickReplies: ["Start Over"],
    });
  }
});

app.get("/api/properties", (req, res) => {
  res.json({ success: true, count: properties.length, properties });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "running",
    mode: chatMode,
    properties: properties.length,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🏡 Islamabad Properties Bot`);
  console.log(`📡 http://localhost:${PORT}`);
  console.log(`📊 ${properties.length} properties`);
  console.log(`🤖 Mode: ${chatMode.toUpperCase()}`);
  console.log(`\n✅ Ready!\n`);
});