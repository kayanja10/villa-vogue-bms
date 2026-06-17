import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useStore } from '../store/useStore';
import toast from 'react-hot-toast';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://villa-vogue-bms.onrender.com';

let socketInstance = null; // singleton — one socket for the whole app

export function useSocket() {
  const { token, user } = useStore();
  const ref = useRef(null);

  useEffect(() => {
    if (!token || !user) return;

    // Reuse existing socket if already connected
    if (socketInstance && socketInstance.connected) {
      ref.current = socketInstance;
      window.__vv_socket = socketInstance;
      return;
    }

    const socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
    });

    // ── Global order events ─────────────────────────────────────────────────
    socket.on('order:created', ({ order, user: by }) => {
      // Only show toast for POS orders here — online orders handled by Dashboard
      if (order?.orderSource !== 'online') {
        toast.success(`Order ${order?.orderNumber} created by ${by}`);
      }
    });

    // ── Stock alerts ────────────────────────────────────────────────────────
    socket.on('stock:alert', ({ product, stock }) => {
      toast(`⚠️ Low stock: ${product} (${stock} left)`, { icon: '📦', duration: 6000 });
    });

    // ── Session events ──────────────────────────────────────────────────────
    socket.on('session:expired', () => {
      toast.error('Your session has expired. Please log in again.');
    });

    socket.on('force:logout', () => {
      toast.error('You have been logged out by an administrator.');
      useStore.getState().logout();
    });

    socketInstance = socket;
    ref.current = socket;
    // Expose globally so Dashboard (and any component) can listen to 'online:order'
    window.__vv_socket = socket;

    return () => {
      // Don't disconnect on component unmount — keep alive for the session
      // Only clean up listeners that are local to this hook
    };
  }, [token, user]);

  return ref.current;
}