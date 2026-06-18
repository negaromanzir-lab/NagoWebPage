const categories = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
    name: 'Enterprise LAN',
    slug: 'enterprise-lan',
    count: 87,
    countLabel: 'projects',
    href: '/projects?category=enterprise-lan',
    color: 'from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
      </svg>
    ),
    name: 'Cloud Networking',
    slug: 'cloud-networking',
    count: 64,
    countLabel: 'projects',
    href: '/projects?category=cloud-networking',
    color: 'from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    name: 'Security & Firewall',
    slug: 'security-firewall',
    count: 112,
    countLabel: 'projects',
    href: '/projects?category=security-firewall',
    color: 'from-red-500/20 to-red-500/5 border-red-500/20 text-red-400',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
      </svg>
    ),
    name: 'Wireless & Wi-Fi',
    slug: 'wireless-wifi',
    count: 53,
    countLabel: 'projects',
    href: '/projects?category=wireless-wifi',
    color: 'from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    name: 'SD-WAN',
    slug: 'sd-wan',
    count: 41,
    countLabel: 'projects',
    href: '/projects?category=sd-wan',
    color: 'from-yellow-500/20 to-yellow-500/5 border-yellow-500/20 text-yellow-400',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    name: 'Ethio-Exam-Preparetion',
    slug: 'exam-preparation',
    count: 2,
    countLabel: 'exams',
    href: '/exam-preparation',
    color: 'from-orange-500/20 to-orange-500/5 border-orange-500/20 text-orange-400',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
    name: 'Books Library',
    slug: 'books',
    count: 0,
    countLabel: 'books',
    href: '/books',
    color: 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/20 text-emerald-400',
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
            Find the exact network design you need across all major technology domains.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-4">
          {categories.map(({ icon, name, href, count, countLabel, color }) => (
            <a
              key={name}
              href={href}
              className={`group flex flex-col items-center gap-3 p-5 rounded-2xl bg-gradient-to-b border ${color} hover:scale-105 transition-transform duration-200 cursor-pointer`}
            >
              <div className="opacity-80 group-hover:opacity-100 transition-opacity">
                {icon}
              </div>
              <div className="text-center">
                <div className="text-white text-sm font-semibold leading-tight">{name}</div>
                <div className="text-gray-500 text-xs mt-1">{count} {countLabel}</div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
