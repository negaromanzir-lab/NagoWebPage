import { Link } from 'react-router-dom';

const categories = [
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
    name: 'Networking Projects',
    description: 'Cisco Packet Tracer labs with full configuration guides',
    count: 3,
    countLabel: 'projects',
    href: '/projects',
    color: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
    projects: ['Project #1 — Accounts & Delivery', 'Project #2 — SOHO / XYZ Company', 'Project #3 — Vic Modern Hotel'],
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    name: 'Ethio Exam Prep',
    description: 'Ethiopian national exam preparation materials',
    count: 2,
    countLabel: 'exams',
    href: '/exam-preparation',
    color: 'from-orange-500/20 to-orange-500/5 border-orange-500/20 text-orange-400',
    projects: ['University Exit Exam', 'High School Entrance Exam'],
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    name: 'Books Library',
    description: 'Networking and IT reference books',
    count: 0,
    countLabel: 'books',
    href: '/books',
    color: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
    projects: [],
  },
  {
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M15 10l4.553-2.069A1 1 0 0121 8.87V15.13a1 1 0 01-1.447.9L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
      </svg>
    ),
    name: 'Courses',
    description: 'Step-by-step networking and IT courses',
    count: 0,
    countLabel: 'courses',
    href: '/courses',
    color: 'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400',
    projects: [],
  },
];

export default function Categories() {
  return (
    <section id="categories" className="py-20 bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Browse by Category
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Find exactly what you need — projects, books, courses and exam preparation.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map(({ icon, name, description, href, count, countLabel, color, projects }) => (
            <Link
              key={name}
              to={href}
              className={`group flex flex-col gap-4 p-6 rounded-2xl bg-gradient-to-b border ${color}
                hover:scale-105 hover:shadow-lg transition-all duration-200 cursor-pointer`}
            >
              {/* Icon + count */}
              <div className="flex items-start justify-between">
                <div className="opacity-80 group-hover:opacity-100 transition-opacity">
                  {icon}
                </div>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-black/20`}>
                  {count} {countLabel}
                </span>
              </div>

              {/* Name + description */}
              <div>
                <div className="text-white text-base font-bold leading-tight mb-1">{name}</div>
                <div className="text-gray-500 text-xs leading-relaxed">{description}</div>
              </div>

              {/* Project list (only if has items) */}
              {projects.length > 0 && (
                <div className="space-y-1.5 border-t border-white/5 pt-3 mt-auto">
                  {projects.map((p) => (
                    <div key={p} className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="w-1 h-1 rounded-full bg-current opacity-50 shrink-0" />
                      {p}
                    </div>
                  ))}
                </div>
              )}

              {/* Arrow */}
              <div className="flex items-center gap-1 text-xs font-semibold opacity-60 group-hover:opacity-100 transition-opacity mt-auto">
                Browse all
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
