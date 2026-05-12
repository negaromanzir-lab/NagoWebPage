import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../lib/api';

function fmtBytes(bytes) {
  if (bytes == null) return 'Unknown';
  if (bytes === 0)   return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <p className="text-white text-sm mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium py-2 rounded-xl transition-colors">Cancel</button>
          <button onClick={onConfirm} className="flex-1 bg-red-500 hover:bg-red-400 text-white text-sm font-semibold py-2 rounded-xl transition-colors">Delete File</button>
        </div>
      </div>
    </div>
  );
}

export default function AdminFiles() {
  const [files,   setFiles]   = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [page,    setPage]    = useState(1);
  const [actionLoading, setActionLoading] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await adminApi.listFiles({ page, limit: 20 });
      setFiles(res.data);
      setPagination(res.pagination);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { load(); }, [load]);

  async function handleDeleteFile(projectId, title) {
    setActionLoading((p) => ({ ...p, [projectId]: true }));
    try {
      await adminApi.deleteFile(projectId);
      setFiles((prev) => prev.map((f) => f.project_id === projectId ? { ...f, project_file_path: null, file_size_bytes: null } : f));
    } catch (e) { alert(e.message); }
    finally { setActionLoading((p) => ({ ...p, [projectId]: false })); setConfirmDelete(null); }
  }

  const totalSize = files.reduce((s, f) => s + (f.file_size_bytes || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">File Management</h1>
          <p className="text-gray-500 text-sm mt-0.5">{pagination.total} project files · {fmtBytes(totalSize)} on this page</p>
        </div>
      </div>

      {/* Storage summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Files',    value: pagination.total },
          { label: 'Page Size',      value: fmtBytes(totalSize) },
          { label: 'Files w/ Data',  value: files.filter((f) => f.project_file_path).length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-gray-500 text-xs mb-1">{label}</p>
            <p className="text-white font-bold text-xl">{value}</p>
          </div>
        ))}
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-sm">{error}</div>}

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-left px-4 py-3 font-medium">Project</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Seller</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">File</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Size</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Downloads</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Uploaded</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center">
                  <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : files.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-600">No files found</td></tr>
              ) : files.map((f) => (
                <tr key={f.project_id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <p className="text-white text-sm font-medium truncate max-w-[160px]">{f.title}</p>
                        <p className="text-gray-500 text-xs">{f.vendor}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-400 text-xs">{f.seller_name}</td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {f.project_file_path ? (
                      <span className="font-mono text-xs text-gray-400 truncate max-w-[120px] block">{f.project_file_path}</span>
                    ) : (
                      <span className="text-gray-600 text-xs italic">No file</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-400 text-xs">{fmtBytes(f.file_size_bytes)}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-400">{f.download_count}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">{fmtDate(f.created_at)}</td>
                  <td className="px-4 py-3">
                    {f.project_file_path ? (
                      <button
                        onClick={() => setConfirmDelete(f)}
                        disabled={actionLoading[f.project_id]}
                        className="text-xs font-medium px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {actionLoading[f.project_id] ? '…' : 'Delete File'}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-600 italic">No file</span>
                    )}
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
          message={`Delete the file for "${confirmDelete.title}"? The project record will remain but the file will be removed from disk.`}
          onConfirm={() => handleDeleteFile(confirmDelete.project_id, confirmDelete.title)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
