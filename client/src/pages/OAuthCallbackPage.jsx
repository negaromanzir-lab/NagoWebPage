import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { storage } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate        = useNavigate();
  const { login }       = useAuth();
  const [error, setError] = useState('');

  useEffect(() => {
    const accessToken  = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const errorParam   = searchParams.get('error');

    // Handle error from backend
    if (errorParam) {
      const messages = {
        account_disabled: 'Your account has been disabled. Please contact support.',
        oauth_failed:     'Authentication failed. Please try again.',
        google_failed:    'Google sign-in failed. Please try again.',
        github_failed:    'GitHub sign-in failed. Please try again.',
      };
      setError(messages[errorParam] || 'Authentication failed. Please try again.');
      setTimeout(() => navigate('/login'), 3000);
      return;
    }

    if (!accessToken || !refreshToken) {
      setError('Invalid authentication response. Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    // Build user object from URL params
    const user = {
      id:    parseInt(searchParams.get('user_id'), 10),
      name:  searchParams.get('name')  || '',
      email: searchParams.get('email') || '',
      role:  searchParams.get('role')  || 'buyer',
    };

    // Store tokens and user in localStorage directly
    storage.setTokens(accessToken, refreshToken);
    storage.setUser(user);

    // Clear sensitive tokens from URL immediately
    window.history.replaceState({}, document.title, '/oauth/callback');

    // Redirect based on role
    const destination = user.role === 'admin' ? '/admin' : '/dashboard';

    // Small delay so storage is written before navigation
    setTimeout(() => {
      window.location.replace(destination);
    }, 500);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="text-center">
        {error ? (
          <>
            <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
            </div>
            <p className="text-red-400 text-sm">{error}</p>
            <p className="text-gray-600 text-xs mt-2">Redirecting to login...</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="w-7 h-7 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin block" />
            </div>
            <p className="text-white font-medium">Signing you in...</p>
            <p className="text-gray-500 text-sm mt-1">Please wait a moment</p>
          </>
        )}
      </div>
    </div>
  );
}
