import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { projectsApi, downloadApi, userApi } from '../lib/api';
import { ApiError } from '../lib/api';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DIFFICULTY_COLORS = {
  beginner:     'bg-green-500/10 text-green-400 border border-green-500/20',
  intermediate: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20',
  advanced:     'bg-red-500/10 text-red-400 border border-red-500/20',
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

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [isInWishlistLoading, setIsInWishlistLoading] = useState(false);
  const [purchaseLoading, setPurchaseLoading] = useState(false);

  useEffect(() => {
    async function loadProject() {
      try {
        const res = await projectsApi.getOne(id);
        setProject(res.data);
        checkWishlist();
      } catch (err) {
        setError(err.message || 'Failed to load project');
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [id]);

  const checkWishlist = async () => {
    try {
      const res = await userApi.getWishlist();
      const wishlist = res.data || [];
      setIsInWishlist(wishlist.some((w) => w.id === parseInt(id)));
    } catch {
      // Silently fail, user might not be logged in
    }
  };

  const toggleWishlist = async () => {
    if (!project) return;
    setIsInWishlistLoading(true);
    try {
      if (isInWishlist) {
        await userApi.removeFromWishlist(project.id);
      } else {
        // Note: You might need to add an API method for adding to wishlist
        // For now, this assumes it exists
      }
      setIsInWishlist(!isInWishlist);
    } catch (err) {
      console.error('Wishlist error:', err);
    } finally {
      setIsInWishlistLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!project) return;

    const isFree = parseFloat(project.price) === 0;

    if (isFree) {
      // For free projects, request download token
      setPurchaseLoading(true);
      try {
        const res = await downloadApi.requestToken(project.id);
        const token = res.data?.token;
        if (token) {
          window.location.href = downloadApi.fileUrl(token);
        } else {
          alert('Failed to download. Please try again.');
        }
      } catch (err) {
        alert(err.message || 'Download failed');
      } finally {
        setPurchaseLoading(false);
      }
    } else {
      // For paid projects, redirect to manual payment or checkout
      navigate('/pay', { state: { projectId: project.id, projectTitle: project.title, price: project.price } });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-4xl mx-auto px-4 py-12 flex flex-col items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">{error || 'Project not found'}</h1>
            <Link to="/projects" className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold px-6 py-2 rounded-xl transition-colors">
              Back to Projects
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const rating = parseFloat(project.avg_rating || 0).toFixed(1);
  const reviews = project.review_count || 0;
  const isFree = parseFloat(project.price) === 0;

  const previewUrl = project.preview_image_path
    ? `${BASE_URL}/uploads/projects/previews/${project.preview_image_path.split('/').pop()}`
    : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm mb-8">
          <Link to="/projects" className="text-cyan-400 hover:text-cyan-300 transition-colors">
            Projects
          </Link>
          <span className="text-gray-600">/</span>
          <span className="text-gray-400">{project.title}</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2">
            {/* Preview image / topology placeholder */}
            <div className="relative w-full h-96 bg-gradient-to-br from-gray-900 to-gray-950 border border-gray-800 rounded-2xl overflow-hidden mb-8 flex items-center justify-center">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={project.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextElementSibling?.style.display = 'flex';
                  }}
                />
              ) : null}

              <div className={`absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:24px_24px] flex items-center justify-center ${previewUrl ? 'hidden' : ''}`}>
                <span className="text-9xl opacity-30">{TOPOLOGY_ICONS[project.topology_type] || '🌐'}</span>
              </div>

              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2 z-10">
                {project.is_featured && (
                  <span className="bg-cyan-500 text-gray-950 text-xs font-bold px-3 py-1.5 rounded-full">Featured</span>
                )}
                {isFree && (
                  <span className="bg-green-500 text-white text-xs font-bold px-3 py-1.5 rounded-full">Free</span>
                )}
              </div>

              {/* Difficulty badge */}
              {project.difficulty && (
                <div className="absolute top-4 right-4 z-10">
                  <span className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize ${DIFFICULTY_COLORS[project.difficulty] || ''}`}>
                    {project.difficulty}
                  </span>
                </div>
              )}
            </div>

            {/* Title and metadata */}
            <h1 className="text-4xl font-bold mb-4">{project.title}</h1>

            <div className="flex flex-wrap items-center gap-3 mb-6">
              {project.category && (
                <span className="text-sm text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-full border border-cyan-500/20">
                  {project.category}
                </span>
              )}
              {project.vendor && (
                <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1.5 rounded-full">
                  {project.vendor}
                </span>
              )}
              {project.topology_type && (
                <span className="text-sm text-gray-400 bg-gray-800 px-3 py-1.5 rounded-full">
                  {project.topology_type}
                </span>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-3 mb-8">
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span className="text-lg font-bold text-yellow-400">{rating}</span>
              </div>
              <span className="text-gray-500">({reviews} reviews)</span>
              {project.download_count > 0 && (
                <span className="text-gray-600 ml-auto">{project.download_count} downloads</span>
              )}
            </div>

            {/* Description */}
            {project.description && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Description</h2>
                <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{project.description}</p>
              </div>
            )}

            {project.short_description && !project.description && (
              <div className="mb-8">
                <p className="text-gray-300 leading-relaxed">{project.short_description}</p>
              </div>
            )}

            {/* Tags */}
            {project.tags && project.tags.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-semibold mb-4">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag, idx) => (
                    <span key={idx} className="bg-gray-800 text-gray-300 text-sm px-3 py-1.5 rounded-full border border-gray-700">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Project Information Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              {project.category && (
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Category</p>
                  <p className="text-white font-medium">{project.category}</p>
                </div>
              )}
              {project.vendor && (
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Vendor / Technology</p>
                  <p className="text-white font-medium">{project.vendor}</p>
                </div>
              )}
              {project.topology_type && (
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Topology Type</p>
                  <p className="text-white font-medium capitalize">{project.topology_type}</p>
                </div>
              )}
              {project.difficulty && (
                <div className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                  <p className="text-gray-500 text-xs font-semibold uppercase mb-1">Difficulty Level</p>
                  <p className="text-white font-medium capitalize">{project.difficulty}</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-6">
              {/* Price */}
              <div>
                <p className="text-sm text-gray-500 mb-2">Price</p>
                <p className="text-4xl font-bold">
                  {isFree ? 'Free' : `$${parseFloat(project.price).toFixed(2)}`}
                </p>
                {!isFree && <p className="text-sm text-gray-500 mt-1">one-time purchase</p>}
              </div>

              {/* CTA Buttons */}
              <div className="space-y-3">
                {isFree ? (
                  <button
                    onClick={handlePurchase}
                    disabled={purchaseLoading}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-gray-950 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {purchaseLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-gray-950/40 border-t-gray-950 rounded-full animate-spin" />
                        Downloading…
                      </>
                    ) : (
                      'Download Now'
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handlePurchase}
                    disabled={purchaseLoading}
                    className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-gray-950 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {purchaseLoading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-gray-950/40 border-t-gray-950 rounded-full animate-spin" />
                        Processing…
                      </>
                    ) : (
                      'Purchase Now'
                    )}
                  </button>
                )}

                <button
                  onClick={toggleWishlist}
                  disabled={isInWishlistLoading}
                  className={`w-full py-3 rounded-xl font-semibold transition-colors border ${
                    isInWishlist
                      ? 'bg-gray-800 border-red-500 text-red-400 hover:bg-red-500/10'
                      : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-300'
                  }`}
                >
                  {isInWishlist ? '❤️ In Wishlist' : '🤍 Add to Wishlist'}
                </button>
              </div>

              {/* Project stats */}
              <div className="border-t border-gray-800 pt-6 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Downloads</span>
                  <span className="font-semibold text-cyan-400">{project.download_count || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Rating</span>
                  <span className="font-semibold text-yellow-400">{rating} / 5.0</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Reviews</span>
                  <span className="font-semibold">{reviews}</span>
                </div>
                {project.difficulty && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Difficulty</span>
                    <span className="font-semibold capitalize">{project.difficulty}</span>
                  </div>
                )}
                {project.topology_type && (
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500 text-sm">Topology</span>
                    <span className="font-semibold capitalize">{project.topology_type}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
