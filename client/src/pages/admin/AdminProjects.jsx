import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../lib/api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function StatusBadge({ published, deleted }) {
  if (deleted)    return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border bg-red-500/10 text-red-400 border-red-500/20">Deleted</span>;
  if (published)  return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border bg-green-500/10 text-green-400 border-green-500/20">Published</span>;
  return <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Pending</span>;
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <p className="text-white text-sm mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium py-2 rounded-xl transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-red-500 hover:bg-red-400 text-white text-sm font-semibold py-2 rounded-xl transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminProjects() {
  const [projects, setProjects] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [page,    setPage]    = useState(1);
  const [actionLoading, setActionLoading] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (status) params.status = status;
      const res = await adminApi.listProjects(params);
      setProjects(res.data);
      setPagination(res.pagination);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  async function handleTogglePublish(id) {
    setActionLoading((p) => ({ ...p, [`pub_${id}`]: true }));
    try {
      const res = await adminApi.toggleProjectPublish(id);
      setProjects((prev) => prev.map((p) => p.id === id ? { ...p, is_published: res.data.is_published } : p));
    } catch (e) { alert(e.message); }
    finally { setActionLoading((p) => ({ ...p, [`pub_${id}`]: false })); }
  }

  async function handleToggleFeature(id) {
    setActionLoading((p) => ({ ...p, [`feat_${id}`]: true }));
    try {
      const res = await adminApi.toggleProjectFeature(id);
      setProjects((prev) => prev.map((p) => p.id === id ? { ...p, is_featured: res.data.is_featured } : p));
    } catch (e) { alert(e.message); }
    finally { setActionLoading((p) => ({ ...p, [`feat_${id}`]: false })); }
  }

  async function handleDelete(id) {
    setActionLoading((p) => ({ ...p, [`del_${id}`]: true }));
    try {
      await adminApi.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      setPagination((p) => ({ ...p, total: p.total - 1 }));
    } catch (e) { alert(e.message); }
    finally { setActionLoading((p) => ({ ...p, [`del_${id}`]: false })); setConfirmDelete(null); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-gray-500 text-sm mt-0.5">{pagination.total} total projects</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text" placeholder="Search title or vendor…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-700 text-white placeholder-gray-600 text-sm px-3 py-2 rounded-xl outline-none focus:border-cyan-500 transition-colors w-56"
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-sm px-3 py-2 rounded-xl outline-none focus:border-cyan-500 transition-colors">
          <option value="">All projects</option>
          <option value="published">Published</option>
          <option value="pending">Pending</option>
          <option value="deleted">Deleted</option>
        </select>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-sm">{error}</div>}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-left px-4 py-3 font-medium">Project</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Seller</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Price</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Downloads</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={6} className="py-12 text-center">
                  <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : projects.length === 0 ? (
                <tr><td colSpan={6} className="py-12 text-center text-gray-600">No projects found</td></tr>
              ) : projects.map((p) => (
                <tr key={p.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {p.preview_image_path ? (
                        <img src={`${BASE_URL}/uploads/projects/${p.preview_image_path}`} alt=""
                          className="w-10 h-10 rounded-lg object-cover bg-gray-800 shrink-0" />
                      ) : (
                        <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                          </svg>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate max-w-[180px]">{p.title}</p>
                        <p className="text-gray-500 text-xs">{p.vendor} · {p.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <p className="text-gray-300 text-xs">{p.seller_name}</p>
                    <p className="text-gray-600 text-xs">{p.seller_email}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-white font-semibold">${p.price}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-400">{p.download_count}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      <StatusBadge published={p.is_published} deleted={p.is_deleted} />
                      {p.is_featured && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">Featured</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {!p.is_deleted && (
                        <button
                          onClick={() => handleTogglePublish(p.id)}
                          disabled={actionLoading[`pub_${p.id}`]}
                          className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                            p.is_published
                              ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                              : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          }`}
                        >
                          {actionLoading[`pub_${p.id}`] ? '…' : p.is_published ? 'Unpublish' : 'Publish'}
                        </button>
                      )}
                      {!p.is_deleted && (
                        <button
                          onClick={() => handleToggleFeature(p.id)}
                          disabled={actionLoading[`feat_${p.id}`]}
                          className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-800 text-gray-400 hover:text-yellow-400 hover:bg-yellow-500/10 transition-colors disabled:opacity-50"
                        >
                          {actionLoading[`feat_${p.id}`] ? '…' : p.is_featured ? '★ Unfeature' : '☆ Feature'}
                        </button>
                      )}
                      <button
                        onClick={() => setConfirmDelete(p)}
                        disabled={actionLoading[`del_${p.id}`]}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-xs text-gray-500">Page {pagination.page} of {pagination.totalPages}</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="text-xs px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors">Previous</button>
              <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                className="text-xs px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>

      {confirmDelete && (
        <ConfirmModal
          message={`Permanently delete "${confirmDelete.title}"? This cannot be undone.`}
          onConfirm={() => handleDelete(confirmDelete.id)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
