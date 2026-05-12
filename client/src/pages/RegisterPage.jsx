import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFormState } from '../hooks/useFormState';
import { ApiError } from '../lib/api';

// ── Password strength meter ────────────────────────────────────────────────────

function PasswordStrength({ password }) {
  const checks = [
    { label: 'At least 8 characters', pass: password.length >= 8 },
    { label: 'One uppercase letter',  pass: /[A-Z]/.test(password) },
    { label: 'One number',            pass: /[0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const colors = ['bg-red-500', 'bg-yellow-500', 'bg-cyan-500'];
  const labels = ['Weak', 'Fair', 'Strong'];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      {/* Bar */}
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
              i < score ? colors[score - 1] : 'bg-gray-700'
            }`}
          />
        ))}
      </div>
      {/* Label */}
      <p className={`text-xs font-medium ${score === 3 ? 'text-cyan-400' : score === 2 ? 'text-yellow-400' : 'text-red-400'}`}>
        {labels[score - 1] || 'Too weak'}
      </p>
      {/* Checklist */}
      <ul className="space-y-1">
        {checks.map(({ label, pass }) => (
          <li key={label} className={`flex items-center gap-1.5 text-xs ${pass ? 'text-gray-400' : 'text-gray-600'}`}>
            {pass ? (
              <svg className="w-3 h-3 text-cyan-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <span className="w-3 h-3 rounded-full border border-gray-600 shrink-0 inline-block" />
            )}
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Field component ────────────────────────────────────────────────────────────

function Field({ label, id, type = 'text', name, value, onChange, error, autoComplete, placeholder, hint }) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';

  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1.5">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={name}
          type={isPassword ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={`w-full bg-gray-900 border rounded-xl px-4 py-3 text-white placeholder-gray-600
            text-sm outline-none transition-colors duration-200
            focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30
            ${error ? 'border-red-500' : 'border-gray-700'}`}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            aria-label={show ? 'Hide password' : 'Show password'}
          >
            {show ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            )}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1.5 text-xs text-red-400 flex items-center gap-1">
          <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </p>
      )}
    </div>
  );
}

// ── Register Page ──────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate     = useNavigate();

  const { values, errors, isSubmitting, handleChange, setFieldErrors, setSubmitting } =
    useFormState({ name: '', email: '', password: '', confirmPassword: '' });

  const [globalError, setGlobalError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setGlobalError('');

    // Client-side confirm password check
    if (values.password !== values.confirmPassword) {
      setFieldErrors([{ field: 'confirmPassword', message: 'Passwords do not match' }]);
      return;
    }

    setSubmitting(true);
    try {
      await register(values.name, values.email, values.password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors?.length) {
          setFieldErrors(err.errors);
        } else {
          setGlobalError(err.message);
        }
      } else {
        setGlobalError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4 py-16">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-9 h-9 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
              </svg>
            </div>
            <span className="text-white font-bold text-xl">
              Nago<span className="text-cyan-400">Web</span>
            </span>
          </Link>
          <h1 className="mt-6 text-2xl font-bold text-white">Create your account</h1>
          <p className="mt-1 text-gray-500 text-sm">Start downloading professional network designs</p>
        </div>

        {/* Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-xl">
          {globalError && (
            <div role="alert" className="mb-5 flex items-start gap-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {globalError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Field
              label="Full name"
              id="name"
              name="name"
              value={values.name}
              onChange={handleChange}
              error={errors.name}
              autoComplete="name"
              placeholder="John Smith"
            />

            <Field
              label="Email address"
              id="email"
              type="email"
              name="email"
              value={values.email}
              onChange={handleChange}
              error={errors.email}
              autoComplete="email"
              placeholder="you@example.com"
            />

            <div>
              <Field
                label="Password"
                id="password"
                type="password"
                name="password"
                value={values.password}
                onChange={handleChange}
                error={errors.password}
                autoComplete="new-password"
                placeholder="Min. 8 characters"
              />
              <PasswordStrength password={values.password} />
            </div>

            <Field
              label="Confirm password"
              id="confirmPassword"
              type="password"
              name="confirmPassword"
              value={values.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              autoComplete="new-password"
              placeholder="Repeat your password"
            />

            <p className="text-xs text-gray-600 leading-relaxed">
              By creating an account you agree to our{' '}
              <a href="#" className="text-cyan-400 hover:underline">Terms of Service</a>
              {' '}and{' '}
              <a href="#" className="text-cyan-400 hover:underline">Privacy Policy</a>.
            </p>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-cyan-500 hover:bg-cyan-400 disabled:opacity-60 disabled:cursor-not-allowed
                text-gray-950 font-semibold py-3 rounded-xl transition-colors duration-200
                flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="w-4 h-4 border-2 border-gray-950/40 border-t-gray-950 rounded-full animate-spin" />
                  Creating account…
                </>
              ) : (
                'Create account'
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-800" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-gray-900 px-3 text-xs text-gray-600">or</span>
            </div>
          </div>

          <p className="text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        <p className="text-center mt-6">
          <Link to="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
            ← Back to NagoWeb
          </Link>
        </p>
      </div>
    </div>
  );
}
