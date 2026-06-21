import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useQuery } from '@tanstack/react-query';
import { analytics } from '../../lib/api';
import {
  LayoutDashboard, ShoppingCart, Package, Users, BarChart3, Receipt,
  Truck, DollarSign, FileText, Settings, LogOut, ChevronLeft, ChevronRight,
  Moon, Sun, Bell, UserCircle, TrendingUp, Layers, AlertTriangle,
  ClipboardList, BookOpen, Tag, Shield, Activity, MessageSquare, Wallet,
  Menu, Sparkles, BookMarked, X
} from 'lucide-react';

const NAV = [
  { label: 'Main', items: [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', exact: true, color: '#C9A96E' },
    { to: '/dashboard/pos', icon: ShoppingCart, label: 'Point of Sale', color: '#2E9E5B' },
    { to: '/dashboard/orders', icon: Receipt, label: 'Orders', color: '#3B82F6' },
    { to: '/dashboard/inventory', icon: Package, label: 'Inventory', color: '#F97316' },
    { to: '/dashboard/customers', icon: Users, label: 'Customers', color: '#8B5CF6' },
  ]},
  { label: 'Finance', items: [
    { to: '/dashboard/expenses', icon: DollarSign, label: 'Expenses', color: '#EF4444' },
    { to: '/dashboard/cash-float', icon: Wallet, label: 'Cash Float', roles: ['admin','manager'], color: '#10B981' },
    { to: '/dashboard/cashbook', icon: BookMarked, label: 'Cash Book', roles: ['admin','manager'], color: '#0EA5E9' },
    { to: '/dashboard/layaway', icon: Layers, label: 'Layaway', color: '#A855F7' },
    { to: '/dashboard/debts', icon: AlertTriangle, label: 'Customer Debts', roles: ['admin','manager'], color: '#F59E0B' },
  ]},
  { label: 'Procurement', items: [
    { to: '/dashboard/suppliers', icon: Truck, label: 'Suppliers', roles: ['admin','manager'], color: '#06B6D4' },
    { to: '/dashboard/purchase-orders', icon: ClipboardList, label: 'Purchase Orders', roles: ['admin','manager'], color: '#6366F1' },
    { to: '/dashboard/stock-count', icon: BookOpen, label: 'Stock Count', roles: ['admin','manager'], color: '#84CC16' },
  ]},
  { label: 'Commerce', items: [
    { to: '/dashboard/quotations', icon: FileText, label: 'Quotations', roles: ['admin','manager'], color: '#EC4899' },
    { to: '/dashboard/discounts', icon: Tag, label: 'Discounts', roles: ['admin','manager'], color: '#F43F5E' },
  ]},
  { label: 'Intelligence', items: [
    { to: '/dashboard/reports', icon: BarChart3, label: 'Reports', roles: ['admin','manager'], color: '#0284C7' },
    { to: '/dashboard/analytics', icon: TrendingUp, label: 'Analytics', roles: ['admin','manager'], color: '#7C3AED' },
    { to: '/dashboard/feedback', icon: MessageSquare, label: 'Feedback', roles: ['admin','manager'], color: '#14B8A6' },
  ]},
  { label: 'Team', items: [
    { to: '/dashboard/staff', icon: UserCircle, label: 'Staff', color: '#D97706' },
    { to: '/dashboard/users', icon: Shield, label: 'User Mgmt', roles: ['admin'], color: '#475569' },
  ]},
  { label: 'System', items: [
    { to: '/dashboard/activity', icon: Activity, label: 'Activity Log', roles: ['admin'], color: '#DB2777' },
    { to: '/dashboard/security', icon: Shield, label: 'Security', roles: ['admin'], color: '#DC2626' },
    { to: '/dashboard/settings', icon: Settings, label: 'Settings', roles: ['admin'], color: '#64748B' },
  ]},
];

export default function Layout() {
  const { user, logout, darkMode, toggleDark, sidebarOpen, toggleSidebar } = useStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: dash } = useQuery({ queryKey: ['dashboard-mini'], queryFn: () => analytics.dashboard().then(r => r.data), staleTime: 60000 });

  const handleLogout = () => { logout(); navigate('/login'); };
  const roleOk = (roles) => !roles || roles.includes(user?.role);

  const Sidebar = ({ collapsed }) => (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Brand */}
      <div className={`flex items-center gap-3 px-4 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0 ${collapsed ? 'justify-center' : ''}`}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#C9A96E] to-[#A8824A] flex items-center justify-center shrink-0 overflow-hidden shadow-gold">
          <img src="/logo.png" alt="VV" className="w-full h-full object-cover" onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }} />
          <span className="hidden text-white font-bold text-sm items-center justify-center w-full h-full">V</span>
        </div>
        {!collapsed && (
          <div>
            <p className="font-heading font-semibold text-gray-900 dark:text-white text-sm leading-tight">Villa Vogue</p>
            <p className="text-[10px] text-[#C9A96E] tracking-wide">Fashions BMS v2.1</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-4">
        {NAV.map(group => {
          const visible = group.items.filter(i => roleOk(i.roles));
          if (!visible.length) return null;
          return (
            <div key={group.label}>
              {!collapsed && <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest mb-1 px-2">{group.label}</p>}
              <div className="space-y-0.5">
                {visible.map(({ to, icon: Icon, label, exact, color }) => (
                  <NavLink key={to} to={to} end={exact} onClick={() => setMobileOpen(false)}
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${isActive ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'} ${collapsed ? 'justify-center' : ''}`}
                    style={({ isActive }) => isActive ? { background: `${color}1A` } : undefined}
                    title={collapsed ? label : undefined}>
                    {({ isActive }) => (
                      <>
                        <div className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-colors" style={{ background: isActive ? `${color}26` : `${color}14` }}>
                          <Icon size={15} style={{ color }} />
                        </div>
                        {!collapsed && <span className="truncate">{label}</span>}
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-2 border-t border-gray-100 dark:border-gray-800 shrink-0">
        {!collapsed && (
          <div className="flex items-center gap-2 px-2 py-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C9A96E] to-[#A8824A] flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">{user?.username?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{user?.username}</p>
              <p className="text-[10px] text-[#C9A96E] capitalize">{user?.role}</p>
            </div>
          </div>
        )}
        <button onClick={handleLogout} className={`flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${collapsed ? 'justify-center' : ''}`}>
          <LogOut size={15} />{!collapsed && 'Sign Out'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Desktop sidebar */}
      <aside className={`hidden lg:flex flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 transition-all duration-300 shrink-0 ${sidebarOpen ? 'w-56' : 'w-14'}`}>
        <Sidebar collapsed={!sidebarOpen} />
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-64 bg-white dark:bg-gray-900 h-full z-10"><Sidebar collapsed={false} /></aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-12 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between px-3 shrink-0">
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"><Menu size={18}/></button>
            <button onClick={toggleSidebar} className="hidden lg:flex p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
              {sidebarOpen ? <ChevronLeft size={16}/> : <ChevronRight size={16}/>}
            </button>
          </div>

          {dash && (
            <div className="hidden md:flex items-center gap-4 text-sm">
              <span className="text-gray-500 text-xs">Today:</span>
              <span className="font-semibold text-gray-900 dark:text-white text-sm">UGX {Number(dash.today?.sales||0).toLocaleString()}</span>
              <span className="text-gray-300">·</span>
              <span className="text-gray-500 text-xs">{dash.today?.orders||0} orders</span>
              {dash.inventory?.lowStockCount > 0 && (
                <NavLink to="/dashboard/inventory" className="flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                  <AlertTriangle size={11}/> {dash.inventory.lowStockCount} low stock
                </NavLink>
              )}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            <a href="/" target="_blank" rel="noopener noreferrer" className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-gray-500 hover:text-[#A8824A] hover:bg-[#C9A96E]/10 transition-colors" title="View public store in new tab">
              <Sparkles size={13}/> Visit Store
            </a>
            <button onClick={toggleDark} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500">
              {darkMode ? <Sun size={16}/> : <Moon size={16}/>}
            </button>
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C9A96E] to-[#A8824A] flex items-center justify-center">
              <span className="text-white text-xs font-bold">{user?.username?.[0]?.toUpperCase()}</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-5"><Outlet /></main>
      </div>
    </div>
  );
}
