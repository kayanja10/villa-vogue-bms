import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useStore } from './store/useStore';
import { useSocket } from './hooks/useSocket';
import { useSessionTimeout } from './hooks/useSessionTimeout';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import POS from './pages/POS';
import Reports from './pages/Reports';
import CashBook from './pages/CashBook';
import Analytics from './pages/Analytics.jsx';
import {
  Orders, Inventory, Customers, Expenses, Staff,
  Suppliers, Layaway, CustomerDebts,
  Quotations, PurchaseOrders, StockCount, CashFloat,
  Discounts, Feedback, SecurityCenter, ActivityLog,
  UsersPage, SettingsPage,
} from './pages/index.jsx';
import CustomerPortal from './pages/customer/CustomerPortal';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 30000, refetchOnWindowFocus: false } },
});

function SocketInit() { useSocket(); return null; }

// Session timeout runs inside BrowserRouter so it has access to navigate/location
function SessionGuard() { useSessionTimeout(); return null; }

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
        <SocketInit />
        <SessionGuard />
        <Toaster position="top-right" toastOptions={{
          style: { fontFamily: 'DM Sans, sans-serif', fontSize: '14px', borderRadius: '10px', border: '1px solid #f0ebe0' },
          success: { iconTheme: { primary: '#C9A96E', secondary: '#fff' } },
          error:   { iconTheme: { primary: '#c0392b', secondary: '#fff' } },
          duration: 3500,
        }} />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/store/*" element={<CustomerPortal />} />
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
