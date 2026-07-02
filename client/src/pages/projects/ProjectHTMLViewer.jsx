/**
 * ProjectHTMLViewer.jsx
 *
 * Renders a project HTML file inside an iframe.
 * Shows a Download button overlay at the top.
 * The HTML files are served from /projects/ public folder.
 */

import { useState, useEffect } from 'react';

export default function ProjectHTMLViewer({ htmlFile, onDownload, isPurchased, price, isLoading }) {
  const [iframeHeight, setIframeHeight] = useState(800);

  function handleIframeLoad(e) {
    try {
      const doc = e.target.contentDocument || e.target.contentWindow.document;
      const h   = doc.documentElement.scrollHeight;
      if (h > 400) setIframeHeight(h + 40);
    } catch {
      // cross-origin fallback — just use a tall fixed height
      setIframeHeight(3000);
    }
  }

  return (
    <div className="space-y-4">
      {/* Download banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4
        bg-gray-900 border border-cyan-500/20 rounded-2xl px-5 py-4">
        <div>
          <p className="text-white font-semibold text-sm">
            {isPurchased ? '✅ You own this project' : '📦 Get the Cisco Packet Tracer source file'}
          </p>
          <p className="text-gray-500 text-xs mt-0.5">
            {isPurchased
              ? 'Click to download your .pkt file'
              : 'Full content is free to read. Purchase to download the .pkt file.'}
          </p>
        </div>
        <button
          onClick={onDownload}
          disabled={isLoading}
          className="flex items-center gap-2 shrink-0
            bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60
            text-gray-950 font-bold px-5 py-2.5 rounded-xl
            transition-colors text-sm"
        >
          {isLoading ? (
            <span className="w-4 h-4 border-2 border-gray-950/40 border-t-gray-950 rounded-full animate-spin" />
          ) : isPurchased ? (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download .pkt File
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Purchase — ${parseFloat(price || 0).toFixed(2)}
            </>
          )}
        </button>
      </div>

      {/* HTML content in iframe */}
      <div className="rounded-2xl overflow-hidden border border-gray-800">
        <iframe
          src={`/projects/${htmlFile}`}
          title="Project Content"
          width="100%"
          height={iframeHeight}
          onLoad={handleIframeLoad}
          style={{ border: 'none', display: 'block' }}
          sandbox="allow-same-origin allow-scripts"
        />
      </div>

      {/* Bottom download button */}
      <div className="flex justify-center pt-2">
        <button
          onClick={onDownload}
          disabled={isLoading}
          className="flex items-center gap-2
            bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60
            text-gray-950 font-bold px-8 py-3 rounded-xl
            transition-colors"
        >
          {isPurchased ? 'Download .pkt File' : `Purchase & Download — $${parseFloat(price || 0).toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}
