-- ================================================================
--  NagoWebPage - Seed: Project #1
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

-- Step 2: Project
DO $$
DECLARE
  cat_id INTEGER;
  desc_text TEXT;
  short_text TEXT;
BEGIN

  SELECT id INTO cat_id FROM categories WHERE slug = 'enterprise-lan';

  desc_text := '## Case Study and Requirements

Design a network in Cisco Packet Tracer that connects **ACCOUNTS** and **DELIVERY** departments:

- Each department should contain at least two PCs
- Appropriate number of switches and routers should be used
- Using the given network **192.168.40.0**, all interfaces should be configured with correct IP addresses, subnet mask and gateways
- All devices should be connected using appropriate cables
- Test communication between devices in both departments

---

## Technologies Implemented

- Creating a Simple Network using a Router and Access Layer Switch
- Connecting Networking devices with Correct cabling
- Connecting two Networks using a Router
- Subnetting and IP Addressing
- Assigning IP Addresses to Router interfaces
- Static IP Address allocation to Host Devices
- Test and Verifying Network Communication

---

## PHASE 1: Subnetting Calculation

### Given Information

| Item | Value |
|---|---|
| Base Network Address | 192.168.40.0 |
| Number of Departments | 2 |
| Subnets Needed | 2 |

### Step 1 - Find Number of Borrowed Bits

```
Formula: 2^n = Number of Subnets
2^n = 2
n   = 1
1 bit is borrowed
```

### Step 2 - Calculate Subnet Mask

```
Octet 1:  11111111 = 255
Octet 2:  11111111 = 255
Octet 3:  11111111 = 255
Octet 4:  10000000 = 128

Subnet Mask = 255.255.255.128 (/25)
Block Size  = 128
```

### Step 3 - Calculate Both Subnets

| Department | Network ID | Valid Range | Broadcast | Subnet Mask |
|---|---|---|---|---|
| Accounts | 192.168.40.0 | .1 to .126 | 192.168.40.127 | 255.255.255.128 |
| Delivery | 192.168.40.128 | .129 to .254 | 192.168.40.255 | 255.255.255.128 |

---

## PHASE 2: Network Design

### Devices Required

| Device | Quantity |
|---|---|
| Router (Cisco 2911) | 1 |
| Switch | 2 (one per department) |
| PCs | 4 (2 per department) |
| Printers | 2 (1 per department) |

### Topology Layout

```
          [Router]
         /        \
  [Accounts SW]   [Delivery SW]
  /    |    \      /    |    \
PC1  PC2  Printer  PC3  PC4  Printer
```

---

## PHASE 3: Cabling

| Connection | Cable Type |
|---|---|
| Router to Accounts Switch | Straight-through |
| Router to Delivery Switch | Straight-through |
| Switch to PCs | Straight-through |
| Switch to Printer | Straight-through |

---

## PHASE 4: Configure Router Interfaces

### Step 1 - Turn Up Both Interfaces

```
enable
config t
interface range gig 0/0 - 1
no shutdown
do wr
```

### Step 2 - Assign IP to Gig 0/0 (Accounts Side)

```
enable
config t
interface gig 0/0
ip address 192.168.40.1 255.255.255.128
no shutdown
exit
do wr
```

### Step 3 - Assign IP to Gig 0/1 (Delivery Side)

```
enable
config t
interface gig 0/1
ip address 192.168.40.129 255.255.255.128
no shutdown
exit
do wr
```

### Step 4 - Verify Router Configuration

```
do show startup-config
```

Expected output:

```
interface GigabitEthernet0/0
 ip address 192.168.40.1 255.255.255.128
interface GigabitEthernet0/1
 ip address 192.168.40.129 255.255.255.128
```

---

## PHASE 5: Configure Host Devices

### Accounts Department

| Device | IP Address | Subnet Mask | Default Gateway |
|---|---|---|---|
| PC1 | 192.168.40.2 | 255.255.255.128 | 192.168.40.1 |
| PC2 | 192.168.40.3 | 255.255.255.128 | 192.168.40.1 |
| Printer | 192.168.40.4 | 255.255.255.128 | 192.168.40.1 |

How to configure each PC: Click PC then Desktop then IP Configuration then Static

```
IP Address   : 192.168.40.2
Subnet Mask  : 255.255.255.128
Default GW   : 192.168.40.1
```

### Delivery Department

| Device | IP Address | Subnet Mask | Default Gateway |
|---|---|---|---|
| PC3 | 192.168.40.130 | 255.255.255.128 | 192.168.40.129 |
| PC4 | 192.168.40.131 | 255.255.255.128 | 192.168.40.129 |
| Printer | 192.168.40.132 | 255.255.255.128 | 192.168.40.129 |

---

## PHASE 6: Test Communication

### Test 1 - Same Department

```
PC1 > Desktop > Command Prompt
ping 192.168.40.3
```

Reply successful

### Test 2 - Cross Department

```
PC1 > Desktop > Command Prompt
ping 192.168.40.130
```

Reply successful

### Test 3 - Ping Printer from Other Department

```
PC1 > Desktop > Command Prompt
ping 192.168.40.132
```

Reply successful

---

## Full IP Address Summary

```
ROUTER
  Gig 0/0 : 192.168.40.1/25   (Accounts Gateway)
  Gig 0/1 : 192.168.40.129/25 (Delivery Gateway)

ACCOUNTS DEPARTMENT
  PC1     : 192.168.40.2/25
  PC2     : 192.168.40.3/25
  Printer : 192.168.40.4/25

DELIVERY DEPARTMENT
  PC3     : 192.168.40.130/25
  PC4     : 192.168.40.131/25
  Printer : 192.168.40.132/25
```

---

## Configuration Checklist

| Task | Status |
|---|---|
| Subnetting completed | Done |
| Topology designed | Done |
| Cabling done | Done |
| Router interfaces configured | Done |
| All PCs assigned static IPs | Done |
| All printers assigned static IPs | Done |
| Default gateways set correctly | Done |
| Communication tested | Done |

---

## Common Mistakes to Avoid

| Mistake | Correct Approach |
|---|---|
| Assigning network ID as IP | Start from .1 or .129 |
| Wrong subnet mask | Always use 255.255.255.128 |
| Wrong default gateway | Must match router interface IP |
| Forgetting no shutdown | Always run no shutdown on router interfaces |
| Assigning broadcast ID as IP | Never use .127 or .255 as host IP |

---

**Download the Packet Tracer (.pkt) source file** using the Purchase button to get the fully configured working topology file.';

  short_text := 'Connect ACCOUNTS and DELIVERY departments using Cisco 2911 router with /25 subnetting. Full configuration guide included. Purchase to download the .pkt source file.';

  INSERT INTO projects (
    seller_id, category_id, title, slug,
    description, short_description,
    vendor, topology_type, difficulty, software_version,
    device_count, lab_duration_hours,
    price, original_price, currency,
    is_published, is_featured
  )
  VALUES (
    1, cat_id,
    'Design and Implementation of a Simple Networking Project #1',
    'simple-networking-project-1-accounts-delivery',
    desc_text, short_text,
    'Cisco', 'star', 'beginner', 'Cisco Packet Tracer 8.x',
    9, 2.0,
    5.00, 10.00, 'USD',
    TRUE, TRUE
  )
  ON CONFLICT (slug) DO UPDATE SET
    description      = EXCLUDED.description,
    short_description = EXCLUDED.short_description,
    price            = EXCLUDED.price,
    is_published     = TRUE,
    is_featured      = TRUE;

END $$;

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
