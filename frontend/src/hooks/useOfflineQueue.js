import { useState, useEffect, useCallback } from 'react';
import { orders as ordersApi } from '../lib/api';
import toast from 'react-hot-toast';

const DB_NAME = 'villavogue_offline';
const STORE_NAME = 'pending_orders';
const DB_VERSION = 1;

// ── IndexedDB helpers ─────────────────────────────────────────────────────────
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'localId', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function savePendingOrder(orderData) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const record = {
      ...orderData,
      status: 'pending',
      savedAt: new Date().toISOString(),
      offlineOrderNumber: `OFF-${Date.now()}`,
    };
    const req = store.add(record);
    req.onsuccess = () => resolve({ ...record, localId: req.result });
    req.onerror = () => reject(req.error);
  });
}

async function getPendingOrders() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result.filter(o => o.status === 'pending'));
    req.onerror = () => reject(req.error);
  });
}

async function markOrderSynced(localId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const getReq = store.get(localId);
    getReq.onsuccess = () => {
      const record = getReq.result;
      if (record) {
        record.status = 'synced';
        record.syncedAt = new Date().toISOString();
        const putReq = store.put(record);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      } else {
        resolve();
      }
    };
    getReq.onerror = () => reject(getReq.error);
  });
}

async function deleteOrder(localId) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(localId);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useOfflineQueue() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('🌐 Back online! Syncing offline orders...', { duration: 3000 });
      syncPendingOrders();
    };
    const handleOffline = () => {
      setIsOnline(false);
      toast('📴 You are offline. Orders will be saved locally.', {
        icon: '⚠️', duration: 5000,
        style: { background: '#92400e', color: '#fff' },
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load pending count on mount
  useEffect(() => {
    refreshPendingCount();
  }, []);

  const refreshPendingCount = useCallback(async () => {
    try {
      const pending = await getPendingOrders();
      setPendingCount(pending.length);
    } catch (e) {
      console.error('Failed to get pending orders:', e);
    }
  }, []);

  // Save order offline
  const saveOffline = useCallback(async (orderData) => {
    try {
      const saved = await savePendingOrder(orderData);
      await refreshPendingCount();
      toast.success(`📦 Order saved offline (${saved.offlineOrderNumber}). Will sync when online.`, { duration: 4000 });
      return { success: true, offlineOrder: saved };
    } catch (e) {
      toast.error('Failed to save order offline');
      return { success: false };
    }
  }, [refreshPendingCount]);

  // Sync all pending orders to server
  const syncPendingOrders = useCallback(async () => {
    if (!navigator.onLine) return;
    setIsSyncing(true);
    try {
      const pending = await getPendingOrders();
      if (pending.length === 0) { setIsSyncing(false); return; }

      let synced = 0;
      let failed = 0;

      for (const order of pending) {
        try {
          const { localId, offlineOrderNumber, savedAt, status, ...orderData } = order;
          await ordersApi.create(orderData);
          await markOrderSynced(localId);
          synced++;
        } catch (e) {
          console.error('Failed to sync order:', e);
          failed++;
        }
      }

      await refreshPendingCount();

      if (synced > 0) toast.success(`✅ ${synced} offline order${synced > 1 ? 's' : ''} synced successfully!`, { duration: 4000 });
      if (failed > 0) toast.error(`⚠️ ${failed} order${failed > 1 ? 's' : ''} failed to sync. Will retry later.`);
    } catch (e) {
      console.error('Sync error:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [refreshPendingCount]);

  // Place order — online or offline
  const placeOrder = useCallback(async (orderData, onSuccess) => {
    if (navigator.onLine) {
      // Normal online flow — handled by caller
      return { mode: 'online' };
    } else {
      // Save offline
      const result = await saveOffline(orderData);
      if (result.success && onSuccess) {
        onSuccess(result.offlineOrder);
      }
      return { mode: 'offline', ...result };
    }
  }, [saveOffline]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    saveOffline,
    syncPendingOrders,
    placeOrder,
    refreshPendingCount,
  };
}
