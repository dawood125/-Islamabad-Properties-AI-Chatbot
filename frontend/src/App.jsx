import React, { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";

const API_URL = import.meta.env.REACT_APP_API_URL || "http://localhost:5000";

// ============ PROPERTY CARD ============
const PropertyCard = ({ property }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className="prop-card">
      <div className="prop-img-wrap">
        <img
          src={
            imgError
              ? "https://placehold.co/400x250/075e54/white?text=Property"
              : property.image
          }
          alt={property.title}
          className="prop-img"
          onError={() => setImgError(true)}
        />
        <span className={`prop-badge ${property.purpose}`}>
          {property.purpose === "rent" ? "FOR RENT" : "FOR SALE"}
        </span>
        <span className="prop-type-badge">{property.type.toUpperCase()}</span>
      </div>

      <div className="prop-body">
        <h4 className="prop-title">{property.title}</h4>

        <p className="prop-price">PKR {property.priceFormatted}</p>

        <p className="prop-loc">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="#075e54">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          {property.location}
        </p>

        <div className="prop-stats">
          {property.bedrooms > 0 && (
            <div className="prop-stat">
              <span className="stat-icon">🛏️</span>
              <span>{property.bedrooms} Beds</span>
            </div>
          )}
          {property.bathrooms > 0 && (
            <div className="prop-stat">
              <span className="stat-icon">🚿</span>
              <span>{property.bathrooms} Baths</span>
            </div>
          )}
          <div className="prop-stat">
            <span className="stat-icon">📐</span>
            <span>{property.size}</span>
          </div>
        </div>

        <div className="prop-tags">
          {property.features.slice(0, 3).map((f, i) => (
            <span key={i} className="prop-tag">
              {f}
            </span>
          ))}
        </div>

        <div className="prop-btns">
          <button
            className="prop-btn details"
            onClick={() => {
              alert(
                `📋 ${property.title}\n\n${property.description}\n\n📐 Size: ${property.size}\n💰 Price: PKR ${property.priceFormatted}\n📍 ${property.location}\n\n📞 Agent: ${property.agent}\n📱 ${property.agentPhone}`,
              );
            }}
          >
            📋 Details
          </button>
          <button
            className="prop-btn contact"
            onClick={() => {
              alert(
                `📞 Contact ${property.agent}\n📱 ${property.agentPhone}\n\nCall or WhatsApp to schedule a visit!`,
              );
            }}
          >
            📞 Contact
          </button>
        </div>
      </div>
    </div>
  );
};

// ============ TYPING DOTS ============
const TypingDots = () => (
  <div className="msg-row bot">
    <div className="bot-avatar-small">🏡</div>
    <div className="bubble bot typing-bub">
      <div className="dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  </div>
);

// ============ FORMAT TEXT ============
const formatText = (text) => {
  if (!text) return { __html: "" };
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\*(.*?)\*/g, "<strong>$1</strong>")
    .replace(/_(.*?)_/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
  return { __html: html };
};

// ============ GET TIME ============
const getTime = () => {
  return new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

// ============ MAIN APP ============
function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom
  const scrollDown = useCallback(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  const startedRef = useRef(false);

  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      handleSend("hello", true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Send message to API
  const sendToAPI = useCallback(async (text) => {
    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      return data;
    } catch (err) {
      console.error("API Error:", err);
      return {
        text: "⚠️ Cannot connect to server.\n\nMake sure backend is running:\n`cd backend && node server.js`",
        properties: [],
        quickReplies: ["Try Again"],
      };
    }
  }, []);

  // Handle sending a message
  const handleSend = useCallback(
    async (text, skipUserMsg = false) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      // Add user message
      if (!skipUserMsg) {
        const userMsg = {
          id: Date.now(),
          from: "user",
          text: trimmed,
          time: getTime(),
        };
        setMessages((prev) => [...prev, userMsg]);
      }

      setInput("");
      setLoading(true);

      // Call API
      const data = await sendToAPI(trimmed);

      // Add bot message
      const botMsg = {
        id: Date.now() + 1,
        from: "bot",
        text: data.text || "Sorry, I could not understand that.",
        properties: data.properties || [],
        quickReplies: data.quickReplies || [],
        time: getTime(),
      };

      setMessages((prev) => [...prev, botMsg]);
      setLoading(false);

      // Focus input after response
      setTimeout(() => {
        inputRef.current?.focus();
      }, 200);
    },
    [loading, sendToAPI],
  );


  // Form submit
  const onSubmit = (e) => {
    e.preventDefault();
    handleSend(input);
  };

  // Quick reply click
  const onQuickReply = (text) => {
    if (!loading) {
      handleSend(text);
    }
  };

  // Find last bot message index for showing quick replies
  const lastBotIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].from === "bot") return i;
    }
    return -1;
  })();

  return (
    <div className="app-container">
      <div className="phone">
        {/* ===== HEADER ===== */}
        <header className="wa-header">
          <div className="wa-header-left">
            <button className="wa-back">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
            </button>
            <div className="wa-avatar">🏡</div>
            <div className="wa-header-info">
              <h1>Islamabad Properties</h1>
              <p>{loading ? "typing..." : "online"}</p>
            </div>
          </div>
          <div className="wa-header-right">
            <button className="wa-header-btn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 0 1-.45 1-1v-3.5l4 4v-11l-4 4z" />
              </svg>
            </button>
            <button className="wa-header-btn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
              </svg>
            </button>
            <button className="wa-header-btn">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
              </svg>
            </button>
          </div>
        </header>

        {/* ===== CHAT AREA ===== */}
        <main className="wa-chat">
          {/* Date pill */}
          <div className="date-pill">
            <span>Today</span>
          </div>

          {/* Encryption notice */}
          <div className="encrypt-notice">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#8c8c6e">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            </svg>
            Messages are end-to-end encrypted. No one outside of this chat can
            read them.
          </div>

          {/* Messages */}
          {messages.map((msg, idx) => (
            <React.Fragment key={msg.id}>
              {/* USER MESSAGE */}
              {msg.from === "user" && (
                <div className="msg-row user">
                  <div className="bubble user">
                    <div
                      className="bubble-text"
                      dangerouslySetInnerHTML={formatText(msg.text)}
                    />
                    <span className="bubble-time">
                      {msg.time}
                      <svg
                        width="16"
                        height="11"
                        viewBox="0 0 16 11"
                        className="read-ticks"
                      >
                        <path
                          d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.175a.463.463 0 0 0-.336-.153.457.457 0 0 0-.344.153.441.441 0 0 0 0 .637l2.34 2.553a.479.479 0 0 0 .352.161h.013a.467.467 0 0 0 .343-.161l6.533-8.076a.441.441 0 0 0-.016-.65z"
                          fill="#53bdeb"
                        />
                        <path
                          d="M15.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.2-1.3-.348.39 1.577 1.724a.479.479 0 0 0 .352.161h.013a.467.467 0 0 0 .343-.161l6.533-8.076a.441.441 0 0 0-.016-.65z"
                          fill="#53bdeb"
                        />
                      </svg>
                    </span>
                  </div>
                </div>
              )}

              {/* BOT MESSAGE */}
              {msg.from === "bot" && (
                <div className="msg-row bot">
                  <div className="bot-avatar-small">🏡</div>
                  <div className="bubble-group">
                    <div className="bubble bot">
                      <div
                        className="bubble-text"
                        dangerouslySetInnerHTML={formatText(msg.text)}
                      />

                      {/* PROPERTY CARDS */}
                      {msg.properties && msg.properties.length > 0 && (
                        <div className="props-container">
                          {msg.properties.map((prop) => (
                            <PropertyCard key={prop.id} property={prop} />
                          ))}
                        </div>
                      )}

                      <span className="bubble-time bot-time">{msg.time}</span>
                    </div>

                    {/* QUICK REPLIES - Only on last bot message */}
                    {idx === lastBotIdx &&
                      msg.quickReplies &&
                      msg.quickReplies.length > 0 &&
                      !loading && (
                        <div className="quick-replies">
                          {msg.quickReplies.map((qr, i) => (
                            <button
                              key={i}
                              className="qr-btn"
                              onClick={() => onQuickReply(qr)}
                            >
                              {qr}
                            </button>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
              )}
            </React.Fragment>
          ))}

          {/* TYPING INDICATOR */}
          {loading && <TypingDots />}

          <div ref={bottomRef} style={{ height: 20 }} />
        </main>

        {/* ===== INPUT BAR ===== */}
        <footer className="wa-input-bar">
          <form onSubmit={onSubmit} className="wa-input-form">
            <button type="button" className="wa-input-icon emoji-btn">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="#8c8c8c">
                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
              </svg>
            </button>

            <div className="wa-input-wrap">
              <input
                ref={inputRef}
                type="text"
                placeholder="Type a message"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={loading}
                autoComplete="off"
              />
              <button type="button" className="wa-attach-btn">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#8c8c8c">
                  <path d="M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5c0-1.38 1.12-2.5 2.5-2.5s2.5 1.12 2.5 2.5v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5c0 1.38 1.12 2.5 2.5 2.5s2.5-1.12 2.5-2.5V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z" />
                </svg>
              </button>
            </div>

            {input.trim() ? (
              <button type="submit" className="wa-send-btn" disabled={loading}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            ) : (
              <button type="button" className="wa-send-btn mic">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M12 14c1.66 0 2.99-1.34 2.99-3L15 5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm5.3-3c0 3-2.54 5.1-5.3 5.1S6.7 14 6.7 11H5c0 3.41 2.72 6.23 6 6.72V21h2v-3.28c3.28-.48 6-3.3 6-6.72h-1.7z" />
                </svg>
              </button>
            )}
          </form>
        </footer>
      </div>

      {/* BRANDING */}
      <div className="demo-brand">
        <p>🏡 Islamabad Properties AI Chatbot</p>
        <p className="demo-sub">
          Demo built by <strong>Dawood Ahmed</strong> • Powered by Grok AI
        </p>
      </div>
    </div>
  );
}

export default App;
