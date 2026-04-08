import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';
import api from '../lib/api';
import { io } from 'socket.io-client';

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

export function useSessionManager() {
  const { user, logout } = useStore();
  const navigate = useNavigate();
  const sessionIdRef = useRef(localStorage.getItem('vv_session'));
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const warningToastRef = useRef(null);
  const heartbeatRef = useRef(null);
  const lastActivityRef = useRef(Date.now());

  // Role-based timeouts (ms) - matches backend
  const TIMEOUTS = { admin: 15*60*1000, manager: 30*60*1000, staff: 60*60*1000 };
  const WARNINGS = { admin: 2*60*1000, manager: 5*60*1000, staff: 10*60*1000 };

  const getTimeout = () => TIMEOUTS[user?.role] || TIMEOUTS.staff;
  const getWarning = () => WARNINGS[user?.role] || WARNINGS.staff;

  const handleLogout = useCallback((reason = 'timeout', message = null) => {
    // End session on backend
    const sessionId = sessionIdRef.current;
    if (sessionId) {
      api.post('/sessions/end', { sessionId }).catch(() => {});
    }

    // Clear all timers
    clearTimeout(timeoutRef.current);
    clearTimeout(warningRef.current);
    clearInterval(heartbeatRef.current);
    if (warningToastRef.current) toast.dismiss(warningToastRef.current);

    // Clear storage
    localStorage.removeItem('vv_session');
    logout();

    // Show message
    const msgs = {
      timeout: '⏰ Session expired due to inactivity',
      force_logout: message || '🔒 You have been signed out by an administrator',
      manual: 'Signed out successfully',
    };
    toast(msgs[reason] || msgs.timeout, { duration: 5000, icon: reason === 'manual' ? '👋' : '🔒' });

    navigate('/login');
  }, [logout, navigate]);

  const extendSession = useCallback(() => {
    if (warningToastRef.current) toast.dismiss(warningToastRef.current);
    lastActivityRef.current = Date.now();
    resetTimers();
    // Send heartbeat
    const sessionId = sessionIdRef.current;
    if (sessionId) api.post('/sessions/heartbeat', { sessionId }).catch(() => {});
    toast.success('Session extended ✓', { duration: 2000 });
  }, []);

  const resetTimers = useCallback(() => {
    clearTimeout(timeoutRef.current);
    clearTimeout(warningRef.current);
    if (warningToastRef.current) toast.dismiss(warningToastRef.current);

    const timeout = getTimeout();
    const warning = getWarning();

    // Show warning before logout
    warningRef.current = setTimeout(() => {
      const remaining = Math.round(warning / 60000);
      warningToastRef.current = toast(
        (t) => (
          <div className="flex flex-col gap-2">
            <p className="font-semibold text-sm">⚠️ Session expiring in {remaining} minute{remaining > 1 ? 's' : ''}</p>
            <p className="text-xs text-gray-500">Click to stay signed in</p>
            <button
              onClick={() => { toast.dismiss(t.id); extendSession(); }}
              className="bg-[#C9A96E] text-white text-xs px-3 py-1.5 rounded-lg font-medium"
            >
              Keep me signed in
            </button>
          </div>
        ),
        { duration: warning, id: 'session-warning' }
      );
    }, timeout - warning);

    // Auto logout
    timeoutRef.current = setTimeout(() => {
      handleLogout('timeout');
    }, timeout);
  }, [user, handleLogout, extendSession]);

  // Track activity
  const handleActivity = useCallback(() => {
    const now = Date.now();
    // Throttle — only reset if 30+ seconds since last activity
    if (now - lastActivityRef.current > 30000) {
      lastActivityRef.current = now;
      resetTimers();
    }
  }, [resetTimers]);

  useEffect(() => {
    if (!user) return;

    const sessionId = localStorage.getItem('vv_session');
    if (!sessionId) {
      // Start session if not exists (e.g. page refresh)
      api.post('/sessions/start', {}).then(res => {
        const newId = res.data.sessionId;
        localStorage.setItem('vv_session', newId);
        sessionIdRef.current = newId;
      }).catch(() => {});
    }

    // Start activity tracking
    ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, handleActivity, { passive: true }));
    resetTimers();

    // Heartbeat every 2 minutes
    heartbeatRef.current = setInterval(() => {
      const sid = sessionIdRef.current;
      if (sid) {
        api.post('/sessions/heartbeat', { sessionId: sid }).then(res => {
          if (!res.data.valid) handleLogout('timeout');
        }).catch(() => {});
      }
    }, 120000);

    // Socket listener for force logout
    const BASE = import.meta.env.VITE_SOCKET_URL || window.location.origin;
    const socket = io(BASE, { transports: ['websocket', 'polling'] });
    const sid = sessionIdRef.current || localStorage.getItem('vv_session');
    if (sid) socket.emit('join:session', sid);

    socket.on('session:expired', (data) => {
      handleLogout(data.reason || 'force_logout', data.message);
    });

    return () => {
      ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, handleActivity));
      clearTimeout(timeoutRef.current);
      clearTimeout(warningRef.current);
      clearInterval(heartbeatRef.current);
      socket.disconnect();
    };
  }, [user]);

  return { extendSession, handleLogout };
}
