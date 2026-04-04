import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useStore } from '../store/useStore';

let socket = null;

export function useSocket() {
  const { user, addAlert } = useStore();
  const connected = useRef(false);

  useEffect(() => {
    if (!user || connected.current) return;

    socket = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      connected.current = true;
      socket.emit('join:room', user.role);
      socket.emit('join:room', 'all');
    });

    socket.on('order:created', (data) => {
      addAlert({ type: 'success', message: `New order by ${data.user || 'staff'}`, icon: '🛍️' });
    });

    socket.on('stock:updated', (data) => {
      if (data.stock <= 3) addAlert({ type: 'warning', message: `Low stock alert: Product #${data.productId}`, icon: '⚠️' });
    });

    socket.on('payment:confirmed', (data) => {
      addAlert({ type: 'success', message: `Payment confirmed for order #${data.orderId}`, icon: '💰' });
    });

    socket.on('system:alert', (msg) => {
      addAlert({ type: 'info', message: msg, icon: 'ℹ️' });
    });

    socket.on('disconnect', () => { connected.current = false; });

    return () => {
      socket?.disconnect();
      connected.current = false;
    };
  }, [user]);

  return socket;
}

export function getSocket() { return socket; }
