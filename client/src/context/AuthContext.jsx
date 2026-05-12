import { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import { authApi, storage } from '../lib/api';

// ── State shape ────────────────────────────────────────────────────────────────
// { user: null | {...}, isAuthenticated: bool, isLoading: bool, error: string|null }

const initialState = {
  user:            storage.getUser(),
  isAuthenticated: !!storage.getAccessToken(),
  isLoading:       true,   // true until we verify the stored token on mount
  error:           null,
};

// ── Reducer ────────────────────────────────────────────────────────────────────

function authReducer(state, action) {
  switch (action.type) {
    case 'AUTH_INIT_DONE':
      return { ...state, isLoading: false };

    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
      return {
        ...state,
        user:            action.payload.user,
        isAuthenticated: true,
        isLoading:       false,
        error:           null,
      };

    case 'LOGOUT':
      return {
        ...state,
        user:            null,
        isAuthenticated: false,
        isLoading:       false,
        error:           null,
      };

    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };

    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    default:
      return state;
  }
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ── On mount: verify stored token is still valid ─────────────────────────────
  useEffect(() => {
    async function verifySession() {
      const token = storage.getAccessToken();
      if (!token) {
        dispatch({ type: 'AUTH_INIT_DONE' });
        return;
      }
      try {
        const res = await authApi.me();
        dispatch({ type: 'LOGIN_SUCCESS', payload: { user: res.data } });
        storage.setUser(res.data);
      } catch {
        // Token invalid or expired — clear everything
        storage.clearTokens();
        dispatch({ type: 'LOGOUT' });
      }
    }
    verifySession();
  }, []);

  // ── Listen for forced logout events (e.g. refresh token expired) ─────────────
  useEffect(() => {
    const handler = () => {
      storage.clearTokens();
      dispatch({ type: 'LOGOUT' });
    };
    window.addEventListener('nw:logout', handler);
    return () => window.removeEventListener('nw:logout', handler);
  }, []);

  // ── Actions ───────────────────────────────────────────────────────────────────

  const login = useCallback(async (email, password) => {
    dispatch({ type: 'CLEAR_ERROR' });
    const res = await authApi.login({ email, password });
    const { user, accessToken, refreshToken } = res.data;
    storage.setTokens(accessToken, refreshToken);
    storage.setUser(user);
    dispatch({ type: 'LOGIN_SUCCESS', payload: { user } });
    return user;
  }, []);

  const register = useCallback(async (name, email, password) => {
    dispatch({ type: 'CLEAR_ERROR' });
    const res = await authApi.register({ name, email, password });
    const { user, accessToken, refreshToken } = res.data;
    storage.setTokens(accessToken, refreshToken);
    storage.setUser(user);
    dispatch({ type: 'REGISTER_SUCCESS', payload: { user } });
    return user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout(storage.getRefreshToken());
    } catch {
      // Best-effort — clear locally regardless
    }
    storage.clearTokens();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateUser = useCallback((updates) => {
    const updated = { ...state.user, ...updates };
    storage.setUser(updated);
    dispatch({ type: 'UPDATE_USER', payload: updates });
  }, [state.user]);

  const clearError = useCallback(() => dispatch({ type: 'CLEAR_ERROR' }), []);

  return (
    <AuthContext.Provider value={{
      ...state,
      login,
      register,
      logout,
      updateUser,
      clearError,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
