// ============================================================
// KEYWORD-BASED CHATBOT (No AI, No API keys needed)
// This is the FALLBACK when Grok API is unavailable
// ============================================================

const { properties } = require("./data/properties");

function processChat(userMessage) {
  const msg = userMessage.toLowerCase().trim();

  // ---- Greetings ----
  if (/\b(hi|hello|hey|assalam|aoa|salam|start over)\b/.test(msg)) {
    return greeting();
  }

  // ---- Help ----
  if (/\b(help|menu|options|guide|what can you)\b/.test(msg)) {
    return helpMenu();
  }

  // ---- Areas ----
  if (/\b(area|location|where|kahan|sector|available area)\b/.test(msg)) {
    return availableAreas();
  }

  // ---- All Properties ----
  if (/\b(all properties|show all|sab|everything|all listing)\b/.test(msg)) {
    return allProperties();
  }

  // ---- Thanks / Bye ----
  if (/\b(thanks|thank|shukriya|bye|goodbye|allah hafiz|khuda hafiz)\b/.test(msg)) {
    return goodbye();
  }

  // ---- Contact ----
  if (/\b(contact|agent|call|phone|number|whatsapp|book|visit|schedule)\b/.test(msg)) {
    return contactAgent();
  }

  // ---- Price Range ----
  if (/\b(price range|rates|price|kitna|kitne)\b/.test(msg) && !/\b(under|below|less|budget)\b/.test(msg)) {
    return priceRange(msg);
  }

  // ---- Property Search ----
  const filters = extractFilters(msg);

  if (Object.keys(filters).length > 0) {
    const results = filterProperties(filters);
    if (results.length > 0) {
      return searchResults(filters, results);
    } else {
      return noResults(filters);
    }
  }

  // ---- Fallback ----
  return fallback();
}

// ============ FILTER EXTRACTION ============

function extractFilters(msg) {
  let filters = {};

  // Location
  const locationMap = {
    "dha phase 2": "DHA Phase 2",
    "dha phase 1": "DHA Phase 1",
    "dha": "DHA",
    "bahria enclave": "Bahria Enclave",
    "bahria town": "Bahria Town",
    "bahria": "Bahria Town",
    "e-11": "E-11", "e11": "E-11", "e 11": "E-11",
    "f-7": "F-7", "f7": "F-7", "f 7": "F-7",
    "f-8": "F-8", "f8": "F-8", "f 8": "F-8",
    "g-13": "G-13", "g13": "G-13", "g 13": "G-13",
    "i-8": "I-8", "i8": "I-8", "i 8": "I-8",
    "blue area": "Blue Area",
    "gulberg": "Gulberg Greens",
    "capital smart": "Capital Smart City",
    "smart city": "Capital Smart City",
  };

  const sortedKeys = Object.keys(locationMap).sort((a, b) => b.length - a.length);
  for (const key of sortedKeys) {
    if (msg.includes(key)) {
      filters.area = locationMap[key];
      break;
    }
  }

  // Type
  if (/\b(house|home|ghar|makan|villa|houses|homes)\b/.test(msg)) filters.type = "house";
  else if (/\b(apartment|flat|studio|apartments|flats)\b/.test(msg)) filters.type = "apartment";
  else if (/\b(plot|land|zameen|plots)\b/.test(msg)) filters.type = "plot";
  else if (/\b(commercial|shop|office|plaza)\b/.test(msg)) filters.type = "commercial";

  // Purpose
  if (/\b(rent|kiraya|lease|monthly|rental)\b/.test(msg)) filters.purpose = "rent";
  else if (/\b(buy|sale|purchase|khareed|invest)\b/.test(msg)) filters.purpose = "sale";

  // Size
  if (/\b5\s*marla\b/.test(msg)) filters.size = "5 Marla";
  else if (/\b8\s*marla\b/.test(msg)) filters.size = "8 Marla";
  else if (/\b10\s*marla\b/.test(msg)) filters.size = "10 Marla";
  else if (/\b1\s*kanal\b/.test(msg)) filters.size = "1 Kanal";

  // Budget
  const croreMatch = msg.match(/(\d+\.?\d*)\s*(?:crore|cr|karor)/);
  const lakhMatch = msg.match(/(\d+\.?\d*)\s*(?:lakh|lac|lacs)/);
  if (croreMatch) filters.maxBudget = parseFloat(croreMatch[1]) * 10000000;
  else if (lakhMatch) filters.maxBudget = parseFloat(lakhMatch[1]) * 100000;

  // Bedrooms
  const bedMatch = msg.match(/(\d+)\s*(?:bed|bedroom|br|kamare)/);
  if (bedMatch) filters.bedrooms = parseInt(bedMatch[1]);

  return filters;
}

function filterProperties(filters) {
  return properties.filter((p) => {
    if (filters.area) {
      const areaLower = filters.area.toLowerCase();
      if (!p.area.toLowerCase().includes(areaLower) && !p.location.toLowerCase().includes(areaLower)) return false;
    }
    if (filters.type && p.type !== filters.type) return false;
    if (filters.purpose && p.purpose !== filters.purpose) return false;
    if (filters.size && p.size !== filters.size) return false;
    if (filters.maxBudget && p.price > filters.maxBudget) return false;
    if (filters.bedrooms && p.bedrooms !== filters.bedrooms) return false;
    return true;
  });
}

// ============ RESPONSES ============

function greeting() {
  return {
    text: "👋 Assalam-u-Alaikum! Welcome to *Islamabad Properties*!\n\nI'm your AI property assistant. I can help you find houses, apartments, plots, and commercial properties across Islamabad.\n\nWhat are you looking for today?",
    properties: [],
    quickReplies: ["🏠 Buy House", "🏢 Apartments", "📍 Plots", "🔑 Rent", "📋 All Properties", "📍 Available Areas"],
  };
}

function helpMenu() {
  return {
    text: "📌 *Here's what I can do:*\n\n🏠 Find houses, apartments, plots\n📍 Search by location (DHA, Bahria, F-7...)\n💰 Filter by budget\n📐 Filter by size (5 Marla, 10 Marla, 1 Kanal)\n🔑 Sale or Rent options\n\n*Try asking me:*\n• _'Show houses in DHA'_\n• _'Apartments for rent in E-11'_\n• _'Plots under 1 crore'_\n• _'5 marla house in Bahria Town'_",
    properties: [],
    quickReplies: ["🏠 Houses", "🏢 Apartments", "📍 Plots", "📍 Available Areas"],
  };
}

function availableAreas() {
  return {
    text: "📍 *We have properties in these locations:*\n\n🏘️ DHA Phase 1 & 2\n🏘️ Bahria Town (Phase 4, 7, 8)\n🏘️ Bahria Enclave\n🏘️ E-11 (Margalla Heights)\n🏘️ F-7 & F-8 (Premium)\n🏘️ G-13 (Affordable)\n🏘️ I-8 (Modern)\n🏗️ Blue Area (Commercial)\n🌿 Gulberg Greens\n🏙️ Capital Smart City\n\nWhich area interests you?",
    properties: [],
    quickReplies: ["DHA", "Bahria Town", "E-11", "F-7", "G-13", "I-8"],
  };
}

function allProperties() {
  return {
    text: `📋 Showing all *${properties.length} available properties* in Islamabad:`,
    properties: properties.slice(0, 6),
    quickReplies: properties.length > 6 ? ["Show More", "Filter by Area", "Filter by Type"] : ["Contact Agent", "New Search"],
  };
}

function searchResults(filters, results) {
  let text = `🏡 Found *${results.length} ${results.length === 1 ? "property" : "properties"}*`;
  if (filters.area) text += ` in *${filters.area}*`;
  if (filters.type) text += ` (${filters.type})`;
  if (filters.purpose) text += ` for ${filters.purpose}`;
  if (filters.maxBudget) text += ` within budget`;
  text += `:`;

  return {
    text,
    properties: results.slice(0, 5),
    quickReplies: ["Contact Agent", "New Search", "📍 Available Areas"],
  };
}

function noResults(filters) {
  return {
    text: `😔 Sorry, no properties match your criteria.\n\nTry:\n• Different area\n• Higher budget\n• Different property type\n• Type *'all properties'* to see everything`,
    properties: [],
    quickReplies: ["📋 All Properties", "📍 Available Areas", "Help"],
  };
}

function priceRange(msg) {
  const formatPrice = (p) => {
    if (p >= 10000000) return `${(p / 10000000).toFixed(1)} Crore`;
    if (p >= 100000) return `${(p / 100000).toFixed(0)} Lakh`;
    return `${p.toLocaleString()}`;
  };

  const salePrices = properties.filter((p) => p.purpose === "sale");
  const min = Math.min(...salePrices.map((p) => p.price));
  const max = Math.max(...salePrices.map((p) => p.price));

  return {
    text: `💰 *Price Range across Islamabad:*\n\n📉 Starting from: *${formatPrice(min)}*\n📈 Up to: *${formatPrice(max)}*\n📊 Total listings: *${properties.length} properties*\n\nWant to see properties in a specific budget?`,
    properties: [],
    quickReplies: ["Under 1 Crore", "1-3 Crore", "3-5 Crore", "Above 5 Crore"],
  };
}

function contactAgent() {
  return {
    text: "📞 *Our Property Agents:*\n\n👤 *Ahmed Ali* — DHA & G-13\n📱 +92 316 1234567\n\n👤 *Faisal Khan* — F-7, I-8\n📱 +92 300 9876543\n\n👤 *Hassan Raza* — Bahria Town\n📱 +92 333 4567890\n\n👤 *Sana Malik* — Rentals\n📱 +92 321 6543210",
    properties: [],
    quickReplies: ["Schedule Visit", "New Search", "📋 All Properties"],
  };
}

function goodbye() {
  return {
    text: "🙏 Thank you for using *Islamabad Properties*!\n\nAllah Hafiz! 🏡✨",
    properties: [],
    quickReplies: ["Start Over"],
  };
}

function fallback() {
  return {
    text: "🤔 I didn't quite understand that.\n\n*Try typing:*\n• _'Houses in DHA'_\n• _'Apartments for rent in E-11'_\n• _'Plots under 1 crore'_\n• _'5 marla house in Bahria Town'_\n• _'Show all properties'_",
    properties: [],
    quickReplies: ["🏠 Buy House", "🏢 Apartments", "📍 Plots", "🔑 Rent", "Help"],
  };
}

module.exports = { processChat };