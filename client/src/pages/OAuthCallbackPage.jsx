import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { storage } from '../lib/api';

// v4 - force redirect with full page reload
export default function OAuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    const accessToken  = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    const errorParam   = searchParams.get('error');

    if (errorParam) {
      setStatus('error');
      setTimeout(() => { window.location.href = '/login'; }, 2000);
      return;
    }

    if (!accessToken || !refreshToken) {
      setStatus('error');
      setTimeout(() => { window.location.href = '/login'; }, 2000);
      return;
    }

    const user = {
      id:    parseInt(searchParams.get('user_id'), 10),
      name:  searchParams.get('name')  || '',
      email: searchParams.get('email') || '',
      role:  searchParams.get('role')  || 'buyer',
    };

    // Write to localStorage
    localStorage.setItem('nw_access_token',  accessToken);
    localStorage.setItem('nw_refresh_token', refreshToken);
    localStorage.setItem('nw_user',          JSON.stringify(user));

    setStatus('success');

    // Hard redirect — no React Router, no cache issues
    const dest = user.role === 'admin' ? '/admin' : '/dashboard';
    setTimeout(() => { window.location.href = dest; }, 800);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center">
        {status === 'error' ? (
          <>
            <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-400">Authentication failed. Redirecting...</p>
          </>
        ) : status === 'success' ? (
          <>
            <div className="w-14 h-14 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-7 h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-white font-medium">Signed in! Redirecting...</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="w-7 h-7 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin block" />
            </div>
            <p className="text-white font-medium">Signing you in...</p>
            <p className="text-gray-500 text-sm mt-1">Please wait</p>
          </>
        )}
      </div>
    </div>
  );
}
