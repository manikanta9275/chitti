import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
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
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        const response = await axios.get(`${apiBaseUrl}/auth/me`);
        if (response.data.success) {
          setUser(response.data.user);
          setToken(storedToken);
        } else {
          logout();
        }
      } catch (err) {
        console.warn('Session verification failed:', err.response?.data?.message || err.message);
        logout();
      } finally {
        setLoading(false);
      }
    };

    verifyUserSession();
  }, [apiBaseUrl]);

  // Login handler
  const login = async (username, pin) => {
    setLoading(true);
    setAuthError(null);
    try {
      const response = await axios.post(`${apiBaseUrl}/auth/login`, {
        username,
        pin
      });

      if (response.data.success) {
        const { token: receivedToken, user: receivedUser } = response.data;
        setToken(receivedToken);
        setUser(receivedUser);
        localStorage.setItem('chitti_token', receivedToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${receivedToken}`;
        return { success: true };
      } else {
        setAuthError(response.data.message || 'Login failed');
        return { success: false, message: response.data.message };
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to connect to authentication server.';
      setAuthError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  // Logout handler
  const logout = async () => {
    try {
      await axios.post(`${apiBaseUrl}/auth/logout`);
    } catch (err) {
      // Ignore logout endpoint network errors
    } finally {
      setUser(null);
      setToken(null);
      localStorage.removeItem('chitti_token');
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

