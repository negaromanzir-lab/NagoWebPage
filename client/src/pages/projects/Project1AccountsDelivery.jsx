/**
 * Project #1 — Design and Implementation of a Simple Networking Project
 * Accounts & Delivery Department Network
 *
 * This is the full rich content page for this specific project.
 * The .pkt file download is locked behind payment (handled by parent).
 */

export default function Project1AccountsDelivery({ onDownload, isPurchased, price, isLoading }) {
  return (
    <div className="project-content space-y-8 text-gray-300">

      {/* ── Download Button ── */}
      <div className="flex items-center gap-4 p-5 bg-gray-800/60 border border-gray-700 rounded-2xl">
        {isPurchased ? (
          <button
            onClick={onDownload}
            disabled={isLoading}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60
              text-gray-950 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-gray-950/40 border-t-gray-950 rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
            Download this Project (.pkt)
          </button>
        ) : (
          <button
            onClick={onDownload}
            disabled={isLoading}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60
              text-gray-950 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Purchase & Download — ${parseFloat(price || 0).toFixed(2)}
          </button>
        )}
        <span className="text-gray-500 text-sm">Cisco Packet Tracer (.pkt) source file</span>
      </div>

      {/* ── Case Study ── */}
      <section>
        <h2 className="text-xl font-bold text-white border-b border-gray-700 pb-2 mb-4">
          Project #1 Case Study and Requirements
        </h2>
        <p className="leading-relaxed mb-4">
          Design a network in Cisco Packet Tracer to connect <strong className="text-white">ACCOUNTS</strong> and{' '}
          <strong className="text-white">DELIVERY</strong> departments through the following:
        </p>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>Each department should contain at least two PCs.</li>
          <li>Appropriate number of switches and routers should be used in the network.</li>
          <li>Using the given network <code className="text-cyan-300 bg-gray-800 px-1.5 py-0.5 rounded text-sm">192.168.40.0</code>, all interfaces should be configured with correct IP addresses, subnet mask and gateways.</li>
          <li>All devices in the network should be connected using appropriate cables.</li>
          <li>Test communication between devices in both ACCOUNTS and DELIVERY departments.</li>
        </ul>
      </section>

      {/* ── Technologies ── */}
      <section>
        <h2 className="text-xl font-bold text-white border-b border-gray-700 pb-2 mb-4">
          Technologies Implemented
        </h2>
        <ul className="list-disc list-inside space-y-2 ml-2">
          <li>Creating a Simple Network using a Router and Access Layer Switch</li>
          <li>Connecting Networking devices with Correct cabling</li>
          <li>Connecting two Networks using a Router</li>
          <li>Subnetting and IP Addressing</li>
          <li>Assigning IP Addresses to Router interfaces</li>
          <li>Static IP Address allocation to Host Devices</li>
          <li>Test and Verifying Network Communication</li>
        </ul>
      </section>

      {/* ── Network Overview Table ── */}
      <section>
        <h2 className="text-xl font-bold text-white border-b border-gray-700 pb-2 mb-4">
          Network Overview
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-300">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Department</th>
                <th className="px-4 py-3 text-left font-semibold">Subnet</th>
                <th className="px-4 py-3 text-left font-semibold">Valid Host Range</th>
                <th className="px-4 py-3 text-left font-semibold">Default Gateway</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              <tr className="bg-gray-900/40">
                <td className="px-4 py-3 font-medium text-cyan-400">Accounts</td>
                <td className="px-4 py-3 font-mono text-xs">192.168.40.0/25</td>
                <td className="px-4 py-3 font-mono text-xs">.1 — .126</td>
                <td className="px-4 py-3 font-mono text-xs">192.168.40.1</td>
              </tr>
              <tr className="bg-gray-900/20">
                <td className="px-4 py-3 font-medium text-blue-400">Delivery</td>
                <td className="px-4 py-3 font-mono text-xs">192.168.40.128/25</td>
                <td className="px-4 py-3 font-mono text-xs">.129 — .254</td>
                <td className="px-4 py-3 font-mono text-xs">192.168.40.129</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Phase 1: Subnetting ── */}
      <section>
        <h2 className="text-xl font-bold text-white border-b border-gray-700 pb-2 mb-4">
          PHASE 1: Subnetting Calculation
        </h2>

        <div className="space-y-5">
          <div>
            <h3 className="font-semibold text-white mb-2">Given Information</h3>
            <ul className="space-y-1 ml-2 text-sm">
              <li>Base Network Address: <code className="text-cyan-300 bg-gray-800 px-1.5 py-0.5 rounded">192.168.40.0</code></li>
              <li>Number of Departments: <strong className="text-white">2</strong></li>
              <li>Number of Subnets Needed: <strong className="text-white">2</strong></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">Step 1 — Find Number of Borrowed Bits</h3>
            <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm text-cyan-300 overflow-x-auto">
{`Formula: 2^n = Number of Subnets
2^n = 2
n   = 1
Therefore: 1 bit is borrowed`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">Step 2 — Calculate Subnet Mask (Binary)</h3>
            <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm text-cyan-300 overflow-x-auto">
{`Octet 1:  11111111 = 255
Octet 2:  11111111 = 255
Octet 3:  11111111 = 255
Octet 4:  10000000 = 128  ← 1 borrowed bit here

Subnet Mask = 255.255.255.128 (/25)
Block Size  = 128`}
            </pre>
          </div>

          <div>
            <h3 className="font-semibold text-white mb-2">Step 3 — Both Subnets</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Subnet 1 */}
              <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-xl p-4">
                <p className="text-cyan-400 font-semibold mb-2">Subnet 1 — Accounts</p>
                <div className="space-y-1 text-sm font-mono">
                  <p>Network ID   : <span className="text-white">192.168.40.0</span></p>
                  <p>Valid Range  : <span className="text-white">.1 — .126</span></p>
                  <p>Broadcast ID : <span className="text-white">192.168.40.127</span></p>
                  <p>Subnet Mask  : <span className="text-white">255.255.255.128</span></p>
                </div>
              </div>
              {/* Subnet 2 */}
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
                <p className="text-blue-400 font-semibold mb-2">Subnet 2 — Delivery</p>
                <div className="space-y-1 text-sm font-mono">
                  <p>Network ID   : <span className="text-white">192.168.40.128</span></p>
                  <p>Valid Range  : <span className="text-white">.129 — .254</span></p>
                  <p>Broadcast ID : <span className="text-white">192.168.40.255</span></p>
                  <p>Subnet Mask  : <span className="text-white">255.255.255.128</span></p>
                </div>
              </div>
            </div>
            <p className="text-yellow-400/80 text-sm mt-3 flex items-start gap-2">
              <span>⚠️</span>
              <span>Block size rule: 0 → 127 = 128 addresses, then 128 → 255 = 128 addresses</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── Phase 2: Design ── */}
      <section>
        <h2 className="text-xl font-bold text-white border-b border-gray-700 pb-2 mb-4">
          PHASE 2: Network Design & Device Placement
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Router (2911)', qty: '1', icon: '🔀' },
            { label: 'Switches', qty: '2', icon: '🔗' },
            { label: 'PCs', qty: '4', icon: '💻' },
            { label: 'Printers', qty: '2', icon: '🖨️' },
          ].map(({ label, qty, icon }) => (
            <div key={label} className="bg-gray-800/60 border border-gray-700 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">{icon}</div>
              <div className="text-white font-bold text-lg">{qty}</div>
              <div className="text-gray-400 text-xs">{label}</div>
            </div>
          ))}
        </div>
        <h3 className="font-semibold text-white mb-2">Topology Layout</h3>
        <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm text-cyan-300 overflow-x-auto">
{`            [Router]
           /        \\
    [Accounts SW]   [Delivery SW]
    /    |    \\      /    |    \\
 PC1  PC2  Printer  PC3  PC4  Printer`}
        </pre>
      </section>

      {/* ── Phase 3: Cabling ── */}
      <section>
        <h2 className="text-xl font-bold text-white border-b border-gray-700 pb-2 mb-4">
          PHASE 3: Cabling
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-300">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Connection</th>
                <th className="px-4 py-3 text-left font-semibold">Cable Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {[
                ['Router → Accounts Switch', 'Straight-through'],
                ['Router → Delivery Switch', 'Straight-through'],
                ['Switch → PCs', 'Straight-through'],
                ['Switch → Printer', 'Straight-through'],
              ].map(([conn, cable], i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-900/20'}>
                  <td className="px-4 py-3 text-gray-300">{conn}</td>
                  <td className="px-4 py-3 text-cyan-400 font-medium">{cable}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Phase 4: Router Config ── */}
      <section>
        <h2 className="text-xl font-bold text-white border-b border-gray-700 pb-2 mb-4">
          PHASE 4: Configure Router Interfaces
        </h2>
        <div className="space-y-4">
          {[
            {
              title: 'Step 1 — Turn Up Both Interfaces',
              code: `enable\nconfig t\ninterface range gig 0/0 - 1\nno shutdown\ndo wr`,
            },
            {
              title: 'Step 2 — Assign IP to Gig 0/0 (Accounts Side)',
              code: `enable\nconfig t\ninterface gig 0/0\nip address 192.168.40.1 255.255.255.128\nno shutdown\nexit\ndo wr`,
            },
            {
              title: 'Step 3 — Assign IP to Gig 0/1 (Delivery Side)',
              code: `enable\nconfig t\ninterface gig 0/1\nip address 192.168.40.129 255.255.255.128\nno shutdown\nexit\ndo wr`,
            },
            {
              title: 'Step 4 — Verify Configuration',
              code: `do show startup-config\n\n-- Expected output:\ninterface GigabitEthernet0/0\n ip address 192.168.40.1 255.255.255.128\ninterface GigabitEthernet0/1\n ip address 192.168.40.129 255.255.255.128`,
            },
          ].map(({ title, code }) => (
            <div key={title}>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm text-cyan-300 overflow-x-auto">
                {code}
              </pre>
            </div>
          ))}
        </div>
      </section>

      {/* ── Phase 5: Host Config ── */}
      <section>
        <h2 className="text-xl font-bold text-white border-b border-gray-700 pb-2 mb-4">
          PHASE 5: Configure Host Devices (Static IP)
        </h2>
        <div className="space-y-5">
          {/* Accounts */}
          <div>
            <h3 className="font-semibold text-cyan-400 mb-3">Accounts Department</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-800 text-gray-300">
                  <tr>
                    <th className="px-4 py-2 text-left">Device</th>
                    <th className="px-4 py-2 text-left">IP Address</th>
                    <th className="px-4 py-2 text-left">Subnet Mask</th>
                    <th className="px-4 py-2 text-left">Default Gateway</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {[
                    ['PC1', '192.168.40.2', '255.255.255.128', '192.168.40.1'],
                    ['PC2', '192.168.40.3', '255.255.255.128', '192.168.40.1'],
                    ['Printer', '192.168.40.4', '255.255.255.128', '192.168.40.1'],
                  ].map(([dev, ip, mask, gw], i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-900/20'}>
                      <td className="px-4 py-2 font-medium text-white">{dev}</td>
                      <td className="px-4 py-2 font-mono text-xs text-cyan-300">{ip}</td>
                      <td className="px-4 py-2 font-mono text-xs">{mask}</td>
                      <td className="px-4 py-2 font-mono text-xs">{gw}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {/* Delivery */}
          <div>
            <h3 className="font-semibold text-blue-400 mb-3">Delivery Department</h3>
            <div className="overflow-x-auto rounded-xl border border-gray-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-800 text-gray-300">
                  <tr>
                    <th className="px-4 py-2 text-left">Device</th>
                    <th className="px-4 py-2 text-left">IP Address</th>
                    <th className="px-4 py-2 text-left">Subnet Mask</th>
                    <th className="px-4 py-2 text-left">Default Gateway</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700/50">
                  {[
                    ['PC3', '192.168.40.130', '255.255.255.128', '192.168.40.129'],
                    ['PC4', '192.168.40.131', '255.255.255.128', '192.168.40.129'],
                    ['Printer', '192.168.40.132', '255.255.255.128', '192.168.40.129'],
                  ].map(([dev, ip, mask, gw], i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-900/20'}>
                      <td className="px-4 py-2 font-medium text-white">{dev}</td>
                      <td className="px-4 py-2 font-mono text-xs text-blue-300">{ip}</td>
                      <td className="px-4 py-2 font-mono text-xs">{mask}</td>
                      <td className="px-4 py-2 font-mono text-xs">{gw}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex items-start gap-2 bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 text-sm">
            <span className="text-yellow-400 mt-0.5">⚠️</span>
            <span className="text-yellow-300">Never assign the Network ID (.0 or .128) or Broadcast ID (.127 or .255) to any device</span>
          </div>
        </div>
      </section>

      {/* ── Phase 6: Tests ── */}
      <section>
        <h2 className="text-xl font-bold text-white border-b border-gray-700 pb-2 mb-4">
          PHASE 6: Test Communication
        </h2>
        <div className="space-y-4">
          {[
            { title: 'Test 1 — Same Department', cmd: 'ping 192.168.40.3', from: 'PC1', result: 'Reply successful ✅' },
            { title: 'Test 2 — Cross Department', cmd: 'ping 192.168.40.130', from: 'PC1', result: 'Reply successful ✅' },
            { title: 'Test 3 — Ping Printer (Other Dept)', cmd: 'ping 192.168.40.132', from: 'PC1', result: 'Reply successful ✅' },
          ].map(({ title, cmd, from, result }) => (
            <div key={title} className="bg-gray-900/60 border border-gray-700 rounded-xl p-4">
              <p className="font-semibold text-white mb-2">{title}</p>
              <p className="text-gray-500 text-xs mb-2">From: {from} → Desktop → Command Prompt</p>
              <pre className="text-cyan-300 text-sm mb-2">{cmd}</pre>
              <p className="text-green-400 text-sm font-medium">{result}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── IP Summary ── */}
      <section>
        <h2 className="text-xl font-bold text-white border-b border-gray-700 pb-2 mb-4">
          Full IP Address Assignment Summary
        </h2>
        <pre className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-sm text-gray-300 overflow-x-auto leading-relaxed">
{`ROUTER
├── Gig 0/0 : 192.168.40.1/25   (Accounts Gateway)
└── Gig 0/1 : 192.168.40.129/25 (Delivery Gateway)

ACCOUNTS DEPARTMENT (Subnet 1)
├── PC1     : 192.168.40.2/25
├── PC2     : 192.168.40.3/25
└── Printer : 192.168.40.4/25

DELIVERY DEPARTMENT (Subnet 2)
├── PC3     : 192.168.40.130/25
├── PC4     : 192.168.40.131/25
└── Printer : 192.168.40.132/25`}
        </pre>
      </section>

      {/* ── Checklist ── */}
      <section>
        <h2 className="text-xl font-bold text-white border-b border-gray-700 pb-2 mb-4">
          Configuration Checklist
        </h2>
        <div className="space-y-2">
          {[
            'Subnetting completed',
            'Topology designed',
            'Cabling done',
            'Router interfaces configured',
            'All PCs assigned static IPs',
            'All printers assigned static IPs',
            'Default gateways set correctly',
            'Communication tested',
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 text-sm">
              <div className="w-5 h-5 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center shrink-0">
                <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="text-gray-300">{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Common Mistakes ── */}
      <section>
        <h2 className="text-xl font-bold text-white border-b border-gray-700 pb-2 mb-4">
          Common Mistakes to Avoid
        </h2>
        <div className="overflow-x-auto rounded-xl border border-gray-700">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-300">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Mistake</th>
                <th className="px-4 py-3 text-left font-semibold">Correct Approach</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700/50">
              {[
                ['Assigning network ID as IP', 'Start from .1 or .129'],
                ['Wrong subnet mask', 'Always use 255.255.255.128'],
                ['Wrong default gateway', 'Must match router interface IP'],
                ['Forgetting no shutdown', 'Always run no shutdown on router interfaces'],
                ['Assigning broadcast ID as IP', 'Never use .127 or .255 as host IP'],
              ].map(([mistake, fix], i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-gray-900/40' : 'bg-gray-900/20'}>
                  <td className="px-4 py-3 text-red-400">{mistake}</td>
                  <td className="px-4 py-3 text-green-400">{fix}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Bottom Download ── */}
      <div className="border-t border-gray-700 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-white font-semibold">Ready to use the full topology?</p>
          <p className="text-gray-500 text-sm">Get the complete Cisco Packet Tracer source file</p>
        </div>
        {isPurchased ? (
          <button
            onClick={onDownload}
            disabled={isLoading}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60
              text-gray-950 font-bold px-6 py-3 rounded-xl transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download .pkt File
          </button>
        ) : (
          <button
            onClick={onDownload}
            className="flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400
              text-gray-950 font-bold px-6 py-3 rounded-xl transition-colors shrink-0"
          >
            Purchase — ${parseFloat(price || 0).toFixed(2)}
          </button>
        )}
      </div>

    </div>
  );
}
