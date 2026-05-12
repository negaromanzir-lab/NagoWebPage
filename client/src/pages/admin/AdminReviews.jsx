import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../lib/api';

function StarRating({ rating }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} className={`w-3 h-3 ${s <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700'}`} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function AdminReviews() {
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [hidden,  setHidden]  = useState('');
  const [page,    setPage]    = useState(1);
  const [actionLoading, setActionLoading] = useState({});

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { page, limit: 20 };
      if (hidden !== '') params.hidden = hidden;
      const res = await adminApi.listReviews(params);
      setReviews(res.data);
      setPagination(res.pagination);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, hidden]);

  useEffect(() => { load(); }, [load]);

  async function handleToggleVisibility(id) {
    setActionLoading((p) => ({ ...p, [id]: true }));
    try {
      const res = await adminApi.toggleReviewVisibility(id);
      setReviews((prev) => prev.map((r) => r.id === id ? { ...r, is_hidden: res.data.is_hidden } : r));
    } catch (e) { alert(e.message); }
    finally { setActionLoading((p) => ({ ...p, [id]: false })); }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Reviews</h1>
          <p className="text-gray-500 text-sm mt-0.5">{pagination.total} total reviews</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <select value={hidden} onChange={(e) => { setHidden(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-sm px-3 py-2 rounded-xl outline-none focus:border-cyan-500 transition-colors">
          <option value="">All reviews</option>
          <option value="false">Visible only</option>
          <option value="true">Hidden only</option>
        </select>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-sm">{error}</div>}

      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : reviews.length === 0 ? (
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-12 text-center text-gray-600">No reviews found</div>
        ) : reviews.map((r) => (
          <div
            key={r.id}
            className={`bg-gray-900 border rounded-2xl p-5 transition-all ${
              r.is_hidden ? 'border-gray-800 opacity-60' : 'border-gray-800'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-2">
                  <StarRating rating={r.rating} />
                  <span className="text-gray-500 text-xs">{fmtDate(r.created_at)}</span>
                  {r.is_hidden && (
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border bg-red-500/10 text-red-400 border-red-500/20">Hidden</span>
                  )}
                </div>

                {r.comment && (
                  <p className="text-gray-300 text-sm mb-3 leading-relaxed">{r.comment}</p>
                )}

                <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                  <span>
                    <span className="text-gray-400 font-medium">Reviewer:</span> {r.user_name} ({r.user_email})
                  </span>
                  <span>
                    <span className="text-gray-400 font-medium">Project:</span> {r.project_title}
                  </span>
                </div>
              </div>

              <button
                onClick={() => handleToggleVisibility(r.id)}
                disabled={actionLoading[r.id]}
                className={`shrink-0 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
                  r.is_hidden
                    ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                    : 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                }`}
              >
                {actionLoading[r.id] ? '…' : r.is_hidden ? 'Show' : 'Hide'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
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
  );
}
