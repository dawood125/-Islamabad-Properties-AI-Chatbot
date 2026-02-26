import React, { useState, useRef, useEffect, useCallback } from "react";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL || "https://islamabad-properties-ai-chatbot.onrender.com";

// ============ PROPERTY CARD (Updated with Payment Plan) ============
const PropertyCard = ({ property, onShowPayment, onBook }) => {
  const [imgErr, setImgErr] = useState(false);

  return (
    <div className="prop-card">
      <div className="prop-img-wrap">
        <img
          src={imgErr ? "https://placehold.co/400x250/075e54/white?text=Property" : property.image}
          alt={property.title}
          className="prop-img"
          onError={() => setImgErr(true)}
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
            <div className="prop-stat">🛏️ {property.bedrooms} Beds</div>
          )}
          {property.bathrooms > 0 && (
            <div className="prop-stat">🚿 {property.bathrooms} Baths</div>
          )}
          <div className="prop-stat">📐 {property.size}</div>
        </div>

        <div className="prop-tags">
          {property.features.slice(0, 3).map((f, i) => (
            <span key={i} className="prop-tag">{f}</span>
          ))}
        </div>

        {/* Payment Plan Preview */}
        {property.paymentPlan && property.purpose === "sale" && (
          <div className="payment-preview">
            <div className="payment-row">
              <span>💵 Booking:</span>
              <strong>PKR {(property.paymentPlan.bookingAmount || 0).toLocaleString()}</strong>
            </div>
            <div className="payment-row">
              <span>📅 Installment:</span>
              <strong>PKR {(property.paymentPlan.monthlyInstallment || 0).toLocaleString()}/mo</strong>
            </div>
          </div>
        )}

        <div className="prop-btns">
          <button
            className="prop-btn payment"
            onClick={() => onShowPayment(property)}
          >
            💰 Payment Plan
          </button>
          <button
            className="prop-btn book"
            onClick={() => onBook(property)}
          >
            📝 Book Now
          </button>
        </div>
      </div>
    </div>
  );
};

// ============ TYPING DOTS ============
const TypingDots = () => (
  <div className="msg-row bot">
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
    .replace(/━/g, "━")
    .replace(/\n/g, "<br/>");
  return { __html: html };
};

const getTime = () =>
  new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

// ============ MAIN APP ============
function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [companyInfo, setCompanyInfo] = useState(null);
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substring(7)}`);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const startedRef = useRef(false);

  const scrollDown = useCallback(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  }, []);

  useEffect(() => scrollDown(), [messages, loading, scrollDown]);

  // Fetch company info
  useEffect(() => {
    fetch(`${API_URL}/api/company`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setCompanyInfo(data.company);
      })
      .catch(() => {});
  }, []);

  // Send to API
  const sendToAPI = useCallback(
    async (text) => {
      try {
        const res = await fetch(`${API_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, sessionId }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (err) {
        return {
          text: "⚠️ Cannot connect to server. Make sure backend is running.",
          properties: [],
          quickReplies: ["Try Again"],
        };
      }
    },
    [sessionId]
  );

  // Handle send
  const handleSend = useCallback(
    async (text, skipUser = false) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      if (!skipUser) {
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), from: "user", text: trimmed, time: getTime() },
        ]);
      }

      setInput("");
      setLoading(true);

      const data = await sendToAPI(trimmed);

      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          from: "bot",
          text: data.text || "",
          properties: data.properties || [],
          quickReplies: data.quickReplies || [],
          time: getTime(),
        },
      ]);

      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 200);
    },
    [loading, sendToAPI]
  );

  // Welcome
  useEffect(() => {
    if (!startedRef.current) {
      startedRef.current = true;
      handleSend("hello", true);
    }
    // eslint-disable-next-line
  }, []);

  const onSubmit = (e) => {
    e.preventDefault();
    handleSend(input);
  };

  const onQuickReply = (text) => {
    if (!loading) handleSend(text);
  };

  // Payment plan button handler
  const onShowPayment = (property) => {
    handleSend(`Show me the complete payment plan for "${property.title}" (Property ID: ${property.id})`);
  };

  // Book button handler
  const onBook = (property) => {
    handleSend(`I want to book "${property.title}" (Property ID: ${property.id}). Please tell me the booking process.`);
  };

  // Last bot message index
  const lastBotIdx = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].from === "bot") return i;
    }
    return -1;
  })();

  const cName = companyInfo?.name || "Prime Islamabad Realty";
  const cLogo = companyInfo?.logo || "🏢";

  return (
    <div className="app-container">
      <div className="phone">
        {/* HEADER */}
        <header className="wa-header">
          <div className="wa-header-left">
            <button className="wa-back">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
                <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
              </svg>
            </button>
            <div className="wa-avatar">{cLogo}</div>
            <div className="wa-header-info">
              <h1>{cName}</h1>
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

        {/* CHAT */}
        <main className="wa-chat">
          <div className="date-pill">
            <span>Today</span>
          </div>

          <div className="encrypt-notice">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#8c8c6e">
              <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
            </svg>
            Messages are end-to-end encrypted. No one outside of this chat can read them.
          </div>

          {messages.map((msg, idx) => (
            <React.Fragment key={msg.id}>
              {msg.from === "user" && (
                <div className="msg-row user">
                  <div className="bubble user">
                    <div className="bubble-text" dangerouslySetInnerHTML={formatText(msg.text)} />
                    <span className="bubble-time">
                      {msg.time}
                      <svg width="16" height="11" viewBox="0 0 16 11" className="read-ticks">
                        <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.175a.463.463 0 0 0-.336-.153.457.457 0 0 0-.344.153.441.441 0 0 0 0 .637l2.34 2.553a.479.479 0 0 0 .352.161h.013a.467.467 0 0 0 .343-.161l6.533-8.076a.441.441 0 0 0-.016-.65z" fill="#53bdeb" />
                        <path d="M15.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.2-1.3-.348.39 1.577 1.724a.479.479 0 0 0 .352.161h.013a.467.467 0 0 0 .343-.161l6.533-8.076a.441.441 0 0 0-.016-.65z" fill="#53bdeb" />
                      </svg>
                    </span>
                  </div>
                </div>
              )}

              {msg.from === "bot" && (
                <div className="msg-row bot">
                  <div className="bubble-group">
                    <div className="bubble bot">
                      <div className="bubble-text" dangerouslySetInnerHTML={formatText(msg.text)} />

                      {msg.properties && msg.properties.length > 0 && (
                        <div className="props-container">
                          {msg.properties.map((prop) => (
                            <PropertyCard
                              key={prop.id}
                              property={prop}
                              onShowPayment={onShowPayment}
                              onBook={onBook}
                            />
                          ))}
                        </div>
                      )}

                      <span className="bubble-time bot-time">{msg.time}</span>
                    </div>

                    {idx === lastBotIdx &&
                      msg.quickReplies?.length > 0 &&
                      !loading && (
                        <div className="quick-replies">
                          {msg.quickReplies.map((qr, i) => (
                            <button key={i} className="qr-btn" onClick={() => onQuickReply(qr)}>
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

          {loading && <TypingDots />}
          <div ref={bottomRef} style={{ height: 20 }} />
        </main>

        {/* INPUT */}
        <footer className="wa-input-bar">
          <form onSubmit={onSubmit} className="wa-input-form">
            <button type="button" className="wa-input-icon">
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

      <div className="demo-brand">
        <p>{cLogo} {cName}</p>
        <p className="demo-sub">
          AI Property Assistant • Built by <strong>Dawood Ahmed</strong>
        </p>
      </div>
    </div>
  );
}

export default App;