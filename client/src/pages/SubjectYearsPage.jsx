import { useNavigate, useParams } from 'react-router-dom';

const years = [
  { year: '2015EC', label: '2015 E.C.' },
  { year: '2016EC', label: '2016 E.C.' },
  { year: '2017EC', label: '2017 E.C.' },
  { year: '2018EC', label: '2018 E.C.' },
];

export default function SubjectYearsPage() {
  const navigate = useNavigate();
  const { stream, subject } = useParams();

  const subjectName = subject
    ? subject.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    : 'Subject';

  const streamName = stream === 'natural-science' ? 'Natural Sciences' : 'Social Sciences';

  const handleYearClick = (year) => {
    navigate(`/exam-preparation/highschool-entrance/${stream}/${subject}/${year}`);
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
          <div className="mb-2 text-gray-400 text-sm">{streamName} Stream</div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            {subjectName}
          </h1>
          <p className="text-gray-400 text-lg">
            Select an exam year to view model exams and past papers
          </p>
        </div>

        {/* Years Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {years.map(({ year, label }) => (
            <button
              key={year}
              onClick={() => handleYearClick(year)}
              className="group relative p-8 rounded-2xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 hover:border-cyan-500/50 hover:from-gray-800 hover:to-gray-900 transition-all duration-200 overflow-hidden text-left"
            >
              {/* Hover glow */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-cyan-500/10 to-blue-600/10"></div>

              <div className="relative z-10">
                {/* Year Icon */}
                <div className="mb-4 text-cyan-400 opacity-80 group-hover:opacity-100 transition-opacity">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>

                {/* Year Label */}
                <h3 className="text-3xl font-bold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                  {label}
                </h3>

                {/* Description */}
                <p className="text-gray-400 text-sm mb-4">
                  Model exams & past papers
                </p>

                {/* Arrow Indicator */}
                <div className="flex items-center gap-2 text-cyan-400 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1 duration-200">
                  <span className="text-xs font-semibold">View</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
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
              <h4 className="text-white font-semibold mb-2">About Past Papers</h4>
              <p className="text-gray-400 text-sm">
                Each year contains model exams and actual past exam papers. Practice with previous years' questions to familiarize yourself with the exam pattern and improve your preparation strategy.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
