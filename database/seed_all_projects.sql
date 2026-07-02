-- ================================================================
--  NagoWebPage - Seed ALL Projects at once
--  Run this single file in Neon SQL Editor to insert all 3 projects
-- ================================================================

-- ── STEP 1: Category ─────────────────────────────────────────────
INSERT INTO categories (name, slug, description, icon, color, sort_order, is_active)
VALUES (
  'Enterprise LAN',
  'enterprise-lan',
  'Local Area Network designs for enterprise environments including subnetting, VLANs, routing and wireless.',
  'network',
  'cyan',
  1,
  TRUE
)
ON CONFLICT (slug) DO NOTHING;

-- ── STEP 2: All 3 Projects ────────────────────────────────────────

INSERT INTO projects (
  seller_id, category_id, title, slug, short_description,
  vendor, topology_type, difficulty, software_version,
  device_count, lab_duration_hours, price, original_price,
  currency, is_published, is_featured
)
VALUES
-- Project 1
(
  1,
  (SELECT id FROM categories WHERE slug = 'enterprise-lan'),
  'Design and Implementation of a Simple Networking Project #1',
  'simple-networking-project-1-accounts-delivery',
  'Connect ACCOUNTS and DELIVERY departments using Cisco 2911 router with /25 subnetting. Full step-by-step guide. Purchase to download the .pkt source file.',
  'Cisco', 'star', 'beginner', 'Cisco Packet Tracer 8.x',
  9, 2.0, 5.00, 10.00, 'USD', TRUE, TRUE
),
-- Project 2
(
  1,
  (SELECT id FROM categories WHERE slug = 'enterprise-lan'),
  'Design and Implementation of a SOHO Network — XYZ Company (Project #2)',
  'simple-networking-project-2-soho-xyz',
  'XYZ Company branch with 3 VLANs, inter-VLAN routing, DHCP, and wireless. Router-on-a-stick design. Purchase to download the .pkt source file.',
  'Cisco', 'star', 'intermediate', 'Cisco Packet Tracer 8.x',
  14, 3.0, 7.00, 15.00, 'USD', TRUE, TRUE
),
-- Project 3
(
  1,
  (SELECT id FROM categories WHERE slug = 'enterprise-lan'),
  'Design and Implementation of a Hotel System Network (Project #3)',
  'hotel-network-vic-modern-project-3',
  'Vic Modern Hotel — 3-floor network with OSPF, VLANs, DHCP, SSH, Port Security and WiFi. Cisco 2911 routers on serial DCE links. Purchase to download the .pkt source file.',
  'Cisco', 'hierarchical', 'advanced', 'Cisco Packet Tracer 8.x',
  35, 5.0, 9.00, 18.00, 'USD', TRUE, TRUE
)
ON CONFLICT (slug) DO UPDATE SET
  short_description = EXCLUDED.short_description,
  price             = EXCLUDED.price,
  is_published      = TRUE,
  is_featured       = TRUE;

-- ── STEP 3: Tags for Project 1 ────────────────────────────────────
INSERT INTO project_tags (project_id, tag)
SELECT
  (SELECT id FROM projects WHERE slug = 'simple-networking-project-1-accounts-delivery'),
  unnest(ARRAY['packet-tracer','subnetting','cisco','routing','lan','static-ip','beginner','enterprise-lan','ip-addressing','cisco-2911'])
ON CONFLICT DO NOTHING;

-- ── STEP 4: Tags for Project 2 ────────────────────────────────────
INSERT INTO project_tags (project_id, tag)
SELECT
  (SELECT id FROM projects WHERE slug = 'simple-networking-project-2-soho-xyz'),
  unnest(ARRAY['packet-tracer','vlan','cisco','dhcp','inter-vlan','wireless','soho','router-on-a-stick','intermediate','access-point','cisco-2911'])
ON CONFLICT DO NOTHING;

-- ── STEP 5: Tags for Project 3 ────────────────────────────────────
INSERT INTO project_tags (project_id, tag)
SELECT
  (SELECT id FROM projects WHERE slug = 'hotel-network-vic-modern-project-3'),
  unnest(ARRAY['packet-tracer','ospf','vlan','cisco','dhcp','ssh','port-security','serial-dce','inter-vlan','hierarchical','advanced','hotel-network','cisco-2911','wireless'])
ON CONFLICT DO NOTHING;

-- ── VERIFY ────────────────────────────────────────────────────────
SELECT
  p.id,
  p.title,
  p.price,
  p.difficulty,
  p.is_published,
  p.is_featured,
  c.name AS category,
  COUNT(pt.tag) AS tag_count
FROM projects p
LEFT JOIN categories c  ON p.category_id = c.id
LEFT JOIN project_tags pt ON pt.project_id = p.id
WHERE p.slug IN (
  'simple-networking-project-1-accounts-delivery',
  'simple-networking-project-2-soho-xyz',
  'hotel-network-vic-modern-project-3'
)
GROUP BY p.id, c.name
ORDER BY p.id;
