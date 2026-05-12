import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../lib/api';

// ── Helpers ────────────────────────────────────────────────────────────────────

function fmt(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
  return `$${Number(n).toFixed(2)}`;
}

function fmtNum(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString();
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = 'cyan', icon }) {
  const colors = {
    cyan:   'from-cyan-500/10 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
    green:  'from-green-500/10 to-green-500/5 border-green-500/20 text-green-400',
    purple: 'from-purple-500/10 to-purple-500/5 border-purple-500/20 text-purple-400',
    yellow: 'from-yellow-500/10 to-yellow-500/5 border-yellow-500/20 text-yellow-400',
    red:    'from-red-500/10 to-red-500/5 border-red-500/20 text-red-400',
    blue:   'from-blue-500/10 to-blue-500/5 border-blue-500/20 text-blue-400',
  };
  return (
    <div className={`bg-gradient-to-b ${colors[color]} border rounded-2xl p-5`}>
      <div className="flex items-start justify-between mb-3">
        <span className="text-gray-400 text-sm">{label}</span>
        <div className={`w-8 h-8 rounded-lg bg-gray-900/60 flex items-center justify-center ${colors[color].split(' ').pop()}`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

// ── Mini bar chart ─────────────────────────────────────────────────────────────

function MiniBarChart({ data, valueKey, labelKey, color = '#06b6d4' }) {
  if (!data?.length) return <div className="h-24 flex items-center justify-center text-gray-600 text-sm">No data</div>;
  const max = Math.max(...data.map((d) => Number(d[valueKey]) || 0), 1);
  return (
    <div className="flex items-end gap-0.5 h-24">
      {data.map((d, i) => {
        const h = Math.max(2, ((Number(d[valueKey]) || 0) / max) * 100);
        return (
          <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
            <div
              className="w-full rounded-sm transition-all duration-300"
              style={{ height: `${h}%`, backgroundColor: color, opacity: 0.7 }}
            />
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
              {d[labelKey]}: {d[valueKey]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Status badge ───────────────────────────────────────────────────────────────

function OrderStatus({ status }) {
  const map = {
    completed:      'bg-green-500/10 text-green-400 border-green-500/20',
    pending:        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    refunded:       'bg-red-500/10 text-red-400 border-red-500/20',
    expired:        'bg-gray-500/10 text-gray-400 border-gray-500/20',
    partial_refund: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${map[status] || map.pending}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}

// ── Overview Page ──────────────────────────────────────────────────────────────

export default function AdminOverview() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    adminApi.getAnalytics()
      .then((res) => setData(res.data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-sm">{error}</div>
  );

  const { totals, revenueChart, usersChart, topProjects, topSellers, recentOrders } = data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-gray-500 text-sm mt-1">Platform-wide metrics and activity</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard label="Total Revenue"   value={fmt(totals.total_revenue)}   sub={`${fmt(totals.revenue_today)} today`}  color="green"  icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 16v-1m0-14v1m0 12v1" /></svg>} />
        <KpiCard label="Total Users"     value={fmtNum(totals.total_users)}  sub={`+${totals.new_users_today} today`}    color="cyan"   icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
        <KpiCard label="Total Orders"    value={fmtNum(totals.total_orders)}                                              color="purple" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>} />
        <KpiCard label="Projects"        value={fmtNum(totals.total_projects)} sub={`${totals.pending_projects} pending`} color="yellow" icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" /></svg>} />
        <KpiCard label="Downloads"       value={fmtNum(totals.total_downloads)}                                           color="blue"   icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>} />
        <KpiCard label="Reviews"         value={fmtNum(totals.total_reviews)}                                             color="red"    icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm">Revenue — Last 30 Days</h2>
            <span className="text-xs text-gray-500">{revenueChart.length} days</span>
          </div>
          <MiniBarChart data={revenueChart} valueKey="revenue" labelKey="date" color="#06b6d4" />
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm">New Users — Last 30 Days</h2>
            <span className="text-xs text-gray-500">{usersChart.length} days</span>
          </div>
          <MiniBarChart data={usersChart} valueKey="count" labelKey="date" color="#a855f7" />
        </div>
      </div>

      {/* Top projects + top sellers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm">Top Projects by Revenue</h2>
            <Link to="/admin/projects" className="text-xs text-cyan-400 hover:text-cyan-300">View all</Link>
          </div>
          <div className="space-y-3">
            {topProjects.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="text-gray-600 text-xs w-4 shrink-0">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{p.title}</p>
                  <p className="text-gray-500 text-xs">{p.vendor} · {p.sales_count} sales</p>
                </div>
                <span className="text-green-400 text-sm font-semibold shrink-0">{fmt(p.revenue)}</span>
              </div>
            ))}
            {!topProjects.length && <p className="text-gray-600 text-sm">No sales yet</p>}
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold text-sm">Top Sellers</h2>
            <Link to="/admin/users" className="text-xs text-cyan-400 hover:text-cyan-300">View all</Link>
          </div>
          <div className="space-y-3">
            {topSellers.map((s, i) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-gray-600 text-xs w-4 shrink-0">{i + 1}</span>
                <div className="w-7 h-7 bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
                  {s.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{s.name}</p>
                  <p className="text-gray-500 text-xs">{s.project_count} projects</p>
                </div>
                <span className="text-green-400 text-sm font-semibold shrink-0">{fmt(s.total_revenue)}</span>
              </div>
            ))}
            {!topSellers.length && <p className="text-gray-600 text-sm">No sellers yet</p>}
          </div>
        </div>
      </div>

      {/* Recent orders */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold text-sm">Recent Orders</h2>
          <Link to="/admin/orders" className="text-xs text-cyan-400 hover:text-cyan-300">View all</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-left pb-3 font-medium">Order</th>
                <th className="text-left pb-3 font-medium">Buyer</th>
                <th className="text-left pb-3 font-medium hidden sm:table-cell">Items</th>
                <th className="text-left pb-3 font-medium">Amount</th>
                <th className="text-left pb-3 font-medium">Status</th>
                <th className="text-left pb-3 font-medium hidden md:table-cell">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {recentOrders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="py-3 pr-4">
                    <span className="text-gray-400 font-mono text-xs">{o.id.slice(0, 8)}…</span>
                  </td>
                  <td className="py-3 pr-4">
                    <p className="text-white font-medium truncate max-w-[120px]">{o.buyer_name}</p>
                    <p className="text-gray-500 text-xs truncate max-w-[120px]">{o.buyer_email}</p>
                  </td>
                  <td className="py-3 pr-4 hidden sm:table-cell text-gray-400">{o.item_count}</td>
                  <td className="py-3 pr-4 text-white font-semibold">{fmt(o.total_amount)}</td>
                  <td className="py-3 pr-4"><OrderStatus status={o.status} /></td>
                  <td className="py-3 hidden md:table-cell text-gray-500 text-xs">{fmtDate(o.created_at)}</td>
                </tr>
              ))}
              {!recentOrders.length && (
                <tr><td colSpan={6} className="py-8 text-center text-gray-600">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
