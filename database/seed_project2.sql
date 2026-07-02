-- ================================================================
--  NagoWebPage - Seed: Project #2 — SOHO XYZ Company
--  Run in Neon SQL Editor AFTER seed_project1.sql
-- ================================================================

INSERT INTO projects (
  seller_id, category_id,
  title, slug, short_description,
  vendor, topology_type, difficulty, software_version,
  device_count, lab_duration_hours,
  price, original_price, currency,
  is_published, is_featured
)
VALUES (
  1,
  (SELECT id FROM categories WHERE slug = 'enterprise-lan'),
  'Design and Implementation of a SOHO Network — XYZ Company (Project #2)',
  'simple-networking-project-2-soho-xyz',
  'XYZ Company branch network with 3 VLANs (Admin, Finance, Customer Service), inter-VLAN routing, DHCP, and wireless access points. Router-on-a-stick design. Purchase to download the .pkt source file.',
  'Cisco', 'star', 'intermediate', 'Cisco Packet Tracer 8.x',
  14, 3.0,
  7.00, 15.00, 'USD',
  TRUE, TRUE
)
ON CONFLICT (slug) DO UPDATE SET
  short_description = EXCLUDED.short_description,
  price             = EXCLUDED.price,
  is_published      = TRUE,
  is_featured       = TRUE;

INSERT INTO project_tags (project_id, tag)
SELECT
  (SELECT id FROM projects WHERE slug = 'simple-networking-project-2-soho-xyz'),
  unnest(ARRAY[
    'packet-tracer','vlan','cisco','dhcp','inter-vlan',
    'wireless','soho','router-on-a-stick','intermediate',
    'access-point','cisco-2911'
  ])
ON CONFLICT DO NOTHING;

SELECT p.id, p.title, p.price, p.difficulty, p.is_published,
       c.name AS category, COUNT(pt.tag) AS tag_count
FROM projects p
LEFT JOIN categories c  ON p.category_id = c.id
LEFT JOIN project_tags pt ON pt.project_id = p.id
WHERE p.slug = 'simple-networking-project-2-soho-xyz'
GROUP BY p.id, c.name;
