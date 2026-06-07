import { useNavigate, useParams } from 'react-router-dom';
import { useState } from 'react';

// Sample exam data structure
const examData = {
  'natural-science': {
    'physics': {
      '2017EC': {
        title: 'ESSLCE Physics 2017 E.C',
        subject: 'Physics',
        year: '2017 E.C',
        code: '04',
        booklet: '325',
        questions: 60,
        duration: '2:30 Hours',
        description: 'Ethiopian Secondary School Leaving Certificate Examination',
        file: 'physics_2017_ec.html',
        tabs: [
          { name: 'Model Exam', content: 'model' },
          { name: 'Solutions', content: 'solutions' },
          { name: 'Past Paper', content: 'paper' },
        ],
      },
    },
    'mathematics': {
      '2017EC': {
        title: 'ESSLCE Mathematics 2017 E.C',
        subject: 'Mathematics',
        year: '2017 E.C',
        code: '03',
        booklet: '325',
        questions: 60,
        duration: '2:30 Hours',
        description: 'Ethiopian Secondary School Leaving Certificate Examination',
        file: '2017_maths_ESSLCE_exam_prep.html',
        tabs: [
          { name: 'Model Exam', content: 'model' },
          { name: 'Solutions', content: 'solutions' },
          { name: 'Past Paper', content: 'paper' },
        ],
      },
    },
    'general-academic-aptitude': {
      '2017EC': {
        title: 'ESSLCE General Academic Aptitude 2017 E.C',
        subject: 'General Academic Aptitude',
        year: '2017 E.C',
        code: '01',
        booklet: '325',
        questions: 60,
        duration: '2:30 Hours',
        description: 'Ethiopian Secondary School Leaving Certificate Examination',
        file: '2017_SAT_ESSLCE_exam_prep.html',
        tabs: [
          { name: 'Model Exam', content: 'model' },
          { name: 'Solutions', content: 'solutions' },
          { name: 'Past Paper', content: 'paper' },
        ],
      },
    },
  },
};

export default function ExamContentPage() {
  const navigate = useNavigate();
  const { stream, subject, year } = useParams();
  const [activeTab, setActiveTab] = useState('model');
  const [examStarted, setExamStarted] = useState(false);

  const exam = examData[stream]?.[subject]?.[year];

  if (!exam) {
    return (
      <div className="min-h-screen bg-gray-950 pt-24 pb-20 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">Exam not found</h1>
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

          <div className="mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">
              {exam.title}
            </h1>
            <p className="text-gray-400 text-lg">{exam.description}</p>
          </div>

          {/* Exam Info Pills */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-xs font-semibold uppercase">Code</div>
              <div className="text-white text-xl font-bold">{exam.code}</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-xs font-semibold uppercase">Booklet</div>
              <div className="text-white text-xl font-bold">{exam.booklet}</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-xs font-semibold uppercase">Questions</div>
              <div className="text-white text-xl font-bold">{exam.questions}</div>
            </div>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="text-gray-400 text-xs font-semibold uppercase">Duration</div>
              <div className="text-white text-xl font-bold">{exam.duration}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex gap-2 border-b border-gray-800">
            {exam.tabs.map((tab) => (
              <button
                key={tab.content}
                onClick={() => setActiveTab(tab.content)}
                className={`px-6 py-3 font-semibold transition-colors ${
                  activeTab === tab.content
                    ? 'text-cyan-400 border-b-2 border-cyan-400'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        {!examStarted ? (
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-800 rounded-2xl p-12 text-center">
            <div className="mb-8">
              <svg className="w-20 h-20 mx-auto text-cyan-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C6.228 6.253 2 10.541 2 15.75c0 5.209 4.228 9.497 10 9.497s10-4.288 10-9.497c0-5.209-4.228-9.497-10-9.497z" />
              </svg>
            </div>

            <h3 className="text-3xl font-bold text-white mb-3">Ready to Start?</h3>
            <p className="text-gray-400 mb-8 max-w-lg mx-auto">
              This exam contains {exam.questions} questions covering various physics topics. You will have {exam.duration} to complete it. Click start to begin.
            </p>

            <div className="flex gap-4 justify-center flex-wrap">
              <button
                onClick={() => setExamStarted(true)}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-200"
              >
                Start Exam
              </button>
              <button
                onClick={() => navigate(-1)}
                className="bg-gray-800 hover:bg-gray-700 text-white font-semibold px-8 py-3 rounded-lg transition-all duration-200"
              >
                Cancel
              </button>
            </div>

            <div className="mt-12 p-6 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-gray-300 text-sm">
                ℹ️ This is a practice exam. Your answers will be tracked and you can review explanations for each question.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-800 rounded-2xl overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-gray-700">
              <h3 className="text-xl font-bold text-white">Exam</h3>
              <button
                onClick={() => setExamStarted(false)}
                className="bg-gray-700 hover:bg-gray-600 text-white font-semibold px-4 py-2 rounded-lg transition-all text-sm"
              >
                Exit Exam
              </button>
            </div>
            <iframe
              src={`/exams/${exam.file}`}
              className="w-full"
              style={{ height: '80vh', border: 'none' }}
              title="Exam Content"
            />
          </div>
        )}
      </div>
    </div>
  );
}
