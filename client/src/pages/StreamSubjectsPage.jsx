import { useNavigate, useParams } from 'react-router-dom';

const streamSubjects = {
  'natural-science': {
    name: 'Natural Sciences Stream',
    color: 'from-green-500/20 to-green-500/5 border-green-500/20 text-green-400',
    subjects: [
      { name: 'English Language', slug: 'english-language', icon: '📖' },
      { name: 'Mathematics', slug: 'mathematics', icon: '🔢' },
      { name: 'General Academic Aptitude', slug: 'general-academic-aptitude', icon: '🧠' },
      { name: 'Physics', slug: 'physics', icon: '⚛️' },
      { name: 'Chemistry', slug: 'chemistry', icon: '🧪' },
      { name: 'Biology', slug: 'biology', icon: '🔬' },
    ],
  },
  'social-science': {
    name: 'Social Sciences Stream',
    color: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
    subjects: [
      { name: 'English Language', slug: 'english-language', icon: '📖' },
      { name: 'Mathematics', slug: 'mathematics', icon: '🔢' },
      { name: 'General Academic Aptitude', slug: 'general-academic-aptitude', icon: '🧠' },
      { name: 'Geography', slug: 'geography', icon: '🌍' },
      { name: 'History', slug: 'history', icon: '📚' },
      { name: 'Economics', slug: 'economics', icon: '📊' },
    ],
  },
};

export default function StreamSubjectsPage() {
  const navigate = useNavigate();
  const { stream } = useParams();

  const streamData = streamSubjects[stream];

  if (!streamData) {
    return (
      <div className="min-h-screen bg-gray-950 pt-24 pb-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Stream not found</h1>
          <button
            onClick={() => navigate(-1)}
            className="text-cyan-400 hover:text-cyan-300"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const handleSubjectClick = (subjectSlug) => {
    navigate(`/exam-preparation/highschool-entrance/${stream}/${subjectSlug}`);
  };

  return (
    <div className="min-h-screen bg-gray-950 pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-12">
          <button
            onClick={() => navigate(-1)}
            className="text-cyan-400 hover:text-cyan-300 flex items-center gap-2 mb-6 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            {streamData.name}
          </h1>
          <p className="text-gray-400 text-lg">
            Select a subject to view exams from previous years
          </p>
        </div>

        {/* Subjects Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-16">
          {streamData.subjects.map(({ name, slug, icon }) => (
            <button
              key={slug}
              onClick={() => handleSubjectClick(slug)}
              className={`group relative p-8 rounded-2xl bg-gradient-to-br border ${streamData.color} hover:scale-105 transition-all duration-200 overflow-hidden text-left`}
            >
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-white/5"></div>

              <div className="relative z-10">
                {/* Subject Icon */}
                <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-200">
                  {icon}
                </div>

                {/* Subject Name */}
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors line-clamp-2">
                  {name}
                </h3>

                {/* Exam Count */}
                <p className="text-gray-400 text-sm mb-4">
                  4 Years of Exams
                </p>

                {/* Arrow Indicator */}
                <div className="flex items-center gap-2 text-cyan-400 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 duration-200">
                  <span className="text-xs font-semibold">View Years</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Statistics */}
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-cyan-400">{streamData.subjects.length}</div>
              <div className="text-gray-400 text-sm">Subjects</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-400">4</div>
              <div className="text-gray-400 text-sm">Years (2015-2018)</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">{streamData.subjects.length * 4}</div>
              <div className="text-gray-400 text-sm">Total Exams</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">∞</div>
              <div className="text-gray-400 text-sm">Practice Questions</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
