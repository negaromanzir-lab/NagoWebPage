/**
 * BookCard.jsx — renders a single book listing card
 */
import { Link } from 'react-router-dom';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function fmtBytes(b) {
  if (!b) return '';
  const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(b) / Math.log(k)), 3);
  return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
}

export default function BookCard({ book }) {
  const coverUrl = book.cover_image_path
    ? `${BASE_URL}/uploads/${book.cover_image_path}`
    : null;

  const isFree = book.is_free || parseFloat(book.price || 0) === 0;

  return (
    <Link to={`/books/${book.id}`} className="block group">
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300 flex flex-col h-full">

        {/* Cover */}
        <div className="relative h-52 bg-gray-800 overflow-hidden shrink-0">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt={book.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-900/40 to-teal-900/40">
              <svg className="w-16 h-16 text-emerald-500/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}

          {/* Badges */}
          <div className="absolute top-3 left-3 flex gap-1.5">
            {book.is_featured && (
              <span className="bg-cyan-500 text-gray-950 text-xs font-bold px-2 py-0.5 rounded-full">Featured</span>
            )}
            {isFree && (
              <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Free</span>
            )}
          </div>

          {/* PDF badge */}
          <div className="absolute bottom-3 right-3">
            <span className="bg-gray-950/80 text-red-400 text-xs font-bold px-2 py-0.5 rounded border border-red-500/30">
              PDF
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <p className="text-xs text-emerald-400 font-medium mb-1 truncate">
            {book.category || 'General'}
          </p>

          <h3 className="text-white font-semibold text-sm leading-snug mb-1 group-hover:text-cyan-400 transition-colors line-clamp-2">
            {book.title}
          </h3>

          <p className="text-gray-500 text-xs mb-2 truncate">by {book.author}</p>

          {book.short_description && (
            <p className="text-gray-500 text-xs leading-relaxed mb-3 line-clamp-2 flex-1">
              {book.short_description}
            </p>
          )}

          {/* Meta row */}
          <div className="flex items-center gap-3 text-xs text-gray-600 mb-3">
            {book.pages   && <span>📄 {book.pages}pp</span>}
            {book.language && <span>🌐 {book.language}</span>}
            {book.file_size_bytes && <span>💾 {fmtBytes(book.file_size_bytes)}</span>}
          </div>

          {/* Rating */}
          {book.review_count > 0 && (
            <div className="flex items-center gap-1 mb-3">
              <svg className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span className="text-yellow-400 text-xs font-semibold">
                {parseFloat(book.rating || 0).toFixed(1)}
              </span>
              <span className="text-gray-600 text-xs">({book.review_count})</span>
              <span className="ml-auto text-gray-600 text-xs">
                ⬇️ {book.download_count || 0}
              </span>
            </div>
          )}

          {/* Price + CTA */}
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-800">
            <span className="text-white font-bold text-base">
              {isFree ? 'Free' : `$${parseFloat(book.price).toFixed(2)}`}
            </span>
            <span className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200 border border-emerald-500/20">
              View Book
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
