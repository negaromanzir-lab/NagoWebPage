import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SearchBar({ large = false, initialQuery = '' }) {
  const [query, setQuery] = useState(initialQuery);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const q = query.trim();
    if (q) {
      navigate(`/projects?q=${encodeURIComponent(q)}`);
    } else {
      navigate('/projects');
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className={`flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-4 ${
        large ? 'py-3 max-w-2xl mx-auto' : 'py-2 max-w-lg'
      } focus-within:border-cyan-500 transition-colors duration-200`}
      role="search"
    >
      <svg
        className="w-5 h-5 text-gray-500 shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search network designs, topologies, vendors..."
        className={`flex-1 bg-transparent text-white placeholder-gray-500 outline-none ${
          large ? 'text-base' : 'text-sm'
        }`}
        aria-label="Search network projects"
      />
      <button
        type="submit"
        className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold px-4 py-1.5 rounded-lg text-sm transition-colors duration-200 shrink-0"
      >
        Search
      </button>
    </form>
  );
}
