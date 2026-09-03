import { createContext, useContext, useState, useEffect, useRef } from 'react';
import client, { setAuthToken } from '../api/client';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const navigate = useNavigate();
  
  // Ref to prevent duplicate refresh requests in StrictMode
  const hasInitialized = useRef(false);

  // On mount, we attempt a silent refresh to see if the user is already logged in
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const initAuth = async () => {
      try {
        const { data } = await client.post('/api/auth/refresh');
        if (data.accessToken) {
          setTokenState(data.accessToken);
          setAuthToken(data.accessToken);
        }
      } catch (err) {
        // If refresh fails, it just means they aren't logged in.
        // We don't need to do anything.
      } finally {
        setIsInitializing(false);
      }
    };
    initAuth();
  }, []);

  // Hook into our axios client so it can update context on refresh/failure
  useEffect(() => {
    client.onTokenRefreshed = (newToken) => {
      setTokenState(newToken);
    };

    client.onRefreshFailed = () => {
      setTokenState(null);
      setAuthToken(null);
      navigate('/login');
    };
  }, [navigate]);

  const login = async (email, password) => {
    const { data } = await client.post('/api/auth/login', { email, password });
    if (data.accessToken) {
      setTokenState(data.accessToken);
      setAuthToken(data.accessToken);
    }
  };

  const register = async (email, password) => {
    await client.post('/api/auth/register', { email, password });
    // After register, the user still needs to login per backend logic
  };

  const logout = async () => {
    try {
      await client.post('/api/auth/logout');
    } catch (err) {
      // Even if backend logout fails, we clear local state
    } finally {
      setTokenState(null);
      setAuthToken(null);
      navigate('/login');
    }
  };

  const value = {
    token,
    isAuthenticated: !!token,
    login,
    register,
    logout,
    isInitializing
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
