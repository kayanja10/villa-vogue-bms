import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Eye, EyeOff, ShieldCheck, Mail, ArrowRight, RotateCcw } from 'lucide-react';
import { auth } from '../lib/api';
import { useStore } from '../store/useStore';

export default function Login() {
  const navigate = useNavigate();
  const { setAuth } = useStore();

  const [step, setStep] = useState('credentials'); // 'credentials' | '2fa'
  const [userId, setUserId] = useState(null);
  const [email2fa, setEmail2fa] = useState('');
  const [form, setForm] = useState({ username: '', password: '' });
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(60);
    const t = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(t); return 0; } return c - 1; });
    }, 1000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) return toast.error('Enter username and password');
    setLoading(true);
    try {
      const { data } = await auth.login(form);
      if (data.requires2FA) {
        setUserId(data.userId);
        setEmail2fa(data.message);
        setStep('2fa');
        startCountdown();
        toast.success('Verification code sent to your email');
      } else {
        setAuth(data.user, data.accessToken, data.refreshToken);
        toast.success(`Welcome back, ${data.user.username}!`);
        navigate('/');
      }
    } catch (err) {
      const msg = err.response?.data?.error || 'Login failed';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (idx, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp];
    next[idx] = val.slice(-1);
    setOtp(next);
    if (val && idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
    if (next.every((d) => d !== '') && next.join('').length === 6) {
      verifyOtp(next.join(''));
    }
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace' && !otp[idx] && idx > 0) {
      document.getElementById(`otp-${idx - 1}`)?.focus();
    }
  };

  const verifyOtp = async (code) => {
    setLoading(true);
    try {
      const { data } = await auth.verify2fa({ userId, code });
      setAuth(data.user, data.accessToken, data.refreshToken);
      toast.success(`Welcome back, ${data.user.username}!`);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid code');
      setOtp(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) return toast.error('Enter the 6-digit code');
    verifyOtp(code);
  };

  const resendOtp = async () => {
    if (countdown > 0) return;
    setResending(true);
    try {
      await auth.resendOtp({ userId });
      toast.success('New code sent!');
      setOtp(['', '', '', '', '', '']);
      startCountdown();
      document.getElementById('otp-0')?.focus();
    } catch {
      toast.error('Failed to resend. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0d0d] relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #C9A96E 0, #C9A96E 1px, transparent 0, transparent 50%)', backgroundSize: '20px 20px' }} />
      </div>

      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#C9A96E]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md px-4">
        {/* Logo & Brand */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#C9A96E] to-[#A8824A] shadow-gold mb-4 overflow-hidden">
            <img src="/logo.png" alt="Villa Vogue" className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'block'; }} />
            <span className="hidden text-white font-heading text-3xl font-bold">V</span>
          </div>
          <h1 className="text-white font-heading text-3xl font-semibold tracking-wide">Villa Vogue</h1>
          <p className="text-[#C9A96E]/70 text-sm tracking-[0.2em] uppercase mt-1 font-body">Business Management System</p>
        </div>

        {/* Card */}
        <div className="bg-[#1a1a1a]/90 backdrop-blur-xl rounded-2xl border border-[#C9A96E]/20 shadow-2xl overflow-hidden">
          {step === 'credentials' ? (
            <form onSubmit={handleLogin} className="p-8">
              <h2 className="text-white font-heading text-xl font-semibold mb-6">Sign In</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-[#C9A96E] text-xs font-medium tracking-wider uppercase mb-2 block">Username</label>
                  <input
                    type="text"
                    placeholder="Enter your username"
                    className="w-full px-4 py-3 rounded-lg bg-[#111] border border-[#333] text-white placeholder:text-gray-600 focus:outline-none focus:border-[#C9A96E] focus:ring-1 focus:ring-[#C9A96E]/30 transition-all text-sm"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    autoFocus
                    autoComplete="username"
                  />
                </div>
                <div>
                  <label className="text-[#C9A96E] text-xs font-medium tracking-wider uppercase mb-2 block">Password</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="Enter your password"
                      className="w-full px-4 py-3 pr-12 rounded-lg bg-[#111] border border-[#333] text-white placeholder:text-gray-600 focus:outline-none focus:border-[#C9A96E] focus:ring-1 focus:ring-[#C9A96E]/30 transition-all text-sm"
                      value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      autoComplete="current-password"
                    />
                    <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors">
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-6 w-full py-3 rounded-lg bg-gradient-to-r from-[#C9A96E] to-[#A8824A] text-white font-semibold text-sm tracking-wide hover:shadow-gold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Sign In <ArrowRight size={16} /></>
                )}
              </button>

              <p className="text-center text-xs text-gray-600 mt-5">
                Admin accounts require email verification
              </p>
            </form>
          ) : (
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-[#C9A96E]/15 flex items-center justify-center">
                  <ShieldCheck size={20} className="text-[#C9A96E]" />
                </div>
                <div>
                  <h2 className="text-white font-heading text-lg font-semibold">Two-Factor Verification</h2>
                  <p className="text-gray-500 text-xs">Admin security check</p>
                </div>
              </div>

              <div className="bg-[#C9A96E]/10 border border-[#C9A96E]/20 rounded-xl p-4 mb-6 flex gap-3">
                <Mail size={16} className="text-[#C9A96E] shrink-0 mt-0.5" />
                <p className="text-gray-300 text-sm">{email2fa || 'Code sent to your registered email'}</p>
              </div>

              <form onSubmit={handleVerify}>
                <label className="text-[#C9A96E] text-xs font-medium tracking-wider uppercase mb-3 block">Enter 6-digit code</label>
                <div className="flex gap-3 justify-center mb-6">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={(e) => {
                        const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
                        if (paste.length === 6) {
                          const next = paste.split('');
                          setOtp(next);
                          verifyOtp(paste);
                        }
                      }}
                      className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-[#111] border-2 border-[#333] text-white focus:outline-none focus:border-[#C9A96E] transition-all"
                    />
                  ))}
                </div>

                <button
                  type="submit"
                  disabled={loading || otp.join('').length !== 6}
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-[#C9A96E] to-[#A8824A] text-white font-semibold text-sm tracking-wide hover:shadow-gold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] mb-4"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Verify & Sign In'}
                </button>

                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => { setStep('credentials'); setOtp(['','','','','','']); }}
                    className="text-gray-500 hover:text-gray-300 transition-colors text-xs flex items-center gap-1"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={resendOtp}
                    disabled={countdown > 0 || resending}
                    className="text-[#C9A96E]/70 hover:text-[#C9A96E] transition-colors text-xs flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <RotateCcw size={12} />
                    {countdown > 0 ? `Resend in ${countdown}s` : resending ? 'Sending...' : 'Resend code'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        <p className="text-center text-gray-700 text-xs mt-6">
          © {new Date().getFullYear()} Villa Vogue Fashions · Where Fashion Finds a Home
        </p>
      </div>
    </div>
  );
}
