import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtBytes(b) {
  if (!b) return '';
  const k = 1024, s = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(b) / Math.log(k)), 3);
  return `${(b / Math.pow(k, i)).toFixed(1)} ${s[i]}`;
}

function StarRating({ value }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <svg key={n} className={`w-4 h-4 ${n <= Math.round(value) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-700 fill-gray-700'}`} viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </div>
  );
}

export default function BookDetailsPage() {
  const { id }            = useParams();
  const { isAuthenticated } = useAuth();
  const [book,    setBook]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [reviewForm,  setReviewForm]  = useState({ rating: 5, comment: '' });
  const [reviewMsg,   setReviewMsg]   = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${BASE_URL}/api/books/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setBook(d.data);
        else setError(d.message || 'Book not found');
      })
      .catch(() => setError('Failed to load book'))
      .finally(() => setLoading(false));
  }, [id]);

  function handleDownload() {
    setDownloading(true);
    const token = localStorage.getItem('nw_access_token');
    fetch(`${BASE_URL}/api/books/${id}/download`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => Promise.reject(new Error(d.message)));
        return res.blob();
      })
      .then((blob) => {
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href     = url;
        a.download = `${book.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
        a.click();
        URL.revokeObjectURL(url);
        setBook((b) => ({ ...b, download_count: (b.download_count || 0) + 1 }));
      })
      .catch((e) => alert(e.message || 'Download failed'))
      .finally(() => setDownloading(false));
  }

  async function handleReviewSubmit(e) {
    e.preventDefault();
    if (!isAuthenticated) { setReviewMsg('Please log in to submit a review.'); return; }
    setSubmittingReview(true);
    setReviewMsg('');
    try {
      const token = localStorage.getItem('nw_access_token');
      const res   = await fetch(`${BASE_URL}/api/books/${id}/reviews`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(reviewForm),
      });
      const data = await res.json();
      if (res.ok) {
        setReviewMsg('Review submitted!');
        // Refresh book
        fetch(`${BASE_URL}/api/books/${id}`).then((r) => r.json()).then((d) => d.success && setBook(d.data));
      } else {
        setReviewMsg(data.message || 'Failed to submit review');
      }
    } catch { setReviewMsg('Something went wrong'); }
    finally { setSubmittingReview(false); }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center text-center px-4">
      <div>
        <p className="text-red-400 mb-4">{error}</p>
        <Link to="/books" className="text-emerald-400 hover:underline">← Back to Library</Link>
      </div>
    </div>
  );

  const isFree = book.is_free || parseFloat(book.price || 0) === 0;
  const coverUrl = book.cover_image_path
    ? `${BASE_URL}/uploads/${book.cover_image_path}`
    : null;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Back */}
        <Link to="/books" className="inline-flex items-center gap-2 text-gray-400 hover:text-white text-sm mb-8 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Library
        </Link>

        {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

          {/* Left — cover + download */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-5">
              {/* Cover */}
              <div className="rounded-2xl overflow-hidden bg-gray-900 border border-gray-800 aspect-[3/4] flex items-center justify-center">
                {coverUrl ? (
                  <img src={coverUrl} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-900/40 to-teal-900/40">
                    <svg className="w-24 h-24 text-emerald-500/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={0.8}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
              </div>

              {/* Price + download */}
              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-white">
                    {isFree ? 'Free' : `$${parseFloat(book.price).toFixed(2)}`}
                  </span>
                  {isFree && (
                    <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold px-2 py-0.5 rounded-full">
                      FREE
                    </span>
                  )}
                </div>

                <button
                  onClick={handleDownload}
                  disabled={downloading}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {downloading ? (
                    <><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Downloading…</>
                  ) : (
                    <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg> Download PDF</>
                  )}
                </button>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-800">
                  {[
                    { label: 'Downloads', value: book.download_count || 0 },
                    { label: 'Reviews',   value: book.review_count   || 0 },
                    { label: 'Pages',     value: book.pages          || '—' },
                    { label: 'File size', value: fmtBytes(book.file_size_bytes) || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="text-center">
                      <p className="text-white font-semibold text-sm">{value}</p>
                      <p className="text-gray-500 text-xs">{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right — details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Title / meta */}
            <div>
              {book.category && (
                <span className="text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                  {book.category}
                </span>
              )}
              <h1 className="text-3xl font-bold text-white mt-3 mb-2">{book.title}</h1>
              <p className="text-gray-400 text-lg">by <span className="text-white">{book.author}</span></p>
              {book.publisher && <p className="text-gray-500 text-sm mt-1">{book.publisher}</p>}

              {/* Rating */}
              {book.review_count > 0 && (
                <div className="flex items-center gap-2 mt-3">
                  <StarRating value={book.rating} />
                  <span className="text-yellow-400 font-semibold">{parseFloat(book.rating || 0).toFixed(1)}</span>
                  <span className="text-gray-500 text-sm">({book.review_count} reviews)</span>
                </div>
              )}
            </div>

            {/* Book details grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Edition',   value: book.edition || '—' },
                { label: 'Year',      value: book.published_year || '—' },
                { label: 'Language',  value: book.language || '—' },
                { label: 'ISBN',      value: book.isbn || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-900 border border-gray-800 rounded-xl p-3 text-center">
                  <p className="text-gray-500 text-xs mb-1">{label}</p>
                  <p className="text-white text-sm font-medium">{value}</p>
                </div>
              ))}
            </div>

            {/* Description */}
            {book.description && (
              <div>
                <h2 className="text-white font-semibold text-lg mb-3">About this Book</h2>
                <p className="text-gray-400 leading-relaxed whitespace-pre-line">{book.description}</p>
              </div>
            )}

            {/* Tags */}
            {book.tags?.length > 0 && (
              <div>
                <h2 className="text-white font-semibold text-sm mb-2">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {book.tags.map((t) => (
                    <span key={t} className="bg-gray-800 text-gray-400 text-xs px-3 py-1 rounded-full border border-gray-700">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div>
              <h2 className="text-white font-semibold text-lg mb-4">
                Reviews {book.review_count > 0 && `(${book.review_count})`}
              </h2>

              {book.reviews?.length > 0 ? (
                <div className="space-y-4 mb-6">
                  {book.reviews.map((r) => (
                    <div key={r.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-7 h-7 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {r.reviewer_name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <span className="text-white text-sm font-medium">{r.reviewer_name}</span>
                        <StarRating value={r.rating} />
                        <span className="ml-auto text-gray-600 text-xs">{fmtDate(r.created_at)}</span>
                      </div>
                      {r.comment && <p className="text-gray-400 text-sm">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-sm mb-6">No reviews yet. Be the first!</p>
              )}

              {/* Review form */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-4">Write a Review</h3>
                {!isAuthenticated ? (
                  <p className="text-gray-500 text-sm">
                    <Link to="/login" className="text-emerald-400 hover:underline">Sign in</Link> to leave a review.
                  </p>
                ) : (
                  <form onSubmit={handleReviewSubmit} className="space-y-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Rating</label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} type="button" onClick={() => setReviewForm((f) => ({ ...f, rating: n }))}
                            className={`text-2xl transition-transform hover:scale-110 ${n <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-700'}`}>
                            ★
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Comment (optional)</label>
                      <textarea
                        value={reviewForm.comment}
                        onChange={(e) => setReviewForm((f) => ({ ...f, comment: e.target.value }))}
                        rows={3}
                        className="w-full bg-gray-800 border border-gray-700 rounded-xl px-3 py-2 text-white text-sm placeholder-gray-600 outline-none focus:border-emerald-500 transition-colors resize-none"
                        placeholder="Share your thoughts about this book…"
                      />
                    </div>
                    {reviewMsg && (
                      <p className={`text-xs ${reviewMsg.includes('submitted') ? 'text-emerald-400' : 'text-red-400'}`}>
                        {reviewMsg}
                      </p>
                    )}
                    <button type="submit" disabled={submittingReview}
                      className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-60 text-white font-semibold px-5 py-2 rounded-xl text-sm transition-colors">
                      {submittingReview ? 'Submitting…' : 'Submit Review'}
                    </button>
                  </form>
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
