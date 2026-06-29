-- ================================================================
--  NagoWebPage — Seed: Project #1
--  Full content visible to all users.
--  .pkt file download requires purchase (price set below).
--  Run in Neon SQL Editor.
-- ================================================================

-- ── Step 1: Category ─────────────────────────────────────────────────────────

INSERT INTO categories (name, slug, description, icon, color, sort_order, is_active)
VALUES (
  'Enterprise LAN',
  'enterprise-lan',
  'Local Area Network designs for enterprise environments including departmental segmentation, subnetting, and inter-VLAN routing.',
  'network',
  'cyan',
  1,
  TRUE
)
ON CONFLICT (slug) DO NOTHING;

-- ── Step 2: Project ───────────────────────────────────────────────────────────

INSERT INTO projects (
  seller_id,
  category_id,
  title,
  slug,
  description,
  short_description,
  vendor,
  topology_type,
  difficulty,
  software_version,
  device_count,
  lab_duration_hours,
  price,
  original_price,
  currency,
  is_published,
  is_featured
)
VALUES (
  1,
  (SELECT id FROM categories WHERE slug = 'enterprise-lan'),
  'Design and Implementation of a Simple Networking Project #1',
  'simple-networking-project-1-accounts-delivery',
  E'## Case Study and Requirements\n\nDesign a network in Cisco Packet Tracer that connects **ACCOUNTS** and **DELIVERY** departments through the following:\n\n- Each department should contain at least two PCs\n- Appropriate number of switches and routers should be used\n- Using the given network **192.168.40.0**, all interfaces should be configured with correct IP addresses, subnet mask and gateways\n- All devices should be connected using appropriate cables\n- Test communication between devices in both departments\n\n---\n\n## Technologies Implemented\n\n- Creating a Simple Network using a Router and Access Layer Switch\n- Connecting Networking devices with Correct cabling\n- Connecting two Networks using a Router\n- Subnetting and IP Addressing\n- Assigning IP Addresses to Router''s interfaces\n- Static IP Address allocation to Host Devices\n- Test and Verifying Network Communication\n\n---\n\n## PHASE 1: Subnetting Calculation\n\n### Given Information\n\n| Item | Value |\n|---|---|\n| Base Network Address | 192.168.40.0 |\n| Number of Departments | 2 |\n| Subnets Needed | 2 |\n\n### Step 1 — Find Number of Borrowed Bits\n\n```\nFormula: 2^n = Number of Subnets\n2^n = 2\nn   = 1\n→ 1 bit is borrowed\n```\n\n### Step 2 — Calculate Subnet Mask\n\n```\nOctet 1:  11111111 = 255\nOctet 2:  11111111 = 255\nOctet 3:  11111111 = 255\nOctet 4:  10000000 = 128  ← 1 borrowed bit\n\nSubnet Mask = 255.255.255.128 (/25)\nBlock Size  = 128\n```\n\n### Step 3 — Calculate Both Subnets\n\n| Department | Network ID | Valid Range | Broadcast | Subnet Mask |\n|---|---|---|---|---|\n| Accounts | 192.168.40.0 | .1 — .126 | 192.168.40.127 | 255.255.255.128 |\n| Delivery | 192.168.40.128 | .129 — .254 | 192.168.40.255 | 255.255.255.128 |\n\n> ⚠️ Block size rule: 0 → 127 = 128 addresses, then 128 → 255 = 128 addresses\n\n---\n\n## PHASE 2: Network Design & Device Placement\n\n### Devices Required\n\n| Device | Quantity |\n|---|---|\n| Router (Cisco 2911) | 1 |\n| Switch | 2 (one per department) |\n| PCs | 4 (2 per department) |\n| Printers | 2 (1 per department) |\n\n### Topology Layout\n\n```\n          [Router]\n         /        \\\n  [Accounts SW]   [Delivery SW]\n  /    |    \\      /    |    \\\nPC1  PC2  Printer  PC3  PC4  Printer\n```\n\n---\n\n## PHASE 3: Cabling\n\n| Connection | Cable Type |\n|---|---|\n| Router → Accounts Switch | Straight-through |\n| Router → Delivery Switch | Straight-through |\n| Switch → PCs | Straight-through |\n| Switch → Printer | Straight-through |\n\n---\n\n## PHASE 4: Configure Router Interfaces\n\n### Step 1 — Turn Up Both Interfaces\n\n```\nenable\nconfig t\ninterface range gig 0/0 - 1\nno shutdown\ndo wr\n```\n\n### Step 2 — Assign IP to Gig 0/0 (Accounts Side)\n\n```\nenable\nconfig t\ninterface gig 0/0\nip address 192.168.40.1 255.255.255.128\nno shutdown\nexit\ndo wr\n```\n\n### Step 3 — Assign IP to Gig 0/1 (Delivery Side)\n\n```\nenable\nconfig t\ninterface gig 0/1\nip address 192.168.40.129 255.255.255.128\nno shutdown\nexit\ndo wr\n```\n\n### Step 4 — Verify Router Configuration\n\n```\ndo show startup-config\n```\n\nExpected output:\n\n```\ninterface GigabitEthernet0/0\n ip address 192.168.40.1 255.255.255.128\ninterface GigabitEthernet0/1\n ip address 192.168.40.129 255.255.255.128\n```\n\n---\n\n## PHASE 5: Configure Host Devices (Static IP)\n\n### Accounts Department\n\n| Device | IP Address | Subnet Mask | Default Gateway |\n|---|---|---|---|\n| PC1 | 192.168.40.2 | 255.255.255.128 | 192.168.40.1 |\n| PC2 | 192.168.40.3 | 255.255.255.128 | 192.168.40.1 |\n| Printer | 192.168.40.4 | 255.255.255.128 | 192.168.40.1 |\n\n**How to configure each PC:**\n> Click PC → Desktop → IP Configuration → Static\n\n```\nIP Address   : 192.168.40.2\nSubnet Mask  : 255.255.255.128\nDefault GW   : 192.168.40.1\n```\n\n### Delivery Department\n\n| Device | IP Address | Subnet Mask | Default Gateway |\n|---|---|---|---|\n| PC3 | 192.168.40.130 | 255.255.255.128 | 192.168.40.129 |\n| PC4 | 192.168.40.131 | 255.255.255.128 | 192.168.40.129 |\n| Printer | 192.168.40.132 | 255.255.255.128 | 192.168.40.129 |\n\n> ⚠️ Key Rule: Never assign the Network ID (.0 or .128) or Broadcast ID (.127 or .255) to any device\n\n---\n\n## PHASE 6: Test Communication\n\n### Test 1 — Same Department\n\n```\nPC1 > Desktop > Command Prompt\nping 192.168.40.3\n```\n✅ Reply successful\n\n### Test 2 — Cross Department\n\n```\nPC1 > Desktop > Command Prompt\nping 192.168.40.130\n```\n✅ Reply successful\n\n### Test 3 — Ping Printer from Other Department\n\n```\nPC1 > Desktop > Command Prompt\nping 192.168.40.132\n```\n✅ Reply successful\n\n---\n\n## Full IP Address Summary\n\n```\nROUTER\n├── Gig 0/0 : 192.168.40.1/25   (Accounts Gateway)\n└── Gig 0/1 : 192.168.40.129/25 (Delivery Gateway)\n\nACCOUNTS DEPARTMENT\n├── PC1     : 192.168.40.2/25\n├── PC2     : 192.168.40.3/25\n└── Printer : 192.168.40.4/25\n\nDELIVERY DEPARTMENT\n├── PC3     : 192.168.40.130/25\n├── PC4     : 192.168.40.131/25\n└── Printer : 192.168.40.132/25\n```\n\n---\n\n## Configuration Checklist\n\n| Task | Status |\n|---|---|\n| Subnetting completed | ✅ |\n| Topology designed | ✅ |\n| Cabling done | ✅ |\n| Router interfaces configured | ✅ |\n| All PCs assigned static IPs | ✅ |\n| All printers assigned static IPs | ✅ |\n| Default gateways set correctly | ✅ |\n| Communication tested | ✅ |\n\n---\n\n## Common Mistakes to Avoid\n\n| Mistake | Correct Approach |\n|---|---|\n| Assigning network ID as IP | Start from .1 or .129 |\n| Wrong subnet mask | Always use 255.255.255.128 |\n| Wrong default gateway | Must match router interface IP |\n| Forgetting no shutdown | Always run no shutdown on router interfaces |\n| Assigning broadcast ID as IP | Never use .127 or .255 as host IP |\n\n---\n\n> 📦 **Download the Packet Tracer (.pkt) source file** using the Purchase button to get the fully configured, working topology file.',

  'Connect ACCOUNTS and DELIVERY departments using Cisco 2911 router with /25 subnetting. Full configuration guide included — purchase to download the .pkt source file.',
  'Cisco',
  'star',
  'beginner',
  'Cisco Packet Tracer 8.x',
  9,
  2.0,
  5.00,        -- ← SET YOUR PRICE HERE (e.g. $5.00)
  10.00,       -- ← original price (shows as strikethrough)
  'USD',
  TRUE,
  TRUE
);

-- ── Step 3: Tags ─────────────────────────────────────────────────────────────

INSERT INTO project_tags (project_id, tag)
SELECT
  (SELECT id FROM projects WHERE slug = 'simple-networking-project-1-accounts-delivery'),
  unnest(ARRAY[
    'packet-tracer','subnetting','cisco','routing','lan',
    'static-ip','beginner','enterprise-lan','ip-addressing','cisco-2911'
  ])
ON CONFLICT DO NOTHING;

-- ── Verify ────────────────────────────────────────────────────────────────────

SELECT p.id, p.title, p.price, p.is_published, p.is_featured,
       c.name AS category, COUNT(pt.tag) AS tag_count
FROM projects p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN project_tags pt ON pt.project_id = p.id
WHERE p.slug = 'simple-networking-project-1-accounts-delivery'
GROUP BY p.id, c.name;
