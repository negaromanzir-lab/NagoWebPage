import { useNavigate } from 'react-router-dom';

const scienceCategories = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C6.228 6.253 2 10.541 2 15.75c0 5.209 4.228 9.497 10 9.497s10-4.288 10-9.497c0-5.209-4.228-9.497-10-9.497z" />
      </svg>
    ),
    name: 'Natural Sciences Stream',
    slug: 'natural-science',
    description: 'Prepare for Ethiopian high school entrance natural sciences examination',
    color: 'from-green-500/20 to-green-500/5 border-green-500/20 text-green-400',
    subjects: ['English Language', 'Mathematics', 'General Academic Aptitude', 'Physics', 'Chemistry', 'Biology'],
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C6.228 6.253 2 10.541 2 15.75c0 5.209 4.228 9.497 10 9.497s10-4.288 10-9.497c0-5.209-4.228-9.497-10-9.497z" />
      </svg>
    ),
    name: 'Social Sciences Stream',
    slug: 'social-science',
    description: 'Prepare for Ethiopian high school entrance social sciences examination',
    color: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
    subjects: ['English Language', 'Mathematics', 'General Academic Aptitude', 'Geography', 'History', 'Economics'],
  },
];

export default function HighSchoolEntranceExamPage() {
  const navigate = useNavigate();

  const handleScienceClick = (slug) => {
    navigate(`/exam-preparation/highschool-entrance/${slug}`);
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
            HighSchool Entrance Exam
          </h1>
          <p className="text-gray-400 text-lg">
            Choose your science stream and start preparing for the Ethiopian high school entrance examination
          </p>
        </div>

        {/* Science Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          {scienceCategories.map(({ icon, name, slug, description, color, subjects }) => (
            <div
              key={slug}
              className={`group relative p-8 rounded-2xl bg-gradient-to-b border ${color} hover:scale-105 transition-transform duration-200 overflow-hidden`}
            >
              {/* Background glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-white"></div>

              <div className="relative z-10">
                <div className="mb-4 opacity-80 group-hover:opacity-100 transition-opacity">
                  {icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{name}</h3>
                <p className="text-gray-400 mb-4">{description}</p>

                {/* Subjects Preview */}
                <div className="mb-6">
                  <p className="text-gray-500 text-xs font-semibold mb-2">Key Subjects:</p>
                  <div className="flex flex-wrap gap-2">
                    {subjects.map((subject) => (
                      <span
                        key={subject}
                        className="inline-block px-3 py-1 text-xs rounded-full bg-white/10 text-gray-300 border border-white/20"
                      >
                        {subject}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Button */}
                <button
                  onClick={() => handleScienceClick(slug)}
                  className="inline-block bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200">
                  Start Learning
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border border-blue-500/20 rounded-xl p-6">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-2">About the Entrance Exam</h4>
              <p className="text-gray-400 text-sm">
                The Ethiopian high school entrance examination tests your knowledge across multiple subjects. Choose your preferred science stream to access model exams, practice questions, and comprehensive study materials tailored to your needs.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
