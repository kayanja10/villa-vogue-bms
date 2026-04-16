import React, { useState } from "react";

const Login = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [otp, setOtp] = useState("");
  const [tempToken, setTempToken] = useState("");
  const [showOtp, setShowOtp] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const API_URL =
    import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // ─── LOGIN ─────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      // 🔴 HANDLE 2FA RESPONSE
      if (data.twoFaRequired) {
        setTempToken(data.tempToken);
        setShowOtp(true);
        setLoading(false);
        return;
      }

      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("sessionId", data.sessionId);

        window.location.href = "/dashboard";
      } else {
        setError(data.error || "Login failed");
      }
    } catch (err) {
      setError("Server error");
    }

    setLoading(false);
  };

  // ─── VERIFY OTP ────────────────────────────────
  const handleVerifyOtp = async () => {
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/auth/2fa/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tempToken,
          code: otp,
        }),
      });

      const data = await res.json();

      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
        localStorage.setItem("refreshToken", data.refreshToken);
        localStorage.setItem("sessionId", data.sessionId);

        window.location.href = "/dashboard";
      } else {
        setError(data.error || "Invalid verification code");
      }
    } catch (err) {
      setError("Verification failed");
    }

    setLoading(false);
  };

  // ─── RESEND OTP ───────────────────────────────
  const handleResendOtp = async () => {
    try {
      await fetch(`${API_URL}/auth/2fa/resend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ tempToken }),
      });

      alert("A new OTP has been sent to your email.");
    } catch (err) {
      alert("Failed to resend OTP");
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Villa Vogue Login</h2>

        {error && <p style={styles.error}>{error}</p>}

        {!showOtp ? (
          <form onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Username or Email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
              required
            />

            <button type="submit" style={styles.button} disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
        ) : (
          <div>
            <p style={styles.subtitle}>
              Enter the verification code sent to your email
            </p>

            <input
              type="text"
              placeholder="Enter 6-digit code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              style={styles.input}
            />

            <button
              onClick={handleVerifyOtp}
              style={styles.button}
              disabled={loading}
            >
              {loading ? "Verifying..." : "Verify Code"}
            </button>

            <button
              onClick={handleResendOtp}
              style={styles.linkButton}
            >
              Resend Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── SIMPLE STYLING ─────────────────────────────
const styles = {
  container: {
    height: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "#f5f0e8",
  },
  card: {
    width: "350px",
    padding: "30px",
    background: "#fff",
    borderRadius: "6px",
    boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    textAlign: "center",
  },
  title: {
    marginBottom: "20px",
  },
  subtitle: {
    fontSize: "14px",
    marginBottom: "15px",
  },
  input: {
    width: "100%",
    padding: "10px",
    marginBottom: "10px",
    border: "1px solid #ccc",
    borderRadius: "4px",
  },
  button: {
    width: "100%",
    padding: "10px",
    background: "#1a1a1a",
    color: "#fff",
    border: "none",
    cursor: "pointer",
  },
  linkButton: {
    marginTop: "10px",
    background: "none",
    border: "none",
    color: "#C9A96E",
    cursor: "pointer",
  },
  error: {
    color: "red",
    fontSize: "14px",
    marginBottom: "10px",
  },
};

export default Login;