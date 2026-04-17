import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../store/useStore";

const API = import.meta.env.VITE_API_URL || "https://villa-vogue-bms.onrender.com/api";

// ── Persists session to localStorage (keys match api.js interceptor) ──────────
function saveSession(data) {
  localStorage.setItem("vv_token", data.accessToken);
  localStorage.setItem("vv_refresh", data.refreshToken);
  localStorage.setItem("vv_session", data.sessionId);
  localStorage.setItem("vv_user", JSON.stringify(data.user));
}

// ── Fetch with retry — handles Render free-tier cold-start (30-60s sleep) ─────
async function fetchWithRetry(url, options, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 40000); // 40s per attempt
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 2000)); // 2s between retries
    }
  }
}

export default function Login() {
  const navigate = useNavigate();
  const setUser = useStore((s) => s.setUser);

  const [phase, setPhase] = useState("credentials");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [tempToken, setTempToken] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const otpRefs = useRef([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (phase === "otp") setTimeout(() => otpRefs.current[0]?.focus(), 120);
  }, [phase]);

  // ── THE KEY FIX: finishLogin uses useStore + navigate instead of onLogin prop
  function finishLogin(data) {
    saveSession(data);
    setUser(data.user);
    navigate("/", { replace: true });
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError("");
    setSuccess("Connecting to server…");
    setLoading(true);
    try {
      const res = await fetchWithRetry(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      setSuccess("");
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Login failed"); return; }
      if (data.twoFaRequired) {
        setTempToken(data.tempToken);
        setPhase("otp");
        setResendCooldown(30);
        setSuccess("A 6-digit code has been sent to the admin email.");
      } else {
        finishLogin(data);
      }
    } catch (err) {
      setSuccess("");
      if (err.name === "AbortError") {
        setError("Server is starting up — please wait a moment and try again.");
      } else {
        setError("Cannot reach the server. Check your internet and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(e) {
    e?.preventDefault();
    const code = otp.join("");
    if (code.length < 6) { setError("Please enter the full 6-digit code."); return; }
    setError("");
    setSuccess("Verifying…");
    setLoading(true);
    try {
      const res = await fetchWithRetry(`${API}/auth/2fa/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken, code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSuccess("");
        setError(data.error || "Verification failed");
        if (res.status === 401 && data.error?.includes("log in again")) {
          setTimeout(() => { setPhase("credentials"); setOtp(["","","","","",""]); setTempToken(""); }, 1800);
        }
        return;
      }
      setSuccess("Verified! Signing you in…");
      setTimeout(() => finishLogin(data), 500);
    } catch (err) {
      setSuccess("");
      setError(err.name === "AbortError" ? "Server timeout. Please try again." : "Cannot reach the server. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (resendCooldown > 0) return;
    setError(""); setLoading(true);
    try {
      const res = await fetchWithRetry(`${API}/auth/2fa/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tempToken }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to resend code.");
        if (res.status === 401) setTimeout(() => { setPhase("credentials"); setOtp(["","","","","",""]); setTempToken(""); }, 1800);
      } else {
        setSuccess("A new code has been sent.");
        setOtp(["","","","","",""]);
        setResendCooldown(30);
        setTimeout(() => otpRefs.current[0]?.focus(), 80);
      }
    } catch { setError("Cannot reach the server. Please try again."); }
    finally { setLoading(false); }
  }

  function handleOtpChange(idx, val) {
    if (val.length > 1) {
      const digits = val.replace(/\D/g, "").slice(0, 6).split("");
      const next = ["","","","","",""];
      digits.forEach((d, i) => { next[i] = d; });
      setOtp(next);
      setTimeout(() => otpRefs.current[Math.min(digits.length, 5)]?.focus(), 20);
      return;
    }
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[idx] = val; setOtp(next);
    if (val && idx < 5) otpRefs.current[idx + 1]?.focus();
    if (val && idx === 5 && [...next].join("").length === 6) setTimeout(handleOtpSubmit, 80);
  }

  function handleOtpKeyDown(idx, e) {
    if (e.key === "Backspace" && !otp[idx] && idx > 0) otpRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowLeft" && idx > 0) otpRefs.current[idx - 1]?.focus();
    if (e.key === "ArrowRight" && idx < 5) otpRefs.current[idx + 1]?.focus();
  }

  function clearAlerts() { setError(""); setSuccess(""); }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300&family=Montserrat:wght@300;400;500;600&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0e0e0e; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
        .vv-root { min-height: 100vh; width: 100%; display: flex; align-items: center; justify-content: center; background: #0e0e0e; position: relative; overflow: hidden; font-family: 'Montserrat', sans-serif; }
        .vv-root::before { content: ''; position: absolute; width: 600px; height: 600px; background: radial-gradient(ellipse at center, rgba(201,169,110,0.08) 0%, transparent 70%); top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; }
        .corner { position: absolute; width: 60px; height: 60px; }
        .corner--tl { top: 32px; left: 32px; border-top: 1px solid rgba(201,169,110,0.3); border-left: 1px solid rgba(201,169,110,0.3); }
        .corner--tr { top: 32px; right: 32px; border-top: 1px solid rgba(201,169,110,0.3); border-right: 1px solid rgba(201,169,110,0.3); }
        .corner--bl { bottom: 32px; left: 32px; border-bottom: 1px solid rgba(201,169,110,0.3); border-left: 1px solid rgba(201,169,110,0.3); }
        .corner--br { bottom: 32px; right: 32px; border-bottom: 1px solid rgba(201,169,110,0.3); border-right: 1px solid rgba(201,169,110,0.3); }
        .vv-card { position: relative; width: 100%; max-width: 420px; background: #141414; border: 1px solid rgba(201,169,110,0.18); padding: 52px 44px 44px; animation: cardIn 0.55s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes cardIn { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: translateY(0); } }
        .vv-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, #C9A96E 30%, #C9A96E 70%, transparent); }
        .vv-logo { text-align: center; margin-bottom: 36px; }
        .vv-logo-name { font-family: 'Cormorant Garamond', serif; font-weight: 300; font-size: 32px; letter-spacing: 10px; text-transform: uppercase; color: #C9A96E; line-height: 1; }
        .vv-logo-sub { font-size: 9px; letter-spacing: 4px; text-transform: uppercase; color: #555; margin-top: 8px; }
        .vv-divider { width: 40px; height: 1px; background: linear-gradient(90deg, transparent, #C9A96E, transparent); margin: 14px auto 0; }
        .vv-heading { font-family: 'Cormorant Garamond', serif; font-weight: 400; font-size: 20px; color: #e8e0d0; letter-spacing: 1px; margin-bottom: 6px; }
        .vv-subheading { font-size: 11px; color: #555; letter-spacing: 1px; margin-bottom: 28px; line-height: 1.5; }
        .vv-field { margin-bottom: 18px; }
        .vv-label { display: block; font-size: 9px; letter-spacing: 2.5px; text-transform: uppercase; color: #666; margin-bottom: 8px; }
        .vv-input-wrap { position: relative; }
        .vv-input { width: 100%; background: #0e0e0e; border: 1px solid #2a2a2a; color: #e8e0d0; font-family: 'Montserrat', sans-serif; font-size: 13px; padding: 13px 16px; outline: none; transition: border-color 0.2s; letter-spacing: 0.3px; }
        .vv-input:focus { border-color: #C9A96E; }
        .vv-input::placeholder { color: #333; }
        .vv-input--pass { padding-right: 46px; }
        .vv-eye { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: #444; display: flex; align-items: center; padding: 0; transition: color 0.2s; }
        .vv-eye:hover { color: #C9A96E; }
        .vv-btn { width: 100%; background: #C9A96E; color: #0e0e0e; border: none; font-family: 'Montserrat', sans-serif; font-size: 10px; font-weight: 600; letter-spacing: 3px; text-transform: uppercase; padding: 16px; cursor: pointer; transition: background 0.2s, opacity 0.2s; margin-top: 8px; position: relative; }
        .vv-btn:hover:not(:disabled) { background: #dbbf82; }
        .vv-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .vv-btn-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid rgba(0,0,0,0.2); border-top-color: #0e0e0e; border-radius: 50%; animation: spin 0.7s linear infinite; vertical-align: middle; margin-right: 8px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .vv-alert { font-size: 11px; letter-spacing: 0.3px; padding: 11px 14px; margin-bottom: 18px; line-height: 1.5; }
        .vv-alert--error { background: rgba(231,76,60,0.08); border-left: 2px solid #e74c3c; color: #e08070; }
        .vv-alert--success { background: rgba(201,169,110,0.08); border-left: 2px solid #C9A96E; color: #C9A96E; }
        .vv-alert--info { background: rgba(80,80,80,0.08); border-left: 2px solid #555; color: #888; }
        .otp-row { display: flex; gap: 10px; justify-content: center; margin: 28px 0 8px; }
        .otp-box { width: 48px; height: 58px; background: #0e0e0e; border: 1px solid #2a2a2a; color: #C9A96E; font-family: 'Cormorant Garamond', serif; font-size: 26px; font-weight: 600; text-align: center; outline: none; transition: border-color 0.2s, background 0.2s; caret-color: #C9A96E; }
        .otp-box:focus { border-color: #C9A96E; background: #1a1610; }
        .otp-box--filled { border-color: rgba(201,169,110,0.5); }
        .otp-hint { font-size: 10px; color: #444; letter-spacing: 1px; text-align: center; margin-bottom: 20px; }
        .vv-back { display: flex; align-items: center; gap: 6px; background: none; border: none; color: #555; font-family: 'Montserrat', sans-serif; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; cursor: pointer; padding: 0; margin-bottom: 28px; transition: color 0.2s; }
        .vv-back:hover { color: #C9A96E; }
        .vv-resend-row { text-align: center; margin-top: 18px; font-size: 11px; color: #444; }
        .vv-resend-btn { background: none; border: none; color: #C9A96E; font-family: 'Montserrat', sans-serif; font-size: 11px; cursor: pointer; padding: 0; text-decoration: underline; text-underline-offset: 3px; transition: opacity 0.2s; }
        .vv-resend-btn:disabled { opacity: 0.4; cursor: not-allowed; text-decoration: none; }
        .vv-portal-link { display: block; text-align: center; margin-top: 22px; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: #444; cursor: pointer; background: none; border: none; width: 100%; font-family: 'Montserrat', sans-serif; transition: color 0.2s; padding: 0; }
        .vv-portal-link:hover { color: #C9A96E; }
        .vv-portal-link span { color: #C9A96E; }
        .vv-footer { text-align: center; margin-top: 32px; font-size: 10px; color: #333; letter-spacing: 1px; }
        .phase-enter { animation: phaseIn 0.35s cubic-bezier(0.22,1,0.36,1) both; }
        @keyframes phaseIn { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>

      <div className="vv-root">
        <div className="corner corner--tl" /><div className="corner corner--tr" />
        <div className="corner corner--bl" /><div className="corner corner--br" />

        <div className="vv-card">
          <div className="vv-logo">
            <div className="vv-logo-name">Villa Vogue</div>
            <div className="vv-logo-sub">Business Management System</div>
            <div className="vv-divider" />
          </div>

          {phase === "credentials" && (
            <div className="phase-enter" key="creds">
              <div className="vv-heading">Sign In</div>
              <div className="vv-subheading">Enter your credentials to access the dashboard</div>

              {error   && <div className="vv-alert vv-alert--error">{error}</div>}
              {success && <div className="vv-alert vv-alert--info">{success}</div>}

              <form onSubmit={handleLogin} autoComplete="off">
                <div className="vv-field">
                  <label className="vv-label">Username or Email</label>
                  <input className="vv-input" type="text" placeholder="username" value={username}
                    onChange={(e) => { setUsername(e.target.value); clearAlerts(); }} autoFocus required />
                </div>
                <div className="vv-field">
                  <label className="vv-label">Password</label>
                  <div className="vv-input-wrap">
                    <input className="vv-input vv-input--pass" type={showPass ? "text" : "password"} placeholder="••••••••"
                      value={password} onChange={(e) => { setPassword(e.target.value); clearAlerts(); }} required />
                    <button type="button" className="vv-eye" onClick={() => setShowPass((s) => !s)} tabIndex={-1}>
                      {showPass
                        ? <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                        : <svg width="17" height="17" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.6"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
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
                Customer? Visit the <span>Online Store →</span>
              </button>
            </div>
          )}

          {phase === "otp" && (
            <div className="phase-enter" key="otp">
              <button className="vv-back" onClick={() => { setPhase("credentials"); setOtp(["","","","","",""]); setTempToken(""); setError(""); setSuccess(""); }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                Back
              </button>
              <div className="vv-heading">Two-Factor Verification</div>
              <div className="vv-subheading">A 6-digit code was sent to the admin email address.<br />Enter it below to complete sign-in.</div>

              {error   && <div className="vv-alert vv-alert--error">{error}</div>}
              {success && <div className="vv-alert vv-alert--success">{success}</div>}

              <form onSubmit={handleOtpSubmit}>
                <div className="otp-row">
                  {otp.map((digit, idx) => (
                    <input key={idx} ref={(el) => (otpRefs.current[idx] = el)}
                      className={`otp-box${digit ? " otp-box--filled" : ""}`}
                      type="text" inputMode="numeric" maxLength={6} value={digit}
                      onChange={(e) => { clearAlerts(); handleOtpChange(idx, e.target.value); }}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)} autoComplete="one-time-code" />
                  ))}
                </div>
                <div className="otp-hint">Code expires in 10 minutes</div>
                <button className="vv-btn" type="submit" disabled={loading || otp.join("").length < 6}>
                  {loading && <span className="vv-btn-spinner" />}
                  {loading ? "Verifying…" : "Verify Code"}
                </button>
              </form>

              <div className="vv-resend-row">
                Didn't receive a code?{" "}
                <button className="vv-resend-btn" onClick={handleResend} disabled={resendCooldown > 0 || loading}>
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
