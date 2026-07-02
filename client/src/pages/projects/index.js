/**
 * Project content registry.
 *
 * Maps project slug → rich content component.
 * If a slug is not listed here, the detail page falls back
 * to rendering the description field from the database.
 *
 * To add a new project:
 *   1. Create client/src/pages/projects/YourProjectComponent.jsx
 *   2. Add its slug → component mapping below
 */

import Project1AccountsDelivery from './Project1AccountsDelivery';

export const PROJECT_CONTENT_MAP = {
  'simple-networking-project-1-accounts-delivery': Project1AccountsDelivery,
};
