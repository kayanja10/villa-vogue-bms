import React, { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store/useStore';
import { useSocket } from './hooks/useSocket';
import { useSessionManager } from './hooks/useSessionManager';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Reports from './pages/Reports';
import CashBook from './pages/CashBook';
import Analytics from './pages/Analytics.jsx';
import SecurityCenter from './pages/SecurityCenter.jsx';
import {
  Orders, Inventory, Customers, Expenses, Staff,
  Suppliers, Layaway, CustomerDebts,
  Quotations, PurchaseOrders, StockCount, CashFloat,
  Discounts, Feedback, ActivityLog,
  UsersPage, SettingsPage,
} from './pages/index.jsx';
import CustomerPortal from './pages/CustomerPortal';
import { customers, products as productsApi } from './lib/api';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000, refetchOnWindowFocus: false } },
});

// ─── Base URL — always use Render backend, never localhost ───────────────────
// VITE_API_URL env var can override (set in Vercel dashboard)
// Fallback is hardcoded Render URL so it works even without the env var
const BASE = import.meta.env.VITE_API_URL || 'https://villa-vogue-bms.onrender.com/api';

// ─── Customer Portal Wrapper ─────────────────────────────────────────────────
function CustomerPortalWrapper() {
  const navigate = useNavigate();

  const [portalUser,     setPortalUser]     = useState(() => {
    try { return JSON.parse(localStorage.getItem('vv_portal_user') || 'null'); } catch { return null; }
  });
  const [portalProducts, setPortalProducts] = useState([]);
  const [portalOrders,   setPortalOrders]   = useState([]);
  const [loading,        setLoading]        = useState(true);

  // ── Fetch products on mount ─────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const fetchProducts = async () => {
      setLoading(true);
      try {
        // Attempt 1: axios via api.js (uses correct BASE URL with Render fallback)
        let res = await productsApi.listPublic({ limit: 100 });
        let items = res.data?.products || res.data?.data || res.data || [];

        // Attempt 2: fall back to general authenticated list if public is empty
        if (!items.length) {
          res = await productsApi.list({ limit: 100 });
          items = res.data?.products || res.data?.data || res.data || [];
        }
        if (!cancelled) setPortalProducts(Array.isArray(items) ? items : []);
      } catch {
        // Attempt 3: raw fetch — MUST use /products/public (no auth required)
        // BUG FIX: was incorrectly hitting /products which requires JWT auth
        try {
          const r = await fetch(`${BASE}/products/public?limit=100`);
          const d = await r.json();
          if (!cancelled) setPortalProducts(d?.products || d?.data || (Array.isArray(d) ? d : []));
        } catch {
          if (!cancelled) setPortalProducts([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchProducts();
    return () => { cancelled = true; };
  }, []);

  // ── Fetch orders when customer is logged in ─────────────────────────────────
  useEffect(() => {
    if (!portalUser?.id) return;
    const token = localStorage.getItem('vv_portal_token');
    if (!token) return;
    fetch(`${BASE}/orders?customerId=${portalUser.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setPortalOrders(d?.orders || d?.data || (Array.isArray(d) ? d : [])))
      .catch(() => setPortalOrders([]));
  }, [portalUser]);

  // ── Customer login ──────────────────────────────────────────────────────────
  const handleLogin = useCallback(async (creds) => {
    if (creds.isStaff) { navigate('/login'); return; }
    const res  = await customers.portalLogin({ email: creds.email, password: creds.password });
    const data = res.data;
    const token    = data.accessToken || data.token || '';
    const userData = data.customer    || data.user  || data;
    localStorage.setItem('vv_portal_token', token);
    localStorage.setItem('vv_portal_user',  JSON.stringify(userData));
    setPortalUser(userData);
  }, [navigate]);

  // ── Customer logout ─────────────────────────────────────────────────────────
  const handleLogout = useCallback(() => {
    localStorage.removeItem('vv_portal_token');
    localStorage.removeItem('vv_portal_user');
    setPortalUser(null);
    setPortalOrders([]);
  }, []);

  return (
    <CustomerPortal
      user={portalUser}
      products={portalProducts}
      orders={portalOrders}
      loading={loading}
      onLogin={handleLogin}
      onLogout={handleLogout}
      onStaffLogin={() => navigate('/login')}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
function SessionInit() {
  useSocket();
  useSessionManager();
  return null;
}

function Guard({ children, admin, manager }) {
  const { user } = useStore();
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== 'admin') return <Navigate to="/" replace />;
  if (manager && !['admin', 'manager'].includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { darkMode } = useStore();
  useEffect(() => { document.documentElement.classList.toggle('dark', darkMode); }, [darkMode]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <SessionInit />
        <Toaster position="top-right" toastOptions={{
          style: { fontFamily: 'DM Sans, sans-serif', fontSize: '14px', borderRadius: '10px', border: '1px solid #f0ebe0' },
          success: { iconTheme: { primary: '#C9A96E', secondary: '#fff' } },
          error: { iconTheme: { primary: '#c0392b', secondary: '#fff' } },
          duration: 4000,
        }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/store/*" element={<CustomerPortalWrapper />} />
          <Route path="/" element={<Guard><Layout /></Guard>}>
            <Route index element={<Dashboard />} />
            <Route path="pos" element={<POS />} />
            <Route path="orders" element={<Orders />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="customers" element={<Customers />} />
            <Route path="layaway" element={<Layaway />} />
            <Route path="debts" element={<Guard manager><CustomerDebts /></Guard>} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="cashbook" element={<Guard manager><CashBook /></Guard>} />
            <Route path="quotations" element={<Guard manager><Quotations /></Guard>} />
            <Route path="purchase-orders" element={<Guard manager><PurchaseOrders /></Guard>} />
            <Route path="stock-count" element={<Guard manager><StockCount /></Guard>} />
            <Route path="cash-float" element={<Guard manager><CashFloat /></Guard>} />
            <Route path="discounts" element={<Guard manager><Discounts /></Guard>} />
            <Route path="suppliers" element={<Guard manager><Suppliers /></Guard>} />
            <Route path="staff" element={<Staff />} />
            <Route path="reports" element={<Guard manager><Reports /></Guard>} />
            <Route path="analytics" element={<Guard manager><Analytics /></Guard>} />
            <Route path="feedback" element={<Guard manager><Feedback /></Guard>} />
            <Route path="activity" element={<Guard admin><ActivityLog /></Guard>} />
            <Route path="security" element={<Guard admin><SecurityCenter /></Guard>} />
            <Route path="users" element={<Guard admin><UsersPage /></Guard>} />
            <Route path="settings" element={<Guard admin><SettingsPage /></Guard>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
