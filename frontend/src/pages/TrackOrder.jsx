import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

const BASE_API = import.meta.env.VITE_API_URL || 'https://villa-vogue-bms.onrender.com/api';

const STATUS_INFO = {
  pending:    { label: "Order Received",  color: "#f39c12", step: 0 },
  confirmed:  { label: "Confirmed",       color: "#2980b9", step: 1 },
  processing: { label: "Being Prepared",  color: "#8e44ad", step: 2 },
  received:   { label: "Ready",           color: "#16a085", step: 3 },
  delivered:  { label: "Delivered",       color: "#27ae60", step: 4 },
  completed:  { label: "Completed",       color: "#27ae60", step: 4 },
  cancelled:  { label: "Cancelled",       color: "#e74c3c", step: -1 },
  voided:     { label: "Voided",          color: "#e74c3c", step: -1 },
};
const STEPS = ["pending", "confirmed", "processing", "received", "delivered"];

export default function TrackOrder() {
  const [orderNumber, setOrderNumber] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async (e) => {
    e?.preventDefault();
    if (!orderNumber.trim()) return;
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const res = await fetch(`${BASE_API}/orders/track/${encodeURIComponent(orderNumber.trim().toUpperCase())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Order not found");
      setOrder(data);
    } catch (err) {
      setError(err.message || "Could not find that order. Check your order number and try again.");
    } finally {
      setLoading(false);
    }
  };

  const info = order ? (STATUS_INFO[order.orderStatus] || STATUS_INFO.pending) : null;

  // ── Live status sync ─────────────────────────────────────────────────────
  // Once an order is found, stay subscribed so a staff update (status change,
  // delivery fee set, etc.) appears here immediately — the customer doesn't
  // need to hit "Track" again to see the latest state.
  const orderNumberRef = useRef(null);
  useEffect(() => { orderNumberRef.current = order?.orderNumber || null; }, [order?.orderNumber]);

  useEffect(() => {
    if (!order?.orderNumber) return;
    const socket = io(BASE_API.replace(/\/api\/?$/, ''), { transports: ['websocket', 'polling'] });

    const applyStatusUpdate = (update) => {
      if (update.orderNumber !== orderNumberRef.current && update.orderId !== order.id) return;
      setOrder(prev => prev ? {
        ...prev,
        orderStatus: update.status ?? prev.orderStatus,
        ...(update.deliveryFee != null ? { deliveryFee: update.deliveryFee } : {}),
        ...(update.total != null ? { total: update.total } : {}),
      } : prev);
    };
    socket.on('order:status-public', applyStatusUpdate);
    socket.on('order:status-changed', applyStatusUpdate);

    return () => {
      socket.off('order:status-public', applyStatusUpdate);
      socket.off('order:status-changed', applyStatusUpdate);
      socket.disconnect();
    };
  }, [order?.orderNumber]);

  return (
    <div style={{
      minHeight: "100vh", background: "#0D0D0D", color: "#F5F0E8",
      fontFamily: "'DM Sans', sans-serif", display: "flex", flexDirection: "column",
      alignItems: "center", padding: "60px 20px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;500&family=DM+Sans:wght@400;500;600;700&display=swap');
        .vv-track-input::placeholder { color: rgba(245,240,232,.3); }
        .vv-track-input:focus { border-color: #C9A84C !important; }
        @keyframes vv-spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Brand mark */}
      <a href="/" style={{ textDecoration: "none", marginBottom: 48 }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 24, fontWeight: 400, letterSpacing: ".2em", color: "#F5F0E8" }}>
            VILLA VOGUE
          </div>
          <div style={{ fontSize: 10, letterSpacing: ".15em", color: "#C9A84C", marginTop: 4, textTransform: "uppercase" }}>
            Where Fashion Finds a Home
          </div>
        </div>
      </a>

      <div style={{ width: "100%", maxWidth: 460 }}>
        <h1 style={{
          fontFamily: "'Cormorant Garamond', serif", fontSize: "clamp(28px,5vw,38px)",
          fontWeight: 300, textAlign: "center", marginBottom: 10, lineHeight: 1.2,
        }}>
          Track Your <em style={{ fontStyle: "italic", color: "#C9A84C" }}>Order</em>
        </h1>
        <p style={{ textAlign: "center", fontSize: 13, color: "rgba(245,240,232,.55)", marginBottom: 32 }}>
          Enter your order number to see real-time status
        </p>

        {/* Search form */}
        <form onSubmit={search} style={{ display: "flex", gap: 10, marginBottom: 8 }}>
          <input
            className="vv-track-input"
            value={orderNumber}
            onChange={e => setOrderNumber(e.target.value)}
            placeholder="e.g. VV261201-1234"
            style={{
              flex: 1, padding: "14px 16px", borderRadius: 12, fontSize: 14,
              background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.12)",
              color: "#F5F0E8", outline: "none", transition: "border-color .2s",
            }}
          />
          <button type="submit" disabled={loading} style={{
            padding: "14px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700,
            background: "linear-gradient(135deg,#9A7A2F,#C9A84C)", color: "#000",
            border: "none", cursor: "pointer", whiteSpace: "nowrap", opacity: loading ? 0.7 : 1,
          }}>
            {loading ? "Searching…" : "Track"}
          </button>
        </form>
        <p style={{ fontSize: 11, color: "rgba(245,240,232,.35)", marginBottom: 32 }}>
          Your order number was sent when you placed your order online or via WhatsApp.
        </p>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div key="err" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                background: "rgba(231,76,60,.1)", border: "1px solid rgba(231,76,60,.3)",
                borderRadius: 14, padding: "16px 18px", marginBottom: 20,
              }}>
              <p style={{ fontSize: 13, color: "#e74c3c" }}>⚠ {error}</p>
              <p style={{ fontSize: 12, color: "rgba(245,240,232,.5)", marginTop: 8 }}>
                Need help? <a href="https://wa.me/256782860372" target="_blank" rel="noopener noreferrer" style={{ color: "#C9A84C" }}>Chat with us on WhatsApp</a>
              </p>
            </motion.div>
          )}

          {order && (
            <motion.div key="order" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 20, padding: "26px 24px",
              }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <p style={{ fontSize: 10, letterSpacing: ".1em", color: "rgba(245,240,232,.4)", textTransform: "uppercase", marginBottom: 4 }}>Order Number</p>
                  <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 20, color: "#C9A84C" }}>{order.orderNumber}</p>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: "5px 12px", borderRadius: 20,
                  background: `${info.color}22`, color: info.color, whiteSpace: "nowrap",
                }}>
                  {info.label}
                </span>
              </div>

              {/* Status stepper */}
              {info.step >= 0 ? (
                <div style={{ display: "flex", alignItems: "center", marginBottom: 22 }}>
                  {STEPS.map((s, i) => {
                    const stepInfo = STATUS_INFO[s];
                    const reached = info.step >= stepInfo.step;
                    return (
                      <React.Fragment key={s}>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flex: 1 }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                            background: reached ? stepInfo.color : "rgba(255,255,255,.08)", transition: "background .3s",
                          }}>
                            {reached && <span style={{ color: "#000", fontSize: 12, fontWeight: 700 }}>✓</span>}
                          </div>
                          <span style={{ fontSize: 9, color: reached ? stepInfo.color : "rgba(245,240,232,.3)", fontWeight: reached ? 700 : 400, textAlign: "center" }}>
                            {stepInfo.label}
                          </span>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div style={{ flex: 0.6, height: 2, marginTop: -16, background: info.step > stepInfo.step ? stepInfo.color : "rgba(255,255,255,.08)", transition: "background .3s" }} />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              ) : (
                <div style={{ marginBottom: 22, fontSize: 13, color: info.color }}>This order was {info.label.toLowerCase()}.</div>
              )}

              {/* Details */}
              <div style={{ borderTop: "1px solid rgba(255,255,255,.08)", paddingTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                <Row label="Items" value={`${order.itemCount} item${order.itemCount !== 1 ? "s" : ""}`} />
                <Row label="Total" value={`UGX ${Number(order.total).toLocaleString()}`} gold />
                {(order.deliveryType === "delivery" || order.deliveryArea) && (
                  <Row label="Delivery Fee" value={
                    typeof order.deliveryFee === "number" && order.deliveryFee > 0
                      ? `UGX ${order.deliveryFee.toLocaleString()}`
                      : "To be confirmed"
                  } />
                )}
                <Row label="Payment" value={order.paymentStatus === "paid" ? "✓ Paid" : "Pending"} />
                <Row label="Payment Method" value={order.paymentMethod?.replace(/_/g, " ")} />
                <Row label="Ordered" value={new Date(order.createdAt).toLocaleDateString("en-UG", { day: "numeric", month: "short", year: "numeric" })} />
              </div>

              <a href={`https://wa.me/256782860372?text=${encodeURIComponent(`Hi! I'd like an update on my order ${order.orderNumber}.`)}`}
                target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                <button style={{
                  width: "100%", marginTop: 20, padding: "12px", borderRadius: 50, fontSize: 13, fontWeight: 600,
                  background: "#25D366", color: "#fff", border: "none", cursor: "pointer",
                }}>
                  💬 Message Us About This Order
                </button>
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ textAlign: "center", marginTop: 32 }}>
          <a href="/" style={{ fontSize: 12, color: "rgba(245,240,232,.4)", textDecoration: "none" }}>← Back to Store</a>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, gold }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
      <span style={{ color: "rgba(245,240,232,.5)" }}>{label}</span>
      <span style={{ fontWeight: 600, color: gold ? "#C9A84C" : "#F5F0E8", textTransform: "capitalize" }}>{value}</span>
    </div>
  );
}
