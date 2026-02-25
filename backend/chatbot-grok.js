const { properties } = require("./data/properties");
const { company } = require("./config/company");
const fs = require("fs");
const path = require("path");

// ============ GROQ CONFIG ============
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

// ============ BOOKINGS FILE ============
const BOOKINGS_FILE = path.join(__dirname, "bookings", "bookings.json");

// Ensure bookings directory exists
if (!fs.existsSync(path.join(__dirname, "bookings"))) {
  fs.mkdirSync(path.join(__dirname, "bookings"));
}

if (!fs.existsSync(BOOKINGS_FILE)) {
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify([], null, 2));
}

function getBookings() {
  try {
    return JSON.parse(fs.readFileSync(BOOKINGS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveBooking(booking) {
  const bookings = getBookings();
  bookings.push(booking);
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
  return booking;
}

function generateBookingId() {
  const count = getBookings().length + 1;
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `PR-${year}${month}-${String(count).padStart(3, "0")}`;
}

// ============ FORMAT PRICE ============
function formatPKR(amount) {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(2)} Crore`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(0)} Lakh`;
  return amount.toLocaleString("en-PK");
}

// ============ SYSTEM PROMPT ============
const SYSTEM_PROMPT = `You are the AI assistant for *${company.name}* — "${company.tagline}"

## COMPANY INFO
- Company: ${company.name}
- Phone: ${company.phone}
- WhatsApp: ${company.whatsapp}
- Email: ${company.email}
- Address: ${company.address}
- Hours: ${company.workingHours}

## AGENTS
${company.agents.map((a) => `- ${a.name} (${a.role}) — ${a.specialization} — ${a.phone}`).join("\n")}

## YOUR PERSONALITY
- Professional, warm, trustworthy real estate consultant
- You represent ${company.name} exclusively
- Use Pakistani real estate terms: marla, kanal, crore, lakh
- Add relevant emojis naturally
- Keep responses concise (3-6 lines)
- Use *bold* for emphasis, _italic_ for subtle text, \\n for newlines

## YOUR CAPABILITIES

### 1. PROPERTY SEARCH
- Search by location, type, size, budget, bedrooms
- Show matching properties from database
- If vague query, guide user to narrow down

### 2. PAYMENT PLAN (VERY IMPORTANT)
When user asks about a specific property's price/payment/installment:
- Show the FULL payment breakdown
- Format it clearly like this:
  💰 *Payment Plan for [Property Name]*
  ━━━━━━━━━━━━━━━━━━━━
  📋 Total Price: PKR X
  💵 Booking Amount: PKR X
  🏦 Down Payment: PKR X (X%)
  📅 Monthly Installment: PKR X
  ⏰ Duration: X months
  🏠 Possession: [timeline]
  📝 Note: [any special notes]

### 3. BOOKING (MOST IMPORTANT)
When user wants to BOOK a property:
- First show the payment plan summary
- Then ask for their details ONE BY ONE or together:
  1. Full Name
  2. Phone Number
  3. Email (optional)
- When you have ALL details, confirm the booking with format:
  ✅ *BOOKING CONFIRMED!*
  🆔 Booking ID: [will be generated]
  🏠 Property: [name]
  💰 Booking Amount: PKR [amount]
  👤 Name: [name]
  📱 Phone: [phone]
  
  Our agent [name] will contact you within 1 hour.
- Include action "CONFIRM_BOOKING" in your response (explained below)

### 4. GENERAL HELP
- Answer questions about areas, market trends
- Compare properties
- Redirect unrelated questions to real estate

## PROPERTIES DATABASE
${JSON.stringify(
  properties.map((p) => ({
    id: p.id,
    title: p.title,
    type: p.type,
    purpose: p.purpose,
    price: p.price,
    priceFormatted: p.priceFormatted,
    area: p.area,
    location: p.location,
    size: p.size,
    bedrooms: p.bedrooms,
    status: p.status,
    paymentPlan: p.paymentPlan,
    agentId: p.agentId,
  })),
  null,
  2
)}

## RESPONSE FORMAT — MUST BE EXACT JSON:
{
  "text": "Your message here",
  "propertyIds": [1, 2, 3],
  "quickReplies": ["Option 1", "Option 2"],
  "action": null
}

## ACTION FIELD:
- null — normal response
- "SHOW_PAYMENT_PLAN" — when showing payment details (include propertyId in propertyIds)
- "COLLECT_BOOKING_INFO" — when asking for user's name/phone for booking
- "CONFIRM_BOOKING" — when user has given all details and wants to confirm
  For CONFIRM_BOOKING, add extra fields:
  {
    "action": "CONFIRM_BOOKING",
    "bookingData": {
      "propertyId": 6,
      "customerName": "Ali Khan",
      "customerPhone": "+92 300 1234567",
      "customerEmail": "ali@email.com"
    }
  }

## RULES
1. Return ONLY raw JSON — no code blocks, no extra text
2. Maximum 5 properties in propertyIds
3. 3-5 quick replies
4. ALWAYS represent ${company.name}
5. When showing payment plan, be detailed and clear
6. For booking, collect name + phone at minimum
7. Never make up properties not in the database`;

// ============ CONVERSATION HISTORY ============
const conversations = new Map();

function getConversation(sessionId) {
  if (!conversations.has(sessionId)) {
    conversations.set(sessionId, []);
  }
  return conversations.get(sessionId);
}

function addToConversation(sessionId, role, content) {
  const conv = getConversation(sessionId);
  conv.push({ role, content });
  // Keep last 20 messages to avoid token limit
  if (conv.length > 20) {
    conv.splice(0, conv.length - 20);
  }
}

// ============ MAIN CHAT FUNCTION ============
async function processChatGrok(userMessage, sessionId = "default") {
  try {
    console.log(`\n🤖 Groq processing: "${userMessage}" [session: ${sessionId}]`);

    // Add user message to history
    addToConversation(sessionId, "user", userMessage);

    // Build messages array with history
    const messages = [{ role: "system", content: SYSTEM_PROMPT }];

    const history = getConversation(sessionId);
    for (const msg of history) {
      messages.push({
        role: msg.role === "bot" ? "assistant" : msg.role,
        content: msg.content,
      });
    }

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: messages,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Groq error:", response.status, errorData);
      throw new Error(`Groq error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;

    console.log(`📝 Raw:\n${content}\n`);

    // Clean response
    content = content.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      // Plain text response
      addToConversation(sessionId, "bot", content);
      return {
        text: content,
        properties: [],
        quickReplies: ["🏠 Properties", "💰 Payment Plans", "📞 Contact", "Help"],
      };
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      addToConversation(sessionId, "bot", content);
      return {
        text: content.replace(/[{}"\\[\]]/g, "").trim(),
        properties: [],
        quickReplies: ["🏠 Properties", "Help"],
      };
    }

    // ---- HANDLE BOOKING CONFIRMATION ----
    if (parsed.action === "CONFIRM_BOOKING" && parsed.bookingData) {
      const bd = parsed.bookingData;
      const property = properties.find((p) => p.id === bd.propertyId);

      if (property) {
        const bookingId = generateBookingId();
        const agent = company.agents.find((a) => a.id === property.agentId) || company.agents[0];

        const booking = {
          bookingId: bookingId,
          propertyId: property.id,
          propertyTitle: property.title,
          propertyPrice: property.priceFormatted,
          bookingAmount: property.paymentPlan?.bookingAmount || 0,
          customerName: bd.customerName || "Not Provided",
          customerPhone: bd.customerPhone || "Not Provided",
          customerEmail: bd.customerEmail || "Not Provided",
          assignedAgent: agent.name,
          agentPhone: agent.phone,
          status: "confirmed",
          bookedAt: new Date().toISOString(),
          company: company.name,
        };

        saveBooking(booking);
        console.log(`✅ BOOKING SAVED: ${bookingId}`);

        // Override the text with proper booking confirmation
        parsed.text =
          `✅ *BOOKING CONFIRMED!*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `🆔 Booking ID: *${bookingId}*\n` +
          `🏠 Property: *${property.title}*\n` +
          `📍 Location: ${property.location}\n` +
          `💰 Total Price: PKR ${property.priceFormatted}\n` +
          `💵 Booking Amount: PKR ${formatPKR(property.paymentPlan?.bookingAmount || 0)}\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `👤 Name: ${bd.customerName}\n` +
          `📱 Phone: ${bd.customerPhone}\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `👨‍💼 Agent *${agent.name}* will call you within 1 hour.\n` +
          `📱 Agent Phone: ${agent.phone}\n\n` +
          `Thank you for choosing *${company.name}*! 🏡`;

        parsed.quickReplies = [
          "🏠 Browse More",
          "📞 Contact Agent",
          "📋 My Booking Details",
        ];
      }
    }

    // Map property IDs
    const matchedProperties = (parsed.propertyIds || [])
      .map((id) => properties.find((p) => p.id === id))
      .filter(Boolean);

    // Save bot response to conversation
    addToConversation(sessionId, "bot", parsed.text);

    console.log(`✅ ${matchedProperties.length} properties | Action: ${parsed.action || "none"}`);

    return {
      text: parsed.text || `Welcome to ${company.name}!`,
      properties: matchedProperties,
      quickReplies: parsed.quickReplies || ["🏠 Properties", "Help"],
      action: parsed.action || null,
    };
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.log("⚡ Fallback...\n");
    const { processChat } = require("./chatbot");
    return processChat(userMessage);
  }
}

// ============ TEST ============
async function testGroqConnection() {
  try {
    console.log("🔄 Testing Groq...");
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: "Say hello" }],
        max_tokens: 20,
      }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    console.log("✅ Groq connected:", data.choices[0].message.content);
    return true;
  } catch (err) {
    console.error("❌ Groq test failed:", err.message);
    return false;
  }
}

module.exports = { processChatGrok, testGroqConnection, getBookings };