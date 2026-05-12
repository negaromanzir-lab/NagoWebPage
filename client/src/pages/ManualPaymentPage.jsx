import { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { manualPaymentApi } from '../lib/api';
import { useAuth } from '../context/AuthContext';

// ── Constants ──────────────────────────────────────────────────────────────────

const METHOD_META = {
  telebirr: {
    label: 'Telebirr',
    color: 'from-green-500/20 to-green-500/5 border-green-500/30',
    accent: 'text-green-400',
    logo: '📱',
    desc: 'Pay via Telebirr mobile money',
  },
  cbe_birr: {
    label: 'CBE Birr',
    color: 'from-blue-500/20 to-blue-500/5 border-blue-500/30',
    accent: 'text-blue-400',
    logo: '🏦',
    desc: 'Pay via Commercial Bank of Ethiopia',
  },
  bank_transfer: {
    label: 'Bank Transfer',
    color: 'from-purple-500/20 to-purple-500/5 border-purple-500/30',
    accent: 'text-purple-400',
    logo: '💳',
    desc: 'Direct bank transfer',
  },
};

// ── Step indicator ─────────────────────────────────────────────────────────────

function Steps({ current }) {
  const steps = ['Select Method', 'Transfer Funds', 'Upload Proof', 'Confirmation'];
  return (
    <div className="flex items-center justify-center gap-0 mb-10">
      {steps.map((label, i) => {
        const idx   = i + 1;
        const done  = idx < current;
        const active = idx === current;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                done   ? 'bg-cyan-500 text-gray-950' :
                active ? 'bg-cyan-500/20 border-2 border-cyan-500 text-cyan-400' :
                         'bg-gray-800 text-gray-600'
              }`}>
                {done ? '✓' : idx}
              </div>
              <span className={`text-xs mt-1 hidden sm:block ${active ? 'text-white' : 'text-gray-600'}`}>
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-12 sm:w-20 h-0.5 mx-1 mb-4 ${done ? 'bg-cyan-500' : 'bg-gray-800'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Step 1: Select payment method ──────────────────────────────────────────────

function StepSelectMethod({ settings, selected, onSelect, onNext }) {
  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h2 className="text-white font-bold text-xl">Choose Payment Method</h2>
        <p className="text-gray-500 text-sm mt-1">Select how you want to pay</p>
      </div>

      <div className="space-y-3">
        {settings.map((s) => {
          const meta = METHOD_META[s.method] || {};
          const isSelected = selected === s.method;
          return (
            <button
              key={s.method}
              onClick={() => onSelect(s.method)}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 bg-gradient-to-r transition-all duration-200 text-left ${
                isSelected
                  ? `${meta.color} scale-[1.01]`
                  : 'border-gray-800 bg-gray-900 hover:border-gray-700'
              }`}
            >
              <span className="text-3xl">{meta.logo}</span>
              <div className="flex-1">
                <p className={`font-semibold ${isSelected ? meta.accent : 'text-white'}`}>{meta.label}</p>
                <p className="text-gray-500 text-sm">{meta.desc}</p>
              </div>
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                isSelected ? 'border-cyan-500 bg-cyan-500' : 'border-gray-600'
              }`}>
                {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onNext}
        disabled={!selected}
        className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-gray-950 font-semibold py-3 rounded-xl transition-colors mt-4"
      >
        Continue →
      </button>
    </div>
  );
}

// ── Step 2: Transfer instructions ─────────────────────────────────────────────

function StepTransfer({ setting, orderId, totalAmount, onNext }) {
  const meta = METHOD_META[setting.method] || {};
  const [copied, setCopied] = useState('');

  function copy(text, key) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(''), 2000);
    });
  }

  return (
    <div className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-white font-bold text-xl">Transfer Funds</h2>
        <p className="text-gray-500 text-sm mt-1">Send the exact amount to the account below</p>
      </div>

      {/* Amount banner */}
      <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-2xl p-5 text-center">
        <p className="text-gray-400 text-sm mb-1">Amount to Transfer</p>
        <p className="text-4xl font-extrabold text-white">
          {Number(totalAmount).toLocaleString('en-ET', { minimumFractionDigits: 2 })} ETB
        </p>
        <p className="text-gray-500 text-xs mt-1">Use the exact amount shown above</p>
      </div>

      {/* Account details */}
      <div className={`bg-gradient-to-b ${meta.color} border rounded-2xl p-5 space-y-3`}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-2xl">{meta.logo}</span>
          <span className={`font-semibold ${meta.accent}`}>{meta.label}</span>
        </div>

        {[
          { label: 'Account Name',   value: setting.account_name,   key: 'name' },
          { label: 'Account Number', value: setting.account_number, key: 'number' },
          { label: 'Reference',      value: orderId.slice(0, 8).toUpperCase(), key: 'ref' },
        ].map(({ label, value, key }) => (
          <div key={key} className="flex items-center justify-between bg-gray-950/40 rounded-xl px-4 py-2.5">
            <div>
              <p className="text-gray-500 text-xs">{label}</p>
              <p className="text-white font-semibold text-sm">{value}</p>
            </div>
            <button
              onClick={() => copy(value, key)}
              className="text-xs text-gray-500 hover:text-cyan-400 transition-colors ml-3"
            >
              {copied === key ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        ))}
      </div>

      {/* Instructions */}
      {setting.instructions && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <p className="text-gray-400 text-xs font-semibold uppercase tracking-wide mb-2">Instructions</p>
          <ol className="space-y-1.5">
            {setting.instructions.split('\n').filter(Boolean).map((line, i) => (
              <li key={i} className="text-gray-300 text-sm flex gap-2">
                <span className="text-cyan-400 shrink-0">{i + 1}.</span>
                <span>{line.replace(/^\d+\.\s*/, '')}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex gap-2">
        <span className="text-yellow-400 shrink-0">⚠️</span>
        <p className="text-yellow-300 text-xs">
          Take a clear screenshot of the payment confirmation before proceeding. You will need to upload it in the next step.
        </p>
      </div>

      <button
        onClick={onNext}
        className="w-full bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold py-3 rounded-xl transition-colors"
      >
        I've Completed the Transfer →
      </button>
    </div>
  );
}

// ── Step 3: Upload screenshot ──────────────────────────────────────────────────

function StepUpload({ orderId, paymentMethod, totalAmount, onSuccess }) {
  const [file,         setFile]         = useState(null);
  const [preview,      setPreview]      = useState(null);
  const [senderName,   setSenderName]   = useState('');
  const [senderPhone,  setSenderPhone]  = useState('');
  const [txRef,        setTxRef]        = useState('');
  const [amountPaid,   setAmountPaid]   = useState(String(totalAmount));
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState('');
  const inputRef = useRef(null);

  function handleFile(f) {
    if (!f) return;
    setFile(f);
    if (f.type.startsWith('image/')) {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!file)         return setError('Please select a screenshot');
    if (!senderName.trim()) return setError('Sender name is required');
    if (!amountPaid)   return setError('Amount paid is required');

    setError(''); setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('screenshot',     file);
      fd.append('sender_name',    senderName.trim());
      fd.append('sender_phone',   senderPhone.trim());
      fd.append('transaction_ref', txRef.trim());
      fd.append('amount_paid',    amountPaid);

      await manualPaymentApi.uploadProof(orderId, fd);
      onSuccess();
    } catch (e) {
      setError(e.message || 'Upload failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="text-center mb-2">
        <h2 className="text-white font-bold text-xl">Upload Payment Proof</h2>
        <p className="text-gray-500 text-sm mt-1">Upload a screenshot of your payment confirmation</p>
      </div>

      {/* Screenshot drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
        className="border-2 border-dashed border-gray-700 hover:border-cyan-500/50 rounded-2xl p-6 text-center cursor-pointer transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
        {preview ? (
          <div className="space-y-2">
            <img src={preview} alt="Preview" className="max-h-48 mx-auto rounded-xl object-contain" />
            <p className="text-gray-400 text-xs">{file.name} · {(file.size / 1024).toFixed(0)} KB</p>
            <p className="text-cyan-400 text-xs">Click to change</p>
          </div>
        ) : file ? (
          <div className="space-y-2">
            <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-300 text-sm">{file.name}</p>
            <p className="text-cyan-400 text-xs">Click to change</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-white text-sm font-medium">Drop screenshot here or click to browse</p>
            <p className="text-gray-600 text-xs">PNG, JPEG, WebP, or PDF · Max 10 MB</p>
          </div>
        )}
      </div>

      {/* Form fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { label: 'Sender Name *',        value: senderName,  set: setSenderName,  placeholder: 'Name on your account',    required: true },
          { label: 'Phone Number',          value: senderPhone, set: setSenderPhone, placeholder: '09xxxxxxxx',              required: false },
          { label: 'Transaction Reference', value: txRef,       set: setTxRef,       placeholder: 'Confirmation number',     required: false },
          { label: 'Amount Paid (ETB) *',   value: amountPaid,  set: setAmountPaid,  placeholder: '0.00',                    required: true, type: 'number' },
        ].map(({ label, value, set, placeholder, required, type }) => (
          <div key={label}>
            <label className="block text-xs text-gray-500 mb-1">{label}</label>
            <input
              type={type || 'text'}
              value={value}
              onChange={(e) => set(e.target.value)}
              placeholder={placeholder}
              required={required}
              step={type === 'number' ? '0.01' : undefined}
              className="w-full bg-gray-900 border border-gray-700 text-white placeholder-gray-600 text-sm px-3 py-2.5 rounded-xl outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 text-gray-950 font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {submitting ? (
          <><span className="w-4 h-4 border-2 border-gray-950/40 border-t-gray-950 rounded-full animate-spin" /> Submitting…</>
        ) : 'Submit Payment Proof'}
      </button>
    </form>
  );
}

// ── Step 4: Confirmation ───────────────────────────────────────────────────────

function StepConfirmation({ orderId }) {
  return (
    <div className="text-center space-y-5 py-4">
      <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/20 rounded-full flex items-center justify-center mx-auto">
        <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div>
        <h2 className="text-white font-bold text-xl">Proof Submitted!</h2>
        <p className="text-gray-400 text-sm mt-2 max-w-sm mx-auto">
          Your payment screenshot has been submitted for review. An admin will verify it within 24 hours.
          You'll be able to download your projects once approved.
        </p>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-left">
        <p className="text-gray-500 text-xs mb-1">Order Reference</p>
        <p className="text-white font-mono text-sm">{orderId}</p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Link
          to="/dashboard"
          className="bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-semibold px-6 py-2.5 rounded-xl transition-colors text-sm"
        >
          Go to Dashboard
        </Link>
        <Link
          to="/"
          className="bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium px-6 py-2.5 rounded-xl transition-colors text-sm"
        >
          Browse More Projects
        </Link>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function ManualPaymentPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [step,        setStep]        = useState(1);
  const [settings,    setSettings]    = useState([]);
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [selectedMethod, setSelectedMethod]   = useState('');
  const [orderId,     setOrderId]     = useState(searchParams.get('orderId') || '');
  const [totalAmount, setTotalAmount] = useState(parseFloat(searchParams.get('amount') || '0'));
  const [projectIds,  setProjectIds]  = useState(
    (searchParams.get('projects') || '').split(',').filter(Boolean).map(Number)
  );

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate('/login', { replace: true });
  }, [isAuthenticated, isLoading, navigate]);

  useEffect(() => {
    manualPaymentApi.getSettings()
      .then((r) => setSettings(r.data))
      .finally(() => setLoadingSettings(false));
  }, []);

  // If orderId already provided (returning from cart), skip to step 2
  useEffect(() => {
    if (orderId && step === 1) setStep(2);
  }, [orderId]);

  async function handleMethodNext() {
    if (!selectedMethod) return;
    // If no orderId yet, create the order now
    if (!orderId && projectIds.length) {
      try {
        const res = await manualPaymentApi.initiateOrder({
          project_ids:    projectIds,
          payment_method: selectedMethod,
        });
        setOrderId(res.data.orderId);
        setTotalAmount(res.data.totalAmount);
      } catch (e) {
        alert(e.message);
        return;
      }
    }
    setStep(2);
  }

  const activeSetting = settings.find((s) => s.method === selectedMethod);

  if (isLoading || loadingSettings) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-16">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">Nago<span className="text-cyan-400">Web</span></span>
          </Link>
          <h1 className="mt-4 text-white font-bold text-2xl">Manual Payment</h1>
          <p className="text-gray-500 text-sm mt-1">Pay via Telebirr or CBE Birr</p>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 sm:p-8 shadow-xl">
          <Steps current={step} />

          {step === 1 && (
            <StepSelectMethod
              settings={settings}
              selected={selectedMethod}
              onSelect={setSelectedMethod}
              onNext={handleMethodNext}
            />
          )}

          {step === 2 && activeSetting && (
            <StepTransfer
              setting={activeSetting}
              orderId={orderId}
              totalAmount={totalAmount}
              onNext={() => setStep(3)}
            />
          )}

          {step === 3 && (
            <StepUpload
              orderId={orderId}
              paymentMethod={selectedMethod}
              totalAmount={totalAmount}
              onSuccess={() => setStep(4)}
            />
          )}

          {step === 4 && <StepConfirmation orderId={orderId} />}
        </div>
      </div>
    </div>
  );
}
