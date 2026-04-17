import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";

const API = import.meta.env.VITE_API_URL || "https://villa-vogue-bms.onrender.com/api";

// Persist session — keys must match api.js interceptor exactly
function saveSession(data) {
  localStorage.setItem("vv_token",   data.accessToken);
  localStorage.setItem("vv_refresh", data.refreshToken);
  localStorage.setItem("vv_session", data.sessionId);
  localStorage.setItem("vv_user",    JSON.stringify(data.user));
}

// Render free-tier cold starts take 60–90 s — use 95 s timeout, 2 attempts
async function fetchWithRetry(url, options, retries = 2) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 95000);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

export default function Login() {
  const navigate = useNavigate();
  // FIX: useStore exports setAuth (not setUser). Destructure correctly.
  const { setAuth } = useStore();

  const [phase,          setPhase]          = useState("credentials");
  const [username,       setUsername]       = useState("");
  const [password,       setPassword]       = useState("");
  const [showPass,       setShowPass]       = useState(false);
  const [otp,            setOtp]            = useState(["", "", "", "", "", ""]);
  const [tempToken,      setTempToken]      = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs                             = useRef([]);
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState("");
  const [success,        setSuccess]        = useState("");
  const [waitSecs,       setWaitSecs]       = useState(0);
  const waitTimer                           = useRef(null);

  // Resend cooldown tick
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  // Auto-focus first OTP box when phase changes
  useEffect(() => {
    if (phase === "otp") setTimeout(() => otpRefs.current[0]?.focus(), 150);
  }, [phase]);

  // FIX: define clearAlerts as a proper function (was referenced but never declared)
  function clearAlerts() {
    setError("");
    setSuccess("");
  }

  function startWaitTimer() {
    setWaitSecs(0);
    waitTimer.current = setInterval(() => setWaitSecs((s) => s + 1), 1000);
  }
  function stopWaitTimer() {
    clearInterval(waitTimer.current);
    setWaitSecs(0);
  }

  // FIX: use setAuth (not setUser — it doesn't exist on the store)
  // setAuth(user, token, refreshToken, sessionId) handles all localStorage writes internally.
  // We still call saveSession first so the api.js interceptor picks up the token immediately,
  // then do a hard redirect so the Guard re-mounts with a clean store.
  function finishLogin(data) {
    saveSession(data);
    setAuth(data.user, data.accessToken, data.refreshToken, data.sessionId);
    window.location.href = "/";
  }

  // ── Credentials submit ────────────────────────────────────────────────────
  async function handleLogin(e) {
    e.preventDefault();
    if (loading) return;
    clearAlerts();
    setSuccess("Connecting…");
    setLoading(true);
    startWaitTimer();
    try {
      const res = await fetchWithRetry(`${API}/auth/login`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ username: username.trim(), password }),
      });
      stopWaitTimer();
      const data = await res.json();
      setSuccess("");
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      if (data.twoFaRequired) {
        setTempToken(data.tempToken);
        setPhase("otp");
        setResendCooldown(30);
        setSuccess("A 6-digit code has been sent to the admin email.");
      } else {
        finishLogin(data);
      }
    } catch (err) {
      stopWaitTimer();
      setSuccess("");
      setError(
        err.name === "AbortError"
          ? "Server took too long — it may still be waking up. Please try again."
          : "Cannot reach the server. Check your internet connection."
      );
    } finally {
      setLoading(false);
    }
  }

  // ── OTP submit ────────────────────────────────────────────────────────────
  async function handleOtpSubmit(e) {
    e?.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter the full 6-digit code."); return; }
    if (loading) return;
    clearAlerts();
    setSuccess("Verifying…");
    setLoading(true);
    try {
      // FIX: endpoint is /auth/2fa/verify — must match backend route (was /auth/verify-2fa)
      const res = await fetchWithRetry(`${API}/auth/2fa/verify`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tempToken, code: code.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Verification failed");
        setSuccess("");
        setLoading(false);
        if (data.error?.toLowerCase().includes("log in again")) {
          setTimeout(() => {
            setPhase("credentials");
            setOtp(["", "", "", "", "", ""]);
            setTempToken("");
            clearAlerts();
          }, 2000);
        }
        return;
      }
      setSuccess("Verified! Signing you in…");
      setTimeout(() => finishLogin(data), 600);
    } catch (err) {
      setSuccess("");
      setError(
        err.name === "AbortError"
          ? "Server timeout. Please try again."
          : "Cannot reach the server. Try again."
      );
      setLoading(false);
    }
  }

  // ── Resend OTP ────────────────────────────────────────────────────────────
  async function handleResend() {
    if (resendCooldown > 0 || loading) return;
    clearAlerts();
    setLoading(true);
    try {
      // FIX: endpoint is /auth/2fa/resend — must match backend (was /auth/resend-otp)
      const res = await fetchWithRetry(`${API}/auth/2fa/resend`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ tempToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to resend code.");
        if (data.error?.toLowerCase().includes("log in again")) {
          setTimeout(() => {
            setPhase("credentials");
            setOtp(["", "", "", "", "", ""]);
            setTempToken("");
          }, 1800);
        }
      } else {
        setSuccess("A new code has been sent to the admin email.");
        setOtp(["", "", "", "", "", ""]);
        setResendCooldown(30);
        setTimeout(() => otpRefs.current[0]?.focus(), 80);
      }
    } catch {
      setError("Cannot reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── OTP input helpers ─────────────────────────────────────────────────────
  function handleOtpChange(idx, val) {
    if (val.length > 1) {
      const digits = val.replace(/\D/g, "").slice(0, 6).split("");
      const next = ["", "", "", "", "", ""];
      digits.forEach((d, i) => { next[i] = d; });
      setOtp(next);
      const focusIdx = Math.min(digits.length, 5);
      setTimeout(() => otpRefs.current[focusIdx]?.focus(), 20);
      if (digits.length === 6) setTimeout(() => handleOtpSubmit(), 100);
      return;
    }
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[idx] = val;
    setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (val && idx === 5 && next.join("").length === 6) {
      setTimeout(() => { if (!loading) handleOtpSubmit(); }, 80);
    }
  }

  function handleOtpKeyDown(idx, e) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowLeft"  && idx > 0) otpRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) otpRefs.current[idx + 1]?.focus();
  }

  // FIX: connectMsg reads waitSecs from state (not a stale closure) and only
  // shows the counter after 3 seconds so it doesn't flash immediately.
  const connectMsg =
    loading && phase === "credentials" && waitSecs > 3
      ? `Server waking up… ${waitSecs}s (first load can take up to 90s)`
      : success;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Montserrat:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body, #root { height: 100%; }
        body { background: #0a0a0a; }

        /* ── Root layout ── */
        .vv-root {
          min-height: 100vh; width: 100%;
          display: flex; align-items: center; justify-content: center;
          background: #0a0a0a;
          position: relative; overflow: hidden;
          font-family: 'Montserrat', sans-serif;
        }

        /* Ambient glow */
        .vv-glow {
          position: absolute; pointer-events: none;
          border-radius: 50%; filter: blur(80px); opacity: 0.35;
        }
        .vv-glow--gold {
          width: 520px; height: 520px;
          background: radial-gradient(circle, rgba(201,169,110,0.22) 0%, transparent 70%);
          top: 50%; left: 50%; transform: translate(-50%, -52%);
        }
        .vv-glow--blue {
          width: 300px; height: 300px;
          background: radial-gradient(circle, rgba(80,60,200,0.07) 0%, transparent 70%);
          bottom: 0; right: 0;
        }

        /* Corner accents */
        .corner {
          position: fixed; width: 72px; height: 72px;
          pointer-events: none; z-index: 0;
        }
        .corner--tl { top: 28px; left: 28px;
          border-top: 1px solid rgba(201,169,110,0.25);
          border-left: 1px solid rgba(201,169,110,0.25); }
        .corner--tr { top: 28px; right: 28px;
          border-top: 1px solid rgba(201,169,110,0.25);
          border-right: 1px solid rgba(201,169,110,0.25); }
        .corner--bl { bottom: 28px; left: 28px;
          border-bottom: 1px solid rgba(201,169,110,0.25);
          border-left: 1px solid rgba(201,169,110,0.25); }
        .corner--br { bottom: 28px; right: 28px;
          border-bottom: 1px solid rgba(201,169,110,0.25);
          border-right: 1px solid rgba(201,169,110,0.25); }

        /* Card */
        .vv-card {
          position: relative; z-index: 1;
          width: 100%; max-width: 440px;
          background: #111;
          border: 1px solid rgba(201,169,110,0.14);
          padding: 52px 44px 44px;
          box-shadow: 0 32px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.025) inset;
          animation: cardIn 0.55s cubic-bezier(0.22,1,0.36,1) both;
        }
        @media (max-width: 480px) {
          .vv-card { padding: 40px 24px 32px; margin: 16px; }
        }
        @keyframes cardIn {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        /* Gold top bar */
        .vv-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent 0%, #C9A96E 35%, #e8c97e 50%, #C9A96E 65%, transparent 100%);
        }

        /* Logo */
        .vv-logo { text-align: center; margin-bottom: 38px; }
        .vv-logo-mark {
          width: 52px; height: 52px; margin: 0 auto 14px;
          background: linear-gradient(135deg, #C9A96E 0%, #8B6914 100%);
          border-radius: 14px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 8px 24px rgba(201,169,110,0.3);
          font-family: 'Cormorant Garamond', serif;
          color: #fff; font-size: 22px; font-weight: 600; letter-spacing: 1px;
        }
        .vv-logo-name {
          font-family: 'Cormorant Garamond', serif; font-weight: 300;
          font-size: 28px; letter-spacing: 9px; text-transform: uppercase; color: #C9A96E; line-height: 1;
        }
        .vv-logo-sub  { font-size: 9px; letter-spacing: 3.5px; text-transform: uppercase; color: #444; margin-top: 7px; }
        .vv-divider   {
          width: 36px; height: 1px; margin: 14px auto 0;
          background: linear-gradient(90deg, transparent, #C9A96E, transparent);
        }

        /* Text */
        .vv-heading    { font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: 21px; color: #e8e0d0; letter-spacing: 0.5px; margin-bottom: 5px; }
        .vv-subheading { font-size: 11px; color: #4a4a4a; letter-spacing: 0.8px; margin-bottom: 26px; line-height: 1.6; }

        /* Fields */
        .vv-field     { margin-bottom: 16px; }
        .vv-label     { display: block; font-size: 9px; letter-spacing: 2.5px; text-transform: uppercase; color: #555; margin-bottom: 7px; }
        .vv-input-wrap{ position: relative; }
        .vv-input {
          width: 100%; background: #0d0d0d;
          border: 1px solid #222; color: #ddd;
          font-family: 'Montserrat', sans-serif; font-size: 13px;
          padding: 13px 16px; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s; letter-spacing: 0.3px;
          border-radius: 2px;
        }
        .vv-input:focus {
          border-color: #C9A96E;
          box-shadow: 0 0 0 3px rgba(201,169,110,0.08);
        }
        .vv-input::placeholder { color: #2e2e2e; }
        .vv-input--pass{ padding-right: 46px; }
        .vv-eye {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer; color: #3a3a3a;
          display: flex; align-items: center; padding: 0; transition: color 0.2s;
        }
        .vv-eye:hover { color: #C9A96E; }

        /* Button */
        .vv-btn {
          width: 100%; background: linear-gradient(135deg, #C9A96E 0%, #A8824A 100%);
          color: #0a0a0a; border: none;
          font-family: 'Montserrat', sans-serif; font-size: 10px;
          font-weight: 700; letter-spacing: 3.5px; text-transform: uppercase;
          padding: 16px; cursor: pointer;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          margin-top: 8px; border-radius: 2px;
          box-shadow: 0 4px 16px rgba(201,169,110,0.2);
        }
        .vv-btn:hover:not(:disabled) {
          opacity: 0.92; transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(201,169,110,0.3);
        }
        .vv-btn:active:not(:disabled) { transform: translateY(0); }
        .vv-btn:disabled { opacity: 0.45; cursor: not-allowed; }
        .vv-btn-spinner {
          display: inline-block; width: 13px; height: 13px;
          border: 2px solid rgba(0,0,0,0.2); border-top-color: #0a0a0a;
          border-radius: 50%; animation: spin 0.7s linear infinite;
          vertical-align: middle; margin-right: 8px;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        /* Alerts */
        .vv-alert { font-size: 11px; letter-spacing: 0.3px; padding: 11px 14px; margin-bottom: 16px; line-height: 1.55; border-radius: 2px; }
        .vv-alert--error   { background: rgba(231,76,60,0.07);   border-left: 2px solid #c0392b; color: #e08070; }
        .vv-alert--success { background: rgba(201,169,110,0.08); border-left: 2px solid #C9A96E; color: #C9A96E; }
        .vv-alert--info    { background: rgba(255,255,255,0.03); border-left: 2px solid #333;    color: #666; }

        /* OTP */
        .otp-row  { display: flex; gap: 9px; justify-content: center; margin: 24px 0 6px; }
        .otp-box  {
          width: 50px; height: 60px;
          background: #0d0d0d; border: 1px solid #222;
          color: #C9A96E; font-family: 'Cormorant Garamond', serif;
          font-size: 28px; font-weight: 600; text-align: center;
          outline: none; transition: border-color 0.2s, background 0.2s, box-shadow 0.2s;
          caret-color: #C9A96E; border-radius: 2px;
        }
        .otp-box:focus     { border-color: #C9A96E; background: #181610; box-shadow: 0 0 0 3px rgba(201,169,110,0.1); }
        .otp-box--filled   { border-color: rgba(201,169,110,0.45); }
        .otp-hint { font-size: 10px; color: #3a3a3a; letter-spacing: 1.5px; text-align: center; margin-bottom: 20px; }

        /* Back button */
        .vv-back {
          display: flex; align-items: center; gap: 7px; background: none; border: none;
          color: #444; font-family: 'Montserrat', sans-serif; font-size: 9px;
          letter-spacing: 2.5px; text-transform: uppercase; cursor: pointer;
          padding: 0; margin-bottom: 26px; transition: color 0.2s;
        }
        .vv-back:hover { color: #C9A96E; }

        /* Resend */
        .vv-resend-row { text-align: center; margin-top: 18px; font-size: 11px; color: #3a3a3a; }
        .vv-resend-btn {
          background: none; border: none; color: #C9A96E;
          font-family: 'Montserrat', sans-serif; font-size: 11px;
          cursor: pointer; padding: 0;
          text-decoration: underline; text-underline-offset: 3px; transition: opacity 0.2s;
        }
        .vv-resend-btn:disabled { opacity: 0.4; cursor: not-allowed; text-decoration: none; }

        /* Portal link */
        .vv-portal-link {
          display: flex; align-items: center; justify-content: center; gap: 6px;
          margin-top: 24px; font-size: 10px; letter-spacing: 1.5px; text-transform: uppercase;
          color: #3a3a3a; cursor: pointer; background: none; border: none;
          width: 100%; font-family: 'Montserrat', sans-serif; transition: color 0.2s; padding: 0;
        }
        .vv-portal-link:hover { color: #888; }
        .vv-portal-link:hover .vv-portal-arrow { color: #C9A96E; }
        .vv-portal-arrow { color: #C9A96E; transition: transform 0.2s; }
        .vv-portal-link:hover .vv-portal-arrow { transform: translateX(3px); }

        /* Footer */
        .vv-footer { text-align: center; margin-top: 32px; font-size: 9px; color: #282828; letter-spacing: 1.5px; }

        /* Phase animation */
        .phase-enter { animation: phaseIn 0.32s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes phaseIn {
          from { opacity: 0; transform: translateX(14px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="vv-root">
        <div className="vv-glow vv-glow--gold" />
        <div className="vv-glow vv-glow--blue" />
        <div className="corner corner--tl" /><div className="corner corner--tr" />
        <div className="corner corner--bl" /><div className="corner corner--br" />

        <div className="vv-card">
          {/* Logo */}
          <div className="vv-logo">
            <div className="vv-logo-mark">VV</div>
            <div className="vv-logo-name">Villa Vogue</div>
            <div className="vv-logo-sub">Business Management System</div>
            <div className="vv-divider" />
          </div>

          {/* ── CREDENTIALS PHASE ── */}
          {phase === "credentials" && (
            <div className="phase-enter" key="creds">
              <div className="vv-heading">Welcome Back</div>
              <div className="vv-subheading">Sign in to access your dashboard</div>

              {error   && <div className="vv-alert vv-alert--error">{error}</div>}
              {!error && connectMsg && (
                <div className="vv-alert vv-alert--info">{connectMsg}</div>
              )}

              <form onSubmit={handleLogin} autoComplete="off">
                <div className="vv-field">
                  <label className="vv-label">Username or Email</label>
                  <input
                    className="vv-input"
                    type="text" placeholder="username or email"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); clearAlerts(); }}
                    autoFocus required disabled={loading}
                  />
                </div>
                <div className="vv-field">
                  <label className="vv-label">Password</label>
                  <div className="vv-input-wrap">
                    <input
                      className="vv-input vv-input--pass"
                      type={showPass ? "text" : "password"} placeholder="••••••••"
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); clearAlerts(); }}
                      required disabled={loading}
                    />
                    <button type="button" className="vv-eye" onClick={() => setShowPass((s) => !s)} tabIndex={-1}>
                      {showPass
                        ? <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.7"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      }
                    </button>
                  </div>
                </div>
                <button className="vv-btn" type="submit" disabled={loading}>
                  {loading && <span className="vv-btn-spinner" />}
                  {loading ? "Connecting…" : "Sign In"}
                </button>
              </form>

              <button className="vv-portal-link" onClick={() => navigate("/store")}>
                <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6" style={{opacity:0.4}}><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                Customer? Visit the Online Store
                <span className="vv-portal-arrow">→</span>
              </button>
            </div>
          )}

          {/* ── OTP PHASE ── */}
          {phase === "otp" && (
            <div className="phase-enter" key="otp">
              <button
                className="vv-back"
                onClick={() => {
                  setPhase("credentials");
                  setOtp(["","","","","",""]);
                  setTempToken("");
                  clearAlerts();
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><polyline points="15 18 9 12 15 6"/></svg>
                Back to Login
              </button>

              <div className="vv-heading">Verify Your Identity</div>
              <div className="vv-subheading">
                A 6-digit code was sent to the admin email.<br />
                Enter it below to complete sign-in.
              </div>

              {error   && <div className="vv-alert vv-alert--error">{error}</div>}
              {!error && success && <div className="vv-alert vv-alert--success">{success}</div>}

              <form onSubmit={handleOtpSubmit}>
                <div className="otp-row">
                  {otp.map((digit, idx) => (
                    <input
                      key={idx}
                      ref={(el) => (otpRefs.current[idx] = el)}
                      className={`otp-box${digit ? " otp-box--filled" : ""}`}
                      type="text" inputMode="numeric" maxLength={6} value={digit}
                      onChange={(e) => { clearAlerts(); handleOtpChange(idx, e.target.value); }}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      autoComplete="one-time-code"
                      disabled={loading}
                    />
                  ))}
                </div>
                <div className="otp-hint">⏱ Code expires in 10 minutes</div>
                <button
                  className="vv-btn" type="submit"
                  disabled={loading || otp.join("").length < 6}
                >
                  {loading && <span className="vv-btn-spinner" />}
                  {loading ? "Verifying…" : "Verify & Sign In"}
                </button>
              </form>

              <div className="vv-resend-row">
                Didn't receive a code?{" "}
                <button
                  className="vv-resend-btn"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                >
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend code"}
                </button>
              </div>
            </div>
          )}

          <div className="vv-footer">Villa Vogue Fashions &bull; Kampala, Uganda</div>
        </div>
      </div>
    </>
  );
}
