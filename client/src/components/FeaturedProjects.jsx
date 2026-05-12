import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import ProjectCard from './ProjectCard';
import { projectsApi } from '../lib/api';

// SVG topology illustrations (used as fallback when no API data)
const topologies = {
  star: (
    <svg viewBox="0 0 160 120" className="w-full h-full opacity-60" fill="none">
      <circle cx="80" cy="60" r="14" stroke="#06b6d4" strokeWidth="2" fill="#06b6d4" fillOpacity="0.15" />
      {[[80,15],[130,40],[130,85],[80,110],[30,85],[30,40]].map(([x,y],i) => (
        <g key={i}>
          <line x1="80" y1="60" x2={x} y2={y} stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4 2" />
          <circle cx={x} cy={y} r="8" stroke="#06b6d4" strokeWidth="1.5" fill="#06b6d4" fillOpacity="0.1" />
        </g>
      ))}
      <text x="80" y="64" textAnchor="middle" fill="#06b6d4" fontSize="8" fontWeight="bold">SW</text>
    </svg>
  ),
  mesh: (
    <svg viewBox="0 0 160 120" className="w-full h-full opacity-60" fill="none">
      {[[40,30],[120,30],[80,70],[40,100],[120,100]].map(([x,y],i,arr) => (
        arr.slice(i+1).map(([x2,y2],j) => (
          <line key={`${i}-${j}`} x1={x} y1={y} x2={x2} y2={y2} stroke="#3b82f6" strokeWidth="1.5" strokeDasharray="3 2" />
        ))
      ))}
      {[[40,30],[120,30],[80,70],[40,100],[120,100]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="9" stroke="#3b82f6" strokeWidth="1.5" fill="#3b82f6" fillOpacity="0.15" />
      ))}
    </svg>
  ),
  hierarchical: (
    <svg viewBox="0 0 160 120" className="w-full h-full opacity-60" fill="none">
      <circle cx="80" cy="20" r="10" stroke="#a855f7" strokeWidth="1.5" fill="#a855f7" fillOpacity="0.15" />
      {[[45,55],[115,55]].map(([x,y],i) => (
        <g key={i}>
          <line x1="80" y1="30" x2={x} y2={y-10} stroke="#a855f7" strokeWidth="1.5" />
          <circle cx={x} cy={y} r="9" stroke="#a855f7" strokeWidth="1.5" fill="#a855f7" fillOpacity="0.15" />
        </g>
      ))}
      {[[20,95],[70,95],[90,95],[140,95]].map(([x,y],i) => (
        <g key={i}>
          <line x1={i < 2 ? 45 : 115} y1="64" x2={x} y2={y-10} stroke="#a855f7" strokeWidth="1.5" />
          <circle cx={x} cy={y} r="7" stroke="#a855f7" strokeWidth="1.5" fill="#a855f7" fillOpacity="0.1" />
        </g>
      ))}
    </svg>
  ),
  cloud: (
    <svg viewBox="0 0 160 120" className="w-full h-full opacity-60" fill="none">
      <ellipse cx="80" cy="45" rx="40" ry="22" stroke="#22d3ee" strokeWidth="1.5" fill="#22d3ee" fillOpacity="0.08" strokeDasharray="5 3" />
      <text x="80" y="49" textAnchor="middle" fill="#22d3ee" fontSize="9">Cloud</text>
      {[[30,90],[80,90],[130,90]].map(([x,y],i) => (
        <g key={i}>
          <line x1={x} y1={y-10} x2="80" y2="67" stroke="#22d3ee" strokeWidth="1.5" />
          <rect x={x-12} y={y-10} width="24" height="16" rx="3" stroke="#22d3ee" strokeWidth="1.5" fill="#22d3ee" fillOpacity="0.1" />
        </g>
      ))}
    </svg>
  ),
  ring: (
    <svg viewBox="0 0 160 120" className="w-full h-full opacity-60" fill="none">
      <circle cx="80" cy="60" r="38" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" fill="none" />
      {[0,60,120,180,240,300].map((deg,i) => {
        const rad = (deg * Math.PI) / 180;
        const x = 80 + 38 * Math.cos(rad);
        const y = 60 + 38 * Math.sin(rad);
        return <circle key={i} cx={x} cy={y} r="8" stroke="#f59e0b" strokeWidth="1.5" fill="#f59e0b" fillOpacity="0.15" />;
      })}
    </svg>
  ),
  sdwan: (
    <svg viewBox="0 0 160 120" className="w-full h-full opacity-60" fill="none">
      <rect x="55" y="45" width="50" height="30" rx="6" stroke="#10b981" strokeWidth="1.5" fill="#10b981" fillOpacity="0.1" />
      <text x="80" y="64" textAnchor="middle" fill="#10b981" fontSize="8" fontWeight="bold">SD-WAN</text>
      {[[20,25],[140,25],[20,95],[140,95]].map(([x,y],i) => (
        <g key={i}>
          <line x1={i < 2 ? 55 : 55} y1={i < 2 ? 55 : 65} x2={x} y2={y} stroke="#10b981" strokeWidth="1.5" strokeDasharray="4 2" />
          <circle cx={x} cy={y} r="9" stroke="#10b981" strokeWidth="1.5" fill="#10b981" fillOpacity="0.1" />
        </g>
      ))}
    </svg>
  ),
};

// Fallback static projects (shown while API loads or if API has no data)
const STATIC_PROJECTS = [
  { id: 's1', title: 'Cisco Enterprise Campus Network — 3-Tier Hierarchical Design', category: 'Enterprise LAN', vendor: 'Cisco', rating: '4.9', reviews: 142, price: 49, badge: 'Bestseller', topology: topologies.hierarchical },
  { id: 's2', title: 'Full-Mesh WAN with BGP Redundancy & Failover', category: 'WAN', vendor: 'Multi-vendor', rating: '4.8', reviews: 98, price: 39, badge: 'Popular', topology: topologies.mesh },
  { id: 's3', title: 'AWS VPC Multi-Region Cloud Network Architecture', category: 'Cloud Networking', vendor: 'AWS', rating: '4.9', reviews: 211, price: 59, badge: 'New', topology: topologies.cloud },
  { id: 's4', title: 'Cisco SD-WAN vManage Deployment with Dual ISP', category: 'SD-WAN', vendor: 'Cisco', rating: '4.7', reviews: 67, price: 69, badge: null, topology: topologies.sdwan },
  { id: 's5', title: 'Juniper EX Series Ring Topology for Campus', category: 'Enterprise LAN', vendor: 'Juniper', rating: '4.6', reviews: 44, price: 35, badge: null, topology: topologies.ring },
  { id: 's6', title: 'Small Business Star Topology with VLAN Segmentation', category: 'SMB', vendor: 'Cisco', rating: '4.8', reviews: 189, price: 19, badge: 'Free Trial', topology: topologies.star },
];

const VENDOR_TABS = ['All', 'Cisco', 'Juniper', 'AWS', 'Azure', 'Multi-vendor'];

export default function FeaturedProjects() {
  const [projects, setProjects]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeVendor, setVendor]   = useState('All');
  const [useStatic, setUseStatic]   = useState(false);

  useEffect(() => {
    projectsApi.list({ is_featured: '1', limit: 6, sort: 'popular' })
      .then((res) => {
        const data = res.data || [];
        if (data.length > 0) {
          setProjects(data);
          setUseStatic(false);
        } else {
          setUseStatic(true);
        }
      })
      .catch(() => setUseStatic(true))
      .finally(() => setLoading(false));
  }, []);

  const displayProjects = useStatic
    ? STATIC_PROJECTS.filter((p) => activeVendor === 'All' || p.vendor === activeVendor)
    : projects.filter((p) => activeVendor === 'All' || p.vendor === activeVendor);

  return (
    <section id="projects" className="py-20 bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-12">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
              Featured Projects
            </h2>
            <p className="text-gray-400 max-w-lg">
              Hand-picked network designs from our top-rated engineers, ready to deploy.
            </p>
          </div>
          <Link
            to="/projects"
            className="text-cyan-400 hover:text-cyan-300 text-sm font-medium flex items-center gap-1 shrink-0 transition-colors"
          >
            View all projects
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Vendor filter tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {VENDOR_TABS.map((tab, i) => (
            <button
              key={tab}
              onClick={() => setVendor(tab)}
              className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeVendor === tab
                  ? 'bg-cyan-500 text-gray-950'
                  : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Cards Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : displayProjects.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            No featured projects for this vendor yet.{' '}
            <Link to="/projects" className="text-cyan-400 hover:text-cyan-300">Browse all projects</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayProjects.map((project) => (
              <ProjectCard key={project.id} project={project} legacy={useStatic} />
            ))}
          </div>
        )}

        {/* Browse all CTA */}
        <div className="text-center mt-10">
          <Link
            to="/projects"
            className="inline-flex items-center gap-2 bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-cyan-500/50 text-gray-300 hover:text-white px-6 py-3 rounded-xl text-sm font-medium transition-all duration-200"
          >
            Browse all projects
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
