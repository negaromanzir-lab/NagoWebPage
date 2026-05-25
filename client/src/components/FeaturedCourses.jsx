import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import CourseCard from './CourseCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function FeaturedCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFeaturedCourses();
  }, []);

  const fetchFeaturedCourses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/courses?is_featured=true&limit=6&sort=newest`);
      const data = await response.json();
      if (data.success) {
        setCourses(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return null;
  }

  if (!courses.length) {
    return null;
  }

  return (
    <section className="relative py-16 md:py-24 border-t border-cyan-500/10">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4">
        {/* Section header */}
        <div className="mb-12">
          <span className="text-cyan-400 text-sm font-bold tracking-wide">FEATURED COURSES</span>
          <h2 className="text-4xl md:text-5xl font-bold mt-2 mb-4">
            Learn from <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Industry Experts</span>
          </h2>
          <p className="text-gray-400 text-lg max-w-2xl">
            Master network design, configuration, and troubleshooting with hands-on courses from experienced instructors.
          </p>
        </div>

        {/* Course grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {courses.map((course) => (
            <CourseCard key={course.id} course={course} />
          ))}
        </div>

        {/* CTA button */}
        <div className="text-center">
          <Link
            to="/courses"
            className="inline-flex items-center justify-center px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 rounded-xl font-bold text-lg transition-all duration-300 hover:shadow-lg hover:shadow-cyan-500/20 group"
          >
            Explore All Courses
            <svg className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
