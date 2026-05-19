const mysql = require('mysql2/promise');
require('dotenv').config();

async function setupDatabase() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host:     process.env.DB_HOST || 'localhost',
      port:     process.env.DB_PORT || 3306,
      user:     process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'nagoweb',
    });

    console.log('✓ Connected to MySQL');

    // Insert categories
    const categories = [
      ['Enterprise Networking', 'enterprise', 'Cisco, Juniper, Arista, and traditional enterprise network designs.', 'network', 'cyan', 0],
      ['Cloud Networking', 'cloud-networking', 'AWS, Azure, and GCP virtual network architectures including VPCs, VNets, and hybrid connectivity.', 'cloud', 'blue', 1],
      ['Security & Firewall', 'security', 'Perimeter security, firewall policies, IDS/IPS, and zero-trust network designs.', 'shield', 'red', 2],
      ['Wireless & Wi-Fi', 'wireless', 'Enterprise wireless LAN designs, controller-based and cloud-managed deployments.', 'wifi', 'purple', 3],
      ['SD-WAN', 'sdwan', 'Software-defined WAN deployments including Cisco Viptela, VMware VeloCloud, and Fortinet.', 'zap', 'yellow', 4],
      ['Data Center', 'data-center', 'Spine-leaf, three-tier, and hyper-converged data center network designs.', 'database', 'green', 5],
      ['WAN & MPLS', 'wan', 'Wide area network designs including MPLS, BGP, OSPF, and multi-site connectivity.', 'globe', 'orange', 6],
      ['SMB Networks', 'smb', 'Small and medium business network designs — affordable, practical, and easy to deploy.', 'briefcase', 'pink', 7],
      ['Network Automation', 'automation', 'Ansible, Python, and Terraform-based network automation and infrastructure-as-code projects.', 'terminal', 'teal', 8],
      ['IPv6 & Routing', 'routing', 'Advanced routing protocol labs — BGP, OSPF, EIGRP, IS-IS, and IPv6 migration designs.', 'route', 'indigo', 9],
    ];

    console.log('📝 Inserting categories...');
    for (const cat of categories) {
      await connection.query(
        'INSERT IGNORE INTO categories (name, slug, description, icon, color, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        cat
      );
    }

    // Insert admin user if not exists
    console.log('👤 Setting up users...');
    await connection.query(
      `INSERT IGNORE INTO users (name, email, password_hash, role, is_active, is_email_verified, email_verified_at)
       VALUES ('Admin', 'admin@nagoweb.com',
               '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.iK8i',
               'admin', 1, 1, NOW())`
    );

    console.log('✓ Database setup complete!');
    console.log('\n📋 Categories loaded:');
    const [cats] = await connection.query('SELECT name FROM categories ORDER BY sort_order');
    cats.forEach((c, i) => console.log(`  ${i + 1}. ${c.name}`));

  } catch (err) {
    console.error('✗ Setup failed:', err.message);
    process.exit(1);
  } finally {
    if (connection) await connection.end();
  }
}

setupDatabase();
