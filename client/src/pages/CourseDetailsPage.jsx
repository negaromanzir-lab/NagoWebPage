import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DIFFICULTY_COLORS = {
  beginner: 'bg-green-500/10 text-green-400 border-green-500/20',
  intermediate: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  advanced: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function CourseDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [course, setCourse] = useState(null);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [review, setReview] = useState({ rating: 5, comment: '' });
  const [showReviewForm, setShowReviewForm] = useState(false);

  useEffect(() => {
    fetchCourse();
    if (user) {
      checkEnrollment();
    }
  }, [id, user]);

  const fetchCourse = async () => {
    try {
      const response = await fetch(`${API_URL}/api/courses/${id}`);
      const data = await response.json();
      if (data.success) {
        setCourse(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch course:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkEnrollment = async () => {
    try {
      const response = await fetch(`${API_URL}/api/courses/${id}/enrolled`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
      const data = await response.json();
      setIsEnrolled(data.enrolled);
    } catch (error) {
      console.error('Failed to check enrollment:', error);
    }
  };

  const handleEnroll = async () => {
    if (!user) {
      window.location.href = '/login';
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/payments/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify({
          courseId: id,
          type: 'course',
        }),
      });
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      console.error('Enrollment failed:', error);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/courses/${id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
        body: JSON.stringify(review),
      });
      if (response.ok) {
        setReview({ rating: 5, comment: '' });
        setShowReviewForm(false);
        fetchCourse();
      }
    } catch (error) {
      console.error('Failed to submit review:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <p className="text-xl">Course not found</p>
      </div>
    );
  }

  const imageUrl = course.image_url?.startsWith('http')
    ? course.image_url
    : `${API_URL}${course.image_url}`;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <h1 className="text-4xl font-bold mb-4">{course.title}</h1>

            <p className="text-gray-400 text-lg mb-6">{course.description}</p>

            {/* Instructor & Stats */}
            <div className="flex flex-wrap gap-6 mb-8 pb-8 border-b border-gray-800">
              <div>
                <div className="text-gray-500 text-sm">Instructor</div>
                <div className="text-lg font-semibold">{course.instructor_name}</div>
              </div>
              <div>
                <div className="text-gray-500 text-sm">Rating</div>
                <div className="text-lg font-semibold">⭐ {course.rating?.toFixed(1) || '0'}</div>
              </div>
              <div>
                <div className="text-gray-500 text-sm">Students</div>
                <div className="text-lg font-semibold">👥 {course.student_count || 0}</div>
              </div>
              <div>
                <div className="text-gray-500 text-sm">Duration</div>
                <div className="text-lg font-semibold">⏱️ {course.duration_hours || 0} hours</div>
              </div>
              <div>
                <div className="text-gray-500 text-sm">Difficulty</div>
                <div className={`inline-block px-3 py-1 rounded text-sm font-semibold border ${DIFFICULTY_COLORS[course.difficulty] || DIFFICULTY_COLORS.intermediate}`}>
                  {course.difficulty?.charAt(0).toUpperCase() + course.difficulty?.slice(1)}
                </div>
              </div>
            </div>

            {/* Long Description */}
            {course.long_description && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-4">About this course</h2>
                <p className="text-gray-300 leading-relaxed">{course.long_description}</p>
              </div>
            )}

            {/* Course Content */}
            {course.modules && course.modules.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-6">Course Content</h2>
                <div className="space-y-4">
                  {course.modules.map((module) => (
                    <div key={module.id} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                      <div className="bg-gray-800 p-4 font-bold text-lg">
                        {module.title}
                      </div>
                      {module.lessons && module.lessons.length > 0 && (
                        <div className="divide-y divide-gray-800">
                          {module.lessons.map((lesson) => (
                            <div key={lesson.id} className="p-4 hover:bg-gray-800/50 transition-colors">
                              <div className="font-semibold flex justify-between items-start mb-1">
                                <span>{lesson.title}</span>
                                {lesson.is_free && (
                                  <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">Free Preview</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">{lesson.duration_minutes || 0} min</div>
                              {lesson.description && (
                                <p className="text-sm text-gray-400 mt-2">{lesson.description}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {course.reviews && course.reviews.length > 0 && (
              <div className="mb-12">
                <h2 className="text-2xl font-bold mb-6">Student Reviews</h2>
                <div className="space-y-4">
                  {course.reviews.map((review) => (
                    <div key={review.id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold">{review.name || 'Anonymous'}</div>
                        <div className="text-yellow-400">
                          {'⭐'.repeat(review.rating)}
                        </div>
                      </div>
                      <p className="text-gray-300">{review.comment}</p>
                      <div className="text-xs text-gray-500 mt-2">
                        {new Date(review.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Review */}
                {isEnrolled && !showReviewForm && (
                  <button
                    onClick={() => setShowReviewForm(true)}
                    className="mt-6 px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-semibold transition-colors"
                  >
                    Add Your Review
                  </button>
                )}

                {isEnrolled && showReviewForm && (
                  <form onSubmit={handleSubmitReview} className="mt-6 bg-gray-900 border border-gray-800 rounded-lg p-6">
                    <div className="mb-4">
                      <label className="block text-sm font-semibold mb-2">Rating</label>
                      <select
                        value={review.rating}
                        onChange={(e) => setReview({ ...review, rating: parseInt(e.target.value) })}
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white focus:border-cyan-500 outline-none"
                      >
                        <option value="5">⭐⭐⭐⭐⭐ Excellent</option>
                        <option value="4">⭐⭐⭐⭐ Good</option>
                        <option value="3">⭐⭐⭐ Average</option>
                        <option value="2">⭐⭐ Poor</option>
                        <option value="1">⭐ Very Poor</option>
                      </select>
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-semibold mb-2">Comment</label>
                      <textarea
                        value={review.comment}
                        onChange={(e) => setReview({ ...review, comment: e.target.value })}
                        placeholder="Share your experience with this course..."
                        rows="4"
                        className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white placeholder-gray-500 focus:border-cyan-500 outline-none resize-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        className="px-6 py-2 bg-cyan-600 hover:bg-cyan-700 rounded-lg font-semibold transition-colors"
                      >
                        Submit Review
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowReviewForm(false)}
                        className="px-6 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 sticky top-20">
              {course.image_url && (
                <img
                  src={imageUrl}
                  alt={course.title}
                  className="w-full rounded-lg mb-6 h-48 object-cover"
                />
              )}

              <div className="text-3xl font-bold text-cyan-400 mb-6">
                ${course.price || '0'}
              </div>

              {isEnrolled ? (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400 font-semibold text-center">
                  ✓ You're enrolled in this course
                </div>
              ) : (
                <button
                  onClick={handleEnroll}
                  className="w-full bg-cyan-600 hover:bg-cyan-700 py-3 rounded-lg font-bold transition-colors mb-3"
                >
                  Enroll Now
                </button>
              )}

              {!user && (
                <p className="text-sm text-gray-400 text-center">
                  <a href="/login" className="text-cyan-400 hover:text-cyan-300">
                    Log in
                  </a>
                  {' '}to enroll in this course
                </p>
              )}

              <div className="mt-6 space-y-3 text-sm text-gray-300">
                <div className="flex items-center gap-2">
                  <span>⏱️</span> {course.duration_hours || 0} hours of content
                </div>
                <div className="flex items-center gap-2">
                  <span>📱</span> Access on mobile & desktop
                </div>
                <div className="flex items-center gap-2">
                  <span>🏆</span> Certificate of completion
                </div>
                <div className="flex items-center gap-2">
                  <span>♾️</span> Lifetime access
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
