import { useState, useEffect, useCallback, useRef } from 'react';
import { Link, NavLink, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authApi, userApi, downloadApi, ordersApi, manualPaymentApi, ApiError } from '../lib/api';
import { useFormState } from '../hooks/useFormState';

// ── Shared helpers ─────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateTime(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtBytes(b) {
  if (!b) return '—';
  const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(k));
  return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
}
function timeLeft(expiresAt) {
  const diff = new Date(expiresAt) - Date.now();
  if (diff <= 0) return 'Expired';
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
}

// ── Shared UI atoms ────────────────────────────────────────────────────────────

function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  return <div className={`${s} border-2 border-cyan-500 border-t-transparent rounded-full animate-spin`} />;
}

function EmptyState({ icon, title, desc, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center text-gray-600 mb-4">{icon}</div>
      <p className="text-white font-semibold mb-1">{title}</p>
      <p className="text-gray-500 text-sm mb-4">{desc}</p>
      {action}
    </div>
  );
}

function RoleBadge({ role }) {
  const s = { admin: 'bg-red-500/10 text-red-400 border-red-500/20', seller: 'bg-purple-500/10 text-purple-400 border-purple-500/20', buyer: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${s[role] || s.buyer}`}>{role}</span>;
}

function OrderStatusBadge({ status }) {
  const m = {
    completed:      'bg-green-500/10 text-green-400 border-green-500/20',
    pending:        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    refunded:       'bg-red-500/10 text-red-400 border-red-500/20',
    expired:        'bg-gray-500/10 text-gray-400 border-gray-500/20',
    partial_refund: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${m[status] || m.pending}`}>{status?.replace('_', ' ')}</span>;
}

function TokenStatusBadge({ status }) {
  const m = {
    active:    'bg-green-500/10 text-green-400 border-green-500/20',
    expired:   'bg-gray-500/10 text-gray-400 border-gray-500/20',
    exhausted: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    revoked:   'bg-red-500/10 text-red-400 border-red-500/20',
  };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${m[status] || m.expired}`}>{status}</span>;
}

// ── Dashboard Layout ───────────────────────────────────────────────────────────

const NAV = [
  { to: '/dashboard',          end: true, label: 'Overview',    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg> },
  { to: '/dashboard/projects',  label: 'My Projects',  icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg> },
  { to: '/dashboard/downloads', label: 'Downloads',    icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> },
  { to: '/dashboard/payments',  label: 'Payments',     icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg> },
  { to: '/dashboard/profile',   label: 'Profile',      icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> },
];

export function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/', { replace: true });
  }

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const navLinkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
        : 'text-gray-400 hover:text-white hover:bg-gray-800'
    }`;

  const sidebar = (
    <div className="flex flex-col h-full">
      <div className="px-4 py-5 border-b border-gray-800">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
          </div>
          <span className="text-white font-bold text-base">Nago<span className="text-cyan-400">Web</span></span>
        </Link>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV.map(({ to, end, label, icon }) => (
          <NavLink key={to} to={to} end={end} className={navLinkClass} onClick={() => setSidebarOpen(false)}>
            {icon}{label}
          </NavLink>
        ))}
      </nav>

      <div className="px-3 py-4 border-t border-gray-800 space-y-1">
        {user?.role === 'admin' && (
          <Link to="/admin" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-red-400 hover:bg-red-500/5 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Admin Panel
          </Link>
        )}
        <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Sign out
        </button>
        <div className="flex items-center gap-2 px-3 pt-2">
          <div className="w-7 h-7 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 overflow-hidden">
            {user?.avatar_url
              ? <img src={`${BASE_URL}${user.avatar_url}`} alt="" className="w-full h-full object-cover" />
              : initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-medium truncate">{user?.name}</p>
            <p className="text-gray-500 text-xs truncate">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 flex">
      <aside className="hidden lg:flex flex-col w-56 bg-gray-900 border-r border-gray-800 fixed inset-y-0 left-0 z-30">
        {sidebar}
      </aside>

      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-gray-950/80" onClick={() => setSidebarOpen(false)} />
          <aside className="relative flex flex-col w-56 bg-gray-900 border-r border-gray-800 z-50">{sidebar}</aside>
        </div>
      )}

      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        <header className="sticky top-0 z-20 bg-gray-900/80 backdrop-blur border-b border-gray-800 h-14 flex items-center px-4 gap-3">
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="text-gray-400 text-sm hidden sm:block">My Dashboard</span>
          <div className="ml-auto"><RoleBadge role={user?.role} /></div>
        </header>
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

// ── Overview ───────────────────────────────────────────────────────────────────

export function DashboardOverview() {
  const { user } = useAuth();
  const [orders,  setOrders]  = useState([]);
  const [tokens,  setTokens]  = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      ordersApi.listOrders(),
      downloadApi.listMyTokens(),
      downloadApi.getHistory(),
    ]).then(([o, t, h]) => {
      setOrders(o.data || []);
      setTokens(t.data || []);
      setHistory(h.data || []);
    }).finally(() => setLoading(false));
  }, []);

  const completedOrders = orders.filter((o) => o.status === 'completed');
  const pendingOrders   = orders.filter((o) => o.status === 'pending');
  const activeTokens    = tokens.filter((t) => t.key_status === 'active');
  const totalDownloads  = history.filter((h) => h.status === 'success').length;

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-8">
      {/* Welcome banner */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl shrink-0 overflow-hidden">
          {user?.avatar_url
            ? <img src={`${BASE_URL}${user.avatar_url}`} alt="" className="w-full h-full object-cover" />
            : initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-white font-bold text-xl">Welcome back, {user?.name?.split(' ')[0] || 'there'}!</h1>
            <RoleBadge role={user?.role} />
          </div>
          <p className="text-gray-400 text-sm">{user?.email} · Member since {fmtDate(user?.created_at)}</p>
        </div>
        <Link to="/dashboard/profile" className="shrink-0 text-sm text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 px-4 py-2 rounded-xl transition-colors">
          Edit Profile
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Purchases',      value: completedOrders.length, color: 'cyan',   icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
          { label: 'Downloads',      value: totalDownloads,         color: 'green',  icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> },
          { label: 'Active Tokens',  value: activeTokens.length,    color: 'purple', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg> },
          { label: 'Pending Orders', value: pendingOrders.length,   color: 'yellow', icon: <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
        ].map(({ label, value, color, icon }) => {
          const c = { cyan: 'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400', green: 'from-green-500/10 to-green-500/5 border-green-500/20 text-green-400', purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-400', yellow: 'from-yellow-500/10 to-yellow-500/5 border-yellow-500/20 text-yellow-400' }[color];
          return (
            <div key={label} className={`bg-gradient-to-b ${c} border rounded-2xl p-5`}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-400 text-sm">{label}</span>
                <div className={`w-8 h-8 rounded-lg bg-gray-900/60 flex items-center justify-center ${c.split(' ').pop()}`}>{icon}</div>
              </div>
              <div className="text-2xl font-bold text-white">{value}</div>
            </div>
          );
        })}
      </div>

      {/* Recent orders + recent downloads */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm">Recent Orders</h2>
            <Link to="/dashboard/payments" className="text-xs text-cyan-400 hover:text-cyan-300">View all</Link>
          </div>
          {completedOrders.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-6">No purchases yet</p>
          ) : (
            <div className="space-y-3">
              {completedOrders.slice(0, 4).map((o) => (
                <div key={o.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-mono">{o.id.slice(0, 8)}…</p>
                    <p className="text-gray-500 text-xs">{fmtDate(o.completed_at || o.created_at)} · {o.item_count} item{o.item_count !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold text-sm">${o.total_amount}</p>
                    <OrderStatusBadge status={o.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm">Recent Downloads</h2>
            <Link to="/dashboard/downloads" className="text-xs text-cyan-400 hover:text-cyan-300">View all</Link>
          </div>
          {history.length === 0 ? (
            <p className="text-gray-600 text-sm text-center py-6">No downloads yet</p>
          ) : (
            <div className="space-y-3">
              {history.slice(0, 4).map((h) => (
                <div key={h.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{h.project_title}</p>
                    <p className="text-gray-500 text-xs">{fmtDateTime(h.downloaded_at)}</p>
                  </div>
                  <span className={`text-xs font-medium ${h.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                    {h.status === 'success' ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <h2 className="text-white font-semibold text-sm mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Browse Projects', to: '/#projects',           icon: '🔍' },
            { label: 'My Projects',     to: '/dashboard/projects',  icon: '📦' },
            { label: 'Downloads',       to: '/dashboard/downloads', icon: '⬇️' },
            { label: 'Edit Profile',    to: '/dashboard/profile',   icon: '👤' },
          ].map(({ label, to, icon }) => (
            <Link key={label} to={to} className="flex flex-col items-center gap-2 p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors text-center">
              <span className="text-2xl">{icon}</span>
              <span className="text-white text-xs font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── My Projects ────────────────────────────────────────────────────────────────

export function DashboardProjects() {
  const [orders,  setOrders]  = useState([]);
  const [tokens,  setTokens]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState({});
  const [tokenMap, setTokenMap] = useState({}); // projectId → rawToken

  useEffect(() => {
    Promise.all([ordersApi.listOrders(), downloadApi.listMyTokens()])
      .then(([o, t]) => {
        setOrders(o.data || []);
        // Build a map of projectId → best active token
        const map = {};
        (t.data || []).forEach((tk) => {
          if (tk.key_status === 'active') {
            if (!map[tk.project_id]) map[tk.project_id] = tk;
          }
        });
        setTokens(t.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  // Collect unique purchased projects from completed orders
  const purchasedProjects = [];
  const seen = new Set();
  orders
    .filter((o) => o.status === 'completed' && o.items)
    .forEach((o) => {
      (o.items || []).forEach((item) => {
        if (!seen.has(item.project_id)) {
          seen.add(item.project_id);
          purchasedProjects.push({ ...item, order_id: o.id, completed_at: o.completed_at });
        }
      });
    });

  // Active token per project
  const activeTokenByProject = {};
  tokens.filter((t) => t.key_status === 'active').forEach((t) => {
    if (!activeTokenByProject[t.project_id]) activeTokenByProject[t.project_id] = t;
  });

  async function handleRequestToken(projectId) {
    setRequesting((p) => ({ ...p, [projectId]: true }));
    try {
      const res = await downloadApi.requestToken(projectId);
      setTokenMap((p) => ({ ...p, [projectId]: res.data.token }));
    } catch (e) {
      alert(e.message);
    } finally {
      setRequesting((p) => ({ ...p, [projectId]: false }));
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">My Projects</h1>
        <p className="text-gray-500 text-sm mt-1">{purchasedProjects.length} purchased project{purchasedProjects.length !== 1 ? 's' : ''}</p>
      </div>

      {purchasedProjects.length === 0 ? (
        <EmptyState
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>}
          title="No projects yet"
          desc="Purchase a network design project to see it here."
          action={<Link to="/#projects" className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold px-5 py-2 rounded-xl text-sm transition-colors">Browse Projects</Link>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {purchasedProjects.map((p) => {
            const activeToken = activeTokenByProject[p.project_id];
            const rawToken    = tokenMap[p.project_id];
            const isRequesting = requesting[p.project_id];

            return (
              <div key={p.project_id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-cyan-500/30 transition-colors">
                {/* Preview */}
                <div className="h-36 bg-gray-800 relative overflow-hidden">
                  {p.preview_image_path ? (
                    <img
                      src={`${BASE_URL}/uploads/projects/previews/${p.preview_image_path.split('/').pop()}`}
                      alt={p.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <div className="w-12 h-12 bg-gray-700 rounded-xl flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                        </svg>
                      </div>
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className="bg-green-500/90 text-white text-xs font-semibold px-2 py-0.5 rounded-full">Purchased</span>
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2">{p.title}</h3>
                    <p className="text-gray-500 text-xs mt-0.5">{p.vendor} · Purchased {fmtDate(p.completed_at)}</p>
                  </div>

                  {/* Token status */}
                  {activeToken && !rawToken && (
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-3 py-2 text-xs text-green-400">
                      Active token · {activeToken.use_count}/{activeToken.max_uses} uses · {timeLeft(activeToken.expires_at)}
                    </div>
                  )}

                  {/* Download link revealed */}
                  {rawToken && (
                    <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-3 py-2 space-y-2">
                      <p className="text-xs text-cyan-400 font-medium">Download link ready — expires in 24h, max 3 uses</p>
                      <a
                        href={downloadApi.fileUrl(rawToken)}
                        className="flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold text-xs py-2 rounded-lg transition-colors"
                        download
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download File
                      </a>
                    </div>
                  )}

                  {/* Request token button */}
                  {!rawToken && (
                    <button
                      onClick={() => handleRequestToken(p.project_id)}
                      disabled={isRequesting}
                      className="w-full flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 hover:text-white text-xs font-medium py-2.5 rounded-xl transition-colors"
                    >
                      {isRequesting ? (
                        <><Spinner size="sm" /> Generating link…</>
                      ) : (
                        <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>Get Download Link</>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Downloads ──────────────────────────────────────────────────────────────────

export function DashboardDownloads() {
  const [tokens,  setTokens]  = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('tokens'); // 'tokens' | 'history'
  const [revoking, setRevoking] = useState({});
  const [tokenMap, setTokenMap] = useState({}); // tokenId → rawToken (for re-download)
  const [requesting, setRequesting] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [t, h] = await Promise.all([downloadApi.listMyTokens(), downloadApi.getHistory()]);
      setTokens(t.data || []);
      setHistory(h.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleRevoke(tokenId) {
    if (!confirm('Revoke this download link? It cannot be undone.')) return;
    setRevoking((p) => ({ ...p, [tokenId]: true }));
    try {
      await downloadApi.revokeToken(tokenId);
      setTokens((prev) => prev.map((t) => t.id === tokenId ? { ...t, key_status: 'revoked' } : t));
    } catch (e) { alert(e.message); }
    finally { setRevoking((p) => ({ ...p, [tokenId]: false })); }
  }

  async function handleReRequest(projectId) {
    setRequesting((p) => ({ ...p, [projectId]: true }));
    try {
      const res = await downloadApi.requestToken(projectId);
      setTokenMap((p) => ({ ...p, [projectId]: res.data.token }));
      await load();
    } catch (e) { alert(e.message); }
    finally { setRequesting((p) => ({ ...p, [projectId]: false })); }
  }

  const activeTokens   = tokens.filter((t) => t.key_status === 'active');
  const inactiveTokens = tokens.filter((t) => t.key_status !== 'active');

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Downloads</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your secure download links and view history</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 w-fit">
        {[
          { key: 'tokens',  label: `Active Links (${activeTokens.length})` },
          { key: 'history', label: `History (${history.length})` },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key ? 'bg-cyan-500 text-gray-950' : 'text-gray-400 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'tokens' && (
        <div className="space-y-4">
          {/* Active tokens */}
          {activeTokens.length === 0 && inactiveTokens.length === 0 ? (
            <EmptyState
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" /></svg>}
              title="No download links"
              desc="Go to My Projects to generate a secure download link."
              action={<Link to="/dashboard/projects" className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold px-5 py-2 rounded-xl text-sm transition-colors">My Projects</Link>}
            />
          ) : (
            <>
              {activeTokens.length > 0 && (
                <div>
                  <p className="text-gray-400 text-xs font-medium uppercase tracking-wide mb-3">Active Links</p>
                  <div className="space-y-3">
                    {activeTokens.map((t) => {
                      const raw = tokenMap[t.project_id];
                      return (
                        <div key={t.id} className="bg-gray-900 border border-green-500/20 rounded-2xl p-4">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium text-sm truncate">{t.project_title}</p>
                              <p className="text-gray-500 text-xs">{t.project_vendor}</p>
                            </div>
                            <TokenStatusBadge status={t.key_status} />
                          </div>

                          {/* Progress bar for uses */}
                          <div className="mb-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-500">{t.use_count} of {t.max_uses} uses</span>
                              <span className="text-yellow-400 font-medium">{timeLeft(t.expires_at)}</span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-1.5">
                              <div
                                className="bg-cyan-500 h-1.5 rounded-full transition-all"
                                style={{ width: `${(t.use_count / t.max_uses) * 100}%` }}
                              />
                            </div>
                          </div>

                          <div className="flex gap-2">
                            {raw ? (
                              <a
                                href={downloadApi.fileUrl(raw)}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold text-xs py-2 rounded-lg transition-colors"
                                download
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Download
                              </a>
                            ) : (
                              <button
                                onClick={() => handleReRequest(t.project_id)}
                                disabled={requesting[t.project_id]}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium py-2 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {requesting[t.project_id] ? <Spinner size="sm" /> : 'Get Link'}
                              </button>
                            )}
                            <button
                              onClick={() => handleRevoke(t.id)}
                              disabled={revoking[t.id]}
                              className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs rounded-lg transition-colors disabled:opacity-50"
                            >
                              {revoking[t.id] ? '…' : 'Revoke'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {inactiveTokens.length > 0 && (
                <div>
                  <p className="text-gray-600 text-xs font-medium uppercase tracking-wide mb-3">Expired / Used</p>
                  <div className="space-y-2">
                    {inactiveTokens.map((t) => (
                      <div key={t.id} className="bg-gray-900/50 border border-gray-800 rounded-xl px-4 py-3 flex items-center justify-between gap-3 opacity-60">
                        <div className="min-w-0">
                          <p className="text-gray-300 text-sm truncate">{t.project_title}</p>
                          <p className="text-gray-600 text-xs">{fmtDate(t.created_at)} · {t.use_count}/{t.max_uses} uses</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <TokenStatusBadge status={t.key_status} />
                          {t.key_status !== 'revoked' && (
                            <button
                              onClick={() => handleReRequest(t.project_id)}
                              disabled={requesting[t.project_id]}
                              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
                            >
                              {requesting[t.project_id] ? '…' : 'New link'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {tab === 'history' && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          {history.length === 0 ? (
            <EmptyState
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>}
              title="No download history"
              desc="Your file downloads will appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-gray-800">
                    <th className="text-left px-4 py-3 font-medium">Project</th>
                    <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Size</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {history.map((h) => (
                    <tr key={h.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white font-medium truncate max-w-[180px]">{h.project_title}</p>
                        <p className="text-gray-500 text-xs">{h.vendor}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-gray-400 text-xs">{fmtBytes(h.bytes_sent)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs font-medium ${h.status === 'success' ? 'text-green-400' : 'text-red-400'}`}>
                          {h.status === 'success' ? '✓ Success' : '✗ Failed'}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-xs">{fmtDateTime(h.downloaded_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Payments ───────────────────────────────────────────────────────────────────

export function DashboardPayments() {
  const [orders,  setOrders]  = useState([]);
  const [proofs,  setProofs]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // orderId for detail modal
  const [orderDetail, setOrderDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    Promise.all([ordersApi.listOrders(), manualPaymentApi.listMyProofs()])
      .then(([o, p]) => {
        setOrders(o.data || []);
        setProofs(p.data || []);
      })
      .finally(() => setLoading(false));
  }, []);

  async function openDetail(orderId) {
    setSelected(orderId);
    setDetailLoading(true);
    try {
      const res = await ordersApi.getOrder(orderId);
      setOrderDetail(res.data);
    } catch (e) { alert(e.message); }
    finally { setDetailLoading(false); }
  }

  // Build proof map by order_id
  const proofByOrder = {};
  proofs.forEach((p) => { proofByOrder[p.order_id] = p; });

  const totalSpent = orders
    .filter((o) => o.status === 'completed')
    .reduce((s, o) => s + parseFloat(o.total_amount), 0);

  if (loading) return <div className="flex justify-center py-20"><Spinner /></div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Payments</h1>
          <p className="text-gray-500 text-sm mt-1">{orders.length} order{orders.length !== 1 ? 's' : ''} · ${totalSpent.toFixed(2)} total spent</p>
        </div>
        <Link
          to="/pay"
          className="flex items-center gap-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Pay via Telebirr / CBE
        </Link>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>}
          title="No orders yet"
          desc="Your purchase history will appear here."
          action={<Link to="/#projects" className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold px-5 py-2 rounded-xl text-sm transition-colors">Browse Projects</Link>}
        />
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="text-left px-4 py-3 font-medium">Order</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Items</th>
                  <th className="text-left px-4 py-3 font-medium">Amount</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Payment</th>
                  <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {orders.map((o) => {
                  const proof = proofByOrder[o.id];
                  return (
                    <tr key={o.id} className="hover:bg-gray-800/40 transition-colors">
                      <td className="px-4 py-3">
                        <p className="text-white font-mono text-xs">{o.id.slice(0, 8)}…</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell text-gray-400">{o.item_count}</td>
                      <td className="px-4 py-3 text-white font-semibold">${o.total_amount}</td>
                      <td className="px-4 py-3"><OrderStatusBadge status={o.status} /></td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        {proof ? (
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs text-gray-400 capitalize">{proof.payment_method?.replace('_', ' ')}</span>
                            <span className={`text-xs font-medium ${proof.status === 'approved' ? 'text-green-400' : proof.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}`}>
                              · {proof.status}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-600 text-xs">Stripe</span>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">{fmtDate(o.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openDetail(o.id)}
                            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            View
                          </button>
                          {/* Pending manual payment — show upload link */}
                          {o.status === 'pending' && !proof && (
                            <Link
                              to={`/pay?orderId=${o.id}&amount=${o.total_amount}`}
                              className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
                            >
                              Pay now
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Manual payment proofs section */}
      {proofs.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-white font-semibold text-sm mb-4">Manual Payment Submissions</h2>
          <div className="space-y-3">
            {proofs.map((p) => (
              <div key={p.id} className="flex items-start justify-between gap-3 py-3 border-b border-gray-800 last:border-0">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-white text-sm font-medium capitalize">{p.payment_method?.replace('_', ' ')}</span>
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${
                      p.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                      p.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                    }`}>{p.status}</span>
                  </div>
                  <p className="text-gray-500 text-xs">{p.amount_paid} {p.currency} · Ref: {p.transaction_ref || '—'}</p>
                  {p.admin_note && (
                    <p className="text-gray-400 text-xs mt-1 italic">"{p.admin_note}"</p>
                  )}
                </div>
                <p className="text-gray-600 text-xs shrink-0">{fmtDate(p.submitted_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Order detail modal */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold">Order Details</h2>
              <button onClick={() => { setSelected(null); setOrderDetail(null); }} className="text-gray-500 hover:text-white transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {detailLoading ? (
              <div className="flex justify-center py-8"><Spinner /></div>
            ) : orderDetail ? (
              <div className="space-y-4">
                <dl className="space-y-2">
                  {[
                    { label: 'Order ID',  value: <span className="font-mono text-xs">{orderDetail.id}</span> },
                    { label: 'Amount',    value: `$${orderDetail.total_amount}` },
                    { label: 'Status',    value: <OrderStatusBadge status={orderDetail.status} /> },
                    { label: 'Date',      value: fmtDateTime(orderDetail.created_at) },
                    { label: 'Completed', value: fmtDateTime(orderDetail.completed_at) },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-start justify-between gap-4 py-1.5 border-b border-gray-800 last:border-0">
                      <dt className="text-gray-500 text-sm shrink-0">{label}</dt>
                      <dd className="text-gray-200 text-sm text-right">{value}</dd>
                    </div>
                  ))}
                </dl>
                {orderDetail.items?.length > 0 && (
                  <div>
                    <p className="text-gray-500 text-xs font-medium mb-2">Items</p>
                    <div className="space-y-2">
                      {orderDetail.items.map((item) => (
                        <div key={item.project_id} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2.5">
                          <div>
                            <p className="text-white text-sm">{item.title}</p>
                            <p className="text-gray-500 text-xs">{item.vendor}</p>
                          </div>
                          <span className="text-white font-semibold text-sm">${item.price_at_purchase}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Profile ────────────────────────────────────────────────────────────────────

export function DashboardProfile() {
  const { user, updateUser } = useAuth();
  const avatarInputRef = useRef(null);

  const { values, errors, isSubmitting, handleChange, setFieldErrors, setSubmitting, reset } =
    useFormState({
      name:    user?.name    || '',
      bio:     user?.bio     || '',
      website: user?.website || '',
    });

  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError,   setProfileError]   = useState('');
  const [avatarLoading,  setAvatarLoading]  = useState(false);
  const [avatarPreview,  setAvatarPreview]  = useState(null);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setProfileError(''); setProfileSuccess(false);
    setSubmitting(true);
    try {
      await userApi.updateProfile({ name: values.name, bio: values.bio, website: values.website });
      updateUser({ name: values.name, bio: values.bio, website: values.website });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err) {
      if (err instanceof ApiError && err.errors?.length) {
        setFieldErrors(err.errors);
      } else {
        setProfileError(err.message || 'Failed to update profile');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAvatarChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      const preview = URL.createObjectURL(file);
      setAvatarPreview(preview);
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await userApi.uploadAvatar(fd);
      updateUser({ avatar_url: res.data.avatarUrl });
    } catch (err) {
      alert(err.message || 'Failed to upload avatar');
      setAvatarPreview(null);
    } finally {
      setAvatarLoading(false);
      e.target.value = '';
    }
  }

  const avatarSrc = avatarPreview
    ? avatarPreview
    : user?.avatar_url
      ? `${BASE_URL}${user.avatar_url}`
      : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Profile Settings</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your account information</p>
      </div>

      {/* Avatar */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-white font-semibold text-sm mb-4">Profile Photo</h2>
        <div className="flex items-center gap-5">
          <div className="relative">
            <div className="w-20 h-20 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl overflow-hidden">
              {avatarSrc
                ? <img src={avatarSrc} alt="" className="w-full h-full object-cover" />
                : initials}
            </div>
            {avatarLoading && (
              <div className="absolute inset-0 bg-gray-950/60 rounded-2xl flex items-center justify-center">
                <Spinner size="sm" />
              </div>
            )}
          </div>
          <div>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
              aria-label="Upload avatar"
            />
            <button
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarLoading}
              className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
            >
              {avatarLoading ? 'Uploading…' : 'Change Photo'}
            </button>
            <p className="text-gray-600 text-xs mt-1.5">PNG, JPEG, WebP · Max 2 MB</p>
          </div>
        </div>
      </div>

      {/* Profile form */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-white font-semibold text-sm mb-5">Account Details</h2>

        {profileSuccess && (
          <div className="mb-4 flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 text-sm rounded-xl px-4 py-3">
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Profile updated successfully
          </div>
        )}

        {profileError && (
          <div className="mb-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
            {profileError}
          </div>
        )}

        <form onSubmit={handleProfileSubmit} noValidate className="space-y-4">
          {/* Read-only email */}
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Email address</label>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-gray-400 text-sm">
              {user?.email}
            </div>
            <p className="text-gray-600 text-xs mt-1">Email cannot be changed</p>
          </div>

          {[
            { id: 'name',    label: 'Full name',   placeholder: 'Your full name',       type: 'text' },
            { id: 'website', label: 'Website',      placeholder: 'https://yoursite.com', type: 'url'  },
          ].map(({ id, label, placeholder, type }) => (
            <div key={id}>
              <label htmlFor={id} className="block text-xs text-gray-500 mb-1.5">{label}</label>
              <input
                id={id} name={id} type={type}
                value={values[id]} onChange={handleChange}
                placeholder={placeholder}
                aria-invalid={!!errors[id]}
                className={`w-full bg-gray-800 border rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none focus:border-cyan-500 transition-colors ${errors[id] ? 'border-red-500' : 'border-gray-700'}`}
              />
              {errors[id] && <p role="alert" className="mt-1 text-xs text-red-400">{errors[id]}</p>}
            </div>
          ))}

          <div>
            <label htmlFor="bio" className="block text-xs text-gray-500 mb-1.5">Bio</label>
            <textarea
              id="bio" name="bio"
              value={values.bio} onChange={handleChange}
              placeholder="Tell us a bit about yourself…"
              rows={3}
              className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm outline-none focus:border-cyan-500 transition-colors resize-none"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-gray-950 font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors flex items-center gap-2"
            >
              {isSubmitting ? <><Spinner size="sm" /> Saving…</> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>

      {/* Account info */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-white font-semibold text-sm mb-4">Account Info</h2>
        <dl className="space-y-3">
          {[
            { label: 'Role',         value: <span className="capitalize">{user?.role}</span> },
            { label: 'Member since', value: fmtDate(user?.created_at) },
            { label: 'Last login',   value: fmtDateTime(user?.last_login_at) },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between py-2 border-b border-gray-800 last:border-0">
              <dt className="text-gray-500 text-sm">{label}</dt>
              <dd className="text-gray-200 text-sm">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Change password link */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 flex items-center justify-between">
        <div>
          <p className="text-white text-sm font-medium">Password</p>
          <p className="text-gray-500 text-xs mt-0.5">Change your account password</p>
        </div>
        <Link
          to="/dashboard/change-password"
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          Change Password
        </Link>
      </div>
    </div>
  );
}

// ── Change Password ────────────────────────────────────────────────────────────

export function DashboardChangePassword() {
  const navigate = useNavigate();
  const { values, errors, isSubmitting, handleChange, setFieldErrors, setSubmitting } =
    useFormState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [success, setSuccess] = useState(false);
  const [globalError, setGlobalError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setGlobalError('');
    if (values.newPassword !== values.confirmPassword) {
      setFieldErrors([{ field: 'confirmPassword', message: 'Passwords do not match' }]);
      return;
    }
    setSubmitting(true);
    try {
      await authApi.changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      setSuccess(true);
      setTimeout(() => navigate('/dashboard/profile'), 2000);
    } catch (err) {
      if (err instanceof ApiError && err.errors?.length) {
        setFieldErrors(err.errors);
      } else {
        setGlobalError(err.message || 'Failed to change password');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-md space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/dashboard/profile')} className="text-gray-500 hover:text-white transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-white">Change Password</h1>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        {success ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <div className="w-14 h-14 bg-cyan-500/10 border border-cyan-500/20 rounded-full flex items-center justify-center">
              <svg className="w-7 h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-semibold">Password changed successfully</p>
            <p className="text-gray-500 text-sm">Redirecting to profile…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            {globalError && (
              <div role="alert" className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
                {globalError}
              </div>
            )}

            {[
              { id: 'currentPassword', label: 'Current password',  autoComplete: 'current-password' },
              { id: 'newPassword',     label: 'New password',      autoComplete: 'new-password' },
              { id: 'confirmPassword', label: 'Confirm new password', autoComplete: 'new-password' },
            ].map(({ id, label, autoComplete }) => (
              <div key={id}>
                <label htmlFor={id} className="block text-xs text-gray-500 mb-1.5">{label}</label>
                <input
                  id={id} name={id} type="password"
                  value={values[id]} onChange={handleChange}
                  autoComplete={autoComplete}
                  aria-invalid={!!errors[id]}
                  className={`w-full bg-gray-800 border rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-cyan-500 transition-colors ${errors[id] ? 'border-red-500' : 'border-gray-700'}`}
                />
                {errors[id] && <p role="alert" className="mt-1 text-xs text-red-400">{errors[id]}</p>}
              </div>
            ))}

            <div className="bg-gray-800 rounded-xl p-3 text-xs text-gray-500 space-y-1">
              <p>Password requirements:</p>
              <ul className="space-y-0.5 ml-2">
                <li className={values.newPassword.length >= 8 ? 'text-green-400' : ''}>• At least 8 characters</li>
                <li className={/[A-Z]/.test(values.newPassword) ? 'text-green-400' : ''}>• One uppercase letter</li>
                <li className={/[0-9]/.test(values.newPassword) ? 'text-green-400' : ''}>• One number</li>
              </ul>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-gray-950 font-semibold py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? <><Spinner size="sm" /> Updating…</> : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

// ── Default export (legacy route /dashboard) ───────────────────────────────────
// App.jsx now uses /dashboard/* nested routes with DashboardLayout + Outlet.
// This default export is kept for backward compatibility.
export default DashboardLayout;
