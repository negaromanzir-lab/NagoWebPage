import { useNavigate } from 'react-router-dom';

const examCategories = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C6.228 6.253 2 10.541 2 15.75c0 5.209 4.228 9.497 10 9.497s10-4.288 10-9.497c0-5.209-4.228-9.497-10-9.497z" />
      </svg>
    ),
    name: 'HighSchool Entrance Exam',
    slug: 'highschool-entrance',
    description: 'Prepare for the Ethiopian high school entrance examination',
    color: 'from-amber-500/20 to-amber-500/5 border-amber-500/20 text-amber-400',
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C6.228 6.253 2 10.541 2 15.75c0 5.209 4.228 9.497 10 9.497s10-4.288 10-9.497c0-5.209-4.228-9.497-10-9.497z" />
      </svg>
    ),
    name: 'University Exit Exam',
    slug: 'university-exit',
    description: 'Prepare for the Ethiopian university exit examination',
    color: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400',
  },
];

export default function ExamPreparationPage() {
  const navigate = useNavigate();

  const handleExamClick = (slug) => {
    if (slug === 'university-exit') {
      navigate('/exam-preparation/university-exit');
    } else if (slug === 'highschool-entrance') {
      navigate('/exam-preparation/highschool-entrance');
    }
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
            Ethio-Exam-Preparetion
          </h1>
          <p className="text-gray-400 text-lg">
            Comprehensive preparation resources for Ethiopian national exams
          </p>
        </div>

        {/* Exam Categories Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {examCategories.map(({ icon, name, slug, description, color }) => (
            <div
              key={slug}
              className={`group relative p-8 rounded-2xl bg-gradient-to-b border ${color} hover:scale-105 transition-transform duration-200 cursor-pointer overflow-hidden`}
            >
              {/* Background glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-white"></div>

              <div className="relative z-10">
                <div className="mb-4 opacity-80 group-hover:opacity-100 transition-opacity">
                  {icon}
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{name}</h3>
                <p className="text-gray-400 mb-6">{description}</p>
                <button
                  onClick={() => handleExamClick(slug)}
                  className="inline-block bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-6 py-2 rounded-lg transition-all duration-200">
                  Start Here
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
