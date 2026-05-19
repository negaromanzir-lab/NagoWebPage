import { useEffect, useState, useCallback } from 'react';
import { adminApi, projectsApi } from '../../lib/api';

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

// ── Create Project Modal ───────────────────────────────────────────────────────

const TOPOLOGY_TYPES = ['star','mesh','ring','hierarchical','bus','hybrid','cloud','sdwan'];
const DIFFICULTIES   = ['beginner','intermediate','advanced'];

function CreateProjectModal({ onClose, onCreated }) {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    title: '', description: '', category_id: '',
    vendor: '', price: '0', topology_type: 'star',
    difficulty: 'intermediate', tags: '',
  });
  const [previewFile,  setPreviewFile]  = useState(null);
  const [projectFile,  setProjectFile]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  useEffect(() => {
    projectsApi.getCategories?.()
      .then((r) => setCategories(r.data || []))
      .catch(() => {});
  }, []);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'tags') {
          v.split(',').map((t) => t.trim()).filter(Boolean).forEach((t) => fd.append('tags[]', t));
        } else {
          fd.append(k, v);
        }
      });
      if (previewFile) fd.append('preview_image', previewFile);
      if (projectFile) fd.append('project_file',  projectFile);

      const token = localStorage.getItem('nw_access_token');
      const res = await fetch(`${BASE_URL}/api/projects`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to create project');
      onCreated(data.data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const inputCls = 'w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm px-3 py-2.5 rounded-xl outline-none focus:border-cyan-500 transition-colors';
  const labelCls = 'block text-xs text-gray-400 mb-1 font-medium';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <h2 className="text-white font-semibold">Create New Project</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-sm">{error}</div>
          )}

          {/* Title */}
          <div>
            <label className={labelCls}>Title *</label>
            <input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)}
              placeholder="e.g. Cisco Enterprise Campus Network" required />
          </div>

          {/* Description */}
          <div>
            <label className={labelCls}>Description *</label>
            <textarea className={`${inputCls} resize-none`} rows={3} value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Describe the network design, devices used, protocols configured…" required />
          </div>

          {/* Row: Category + Vendor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category *</label>
              <select className={inputCls} value={form.category_id}
                onChange={(e) => set('category_id', e.target.value)} required>
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Vendor *</label>
              <input className={inputCls} value={form.vendor} onChange={(e) => set('vendor', e.target.value)}
                placeholder="e.g. Cisco, Juniper, AWS" required />
            </div>
          </div>

          {/* Row: Price + Topology + Difficulty */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Price (USD) *</label>
              <input className={inputCls} type="number" min="0" step="0.01" value={form.price}
                onChange={(e) => set('price', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Topology Type *</label>
              <select className={inputCls} value={form.topology_type}
                onChange={(e) => set('topology_type', e.target.value)}>
                {TOPOLOGY_TYPES.map((t) => (
                  <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Difficulty</label>
              <select className={inputCls} value={form.difficulty}
                onChange={(e) => set('difficulty', e.target.value)}>
                {DIFFICULTIES.map((d) => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className={labelCls}>Tags (comma-separated)</label>
            <input className={inputCls} value={form.tags} onChange={(e) => set('tags', e.target.value)}
              placeholder="e.g. OSPF, BGP, VLAN, GNS3" />
          </div>

          {/* File uploads */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Preview Image (optional)</label>
              <label className="flex items-center gap-2 cursor-pointer bg-gray-800 border border-gray-700 hover:border-cyan-500/50 rounded-xl px-3 py-2.5 transition-colors">
                <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-400 truncate">
                  {previewFile ? previewFile.name : 'Choose image…'}
                </span>
                <input type="file" accept=".png,.jpg,.jpeg,.webp,.svg" className="hidden"
                  onChange={(e) => setPreviewFile(e.target.files[0] || null)} />
              </label>
            </div>
            <div>
              <label className={labelCls}>Source File (optional)</label>
              <label className="flex items-center gap-2 cursor-pointer bg-gray-800 border border-gray-700 hover:border-cyan-500/50 rounded-xl px-3 py-2.5 transition-colors">
                <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span className="text-sm text-gray-400 truncate">
                  {projectFile ? projectFile.name : 'Choose file…'}
                </span>
                <input type="file" accept=".zip,.pkt,.gns3,.yml,.yaml,.txt,.pdf" className="hidden"
                  onChange={(e) => setProjectFile(e.target.files[0] || null)} />
              </label>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium py-2.5 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-gray-950 text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-gray-950/40 border-t-gray-950 rounded-full animate-spin" />Creating…</>
              ) : 'Create Project'}
            </button>
          </div>
        </form>
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
  const [showCreate,    setShowCreate]    = useState(false);

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
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New Project
        </button>
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

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={(newProject) => {
            setShowCreate(false);
            load(); // refresh the list
          }}
        />
      )}
    </div>
  );
}
