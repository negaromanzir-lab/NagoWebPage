/**
 * ProjectCard.jsx
 *
 * Renders a project listing card.
 * Accepts either:
 *  - Real API project objects (from /api/projects)
 *  - Legacy hardcoded objects (from FeaturedProjects) via the `legacy` prop
 */

import { Link } from 'react-router-dom';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DIFFICULTY_COLORS = {
  beginner:     'bg-green-500/10 text-green-400 border-green-500/20',
  intermediate: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  advanced:     'bg-red-500/10 text-red-400 border-red-500/20',
};

const TOPOLOGY_ICONS = {
  star:         '⭐',
  mesh:         '🕸️',
  ring:         '🔄',
  hierarchical: '🌳',
  bus:          '🚌',
  hybrid:       '🔀',
  cloud:        '☁️',
  sdwan:        '🌐',
};

/**
 * @param {{ project: object, legacy?: boolean }} props
 *   legacy=true  → uses old shape: { title, category, vendor, rating, reviews, price, badge, topology }
 *   legacy=false → uses API shape: { id, title, category, vendor, avg_rating, review_count, price, difficulty, topology_type, preview_image_path, is_featured }
 */
export default function ProjectCard({ project, legacy = false }) {
  if (legacy) {
    // ── Legacy hardcoded card (FeaturedProjects) ──────────────────────────
    const { title, category, vendor, rating, reviews, price, badge, topology } = project;
    return (
      <div className="group bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300">
        <div className="relative h-44 bg-gray-800 overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="absolute inset-0 flex items-center justify-center">{topology}</div>
          {badge && (
            <span className="absolute top-3 left-3 bg-cyan-500 text-gray-950 text-xs font-bold px-2.5 py-1 rounded-full">{badge}</span>
          )}
        </div>
        <div className="p-5">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-cyan-400 font-medium bg-cyan-500/10 px-2 py-0.5 rounded-full">{category}</span>
            <span className="text-xs text-gray-500">{vendor}</span>
          </div>
          <h3 className="text-white font-semibold text-sm leading-snug mb-3 group-hover:text-cyan-400 transition-colors line-clamp-2">{title}</h3>
          <div className="flex items-center gap-1 mb-4">
            <svg className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            <span className="text-yellow-400 text-xs font-semibold">{rating}</span>
            <span className="text-gray-500 text-xs">({reviews})</span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-white font-bold text-lg">${price}</span>
              {price > 0 && <span className="text-gray-500 text-xs ml-1">one-time</span>}
            </div>
            <Link to="/projects" className="bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-gray-950 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200">
              View Project
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── API-backed card ────────────────────────────────────────────────────────
  const {
    id,
    title,
    category,
    vendor,
    avg_rating,
    review_count,
    price,
    original_price,
    difficulty,
    topology_type,
    preview_image_path,
    is_featured,
    short_description,
    download_count,
  } = project;

  const rating  = parseFloat(avg_rating || 0).toFixed(1);
  const reviews = review_count || 0;
  const isFree  = parseFloat(price) === 0;

  const previewUrl = preview_image_path
    ? `${BASE_URL}/uploads/projects/previews/${preview_image_path.split('/').pop()}`
    : null;

  return (
    <div className="group bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300">
      {/* Preview image / topology placeholder */}
      <div className="relative h-44 bg-gray-800 overflow-hidden">
        {previewUrl ? (
          <img
            src={previewUrl}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <>
            <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl opacity-30">{TOPOLOGY_ICONS[topology_type] || '🌐'}</span>
            </div>
          </>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {is_featured && (
            <span className="bg-cyan-500 text-gray-950 text-xs font-bold px-2.5 py-1 rounded-full">Featured</span>
          )}
          {isFree && (
            <span className="bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">Free</span>
          )}
        </div>

        {/* Difficulty badge */}
        {difficulty && (
          <div className="absolute top-3 right-3">
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${DIFFICULTY_COLORS[difficulty] || ''}`}>
              {difficulty}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {category && (
            <span className="text-xs text-cyan-400 font-medium bg-cyan-500/10 px-2 py-0.5 rounded-full">
              {category}
            </span>
          )}
          {vendor && <span className="text-xs text-gray-500">{vendor}</span>}
        </div>

        <h3 className="text-white font-semibold text-sm leading-snug mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">
          {title}
        </h3>

        {short_description && (
          <p className="text-gray-500 text-xs leading-relaxed mb-3 line-clamp-2">{short_description}</p>
        )}

        {/* Rating */}
        <div className="flex items-center gap-1 mb-4">
          <svg className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          <span className="text-yellow-400 text-xs font-semibold">{rating}</span>
          <span className="text-gray-500 text-xs">({reviews})</span>
          {download_count > 0 && (
            <span className="text-gray-600 text-xs ml-auto">{download_count} downloads</span>
          )}
        </div>

        {/* Price + CTA */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-white font-bold text-lg">
              {isFree ? 'Free' : `$${parseFloat(price).toFixed(2)}`}
            </span>
            {original_price && parseFloat(original_price) > parseFloat(price) && (
              <span className="text-gray-500 text-xs line-through">${parseFloat(original_price).toFixed(2)}</span>
            )}
            {!isFree && <span className="text-gray-500 text-xs">one-time</span>}
          </div>
          <Link
            to={`/projects/${id}`}
            className="bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-gray-950 text-xs font-semibold px-3 py-1.5 rounded-lg transition-all duration-200"
          >
            View Project
          </Link>
        </div>
      </div>
    </div>
  );
}
