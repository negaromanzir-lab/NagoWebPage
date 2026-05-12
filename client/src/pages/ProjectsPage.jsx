/**
 * ProjectsPage.jsx
 *
 * Full-featured project browsing page with:
 *  - Advanced filtering: category, difficulty, price range, technology/vendor, topology
 *  - Real-time search with debounce
 *  - Sort options: newest, price asc/desc, rating, popular
 *  - Pagination
 *  - Active filter chips
 *  - Responsive sidebar filter panel (collapsible on mobile)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import ProjectCard from '../components/ProjectCard';
import { projectsApi } from '../lib/api';

// ── Helpers ────────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="flex justify-center items-center py-20">
      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-800 pb-4 mb-4">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full text-left mb-3"
        aria-expanded={open}
      >
        <span className="text-white text-sm font-semibold">{title}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}

function CheckboxOption({ label, count, checked, onChange, color }) {
  return (
    <label className="flex items-center gap-2.5 py-1 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-gray-900 cursor-pointer"
      />
      <span className={`text-sm flex-1 group-hover:text-white transition-colors ${checked ? 'text-white' : 'text-gray-400'}`}>
        {color && <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${color}`} />}
        {label}
      </span>
      {count !== undefined && (
        <span className="text-xs text-gray-600">{count}</span>
      )}
    </label>
  );
}

function ActiveFilterChip({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1.5 bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-medium px-2.5 py-1 rounded-full">
      {label}
      <button onClick={onRemove} className="hover:text-white transition-colors" aria-label={`Remove ${label} filter`}>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

// ── Difficulty config ──────────────────────────────────────────────────────────

const DIFFICULTY_CONFIG = {
  beginner:     { label: 'Beginner',     color: 'bg-green-500' },
  intermediate: { label: 'Intermediate', color: 'bg-yellow-500' },
  advanced:     { label: 'Advanced',     color: 'bg-red-500' },
};

const TOPOLOGY_LABELS = {
  star:         'Star',
  mesh:         'Mesh',
  ring:         'Ring',
  hierarchical: 'Hierarchical',
  bus:          'Bus',
  hybrid:       'Hybrid',
  cloud:        'Cloud',
  sdwan:        'SD-WAN',
};

const SORT_OPTIONS = [
  { value: 'newest',     label: 'Newest First' },
  { value: 'popular',    label: 'Most Popular' },
  { value: 'rating',     label: 'Highest Rated' },
  { value: 'price_asc',  label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'oldest',     label: 'Oldest First' },
];

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Filter state (synced with URL) ─────────────────────────────────────────
  const [searchInput, setSearchInput]       = useState(searchParams.get('q') || '');
  const [selectedCategories, setCategories] = useState(() => searchParams.getAll('category'));
  const [selectedDifficulties, setDiffs]    = useState(() => searchParams.getAll('difficulty'));
  const [selectedTopologies, setTopologies] = useState(() => searchParams.getAll('topology_type'));
  const [selectedVendors, setVendors]       = useState(() => searchParams.getAll('vendor'));
  const [priceMin, setPriceMin]             = useState(searchParams.get('price_min') || '');
  const [priceMax, setPriceMax]             = useState(searchParams.get('price_max') || '');
  const [sort, setSort]                     = useState(searchParams.get('sort') || 'newest');
  const [page, setPage]                     = useState(parseInt(searchParams.get('page') || '1', 10));
  const [showFreeOnly, setShowFreeOnly]     = useState(searchParams.get('free') === '1');

  // ── UI state ───────────────────────────────────────────────────────────────
  const [filterOpen, setFilterOpen] = useState(false);
  const [projects, setProjects]     = useState([]);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [filterMeta, setFilterMeta] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [metaLoading, setMetaLoading] = useState(true);

  const debouncedSearch = useDebounce(searchInput, 400);
  const abortRef = useRef(null);

  // ── Load filter metadata once ──────────────────────────────────────────────
  useEffect(() => {
    projectsApi.getFilterMeta()
      .then((res) => setFilterMeta(res.data))
      .catch(() => {})
      .finally(() => setMetaLoading(false));
  }, []);

  // ── Build query params from state ─────────────────────────────────────────
  const buildParams = useCallback(() => {
    const p = {};
    if (debouncedSearch) p.q = debouncedSearch;
    if (selectedCategories.length === 1) p.category = selectedCategories[0];
    if (selectedDifficulties.length === 1) p.difficulty = selectedDifficulties[0];
    if (selectedTopologies.length === 1) p.topology_type = selectedTopologies[0];
    if (selectedVendors.length === 1) p.vendor = selectedVendors[0];
    if (priceMin) p.price_min = priceMin;
    if (priceMax) p.price_max = priceMax;
    if (showFreeOnly) { p.price_min = '0'; p.price_max = '0'; }
    p.sort = sort;
    p.page = page;
    p.limit = 12;
    return p;
  }, [debouncedSearch, selectedCategories, selectedDifficulties, selectedTopologies, selectedVendors, priceMin, priceMax, sort, page, showFreeOnly]);

  // ── Fetch projects when filters change ────────────────────────────────────
  useEffect(() => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    const params = buildParams();

    // Sync URL
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== '') urlParams.set(k, v); });
    selectedCategories.forEach((c) => urlParams.append('category', c));
    selectedDifficulties.forEach((d) => urlParams.append('difficulty', d));
    selectedTopologies.forEach((t) => urlParams.append('topology_type', t));
    selectedVendors.forEach((v) => urlParams.append('vendor', v));
    setSearchParams(urlParams, { replace: true });

    projectsApi.list(params)
      .then((res) => {
        if (!controller.signal.aborted) {
          setProjects(res.data || []);
          setPagination(res.pagination || { total: 0, totalPages: 1 });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setProjects([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [buildParams]);

  // Reset page to 1 when filters change (not page itself)
  const resetPage = () => setPage(1);

  // ── Toggle helpers ─────────────────────────────────────────────────────────
  function toggleItem(setter, value) {
    setter((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
    resetPage();
  }

  // ── Active filter chips ────────────────────────────────────────────────────
  const activeFilters = [
    ...selectedCategories.map((c) => ({
      label: filterMeta?.categories?.find((cat) => cat.slug === c)?.name || c,
      remove: () => { setCategories((p) => p.filter((v) => v !== c)); resetPage(); },
    })),
    ...selectedDifficulties.map((d) => ({
      label: DIFFICULTY_CONFIG[d]?.label || d,
      remove: () => { setDiffs((p) => p.filter((v) => v !== d)); resetPage(); },
    })),
    ...selectedTopologies.map((t) => ({
      label: TOPOLOGY_LABELS[t] || t,
      remove: () => { setTopologies((p) => p.filter((v) => v !== t)); resetPage(); },
    })),
    ...selectedVendors.map((v) => ({
      label: v,
      remove: () => { setVendors((p) => p.filter((x) => x !== v)); resetPage(); },
    })),
    ...(priceMin ? [{ label: `Min $${priceMin}`, remove: () => { setPriceMin(''); resetPage(); } }] : []),
    ...(priceMax ? [{ label: `Max $${priceMax}`, remove: () => { setPriceMax(''); resetPage(); } }] : []),
    ...(showFreeOnly ? [{ label: 'Free only', remove: () => { setShowFreeOnly(false); resetPage(); } }] : []),
  ];

  function clearAllFilters() {
    setCategories([]);
    setDiffs([]);
    setTopologies([]);
    setVendors([]);
    setPriceMin('');
    setPriceMax('');
    setShowFreeOnly(false);
    setSearchInput('');
    setSort('newest');
    setPage(1);
  }

  // ── Sidebar filter panel ───────────────────────────────────────────────────
  const filterPanel = (
    <div className="space-y-0">
      {/* Free only */}
      <FilterSection title="Price Type">
        <CheckboxOption
          label="Free projects only"
          checked={showFreeOnly}
          onChange={() => { setShowFreeOnly((p) => !p); resetPage(); }}
        />
        {filterMeta && (
          <div className="mt-3 space-y-2">
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Min ($)</label>
                <input
                  type="number"
                  min="0"
                  value={priceMin}
                  onChange={(e) => { setPriceMin(e.target.value); resetPage(); }}
                  placeholder={`${Math.floor(filterMeta.priceRange?.min || 0)}`}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  disabled={showFreeOnly}
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">Max ($)</label>
                <input
                  type="number"
                  min="0"
                  value={priceMax}
                  onChange={(e) => { setPriceMax(e.target.value); resetPage(); }}
                  placeholder={`${Math.ceil(filterMeta.priceRange?.max || 200)}`}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-cyan-500"
                  disabled={showFreeOnly}
                />
              </div>
            </div>
          </div>
        )}
      </FilterSection>

      {/* Categories */}
      {!metaLoading && filterMeta?.categories?.length > 0 && (
        <FilterSection title="Category">
          {filterMeta.categories.map((cat) => (
            <CheckboxOption
              key={cat.slug}
              label={cat.name}
              count={cat.project_count}
              checked={selectedCategories.includes(cat.slug)}
              onChange={() => toggleItem(setCategories, cat.slug)}
            />
          ))}
        </FilterSection>
      )}

      {/* Difficulty */}
      <FilterSection title="Difficulty">
        {Object.entries(DIFFICULTY_CONFIG).map(([key, { label, color }]) => (
          <CheckboxOption
            key={key}
            label={label}
            color={color}
            checked={selectedDifficulties.includes(key)}
            onChange={() => toggleItem(setDiffs, key)}
          />
        ))}
      </FilterSection>

      {/* Topology */}
      <FilterSection title="Topology Type" defaultOpen={false}>
        {Object.entries(TOPOLOGY_LABELS).map(([key, label]) => (
          <CheckboxOption
            key={key}
            label={label}
            checked={selectedTopologies.includes(key)}
            onChange={() => toggleItem(setTopologies, key)}
          />
        ))}
      </FilterSection>

      {/* Vendors / Technology */}
      {!metaLoading && filterMeta?.vendors?.length > 0 && (
        <FilterSection title="Technology / Vendor" defaultOpen={false}>
          {filterMeta.vendors.slice(0, 15).map((v) => (
            <CheckboxOption
              key={v.vendor}
              label={v.vendor}
              count={v.count}
              checked={selectedVendors.includes(v.vendor)}
              onChange={() => toggleItem(setVendors, v.vendor)}
            />
          ))}
        </FilterSection>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Browse Projects</h1>
          <p className="text-gray-400">
            {loading ? 'Loading…' : `${pagination.total} network design project${pagination.total !== 1 ? 's' : ''} found`}
          </p>
        </div>

        {/* ── Search bar ───────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 focus-within:border-cyan-500 transition-colors">
            <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => { setSearchInput(e.target.value); resetPage(); }}
              placeholder="Search by title, vendor, technology..."
              className="flex-1 bg-transparent text-white placeholder-gray-500 outline-none text-sm"
              aria-label="Search projects"
            />
            {searchInput && (
              <button onClick={() => { setSearchInput(''); resetPage(); }} className="text-gray-500 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Mobile filter toggle */}
          <button
            onClick={() => setFilterOpen(true)}
            className="lg:hidden flex items-center gap-2 bg-gray-900 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white px-4 py-3 rounded-xl text-sm font-medium transition-colors"
            aria-label="Open filters"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            Filters
            {activeFilters.length > 0 && (
              <span className="bg-cyan-500 text-gray-950 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {activeFilters.length}
              </span>
            )}
          </button>

          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => { setSort(e.target.value); resetPage(); }}
            className="bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-xl px-3 py-3 focus:outline-none focus:border-cyan-500 cursor-pointer"
            aria-label="Sort projects"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>

        {/* ── Active filter chips ───────────────────────────────────────────── */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <span className="text-gray-500 text-xs">Active filters:</span>
            {activeFilters.map((f, i) => (
              <ActiveFilterChip key={i} label={f.label} onRemove={f.remove} />
            ))}
            <button
              onClick={clearAllFilters}
              className="text-xs text-gray-500 hover:text-red-400 transition-colors underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}

        {/* ── Layout: sidebar + grid ────────────────────────────────────────── */}
        <div className="flex gap-8">
          {/* Desktop sidebar */}
          <aside className="hidden lg:block w-60 shrink-0">
            <div className="sticky top-20 bg-gray-900 border border-gray-800 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-white font-semibold text-sm">Filters</h2>
                {activeFilters.length > 0 && (
                  <button onClick={clearAllFilters} className="text-xs text-gray-500 hover:text-red-400 transition-colors">
                    Clear all
                  </button>
                )}
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
                  <button onClick={() => setFilterOpen(false)} className="text-gray-400 hover:text-white" aria-label="Close filters">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {filterPanel}
                <button
                  onClick={() => setFilterOpen(false)}
                  className="w-full mt-4 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold py-2.5 rounded-xl text-sm transition-colors"
                >
                  Show {pagination.total} results
                </button>
              </aside>
            </div>
          )}

          {/* Project grid */}
          <div className="flex-1 min-w-0">
            {loading ? (
              <Spinner />
            ) : projects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-gray-800 rounded-2xl flex items-center justify-center text-gray-600 mb-4">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <p className="text-white font-semibold mb-1">No projects found</p>
                <p className="text-gray-500 text-sm mb-4">Try adjusting your filters or search terms.</p>
                <button
                  onClick={clearAllFilters}
                  className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold px-5 py-2 rounded-xl text-sm transition-colors"
                >
                  Clear all filters
                </button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                  {projects.map((project) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-10">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="px-4 py-2 bg-gray-900 border border-gray-700 hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 hover:text-white rounded-xl text-sm transition-colors"
                    >
                      ← Previous
                    </button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(7, pagination.totalPages) }, (_, i) => {
                        let pageNum;
                        const total = pagination.totalPages;
                        if (total <= 7) {
                          pageNum = i + 1;
                        } else if (page <= 4) {
                          pageNum = i < 6 ? i + 1 : total;
                        } else if (page >= total - 3) {
                          pageNum = i === 0 ? 1 : total - 6 + i;
                        } else {
                          const offsets = [0, 1, 2, 3, 4, 5, 6];
                          const map = [1, page - 2, page - 1, page, page + 1, page + 2, total];
                          pageNum = map[offsets[i]];
                        }
                        const isEllipsis = i > 0 && pageNum - (i === 1 ? 1 : (i === 5 ? pagination.totalPages - 1 : pageNum - 1)) > 1;
                        return (
                          <button
                            key={i}
                            onClick={() => !isEllipsis && setPage(pageNum)}
                            className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors ${
                              pageNum === page
                                ? 'bg-cyan-500 text-gray-950'
                                : 'bg-gray-900 border border-gray-700 hover:border-gray-500 text-gray-400 hover:text-white'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                      disabled={page === pagination.totalPages}
                      className="px-4 py-2 bg-gray-900 border border-gray-700 hover:border-gray-500 disabled:opacity-40 disabled:cursor-not-allowed text-gray-300 hover:text-white rounded-xl text-sm transition-colors"
                    >
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
