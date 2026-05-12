import { useEffect, useState, useCallback } from 'react';
import { adminApi } from '../../lib/api';

function OrderStatus({ status }) {
  const map = {
    completed:      'bg-green-500/10 text-green-400 border-green-500/20',
    pending:        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    refunded:       'bg-red-500/10 text-red-400 border-red-500/20',
    expired:        'bg-gray-500/10 text-gray-400 border-gray-500/20',
    partial_refund: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border capitalize ${map[status] || map.pending}`}>
      {status?.replace('_', ' ')}
    </span>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function OrderDetailModal({ orderId, onClose }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refunding, setRefunding] = useState(false);

  useEffect(() => {
    adminApi.getOrder(orderId)
      .then((r) => setOrder(r.data))
      .finally(() => setLoading(false));
  }, [orderId]);

  async function handleRefund() {
    if (!confirm('Mark this order as refunded?')) return;
    setRefunding(true);
    try {
      await adminApi.refundOrder(orderId);
      setOrder((o) => ({ ...o, status: 'refunded' }));
    } catch (e) { alert(e.message); }
    finally { setRefunding(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white font-semibold">Order Details</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : order ? (
          <div className="space-y-4">
            <dl className="space-y-2">
              {[
                { label: 'Order ID',  value: <span className="font-mono text-xs">{order.id}</span> },
                { label: 'Buyer',     value: `${order.buyer_name} (${order.buyer_email})` },
                { label: 'Amount',    value: `$${order.total_amount}` },
                { label: 'Status',    value: <OrderStatus status={order.status} /> },
                { label: 'Created',   value: fmtDate(order.created_at) },
                { label: 'Completed', value: fmtDate(order.completed_at) },
                { label: 'Stripe Session', value: <span className="font-mono text-xs text-gray-400">{order.stripe_session_id || '—'}</span> },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-4 py-1.5 border-b border-gray-800 last:border-0">
                  <dt className="text-gray-500 text-sm shrink-0">{label}</dt>
                  <dd className="text-gray-200 text-sm text-right">{value}</dd>
                </div>
              ))}
            </dl>

            {order.items?.length > 0 && (
              <div>
                <h3 className="text-white text-sm font-semibold mb-2">Items ({order.items.length})</h3>
                <div className="space-y-2">
                  {order.items.map((item) => (
                    <div key={item.project_id} className="flex items-center justify-between bg-gray-800 rounded-xl px-3 py-2">
                      <div>
                        <p className="text-white text-sm">{item.title}</p>
                        <p className="text-gray-500 text-xs">{item.vendor} · Seller: {item.seller_name}</p>
                      </div>
                      <span className="text-white font-semibold text-sm">${item.price_at_purchase}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {order.status === 'completed' && (
              <button
                onClick={handleRefund}
                disabled={refunding}
                className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {refunding ? 'Processing…' : 'Mark as Refunded'}
              </button>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">Order not found</p>
        )}
      </div>
    </div>
  );
}

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [search,  setSearch]  = useState('');
  const [status,  setStatus]  = useState('');
  const [page,    setPage]    = useState(1);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (status) params.status = status;
      const res = await adminApi.listOrders(params);
      setOrders(res.data);
      setPagination(res.pagination);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { load(); }, [load]);

  const totalRevenue = orders.filter((o) => o.status === 'completed').reduce((s, o) => s + Number(o.total_amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Orders</h1>
          <p className="text-gray-500 text-sm mt-0.5">{pagination.total} total orders</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 text-sm font-semibold px-4 py-2 rounded-xl">
          Page revenue: ${totalRevenue.toFixed(2)}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="text" placeholder="Search buyer or order ID…" value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-700 text-white placeholder-gray-600 text-sm px-3 py-2 rounded-xl outline-none focus:border-cyan-500 transition-colors w-56"
        />
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="bg-gray-900 border border-gray-700 text-gray-300 text-sm px-3 py-2 rounded-xl outline-none focus:border-cyan-500 transition-colors">
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="completed">Completed</option>
          <option value="refunded">Refunded</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-sm">{error}</div>}

      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-left px-4 py-3 font-medium">Order ID</th>
                <th className="text-left px-4 py-3 font-medium">Buyer</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Items</th>
                <th className="text-left px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Date</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center">
                  <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center text-gray-600">No orders found</td></tr>
              ) : orders.map((o) => (
                <tr key={o.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <span className="text-gray-400 font-mono text-xs">{o.id.slice(0, 8)}…</span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-white font-medium truncate max-w-[120px]">{o.buyer_name}</p>
                    <p className="text-gray-500 text-xs truncate max-w-[120px]">{o.buyer_email}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-gray-400">{o.item_count}</td>
                  <td className="px-4 py-3 text-white font-semibold">${o.total_amount}</td>
                  <td className="px-4 py-3"><OrderStatus status={o.status} /></td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-500 text-xs">{fmtDate(o.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setSelectedOrder(o.id)}
                      className="text-xs font-medium px-3 py-1.5 bg-gray-800 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      View
                    </button>
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

      {selectedOrder && <OrderDetailModal orderId={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </div>
  );
}
