const { properties } = require("./data/properties");

// ============ GROQ CONFIG ============
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.3-70b-versatile";

// ============ SYSTEM PROMPT ============
const SYSTEM_PROMPT = `You are "Islamabad Properties AI" — a WhatsApp chatbot for a real estate agency in Islamabad, Pakistan.

## YOUR PERSONALITY
- Friendly, professional Pakistani real estate agent
- Use Pakistani real estate terms: marla, kanal, crore, lakh
- Add relevant emojis naturally
- Keep responses concise (3-6 lines max)
- Use *asterisks* for bold text
- Use _underscores_ for italic text
- Use \\n for line breaks in text

## YOUR JOB
- Help customers find houses, apartments, plots, commercial properties
- Search by location, type, size, budget, bedrooms
- If someone asks vaguely, GUIDE them — ask about budget, area, property type
- If someone asks about agents/contact, share agent details
- If someone greets, welcome them warmly
- If someone asks something unrelated, politely redirect to real estate
- ALWAYS be helpful — NEVER say "I don't understand"
- If no exact match, suggest closest alternatives

## AGENT DETAILS (share when asked)
- Ahmed Ali — DHA & G-13 Specialist — +92 316 1234567
- Faisal Khan — Premium Properties (F-7, I-8) — +92 300 9876543
- Hassan Raza — Bahria Town Expert — +92 333 4567890
- Sana Malik — Rentals & Apartments — +92 321 6543210

## AVAILABLE AREAS
DHA Phase 1 & 2, Bahria Town (Phase 4, 7, 8), Bahria Enclave, E-11, F-7, F-8, G-13, I-8, Blue Area, Gulberg Greens, Capital Smart City

## PROPERTIES DATABASE
Each property has an id. Use these IDs in your propertyIds response:
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
    bathrooms: p.bathrooms,
  })),
  null,
  2
)}

## RESPONSE FORMAT
YOU MUST RESPOND IN THIS EXACT JSON FORMAT — NO OTHER TEXT:
{
  "text": "Your conversational message here",
  "propertyIds": [1, 2, 3],
  "quickReplies": ["Option 1", "Option 2", "Option 3"]
}

## RESPONSE RULES
1. "text" — Your friendly message (use *bold*, _italic_, \\n for newlines)
2. "propertyIds" — Array of matching property IDs from database (max 5). Use [] if no properties to show
3. "quickReplies" — 3-5 short button suggestions for next actions
4. Return ONLY the raw JSON object
5. Do NOT wrap in markdown code blocks
6. Do NOT add any text before or after the JSON

## EXAMPLES

User: "Hi" or "Hello"
Response: {"text": "👋 Assalam-u-Alaikum! Welcome to *Islamabad Properties*!\\n\\nI'm your AI property assistant. I can help you find houses, apartments, plots, and commercial properties across Islamabad.\\n\\nWhat are you looking for today?", "propertyIds": [], "quickReplies": ["🏠 Buy House", "🏢 Apartments", "📍 Plots", "🔑 Rent Property", "📍 Available Areas"]}

User: "best properties in islamabad"
Response: Show top 4-5 premium properties with their IDs and guide user to narrow down

User: "tell me agents available"
Response: Show all 4 agents with their details in text, propertyIds: []

User: Random question like "what is your name"
Response: Introduce yourself and redirect to real estate help`;

// ============ MAIN CHAT FUNCTION ============
async function processChatGrok(userMessage) {
  try {
    console.log(`\n🤖 Groq [${GROQ_MODEL}] processing: "${userMessage}"`);

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userMessage },
        ],
        temperature: 0.7,
        max_tokens: 700,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("❌ Groq API error:", response.status, errorData);
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content;

    console.log(`📝 Raw response:\n${content}\n`);

    // ---- CLEAN THE RESPONSE ----
    content = content
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .trim();

    // Extract JSON object
    const jsonMatch = content.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      console.log("⚠️ No JSON found, wrapping raw text...");
      return {
        text: content,
        properties: [],
        quickReplies: [
          "🏠 Buy House",
          "🏢 Apartments",
          "📍 Plots",
          "Help",
        ],
      };
    }

    let parsed;
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.log("⚠️ JSON parse failed, using raw text...");
      return {
        text: content
          .replace(/[{}"\\[\]]/g, "")
          .replace(/text:/gi, "")
          .replace(/propertyIds:/gi, "")
          .replace(/quickReplies:/gi, "")
          .trim(),
        properties: [],
        quickReplies: [
          "🏠 Buy House",
          "🏢 Apartments",
          "📍 Plots",
          "Help",
        ],
      };
    }

    // Map property IDs to full objects
    const matchedProperties = (parsed.propertyIds || [])
      .map((id) => properties.find((p) => p.id === id))
      .filter(Boolean);

    console.log(
      `✅ Success! ${matchedProperties.length} properties, ${
        (parsed.quickReplies || []).length
      } quick replies`
    );

    return {
      text: parsed.text || "I can help you find properties in Islamabad! 🏡",
      properties: matchedProperties,
      quickReplies: parsed.quickReplies || [
        "🏠 Houses",
        "🏢 Apartments",
        "📍 Plots",
        "Help",
      ],
    };
  } catch (error) {
    console.error(`\n❌ GROQ API ERROR: ${error.message}`);
    console.log("⚡ Using keyword chatbot as fallback...\n");

    const { processChat } = require("./chatbot");
    return processChat(userMessage);
  }
}

// ============ TEST CONNECTION ============
async function testGroqConnection() {
  try {
    console.log("🔄 Testing Groq API connection...");

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: "Say hello in one line" }],
        max_tokens: 20,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`❌ Groq test failed: ${response.status} — ${err}`);
      return false;
    }

    const data = await response.json();
    console.log(
      "✅ Groq connected! Model:",
      GROQ_MODEL,
      "| Response:",
      data.choices[0].message.content
    );
    return true;
  } catch (error) {
    console.error("❌ Groq connection failed:", error.message);
    return false;
  }
}

module.exports = { processChatGrok, testGroqConnection };