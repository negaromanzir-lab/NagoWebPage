import { useNavigate } from 'react-router-dom';

const universities = [
  {
    section: 'Public Universities',
    universities: [
      'Adama Science and Technology University',
      'Addis Ababa Science and Technology University',
      'Addis Ababa University',
      'Adigrat University',
      'Ambo University',
      'Arba Minch University',
      'Arsi University',
      'Assosa University',
      'Axum University',
      'Bahir Dar University',
      'Bonga University',
      'Borena University',
      'Bule Hora University',
      'Debark University',
      'Debre Berhan University',
      'Debre Markos University',
      'Debre Tabor University',
      'Dembi Dolo University',
      'Dilla University',
      'Dire Dawa University',
      'Ethiopian Civil Service University',
      'Ethiopian Police University',
      'Gambella University',
      'Haramaya University',
      'Hawassa University',
      'Injibara University',
      'Jigjiga University',
      'Jimma University',
      'Jinka University',
      'Kebri Dehar University',
      'Kotebe Education University',
      'Madda Walabu University',
      'Mekdela Amba University',
      'Mekelle University',
      'Mettu University',
      'Mizan-Tepi University',
      'Oda Bultum University',
      'Oromia State University',
      'Raya University',
      'Samara University',
      'Selale University',
      'University of Gondar',
      'Wachamo University',
      'Werabe University',
      'Wolaita Sodo University',
      'Woldia University',
      'Wolkite University',
      'Wollega University',
      'Wollo University',
    ],
  },
  {
    section: 'Prominent Private Universities',
    universities: [
      'Admas University',
      'Rift Valley University',
      'St. Mary\'s University',
      'Unity University',
    ],
  },
];

export default function UniversityExitExamPage() {
  const navigate = useNavigate();

  const handleExamClick = (universityName, examType) => {
    // Navigate to exam details page (will create this next)
    const slugName = universityName.toLowerCase().replace(/\s+/g, '-');
    navigate(`/exam-preparation/university-exit/${slugName}/${examType}`);
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
            University Exit Exam
          </h1>
          <p className="text-gray-400 text-lg">
            Select your university to view preparation materials and departments
          </p>
        </div>

        {/* Universities by Section */}
        {universities.map((section) => (
          <div key={section.section} className="mb-16">
            <h2 className="text-2xl font-bold text-white mb-8 flex items-center gap-3">
              <div className="w-1 h-8 bg-gradient-to-b from-cyan-400 to-blue-600"></div>
              {section.section}
            </h2>

            {/* Universities Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {section.universities.map((university) => (
                <div
                  key={university}
                  className="group relative p-6 rounded-xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-700 hover:border-cyan-500/50 hover:bg-gradient-to-br hover:from-gray-800 hover:to-gray-900 transition-all duration-200"
                >
                  {/* Hover glow */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-cyan-500/10 to-blue-600/10 rounded-xl"></div>

                  <div className="relative z-10">
                    {/* University Icon */}
                    <div className="mb-3 text-cyan-400 opacity-80 group-hover:opacity-100 transition-opacity">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C6.228 6.253 2 10.541 2 15.75c0 5.209 4.228 9.497 10 9.497s10-4.288 10-9.497c0-5.209-4.228-9.497-10-9.497z" />
                      </svg>
                    </div>

                    {/* University Name */}
                    <h3 className="text-white font-semibold text-sm mb-4 line-clamp-3">
                      {university}
                    </h3>

                    {/* Buttons */}
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleExamClick(university, 'model-exam')}
                        className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors duration-200 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Model Exam
                      </button>
                      <button
                        onClick={() => handleExamClick(university, 'exit-exam')}
                        className="w-full py-2 px-3 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors duration-200 flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        Exit Exam
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* Statistics Footer */}
        <div className="mt-16 pt-8 border-t border-gray-800">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-cyan-400">47</div>
              <div className="text-gray-400 text-sm">Public Universities</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-400">4</div>
              <div className="text-gray-400 text-sm">Private Universities</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-400">51</div>
              <div className="text-gray-400 text-sm">Total Universities</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
