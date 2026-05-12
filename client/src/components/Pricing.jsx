const plans = [
  {
    name: 'Starter',
    price: 0,
    period: 'Free forever',
    description: 'Perfect for students and hobbyists exploring network design.',
    color: 'border-gray-700',
    buttonStyle: 'bg-gray-800 hover:bg-gray-700 text-white',
    features: [
      '5 project downloads/month',
      'Basic topology diagrams',
      'Community support',
      'PNG & PDF export',
      'Access to free projects',
    ],
    missing: ['Source files (.pkt, .gns3)', 'Commercial license', 'Priority support'],
  },
  {
    name: 'Professional',
    price: 29,
    period: 'per month',
    description: 'For network engineers who need full access and source files.',
    color: 'border-cyan-500 shadow-lg shadow-cyan-500/10',
    buttonStyle: 'bg-cyan-500 hover:bg-cyan-400 text-gray-950',
    badge: 'Most Popular',
    features: [
      'Unlimited downloads',
      'All topology types',
      'Source files (.pkt, .gns3, .yml)',
      'Commercial license',
      'Email support',
      'Early access to new projects',
    ],
    missing: ['Dedicated account manager'],
  },
  {
    name: 'Enterprise',
    price: 99,
    period: 'per month',
    description: 'For teams and organizations with advanced needs.',
    color: 'border-gray-700',
    buttonStyle: 'bg-gray-800 hover:bg-gray-700 text-white',
    features: [
      'Everything in Professional',
      'Team collaboration (up to 20)',
      'Custom project requests',
      'Dedicated account manager',
      'SLA-backed support',
      'White-label exports',
      'API access',
    ],
    missing: [],
  },
];

function CheckIcon() {
  return (
    <svg className="w-4 h-4 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-4 h-4 text-gray-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            Simple, Transparent Pricing
          </h2>
          <p className="text-gray-400 max-w-xl mx-auto">
            Start free and scale as your needs grow. No hidden fees, cancel anytime.
          </p>

          {/* Toggle (visual only) */}
          <div className="inline-flex items-center gap-3 mt-6 bg-gray-800 rounded-full p-1">
            <button className="bg-cyan-500 text-gray-950 text-sm font-semibold px-4 py-1.5 rounded-full">
              Monthly
            </button>
            <button className="text-gray-400 text-sm font-medium px-4 py-1.5 rounded-full hover:text-white transition-colors">
              Annual
              <span className="ml-1.5 text-xs text-green-400 font-semibold">-20%</span>
            </button>
          </div>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-gray-950 border-2 ${plan.color} rounded-2xl p-8 flex flex-col`}
            >
              {plan.badge && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-cyan-500 text-gray-950 text-xs font-bold px-3 py-1 rounded-full">
                    {plan.badge}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-white font-bold text-lg mb-1">{plan.name}</h3>
                <p className="text-gray-500 text-sm">{plan.description}</p>
              </div>

              <div className="mb-6">
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-extrabold text-white">
                    {plan.price === 0 ? 'Free' : `$${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-500 text-sm mb-1.5">{plan.period}</span>
                  )}
                </div>
              </div>

              <button
                className={`w-full py-2.5 rounded-xl font-semibold text-sm transition-colors duration-200 mb-8 ${plan.buttonStyle}`}
              >
                {plan.price === 0 ? 'Get Started Free' : `Start ${plan.name}`}
              </button>

              <ul className="space-y-3 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-gray-300 text-sm">
                    <CheckIcon />
                    {f}
                  </li>
                ))}
                {plan.missing.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-gray-600 text-sm line-through">
                    <XIcon />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom note */}
        <p className="text-center text-gray-600 text-sm mt-10">
          All plans include a 14-day money-back guarantee. Need a custom plan?{' '}
          <a href="#" className="text-cyan-400 hover:underline">Contact us</a>.
        </p>
      </div>
    </section>
  );
}
