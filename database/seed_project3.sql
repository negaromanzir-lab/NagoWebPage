-- ================================================================
--  NagoWebPage - Seed: Project #3 — Vic Modern Hotel
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
  'Design and Implementation of a Hotel System Network (Project #3)',
  'hotel-network-vic-modern-project-3',
  'Vic Modern Hotel — 3-floor network with OSPF, VLANs, DHCP, SSH, Port Security and WiFi. Cisco 2911 routers connected via serial DCE links. Purchase to download the .pkt source file.',
  'Cisco', 'hierarchical', 'advanced', 'Cisco Packet Tracer 8.x',
  35, 5.0,
  9.00, 18.00, 'USD',
  TRUE, TRUE
)
ON CONFLICT (slug) DO UPDATE SET
  short_description = EXCLUDED.short_description,
  price             = EXCLUDED.price,
  is_published      = TRUE,
  is_featured       = TRUE;

INSERT INTO project_tags (project_id, tag)
SELECT
  (SELECT id FROM projects WHERE slug = 'hotel-network-vic-modern-project-3'),
  unnest(ARRAY[
    'packet-tracer','ospf','vlan','cisco','dhcp','ssh',
    'port-security','serial-dce','inter-vlan','hierarchical',
    'advanced','hotel-network','cisco-2911','wireless'
  ])
ON CONFLICT DO NOTHING;

SELECT p.id, p.title, p.price, p.difficulty, p.is_published,
       c.name AS category, COUNT(pt.tag) AS tag_count
FROM projects p
LEFT JOIN categories c  ON p.category_id = c.id
LEFT JOIN project_tags pt ON pt.project_id = p.id
WHERE p.slug = 'hotel-network-vic-modern-project-3'
GROUP BY p.id, c.name;
