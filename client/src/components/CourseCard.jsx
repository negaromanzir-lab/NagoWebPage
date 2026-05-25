/**
 * CourseCard.jsx
 *
 * Renders a course listing card.
 */

import { Link } from 'react-router-dom';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const DIFFICULTY_COLORS = {
  beginner:     'bg-green-500/10 text-green-400 border-green-500/20',
  intermediate: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
  advanced:     'bg-red-500/10 text-red-400 border-red-500/20',
};

export default function CourseCard({ course }) {
  const imageUrl = course.image_url?.startsWith('http') 
    ? course.image_url 
    : `${BASE_URL}${course.image_url}`;

  return (
    <Link to={`/courses/${course.id}`} className="block">
      <div className="group bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden hover:border-cyan-500/40 hover:shadow-lg hover:shadow-cyan-500/5 transition-all duration-300">
        {/* Image */}
        <div className="relative h-48 bg-gray-800 overflow-hidden">
          {course.image_url ? (
            <img 
              src={imageUrl} 
              alt={course.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
              <span className="text-white text-5xl">📚</span>
            </div>
          )}
          {course.is_featured && (
            <span className="absolute top-3 left-3 bg-cyan-500 text-gray-950 text-xs font-bold px-2.5 py-1 rounded-full">
              Featured
            </span>
          )}
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-bold text-lg mb-2 line-clamp-2 text-white group-hover:text-cyan-400 transition-colors">
            {course.title}
          </h3>
          
          <p className="text-gray-400 text-sm mb-3 line-clamp-2">
            {course.description}
          </p>

          {/* Instructor */}
          <p className="text-gray-500 text-xs mb-3">
            by {course.instructor_name || 'Unknown'}
          </p>

          {/* Difficulty Badge */}
          <div className={`inline-block px-2 py-1 rounded text-xs font-semibold mb-3 border ${DIFFICULTY_COLORS[course.difficulty] || DIFFICULTY_COLORS.intermediate}`}>
            {course.difficulty?.charAt(0).toUpperCase() + course.difficulty?.slice(1) || 'Intermediate'}
          </div>

          {/* Footer */}
          <div className="flex justify-between items-center">
            <span className="text-cyan-400 font-bold text-xl">
              ${course.price || '0'}
            </span>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>⭐ {course.rating?.toFixed(1) || '0'}</span>
              <span>👥 {course.student_count || 0}</span>
            </div>
          </div>

          {/* Duration */}
          <div className="mt-3 text-xs text-gray-500">
            ⏱️ {course.duration_hours || 0} hours
          </div>
        </div>
      </div>
    </Link>
  );
}
