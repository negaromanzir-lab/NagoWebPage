import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../lib/api';

function RoleBadge({ role }) {
  const s = { admin: 'bg-red-500/10 text-red-400 border-red-500/20', seller: 'bg-purple-500/10 text-purple-400 border-purple-500/20', buyer: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' };
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${s[role] || s.buyer}`}>{role}</span>;
}

function StatusDot({ active }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${active ? 'bg-green-400' : 'bg-gray-600'}`} />;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminUsers() {
  const [users,   setUsers]   = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');
  const [role,    setRole]    = useState('');
  const [status,  setStatus]  = useState('');
  const [page,    setPage]    = useState(1);
  const [actionLoading, setActionLoading] = useState({});

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (role)   params.role   = role;
      if (status) params.status = status;
      const res = await adminApi.listUsers(params);
      setUsers(res.data);
      setPagination(res.pagination);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, search, role, status]);

  useEffect(() => { load(); }, [load]);

  async function handleToggleStatus(userId) {
    setActionLoading((p) => ({ ...p, [`status_${userId}`]: true }));
    try {
      const res = await adminApi.toggleUserStatus(userId);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, is_active: res.data.is_active } : u));
    } catch (e) { alert(e.message); }
    finally { setActionLoading((p) => ({ ...p, [`status_${userId}`]: false })); }
  }

  async function handleChangeRole(userId, newRole) {
    setActionLoading((p) => ({ ...p, [`role_${userId}`]: true }));
    try {
      await adminApi.changeUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => u.id === userId ? { ...u, role: newRole } : u));
    } catch (e) { alert(e.message); }
    finally { setActionLoading((p) => ({ ...p, [`role_${userId}`]: false })); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Users</h1>
          <p className="text-gray-500 text-sm mt-0.5">{pagination.total} total users</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text" placeholder="Search name or email…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-700 text-white placeholder-gray-600 text-sm px-3 py-2 rounded-xl outline-none focus:border-cyan-500 transition-colors w-56"
        />
        <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-sm px-3 py-2 rounded-xl outline-none focus:border-cyan-500 transition-colors">
          <option value="">All roles</option>
          <option value="buyer">Buyer</option>
          <option value="seller">Seller</option>
          <option value="admin">Admin</option>
        </select>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-sm px-3 py-2 rounded-xl outline-none focus:border-cyan-500 transition-colors">
          <option value="">All status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-sm">{error}</div>}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800 bg-gray-900/80">
                <th className="text-left px-4 py-3 font-medium">User</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Role</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Projects</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Orders</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Joined</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center">
                  <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : users.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-600">No users found</td></tr>
              ) : users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {u.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate">{u.name}</p>
                        <p className="text-gray-500 text-xs truncate">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <select
                      value={u.role}
                      onChange={(e) => handleChangeRole(u.id, e.target.value)}
                      disabled={actionLoading[`role_${u.id}`]}
                      className="bg-gray-800 border border-gray-700 text-gray-300 text-xs px-2 py-1 rounded-lg outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
                    >
                      <option value="buyer">buyer</option>
                      <option value="seller">seller</option>
                      <option value="admin">admin</option>
                    </select>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-400">{u.project_count}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-400">{u.order_count}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">{fmtDate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <StatusDot active={u.is_active} />
                      <span className="text-xs text-gray-500">{u.is_active ? 'Active' : 'Inactive'}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleStatus(u.id)}
                      disabled={actionLoading[`status_${u.id}`]}
                      className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                        u.is_active
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                      }`}
                    >
                      {actionLoading[`status_${u.id}`] ? '…' : u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-xs text-gray-500">Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="text-xs px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors">
                Previous
              </button>
              <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                className="text-xs px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors">
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
