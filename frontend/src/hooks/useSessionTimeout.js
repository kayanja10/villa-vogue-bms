import { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useStore } from '../store/useStore';

// Role-based timeout in milliseconds
const TIMEOUTS = {
  admin:   30 * 60 * 1000,  // 30 minutes
  manager: 2  * 60 * 60 * 1000,  // 2 hours
  staff:   8  * 60 * 60 * 1000,  // 8 hours
};

const WARNING_BEFORE = 2 * 60 * 1000; // warn 2 min before logout

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'];

export function useSessionTimeout() {
  const { user, logout } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  const logoutTimer   = useRef(null);
  const warningTimer  = useRef(null);
  const warningToastId = useRef(null);
  const lastPath      = useRef(location.pathname);

  const clearTimers = useCallback(() => {
    clearTimeout(logoutTimer.current);
    clearTimeout(warningTimer.current);
    if (warningToastId.current) {
      toast.dismiss(warningToastId.current);
      warningToastId.current = null;
    }
  }, []);

  const handleLogout = useCallback((reason = 'timeout') => {
    clearTimers();
    // Save current page so we can redirect back after login
    sessionStorage.setItem('vv_redirect', lastPath.current);
    sessionStorage.setItem('vv_logout_reason', reason);
    logout();
    navigate('/login', { replace: true });
  }, [clearTimers, logout, navigate]);

  const showWarning = useCallback((secondsLeft) => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;

    warningToastId.current = toast(
      (t) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ fontWeight: 700, color: '#92400e' }}>
            ⚠️ Session expiring in {timeStr}
          </div>
          <div style={{ fontSize: 12, color: '#78716c' }}>
            Move your mouse or press any key to stay logged in.
          </div>
          <button
            onClick={() => { toast.dismiss(t.id); resetTimers(); }}
            style={{
              background: 'linear-gradient(135deg,#C9A96E,#A8824A)',
              color: '#fff', border: 'none', borderRadius: 8,
              padding: '6px 14px', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', alignSelf: 'flex-start',
            }}
          >
            Stay Logged In
          </button>
        </div>
      ),
      {
        duration: WARNING_BEFORE,
        style: {
          background: '#fffbeb',
          border: '1px solid #fbbf24',
          borderRadius: 12,
          maxWidth: 300,
        },
        icon: null,
      }
    );
  }, []);

  const resetTimers = useCallback(() => {
    if (!user) return;
    clearTimers();

    const timeout = TIMEOUTS[user.role] || TIMEOUTS.staff;
    const warningAt = timeout - WARNING_BEFORE;

    // Show warning before logout
    if (warningAt > 0) {
      warningTimer.current = setTimeout(() => {
        showWarning(Math.floor(WARNING_BEFORE / 1000));
      }, warningAt);
    }

    // Auto logout
    logoutTimer.current = setTimeout(() => {
      handleLogout('timeout');
    }, timeout);
  }, [user, clearTimers, showWarning, handleLogout]);

  // Track current path for redirect after login
  useEffect(() => {
    lastPath.current = location.pathname;
  }, [location.pathname]);

  // Set up activity listeners
  useEffect(() => {
    if (!user) return;

    resetTimers();

    const onActivity = () => {
      // Dismiss warning if user becomes active
      if (warningToastId.current) {
        toast.dismiss(warningToastId.current);
        warningToastId.current = null;
      }
      resetTimers();
    };

    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, onActivity, { passive: true }));

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, onActivity));
    };
  }, [user, resetTimers, clearTimers]);

  return null;
}
