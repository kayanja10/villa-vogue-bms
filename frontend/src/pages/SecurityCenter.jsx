import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Shield, Users, Clock, LogOut, RefreshCw, Activity, Lock, Unlock, AlertTriangle, CheckCircle, Eye, Key } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import api, { users as usersApi } from '../lib/api';
import { useStore } from '../store/useStore';

const ROLE_COLORS = { admin: 'bg-red-100 text-red-700', manager: 'bg-amber-100 text-amber-700', staff: 'bg-blue-100 text-blue-700' };
const STATUS_CONFIG = {
  active: { label: 'Active', dot: 'bg-green-500', text: 'text-green-600' },
  warning: { label: 'Idle Warning', dot: 'bg-amber-500 animate-pulse', text: 'text-amber-600' },
  idle: { label: 'Idle', dot: 'bg-gray-400', text: 'text-gray-500' },
};

function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export default function SecurityCenter() {
  const qc = useQueryClient();
  const { user: currentUser } = useStore();
  const [tab, setTab] = useState('live');
  const [auditPage, setAuditPage] = useState(1);
  const [tick, setTick] = useState(0);

  // Live clock tick every second for duration updates
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const { data: sessions = [], isLoading: loadingSessions } = useQuery({
    queryKey: ['live-sessions'],
    queryFn: () => api.get('/sessions').then(r => r.data),
    refetchInterval: 10000, // refresh every 10 seconds
    enabled: tab === 'live',
  });

  const { data: auditData, isLoading: loadingAudit } = useQuery({
    queryKey: ['session-audit', auditPage],
    queryFn: () => api.get(`/sessions/audit?page=${auditPage}&limit=50`).then(r => r.data),
    enabled: tab === 'audit',
  });

  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersApi.list().then(r => r.data),
    enabled: tab === 'users',
  });

  const { data: config } = useQuery({
    queryKey: ['session-config'],
    queryFn: () => api.get('/sessions/config').then(r => r.data),
  });

  const forceLogout = useMutation({
    mutationFn: (sessionId) => api.post(`/sessions/${sessionId}/force-logout`),
    onSuccess: (_, sessionId) => {
      toast.success('User has been signed out');
      qc.invalidateQueries(['live-sessions']);
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Failed to sign out user'),
  });

  const unlockUser = useMutation({
    mutationFn: (id) => usersApi.unlock(id),
    onSuccess: () => { toast.success('User unlocked!'); qc.invalidateQueries(['users']); },
  });

  const tabs = [
    { id: 'live', label: 'Live Sessions', icon: Activity },
    { id: 'audit', label: 'Audit Log', icon: Eye },
    { id: 'users', label: 'User Security', icon: Users },
    { id: 'config', label: 'Timeout Config', icon: Clock },
  ];

  const reasonColor = (r) => ({
    login: 'badge-green', manual: 'badge-blue', timeout: 'badge-yellow', force_logout: 'badge-red'
  }[r] || 'badge-gray');

  const reasonLabel = (r) => ({
    login: '🔑 Login', manual: '👋 Manual Logout', timeout: '⏰ Session Timeout', force_logout: '🔒 Force Logout'
  }[r] || r);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2"><Shield size={22} className="text-[#C9A96E]"/><h1 className="text-2xl font-heading font-semibold">Security Center</h1></div>
          <p className="text-sm text-gray-500 ml-8">Session management and security monitoring</p>
        </div>
        {tab === 'live' && (
          <button onClick={() => qc.invalidateQueries(['live-sessions'])} className="btn-secondary text-sm">
            <RefreshCw size={15}/> Refresh
          </button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4 border-l-4 border-green-400">
          <p className="text-xs text-gray-500 mb-1">Active Sessions</p>
          <p className="text-3xl font-heading font-bold text-green-600">{sessions.filter(s => s.status === 'active').length}</p>
        </div>
        <div className="card p-4 border-l-4 border-amber-400">
          <p className="text-xs text-gray-500 mb-1">Idle / Warning</p>
          <p className="text-3xl font-heading font-bold text-amber-600">{sessions.filter(s => s.status === 'warning').length}</p>
        </div>
        <div className="card p-4 border-l-4 border-red-400">
          <p className="text-xs text-gray-500 mb-1">Locked Accounts</p>
          <p className="text-3xl font-heading font-bold text-red-600">{usersData?.filter(u => u.lockedUntil && new Date() < new Date(u.lockedUntil)).length || '—'}</p>
        </div>
        <div className="card p-4 border-l-4 border-[#C9A96E]">
          <p className="text-xs text-gray-500 mb-1">Total Users</p>
          <p className="text-3xl font-heading font-bold text-[#A8824A]">{usersData?.length || '—'}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-fit">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-white dark:bg-gray-900 shadow-sm text-[#A8824A]' : 'text-gray-500 hover:text-gray-700'}`}>
            <Icon size={15}/>{label}
          </button>
        ))}
      </div>

      {/* LIVE SESSIONS TAB */}
      {tab === 'live' && (
        <div className="card overflow-x-auto">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h3 className="font-heading font-semibold">Currently Logged In Users</h3>
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/> Live — updates every 10s
            </span>
          </div>
          {loadingSessions ? (
            <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[#C9A96E] border-t-transparent rounded-full animate-spin"/></div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Users size={48} className="mb-3 opacity-20"/>
              <p className="font-medium">No active sessions</p>
              <p className="text-sm">Users will appear here when they log in</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800/50">
                <tr>{['User','Role','Status','Login Time','Last Activity','Duration','Remaining','IP','Actions'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
              </thead>
              <tbody>
                {sessions.map(s => {
                  const status = STATUS_CONFIG[s.status] || STATUS_CONFIG.active;
                  const isMe = s.userId === currentUser?.id;
                  const durationMs = Date.now() - new Date(s.loginTime).getTime();
                  const idleMs = Date.now() - new Date(s.lastActivity).getTime();
                  const remaining = (s.timeoutMs || 3600000) - idleMs;
                  return (
                    <tr key={s.sessionId} className={`table-row ${isMe ? 'bg-[#C9A96E]/5' : ''}`}>
                      <td className="table-cell">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-[#C9A96E]/20 flex items-center justify-center text-[#A8824A] text-sm font-bold">{s.username[0].toUpperCase()}</div>
                          <div>
                            <p className="font-medium text-sm">{s.username}</p>
                            {isMe && <span className="text-[10px] text-[#C9A96E] font-medium">You</span>}
                          </div>
                        </div>
                      </td>
                      <td className="table-cell"><span className={`badge text-xs capitalize ${ROLE_COLORS[s.role]}`}>{s.role}</span></td>
                      <td className="table-cell">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2 h-2 rounded-full ${status.dot}`}/>
                          <span className={`text-xs font-medium ${status.text}`}>{status.label}</span>
                        </div>
                      </td>
                      <td className="table-cell text-xs text-gray-500">{format(new Date(s.loginTime), 'HH:mm:ss')}</td>
                      <td className="table-cell text-xs text-gray-500">{formatDistanceToNow(new Date(s.lastActivity), { addSuffix: true })}</td>
                      <td className="table-cell font-mono text-xs">{formatDuration(durationMs)}</td>
                      <td className="table-cell">
                        <span className={`text-xs font-mono font-semibold ${remaining < 60000 ? 'text-red-600' : remaining < 300000 ? 'text-amber-600' : 'text-green-600'}`}>
                          {remaining > 0 ? formatDuration(remaining) : 'Expired'}
                        </span>
                      </td>
                      <td className="table-cell text-xs text-gray-400 font-mono">{s.ip?.split(',')[0]?.trim().substring(0, 15) || '—'}</td>
                      <td className="table-cell">
                        {!isMe && (
                          <button
                            onClick={() => {
                              if (window.confirm(`Force sign out ${s.username}? They will be immediately logged out.`)) {
                                forceLogout.mutate(s.sessionId);
                              }
                            }}
                            disabled={forceLogout.isPending}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 text-xs font-medium transition-colors disabled:opacity-40"
                          >
                            <LogOut size={12}/> Sign Out
                          </button>
                        )}
                        {isMe && <span className="text-xs text-gray-400 italic">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* AUDIT LOG TAB */}
      {tab === 'audit' && (
        <div className="card overflow-x-auto">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-heading font-semibold">Session Audit Log</h3>
            <p className="text-xs text-gray-500 mt-0.5">Complete record of all logins, logouts, and security events</p>
          </div>
          {loadingAudit ? <div className="flex justify-center py-12"><div className="w-8 h-8 border-2 border-[#C9A96E] border-t-transparent rounded-full animate-spin"/></div> : (
            <>
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-800/50">
                  <tr>{['User','Role','Event','Login Time','Logout Time','Duration','IP','Forced By'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
                </thead>
                <tbody>
                  {auditData?.logs?.map(l => {
                    const duration = l.logoutTime ? Date.parse(l.logoutTime) - Date.parse(l.loginTime) : null;
                    return (
                      <tr key={l.id} className="table-row">
                        <td className="table-cell font-medium text-sm">{l.username}</td>
                        <td className="table-cell"><span className={`badge text-xs capitalize ${ROLE_COLORS[l.role]}`}>{l.role}</span></td>
                        <td className="table-cell"><span className={`badge text-xs ${reasonColor(l.reason)}`}>{reasonLabel(l.reason)}</span></td>
                        <td className="table-cell text-xs text-gray-500">{format(new Date(l.loginTime), 'MMM d, HH:mm:ss')}</td>
                        <td className="table-cell text-xs text-gray-500">{l.logoutTime ? format(new Date(l.logoutTime), 'MMM d, HH:mm:ss') : <span className="text-green-600">Active</span>}</td>
                        <td className="table-cell font-mono text-xs">{duration ? formatDuration(duration) : '—'}</td>
                        <td className="table-cell text-xs text-gray-400 font-mono">{l.ip?.split(',')[0]?.trim().substring(0, 15) || '—'}</td>
                        <td className="table-cell text-xs text-red-600">{l.forcedBy || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {!auditData?.logs?.length && <div className="py-12 text-center text-gray-400">No audit logs yet</div>}
              {auditData?.total > 50 && (
                <div className="flex justify-between p-4 border-t border-gray-100 dark:border-gray-800">
                  <span className="text-sm text-gray-500">{auditData.total} total events</span>
                  <div className="flex gap-2">
                    <button disabled={auditPage === 1} onClick={() => setAuditPage(p => p-1)} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">Prev</button>
                    <button disabled={auditData.logs.length < 50} onClick={() => setAuditPage(p => p+1)} className="btn-secondary py-1 px-3 text-xs disabled:opacity-40">Next</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* USER SECURITY TAB */}
      {tab === 'users' && (
        <div className="card overflow-x-auto">
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <h3 className="font-heading font-semibold">User Security Status</h3>
          </div>
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>{['User','Role','Status','Failed Attempts','Last Login','2FA','Actions'].map(h => <th key={h} className="table-header">{h}</th>)}</tr>
            </thead>
            <tbody>
              {usersData?.map(u => {
                const isLocked = u.lockedUntil && new Date() < new Date(u.lockedUntil);
                return (
                  <tr key={u.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#C9A96E]/20 flex items-center justify-center text-[#A8824A] text-sm font-bold">{u.username[0].toUpperCase()}</div>
                        <div>
                          <p className="font-medium text-sm">{u.username}</p>
                          <p className="text-xs text-gray-400">{u.email || '—'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell"><span className={`badge capitalize text-xs ${ROLE_COLORS[u.role]}`}>{u.role}</span></td>
                    <td className="table-cell">
                      {isLocked
                        ? <span className="flex items-center gap-1 badge-red text-xs w-fit"><Lock size={10}/> Locked until {format(new Date(u.lockedUntil), 'HH:mm')}</span>
                        : u.isActive
                        ? <span className="flex items-center gap-1 badge-green text-xs w-fit"><CheckCircle size={10}/> Active</span>
                        : <span className="badge-gray text-xs">Inactive</span>}
                    </td>
                    <td className="table-cell">
                      <span className={`text-sm font-bold ${u.loginAttempts >= 3 ? 'text-red-600' : u.loginAttempts > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{u.loginAttempts || 0}</span>
                    </td>
                    <td className="table-cell text-xs text-gray-400">{u.lastLogin ? formatDistanceToNow(new Date(u.lastLogin), { addSuffix: true }) : 'Never'}</td>
                    <td className="table-cell">
                      {u.role === 'admin'
                        ? <span className="badge-green text-xs flex items-center gap-1 w-fit"><Key size={10}/> Email OTP</span>
                        : <span className="badge-gray text-xs">Password</span>}
                    </td>
                    <td className="table-cell">
                      {isLocked && (
                        <button onClick={() => unlockUser.mutate(u.id)} className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-600 text-xs font-medium transition-colors">
                          <Unlock size={12}/> Unlock
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CONFIG TAB */}
      {tab === 'config' && (
        <div className="space-y-4">
          <div className="grid lg:grid-cols-3 gap-4">
            {[
              { role: 'Admin', timeout: 15, warning: 2, color: 'border-red-400', icon: '👑', desc: 'Full system access — tightest security' },
              { role: 'Manager', timeout: 30, warning: 5, color: 'border-amber-400', icon: '📊', desc: 'Reports and management features' },
              { role: 'Staff', timeout: 60, warning: 10, color: 'border-blue-400', icon: '🛍️', desc: 'POS and daily operations' },
            ].map(({ role, timeout, warning, color, icon, desc }) => (
              <div key={role} className={`card p-5 border-l-4 ${color}`}>
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-2xl">{icon}</span>
                  <h3 className="font-heading font-semibold text-lg">{role}</h3>
                </div>
                <p className="text-xs text-gray-500 mb-4">{desc}</p>
                <div className="space-y-3">
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Session Timeout</p>
                    <p className="text-2xl font-heading font-bold text-gray-900 dark:text-white">{timeout} min</p>
                    <p className="text-xs text-gray-400">Auto sign-out after {timeout} min idle</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3">
                    <p className="text-xs text-amber-600 mb-1">Warning Shown</p>
                    <p className="text-xl font-heading font-bold text-amber-600">{warning} min before</p>
                    <p className="text-xs text-amber-500">User can click to extend session</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card p-5">
            <h3 className="font-heading font-semibold mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500"/> Security Rules</h3>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              {[
                ['Account Lockout', 'Locked for 30 minutes after 5 failed login attempts'],
                ['Token Expiry', 'Access tokens expire every 15 minutes, refresh tokens last 7 days'],
                ['Admin 2FA', 'Email OTP required for admin login (re-enable in auth.js)'],
                ['Session Tracking', 'All logins/logouts recorded with IP address and timestamp'],
                ['Force Logout', 'Admins can remotely sign out any user instantly via socket'],
                ['Activity Tracking', 'Mouse, keyboard, click, scroll events reset the idle timer'],
              ].map(([title, desc]) => (
                <div key={title} className="flex gap-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                  <CheckCircle size={16} className="text-green-500 shrink-0 mt-0.5"/>
                  <div><p className="font-medium text-sm">{title}</p><p className="text-xs text-gray-500 mt-0.5">{desc}</p></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
