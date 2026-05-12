import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../lib/api';

// ── Helpers ────────────────────────────────────────────────────────────────────

const METHOD_META = {
  telebirr:      { label: 'Telebirr',       color: 'bg-green-500/10 text-green-400 border-green-500/20',  logo: '📱' },
  cbe_birr:      { label: 'CBE Birr',       color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',    logo: '🏦' },
  bank_transfer: { label: 'Bank Transfer',  color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', logo: '💳' },
};

const STATUS_META = {
  pending:  { label: 'Pending',  color: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' },
  approved: { label: 'Approved', color: 'bg-green-500/10 text-green-400 border-green-500/20' },
  rejected: { label: 'Rejected', color: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function MethodBadge({ method }) {
  const m = METHOD_META[method] || { label: method, color: 'bg-gray-800 text-gray-400 border-gray-700', logo: '💰' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${m.color}`}>
      {m.logo} {m.label}
    </span>
  );
}

function StatusBadge({ status }) {
  const s = STATUS_META[status] || STATUS_META.pending;
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${s.color}`}>
      {s.label}
    </span>
  );
}

// ── Screenshot Viewer ──────────────────────────────────────────────────────────

function ScreenshotViewer({ proofId, fileName }) {
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const url = adminApi.screenshotUrl(proofId);
  const token = localStorage.getItem('nw_access_token');

  // Use an object tag for PDFs, img for images
  const isPdf = fileName?.toLowerCase().endsWith('.pdf');

  return (
    <div className="bg-gray-800 rounded-xl overflow-hidden border border-gray-700">
      {loading && !error && (
        <div className="flex items-center justify-center h-48">
          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      {error && (
        <div className="flex items-center justify-center h-48 text-gray-500 text-sm">
          Failed to load screenshot
        </div>
      )}
      {isPdf ? (
        <iframe
          src={`${url}?token=${token}`}
          title="Payment proof"
          className="w-full h-64"
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
        />
      ) : (
        <img
          src={url}
          alt="Payment screenshot"
          className={`w-full object-contain max-h-80 ${loading ? 'hidden' : 'block'}`}
          onLoad={() => setLoading(false)}
          onError={() => { setLoading(false); setError(true); }}
        />
      )}
    </div>
  );
}

// ── Proof Detail Modal ─────────────────────────────────────────────────────────

function ProofDetailModal({ proofId, onClose, onAction }) {
  const [proof,     setProof]     = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [note,      setNote]      = useState('');
  const [acting,    setActing]    = useState('');
  const [actionErr, setActionErr] = useState('');

  useEffect(() => {
    adminApi.getManualPayment(proofId)
      .then((r) => setProof(r.data))
      .finally(() => setLoading(false));
  }, [proofId]);

  async function handleApprove() {
    setActing('approve'); setActionErr('');
    try {
      await adminApi.approveManualPayment(proofId, note);
      onAction('approved');
      onClose();
    } catch (e) { setActionErr(e.message); }
    finally { setActing(''); }
  }

  async function handleReject() {
    if (!note.trim()) return setActionErr('Please provide a rejection reason');
    setActing('reject'); setActionErr('');
    try {
      await adminApi.rejectManualPayment(proofId, note);
      onAction('rejected');
      onClose();
    } catch (e) { setActionErr(e.message); }
    finally { setActing(''); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <h2 className="text-white font-semibold">Payment Proof Review</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : proof ? (
            <>
              {/* Screenshot */}
              <ScreenshotViewer proofId={proof.id} fileName={proof.screenshot_name} />

              {/* Details grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'Buyer',          value: `${proof.buyer_name} (${proof.buyer_email})` },
                  { label: 'Payment Method', value: <MethodBadge method={proof.payment_method} /> },
                  { label: 'Sender Name',    value: proof.sender_name },
                  { label: 'Phone',          value: proof.sender_phone || '—' },
                  { label: 'Tx Reference',   value: proof.transaction_ref || '—' },
                  { label: 'Amount Paid',    value: `${Number(proof.amount_paid).toLocaleString()} ${proof.currency}` },
                  { label: 'Order Total',    value: `$${proof.order_total}` },
                  { label: 'Status',         value: <StatusBadge status={proof.status} /> },
                  { label: 'Submitted',      value: fmtDate(proof.submitted_at) },
                  { label: 'Order ID',       value: <span className="font-mono text-xs">{proof.order_id}</span> },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-800 rounded-xl px-4 py-3">
                    <p className="text-gray-500 text-xs mb-0.5">{label}</p>
                    <div className="text-white text-sm font-medium">{value}</div>
                  </div>
                ))}
              </div>

              {/* Order items */}
              {proof.items?.length > 0 && (
                <div>
                  <p className="text-gray-500 text-xs font-medium mb-2">Ordered Projects</p>
                  <div className="space-y-1.5">
                    {proof.items.map((item) => (
                      <div key={item.project_id} className="flex items-center justify-between bg-gray-800 rounded-xl px-4 py-2.5">
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

              {/* Amount mismatch warning */}
              {Math.abs(parseFloat(proof.amount_paid) - parseFloat(proof.order_total) * 55) > 10 && (
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex gap-2">
                  <span className="text-yellow-400 shrink-0">⚠️</span>
                  <p className="text-yellow-300 text-xs">
                    The amount paid ({proof.amount_paid} ETB) may not match the order total (${proof.order_total}).
                    Verify the exchange rate before approving.
                  </p>
                </div>
              )}

              {/* Action area — only for pending proofs */}
              {proof.status === 'pending' && (
                <div className="space-y-3 pt-2 border-t border-gray-800">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">
                      Note (required for rejection, optional for approval)
                    </label>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Add a note for the buyer…"
                      rows={3}
                      className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-600 text-sm px-3 py-2.5 rounded-xl outline-none focus:border-cyan-500 transition-colors resize-none"
                    />
                  </div>

                  {actionErr && (
                    <p className="text-red-400 text-xs">{actionErr}</p>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleReject}
                      disabled={!!acting}
                      className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
                    >
                      {acting === 'reject' ? 'Rejecting…' : '✗ Reject'}
                    </button>
                    <button
                      onClick={handleApprove}
                      disabled={!!acting}
                      className="flex-1 bg-green-500 hover:bg-green-400 text-gray-950 font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-50"
                    >
                      {acting === 'approve' ? 'Approving…' : '✓ Approve Payment'}
                    </button>
                  </div>
                </div>
              )}

              {/* Already reviewed */}
              {proof.status !== 'pending' && (
                <div className={`rounded-xl p-4 border ${proof.status === 'approved' ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                  <p className={`text-sm font-semibold ${proof.status === 'approved' ? 'text-green-400' : 'text-red-400'}`}>
                    {proof.status === 'approved' ? '✓ Payment Approved' : '✗ Payment Rejected'}
                  </p>
                  {proof.admin_note && <p className="text-gray-400 text-xs mt-1">{proof.admin_note}</p>}
                  <p className="text-gray-600 text-xs mt-1">
                    by {proof.reviewed_by_name} · {fmtDate(proof.reviewed_at)}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-gray-500 text-sm text-center py-8">Proof not found</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Settings Panel ─────────────────────────────────────────────────────────────

function SettingsPanel({ onClose }) {
  const [settings, setSettings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState({});
  const [edits,    setEdits]    = useState({});

  useEffect(() => {
    adminApi.getManualPaymentSettings()
      .then((r) => {
        setSettings(r.data);
        const init = {};
        r.data.forEach((s) => { init[s.method] = { ...s }; });
        setEdits(init);
      })
      .finally(() => setLoading(false));
  }, []);

  function update(method, field, value) {
    setEdits((prev) => ({ ...prev, [method]: { ...prev[method], [field]: value } }));
  }

  async function save(method) {
    setSaving((p) => ({ ...p, [method]: true }));
    try {
      await adminApi.updateManualPaymentSettings(method, edits[method]);
    } catch (e) { alert(e.message); }
    finally { setSaving((p) => ({ ...p, [method]: false })); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <h2 className="text-white font-semibold">Payment Method Settings</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : Object.entries(edits).map(([method, s]) => {
            const meta = METHOD_META[method] || {};
            return (
              <div key={method} className="bg-gray-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{meta.logo}</span>
                    <span className="text-white font-semibold">{meta.label}</span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-gray-400 text-sm">Enabled</span>
                    <input
                      type="checkbox"
                      checked={!!s.is_enabled}
                      onChange={(e) => update(method, 'is_enabled', e.target.checked)}
                      className="w-4 h-4 accent-cyan-500"
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { field: 'account_name',   label: 'Account Name' },
                    { field: 'account_number', label: 'Account Number' },
                  ].map(({ field, label }) => (
                    <div key={field}>
                      <label className="block text-xs text-gray-500 mb-1">{label}</label>
                      <input
                        type="text"
                        value={s[field] || ''}
                        onChange={(e) => update(method, field, e.target.value)}
                        className="w-full bg-gray-900 border border-gray-700 text-white text-sm px-3 py-2 rounded-xl outline-none focus:border-cyan-500 transition-colors"
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-xs text-gray-500 mb-1">Instructions (one step per line)</label>
                  <textarea
                    value={s.instructions || ''}
                    onChange={(e) => update(method, 'instructions', e.target.value)}
                    rows={5}
                    className="w-full bg-gray-900 border border-gray-700 text-white text-sm px-3 py-2 rounded-xl outline-none focus:border-cyan-500 transition-colors resize-none"
                  />
                </div>

                <button
                  onClick={() => save(method)}
                  disabled={saving[method]}
                  className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-gray-950 font-semibold text-sm px-4 py-2 rounded-xl transition-colors"
                >
                  {saving[method] ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminManualPayments() {
  const [proofs,      setProofs]      = useState([]);
  const [pagination,  setPagination]  = useState({ page: 1, totalPages: 1, total: 0 });
  const [pendingCount, setPendingCount] = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [methodFilter, setMethodFilter] = useState('');
  const [page,        setPage]        = useState(1);
  const [selectedId,  setSelectedId]  = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { page, limit: 20 };
      if (statusFilter) params.status = statusFilter;
      if (methodFilter) params.method = methodFilter;
      const res = await adminApi.listManualPayments(params);
      setProofs(res.data);
      setPagination(res.pagination);
      setPendingCount(res.pending_count);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, statusFilter, methodFilter]);

  useEffect(() => { load(); }, [load]);

  function handleAction() { load(); }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Manual Payments</h1>
            {pendingCount > 0 && (
              <span className="bg-yellow-500 text-gray-950 text-xs font-bold px-2.5 py-1 rounded-full">
                {pendingCount} pending
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-0.5">Review Telebirr and CBE Birr payment screenshots</p>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium px-4 py-2 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Payment Settings
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-sm px-3 py-2 rounded-xl outline-none focus:border-cyan-500 transition-colors">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <select value={methodFilter} onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-sm px-3 py-2 rounded-xl outline-none focus:border-cyan-500 transition-colors">
          <option value="">All methods</option>
          <option value="telebirr">Telebirr</option>
          <option value="cbe_birr">CBE Birr</option>
          <option value="bank_transfer">Bank Transfer</option>
        </select>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-sm">{error}</div>}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-left px-4 py-3 font-medium">Buyer</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Method</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Sender</th>
                <th className="text-left px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Order Total</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Submitted</th>
                <th className="text-left px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={8} className="py-12 text-center">
                  <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : proofs.length === 0 ? (
                <tr><td colSpan={8} className="py-12 text-center text-gray-600">No payment proofs found</td></tr>
              ) : proofs.map((p) => (
                <tr key={p.id} className={`hover:bg-gray-800/40 transition-colors ${p.status === 'pending' ? 'border-l-2 border-l-yellow-500/50' : ''}`}>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium truncate max-w-[120px]">{p.buyer_name}</p>
                    <p className="text-gray-500 text-xs truncate max-w-[120px]">{p.buyer_email}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell"><MethodBadge method={p.payment_method} /></td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-gray-300 text-xs">{p.sender_name}</p>
                    {p.transaction_ref && <p className="text-gray-600 text-xs font-mono">{p.transaction_ref}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white font-semibold">{Number(p.amount_paid).toLocaleString()} {p.currency}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-400">${p.order_total}</td>
                  <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">{fmtDate(p.submitted_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedId(p.id)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                        p.status === 'pending'
                          ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20'
                          : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                      }`}
                    >
                      {p.status === 'pending' ? 'Review' : 'View'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-800">
            <span className="text-xs text-gray-500">Page {pagination.page} of {pagination.totalPages} · {pagination.total} total</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="text-xs px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors">Previous</button>
              <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                className="text-xs px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>

      {selectedId && (
        <ProofDetailModal
          proofId={selectedId}
          onClose={() => setSelectedId(null)}
          onAction={handleAction}
        />
      )}

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
