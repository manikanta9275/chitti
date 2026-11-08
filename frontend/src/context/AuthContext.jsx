import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Allowed offline users and PINs
const OFFLINE_CREDENTIALS = {
  admin: {
    username: 'admin',
    displayName: 'Admin',
    role: 'admin',
    pin: '9999',
    id: 'admin_local_id'
  },
  mavayya: {
    username: 'mavayya',
    displayName: 'Mavayya',
    role: 'user',
    pin: '9278',
    id: 'mavayya_local_id'
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem('chitti_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [token, setToken] = useState(localStorage.getItem('chitti_token') || null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  // Configure axios authorization header whenever token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      localStorage.setItem('chitti_token', token);
    } else {
      delete axios.defaults.headers.common['Authorization'];
      localStorage.removeItem('chitti_token');
    }
  }, [token]);

  // Check existing session on application start
  useEffect(() => {
    const verifyUserSession = async () => {
      const storedToken = localStorage.getItem('chitti_token');
      const storedUser = localStorage.getItem('chitti_user');

      if (!storedToken && !storedUser) {
        setLoading(false);
        return;
      }

      // If we have a cached user, initialize with it immediately so offline start is instant
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.warn('Failed parsing stored user', e);
        }
      }

      if (!storedToken) {
        setLoading(false);
        return;
      }

      // If online, verify against backend; if network fails, do NOT logout!
      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        const response = await axios.get(`${apiBaseUrl}/auth/me`, { timeout: 4000 });
        if (response.data.success) {
          setUser(response.data.user);
          localStorage.setItem('chitti_user', JSON.stringify(response.data.user));
          setToken(storedToken);
        } else {
          logout();
        }
      } catch (err) {
        // If error is network-related (offline, timeout, server down), preserve cached user session!
        if (!err.response || err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED' || !navigator.onLine) {
          console.warn('Network unavailable during session check — staying logged in offline.');
        } else {
          // If server returned 401 Unauthorized, token truly expired
          logout();
        }
      } finally {
        setLoading(false);
      }
    };

    verifyUserSession();
  }, [apiBaseUrl]);

  // Login handler with offline-fallback for Admin and Mavayya
  const login = async (username, pin) => {
    setLoading(true);
    setAuthError(null);
    const cleanUsername = (username || '').trim().toLowerCase();

    // 1. Try online authentication
    try {
      const response = await axios.post(`${apiBaseUrl}/auth/login`, {
        username: cleanUsername,
        pin: pin.toString()
      }, { timeout: 5000 });

      if (response.data.success) {
        const { token: receivedToken, user: receivedUser } = response.data;
        setToken(receivedToken);
        setUser(receivedUser);
        localStorage.setItem('chitti_token', receivedToken);
        localStorage.setItem('chitti_user', JSON.stringify(receivedUser));
        axios.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;
        return { success: true };
      } else {
        setAuthError(response.data.message || 'Login failed');
        return { success: false, message: response.data.message };
      }
    } catch (err) {
      // 2. If network fails or offline, check offline credentials for Admin & Mavayya
      const isNetworkIssue = !err.response || err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED' || !navigator.onLine;

      if (isNetworkIssue) {
        const cred = OFFLINE_CREDENTIALS[cleanUsername];
        if (cred && cred.pin === pin.toString()) {
          const offlineUser = {
            id: cred.id,
            username: cred.username,
            displayName: cred.displayName,
            role: cred.role,
            isOffline: true
          };
          setUser(offlineUser);
          localStorage.setItem('chitti_user', JSON.stringify(offlineUser));
          return { success: true, offline: true, message: `Logged in offline as ${cred.displayName}` };
        } else if (cred) {
          const msg = 'Invalid PIN for offline login.';
          setAuthError(msg);
          return { success: false, message: msg };
        }
      }

      const errorMessage = err.response?.data?.message || 'Failed to connect to authentication server. Check your PIN or internet.';
      setAuthError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await axios.post(`${apiBaseUrl}/auth/logout`, {}, { timeout: 2000 });
    } catch (err) {
      // Ignore logout network errors
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('chitti_token');
      localStorage.removeItem('chitti_user');
      delete axios.defaults.headers.common['Authorization'];
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        authError,
        setAuthError,
        login,
        logout,
        isAdmin: user?.role === 'admin'
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
