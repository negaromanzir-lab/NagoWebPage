-- ================================================================
--  NagoWebPage - Seed: Project #1
--  DB stores only metadata + price. Full content lives in:
--  client/src/pages/projects/Project1AccountsDelivery.jsx
--  Run in Neon SQL Editor.
-- ================================================================

-- Step 1: Category
INSERT INTO categories (name, slug, description, icon, color, sort_order, is_active)
VALUES (
  'Enterprise LAN',
  'enterprise-lan',
  'Local Area Network designs for enterprise environments.',
  'network',
  'cyan',
  1,
  TRUE
)
ON CONFLICT (slug) DO NOTHING;

-- Step 2: Project (metadata only - no long description)
INSERT INTO projects (
  seller_id, category_id,
  title, slug,
  short_description,
  vendor, topology_type, difficulty, software_version,
  device_count, lab_duration_hours,
  price, original_price, currency,
  is_published, is_featured
)
VALUES (
  1,
  (SELECT id FROM categories WHERE slug = 'enterprise-lan'),
  'Design and Implementation of a Simple Networking Project #1',
  'simple-networking-project-1-accounts-delivery',
  'Connect ACCOUNTS and DELIVERY departments using Cisco 2911 router with /25 subnetting. Full step-by-step guide included. Purchase to download the .pkt source file.',
  'Cisco', 'star', 'beginner', 'Cisco Packet Tracer 8.x',
  9, 2.0,
  5.00, 10.00, 'USD',
  TRUE, TRUE
)
ON CONFLICT (slug) DO UPDATE SET
  short_description = EXCLUDED.short_description,
  price             = EXCLUDED.price,
  original_price    = EXCLUDED.original_price,
  is_published      = TRUE,
  is_featured       = TRUE;

-- Step 3: Tags
INSERT INTO project_tags (project_id, tag)
SELECT
  (SELECT id FROM projects WHERE slug = 'simple-networking-project-1-accounts-delivery'),
  unnest(ARRAY[
    'packet-tracer','subnetting','cisco','routing','lan',
    'static-ip','beginner','enterprise-lan','ip-addressing','cisco-2911'
  ])
ON CONFLICT DO NOTHING;

-- Verify
SELECT p.id, p.title, p.price, p.is_published, p.is_featured,
       c.name AS category, COUNT(pt.tag) AS tag_count
FROM projects p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN project_tags pt ON pt.project_id = p.id
WHERE p.slug = 'simple-networking-project-1-accounts-delivery'
GROUP BY p.id, c.name;
