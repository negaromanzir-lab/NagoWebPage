/**
 * Project content registry.
 *
 * Maps project slug → { component, htmlFile? }
 *
 * htmlFile: served from /public/projects/ as a static asset via iframe
 * component: custom React component (used if htmlFile is not set)
 *
 * To add a new project:
 *   1. Put the HTML file in client/public/projects/your-project.html
 *   2. Add its slug below with htmlFile pointing to that file
 */

import ProjectHTMLViewer from './ProjectHTMLViewer';

// Wrapper factory — creates a component that renders a specific HTML file
function htmlProject(htmlFile) {
  return function HTMLProjectWrapper(props) {
    return <ProjectHTMLViewer {...props} htmlFile={htmlFile} />;
  };
}

export const PROJECT_CONTENT_MAP = {
  // Project #1 — Accounts & Delivery
  'simple-networking-project-1-accounts-delivery': htmlProject('networking-project-one.html'),

  // Project #2 — SOHO / XYZ Company
  'simple-networking-project-2-soho-xyz': htmlProject('networking-project-2.html'),

  // Project #3 — Vic Modern Hotel
  'hotel-network-vic-modern-project-3': htmlProject('networking-project-3.html'),
};
