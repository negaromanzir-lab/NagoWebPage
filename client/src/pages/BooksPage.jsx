import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import BookCard from '../components/BookCard';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function useDebounce(val, delay = 400) {
  const [d, setD] = useState(val);
  useEffect(() => { const t = setTimeout(() => setD(val), delay); return () => clearTimeout(t); }, [val, delay]);
  return d;
}

function Spinner() {
  return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest First' },
  { value: 'popular',    label: 'Most Downloaded' },
  { value: 'rating',     label: 'Highest Rated' },
  { value: 'title_asc',  label: 'Title A–Z' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
];

export default function BooksPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [searchInput, setSearchInput]   = useState(searchParams.get('q') || '');
  const [category,    setCategory]      = useState(searchParams.get('category') || '');
  const [freeOnly,    setFreeOnly]      = useState(searchParams.get('free') === '1');
  const [sort,        setSort]          = useState(searchParams.get('sort') || 'newest');
  const [page,        setPage]          = useState(1);

  const [books,      setBooks]      = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [categories, setCategories] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  const debouncedQ = useDebounce(searchInput);
  const abortRef   = useRef(null);

  // Load categories once
  useEffect(() => {
    fetch(`${BASE_URL}/api/projects/categories`)
      .then((r) => r.json())
      .then((d) => setCategories(d.data || []))
      .catch(() => {});
  }, []);

  // Fetch books whenever filters change
  const fetchBooks = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(true);
    const params = new URLSearchParams({ sort, page, limit: 12 });
    if (debouncedQ) params.set('q', debouncedQ);
    if (category)   params.set('category', category);
    if (freeOnly)   params.set('is_free', '1');

    // Sync URL
    setSearchParams(params, { replace: true });

    fetch(`${BASE_URL}/api/books?${params}`, { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d) => {
        if (!ctrl.signal.aborted) {
          setBooks(d.data || []);
          setPagination(d.pagination || { total: 0, totalPages: 1 });
        }
      })
      .catch((e) => { if (e.name !== 'AbortError') setBooks([]); })
      .finally(() => { if (!ctrl.signal.aborted) setLoading(false); });

    return () => ctrl.abort();
  }, [debouncedQ, category, freeOnly, sort, page]);

  useEffect(fetchBooks, [fetchBooks]);

  function resetPage() { setPage(1); }

  function clearAll() {
    setSearchInput('');
    setCategory('');
    setFreeOnly(false);
    setSort('newest');
    setPage(1);
  }

  const filterPanel = (
    <div className="space-y-5">
      {/* Free only */}
      <div>
        <p className="text-white text-sm font-semibold mb-2">Price</p>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={freeOnly} onChange={() => { setFreeOnly((p) => !p); resetPage(); }}
            className="w-4 h-4 accent-emerald-500 rounded" />
          <span className="text-sm text-gray-400">Free books only</span>
        </label>
      </div>

      {/* Category */}
      {categories.length > 0 && (
        <div>
          <p className="text-white text-sm font-semibold mb-2">Category</p>
          <div className="space-y-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="cat" value="" checked={category === ''} onChange={() => { setCategory(''); resetPage(); }}
                className="w-4 h-4 accent-emerald-500" />
              <span className="text-sm text-gray-400">All</span>
            </label>
            {categories.map((c) => (
              <label key={c.slug} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="cat" value={c.slug} checked={category === c.slug}
                  onChange={() => { setCategory(c.slug); resetPage(); }}
                  className="w-4 h-4 accent-emerald-500" />
                <span className="text-sm text-gray-400">{c.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-1">
            📚 Book Library
          </h1>
          <p className="text-gray-400">
            {loading ? 'Loading…' : `${pagination.total} book${pagination.total !== 1 ? 's' : ''} available`}
          </p>
        </div>

        {/* Search + Sort bar */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 focus-within:border-emerald-500 transition-colors">
            <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); resetPage(); }}
              placeholder="Search by title, author, description..."
              className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm" />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); resetPage(); }} className="text-gray-500 hover:text-white">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Mobile filter */}
          <button onClick={() => setFilterOpen(true)}
            className="lg:hidden flex items-center gap-2 bg-gray-900 border border-gray-700 text-gray-300 px-4 py-3 rounded-xl text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filters
          </button>

          <select value={sort} onChange={(e) => { setSort(e.target.value); resetPage(); }}
            className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-xl px-3 py-3 outline-none focus:border-emerald-500 cursor-pointer">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Layout */}
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-56 shrink-0">
            <div className="sticky top-20 bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold text-sm">Filters</h2>
                <button onClick={clearAll} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                  Clear
                </button>
              </div>
              {filterPanel}
            </div>
          </aside>

          {/* Mobile filter drawer */}
          {filterOpen && (
            <div className="lg:hidden fixed inset-0 z-50 flex">
              <div className="fixed inset-0 bg-gray-950/80" onClick={() => setFilterOpen(false)} />
              <aside className="relative ml-auto w-72 bg-gray-900 border-l border-gray-800 h-full overflow-y-auto z-50 p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-white font-semibold">Filters</h2>
                  <button onClick={() => setFilterOpen(false)} className="text-gray-400 hover:text-white">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {filterPanel}
                <button onClick={() => setFilterOpen(false)}
                  className="w-full mt-6 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                  Show {pagination.total} results
                </button>
              </aside>
            </div>
          )}

          {/* Grid */}
          <div className="flex-1 min-w-0">
            {loading ? <Spinner /> : books.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-6xl mb-4">📚</div>
                <p className="text-white font-semibold mb-1">No books found</p>
                <p className="text-gray-500 text-sm mb-4">Try adjusting your search or filters.</p>
                <button onClick={clearAll}
                  className="bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors">
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {books.map((b) => <BookCard key={b.id} book={b} />)}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                      className="px-4 py-2 bg-gray-900 border border-gray-700 text-gray-300 rounded-xl text-sm disabled:opacity-40 hover:border-gray-500 transition-colors">
                      ← Previous
                    </button>
                    <span className="text-gray-400 text-sm px-2">
                      Page {page} of {pagination.totalPages}
                    </span>
                    <button onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))} disabled={page === pagination.totalPages}
                      className="px-4 py-2 bg-gray-900 border border-gray-700 text-gray-300 rounded-xl text-sm disabled:opacity-40 hover:border-gray-500 transition-colors">
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
