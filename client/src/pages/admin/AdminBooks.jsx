import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function authHeaders(extra = {}) {
  const token = localStorage.getItem('nw_access_token');
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...extra };
}

function fmtBytes(b) {
  if (!b) return '—';
  const k = 1024, s = ['B','KB','MB','GB'];
  const i = Math.min(Math.floor(Math.log(b) / Math.log(k)), 3);
  return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' });
}

function StatusBadge({ published }) {
  if (published) return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border bg-green-500/10 text-green-400 border-green-500/20">
      Published
    </span>
  );
  return (
    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold border bg-yellow-500/10 text-yellow-400 border-yellow-500/20">
      Draft
    </span>
  );
}

// ── Upload / Edit Modal ────────────────────────────────────────────────────────

function BookFormModal({ book, categories, onClose, onSaved }) {
  const isEdit = !!book;
  const [form, setForm] = useState({
    title:             book?.title             || '',
    author:            book?.author            || '',
    publisher:         book?.publisher         || '',
    short_description: book?.short_description || '',
    description:       book?.description       || '',
    edition:           book?.edition           || '',
    published_year:    book?.published_year    || '',
    isbn:              book?.isbn              || '',
    pages:             book?.pages             || '',
    language:          book?.language          || 'English',
    category_id:       book?.category_id       || '',
    price:             book?.price             || '0',
    is_free:           book?.is_free ?? true,
    tags:              '',
  });
  const [pdfFile,   setPdfFile]   = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!isEdit && !pdfFile) { setError('PDF file is required'); return; }
    setError(''); setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (pdfFile)   fd.append('pdf',   pdfFile);
      if (coverFile) fd.append('cover', coverFile);

      const url    = isEdit ? `${BASE_URL}/api/books/${book.id}` : `${BASE_URL}/api/books`;
      const method = isEdit ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: authHeaders(), body: fd });
      const data   = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed');
      onSaved();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }

  const inp = 'w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-sm px-3 py-2.5 rounded-xl outline-none focus:border-emerald-500 transition-colors';
  const lbl = 'block text-xs text-gray-400 mb-1 font-medium';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-950/80 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 shrink-0">
          <h2 className="text-white font-semibold">{isEdit ? 'Edit Book' : 'Upload New Book'}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-3 text-sm">{error}</div>}

          {/* PDF + Cover file pickers */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>PDF File {!isEdit && <span className="text-red-400">*</span>}</label>
              <label className="flex items-center gap-2 cursor-pointer bg-gray-800 border border-gray-700 hover:border-red-500/50 rounded-xl px-3 py-2.5 transition-colors">
                <svg className="w-4 h-4 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-400 truncate">{pdfFile ? pdfFile.name : isEdit ? 'Replace PDF…' : 'Choose PDF…'}</span>
                <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={(e) => setPdfFile(e.target.files[0] || null)} />
              </label>
            </div>
            <div>
              <label className={lbl}>Cover Image (optional)</label>
              <label className="flex items-center gap-2 cursor-pointer bg-gray-800 border border-gray-700 hover:border-emerald-500/50 rounded-xl px-3 py-2.5 transition-colors">
                <svg className="w-4 h-4 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-400 truncate">{coverFile ? coverFile.name : 'Choose image…'}</span>
                <input type="file" accept=".png,.jpg,.jpeg,.webp" className="hidden" onChange={(e) => setCoverFile(e.target.files[0] || null)} />
              </label>
            </div>
          </div>

          {/* Title + Author */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Title *</label>
              <input className={inp} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Book title" required />
            </div>
            <div>
              <label className={lbl}>Author *</label>
              <input className={inp} value={form.author} onChange={(e) => set('author', e.target.value)} placeholder="Author name" required />
            </div>
          </div>

          {/* Publisher + Category */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Publisher</label>
              <input className={inp} value={form.publisher} onChange={(e) => set('publisher', e.target.value)} placeholder="e.g. O'Reilly" />
            </div>
            <div>
              <label className={lbl}>Category</label>
              <select className={inp} value={form.category_id} onChange={(e) => set('category_id', e.target.value)}>
                <option value="">No category</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Edition / Year / ISBN / Pages / Language */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={lbl}>Edition</label>
              <input className={inp} value={form.edition} onChange={(e) => set('edition', e.target.value)} placeholder="e.g. 3rd" />
            </div>
            <div>
              <label className={lbl}>Year</label>
              <input className={inp} type="number" min="1900" max="2099" value={form.published_year} onChange={(e) => set('published_year', e.target.value)} placeholder="2024" />
            </div>
            <div>
              <label className={lbl}>Pages</label>
              <input className={inp} type="number" min="1" value={form.pages} onChange={(e) => set('pages', e.target.value)} placeholder="350" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>ISBN</label>
              <input className={inp} value={form.isbn} onChange={(e) => set('isbn', e.target.value)} placeholder="978-0-..." />
            </div>
            <div>
              <label className={lbl}>Language</label>
              <input className={inp} value={form.language} onChange={(e) => set('language', e.target.value)} placeholder="English" />
            </div>
          </div>

          {/* Short description */}
          <div>
            <label className={lbl}>Short Description</label>
            <input className={inp} value={form.short_description} onChange={(e) => set('short_description', e.target.value)} placeholder="One-line summary shown in cards" />
          </div>

          {/* Description */}
          <div>
            <label className={lbl}>Full Description</label>
            <textarea className={`${inp} resize-none`} rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Detailed description of the book…" />
          </div>

          {/* Tags */}
          <div>
            <label className={lbl}>Tags (comma-separated)</label>
            <input className={inp} value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="e.g. networking, cisco, python" />
          </div>

          {/* Price + Free toggle */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className={lbl}>Price (USD)</label>
              <input className={inp} type="number" min="0" step="0.01" value={form.price} onChange={(e) => set('price', e.target.value)} disabled={form.is_free} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer pb-2.5">
              <input type="checkbox" checked={form.is_free} onChange={(e) => { set('is_free', e.target.checked); if (e.target.checked) set('price', '0'); }}
                className="w-4 h-4 accent-emerald-500" />
              <span className="text-sm text-gray-300">Free book</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium py-2.5 rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2">
              {loading ? (
                <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />{isEdit ? 'Saving…' : 'Uploading…'}</>
              ) : isEdit ? 'Save Changes' : 'Upload Book'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main AdminBooks Page ───────────────────────────────────────────────────────

export default function AdminBooks() {
  const [books,      setBooks]      = useState([]);
  const [pagination, setPagination] = useState({ page:1, totalPages:1, total:0 });
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [page,       setPage]       = useState(1);
  const [showForm,   setShowForm]   = useState(false);
  const [editBook,   setEditBook]   = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  // Load categories once
  useEffect(() => {
    fetch(`${BASE_URL}/api/projects/categories`)
      .then((r) => r.json())
      .then((d) => setCategories(d.data || []))
      .catch(() => {});
  }, []);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.set('q', search);
      const res  = await fetch(`${BASE_URL}/api/books?${params}&is_published_all=1`, { headers: authHeaders() });
      const data = await res.json();
      // Admin fetch: get all books including drafts via admin endpoint
      const res2  = await fetch(`${BASE_URL}/api/admin/books?${params}`, { headers: authHeaders() });
      const data2 = await res2.json();
      if (data2.success) {
        setBooks(data2.data || []);
        setPagination(data2.pagination || { page:1, totalPages:1, total:0 });
      } else {
        // fallback to public endpoint
        setBooks(data.data || []);
        setPagination(data.pagination || { page:1, totalPages:1, total:0 });
      }
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  async function togglePublish(id, current) {
    setActionLoading((p) => ({ ...p, [`pub_${id}`]: true }));
    try {
      await fetch(`${BASE_URL}/api/books/${id}/publish`, { method:'PATCH', headers: authHeaders() });
      setBooks((prev) => prev.map((b) => b.id === id ? { ...b, is_published: !current } : b));
    } catch (e) { alert(e.message); }
    finally { setActionLoading((p) => ({ ...p, [`pub_${id}`]: false })); }
  }

  async function toggleFeature(id, current) {
    setActionLoading((p) => ({ ...p, [`feat_${id}`]: true }));
    try {
      await fetch(`${BASE_URL}/api/books/${id}/feature`, { method:'PATCH', headers: authHeaders() });
      setBooks((prev) => prev.map((b) => b.id === id ? { ...b, is_featured: !current } : b));
    } catch (e) { alert(e.message); }
    finally { setActionLoading((p) => ({ ...p, [`feat_${id}`]: false })); }
  }

  async function deleteBook(id, title) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    setActionLoading((p) => ({ ...p, [`del_${id}`]: true }));
    try {
      await fetch(`${BASE_URL}/api/books/${id}`, { method:'DELETE', headers: authHeaders() });
      setBooks((prev) => prev.filter((b) => b.id !== id));
    } catch (e) { alert(e.message); }
    finally { setActionLoading((p) => ({ ...p, [`del_${id}`]: false })); }
  }

  function openEdit(book) { setEditBook(book); setShowForm(true); }
  function openCreate()   { setEditBook(null);  setShowForm(true); }
  function closeForm()    { setShowForm(false);  setEditBook(null); }
  function onSaved()      { closeForm(); load(); }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Books Library</h1>
          <p className="text-gray-500 text-sm mt-0.5">{pagination.total} total books</p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold text-sm px-4 py-2.5 rounded-xl transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          Upload Book
        </button>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 focus-within:border-emerald-500 transition-colors max-w-sm">
        <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search title or author…"
          className="flex-1 bg-transparent text-white placeholder-gray-600 text-sm outline-none" />
      </div>

      {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 text-sm">{error}</div>}

      {/* Table */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-left px-4 py-3 font-medium">Book</th>
                <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Author</th>
                <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Price</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Size</th>
                <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Downloads</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {loading ? (
                <tr><td colSpan={7} className="py-12 text-center">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
                </td></tr>
              ) : books.length === 0 ? (
                <tr><td colSpan={7} className="py-12 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-600">
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span className="text-sm">No books yet. Upload your first book!</span>
                    <button onClick={openCreate} className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition-colors">
                      + Upload Book
                    </button>
                  </div>
                </td></tr>
              ) : books.map((b) => (
                <tr key={b.id} className="hover:bg-gray-800/40 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-14 bg-gray-800 rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
                        {b.cover_image_path ? (
                          <img src={`${BASE_URL}/uploads/${b.cover_image_path}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-white font-medium text-sm truncate max-w-[160px]">{b.title}</p>
                        <p className="text-gray-500 text-xs">{b.category || 'No category'}</p>
                        {b.is_featured && <span className="text-xs text-cyan-400">★ Featured</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-gray-300 text-xs">{b.author}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    {b.is_free ? (
                      <span className="text-emerald-400 font-semibold text-xs">Free</span>
                    ) : (
                      <span className="text-white font-semibold text-sm">${parseFloat(b.price||0).toFixed(2)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">{fmtBytes(b.file_size_bytes)}</td>
                  <td className="px-4 py-3 hidden lg:table-cell text-gray-400 text-sm">{b.download_count || 0}</td>
                  <td className="px-4 py-3"><StatusBadge published={b.is_published} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button onClick={() => togglePublish(b.id, b.is_published)}
                        disabled={actionLoading[`pub_${b.id}`]}
                        className={`text-xs font-medium px-2.5 py-1 rounded-lg transition-colors disabled:opacity-50 ${b.is_published ? 'bg-yellow-500/10 text-yellow-400 hover:bg-yellow-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}>
                        {actionLoading[`pub_${b.id}`] ? '…' : b.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button onClick={() => toggleFeature(b.id, b.is_featured)}
                        disabled={actionLoading[`feat_${b.id}`]}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-800 text-gray-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors disabled:opacity-50">
                        {actionLoading[`feat_${b.id}`] ? '…' : b.is_featured ? '★ Unfeature' : '☆ Feature'}
                      </button>
                      <button onClick={() => openEdit(b)}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
                        Edit
                      </button>
                      <Link to={`/books/${b.id}`} target="_blank"
                        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-gray-800 text-gray-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors">
                        View
                      </Link>
                      <button onClick={() => deleteBook(b.id, b.title)}
                        disabled={actionLoading[`del_${b.id}`]}
                        className="text-xs font-medium px-2.5 py-1 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50">
                        {actionLoading[`del_${b.id}`] ? '…' : 'Delete'}
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
            <span className="text-xs text-gray-500">Page {page} of {pagination.totalPages} · {pagination.total} books</span>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page===1}
                className="text-xs px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors">Previous</button>
              <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p+1))} disabled={page===pagination.totalPages}
                className="text-xs px-3 py-1.5 bg-gray-800 text-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-700 transition-colors">Next</button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <BookFormModal
          book={editBook}
          categories={categories}
          onClose={closeForm}
          onSaved={onSaved}
        />
      )}
    </div>
  );
}
