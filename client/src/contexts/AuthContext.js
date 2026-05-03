
"use client";
import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import api from "../utils/api";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Helper function to decode JWT and check expiration
const isTokenExpired = (token) => {
  if (!token) return true;
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
      '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
    ).join(''));
    const { exp } = JSON.parse(jsonPayload);
    return exp * 1000 < Date.now(); // Convert to milliseconds
  } catch (e) {
    return true;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [authError, setAuthError] = useState(null);

  // Load token from localStorage on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedToken = localStorage.getItem("token");
      if (savedToken && !isTokenExpired(savedToken)) {
        setToken(savedToken);
        axios.defaults.headers.common["Authorization"] = `Bearer ${savedToken}`;
      } else if (savedToken) {
        // Remove expired token
        localStorage.removeItem("token");
      }
    }
    setIsInitialized(true);
  }, []);

  // Configure axios defaults when token changes
  useEffect(() => {
    if (isInitialized) {
      if (token && !isTokenExpired(token)) {
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      } else {
        delete axios.defaults.headers.common["Authorization"];
        if (token) {
          // Token is expired, clear it
          setToken(null);
          localStorage.removeItem("token");
        }
      }
    }
  }, [token, isInitialized]);

  // Load user on app start
  useEffect(() => {
    const loadUser = async () => {
      if (token && isInitialized && !isTokenExpired(token)) {
        try {
          // First try the regular user endpoint
          const response = await api.get("/api/auth/me");
          setUser(response.data.user);
          setAuthError(null);
        } catch (error) {
          console.error("Failed to load regular user:", error);
          
          // If regular user endpoint fails, try superadmin endpoint
          try {
            const superadminResponse = await api.get("/api/auth/superadmin/me");
            setUser(superadminResponse.data.user);
            setAuthError(null);
          } catch (superadminError) {
            console.error("Failed to load superadmin user:", superadminError);
            setAuthError("Authentication failed. Please login again.");
            logout();
          }
        }
      } else if (token && isTokenExpired(token)) {
        // Token is expired
        setAuthError("Your session has expired. Please login again.");
        logout();
      }
      setLoading(false);
    };
    
    if (isInitialized) {
      loadUser();
    }
  }, [token, isInitialized]);

  // 🔑 Auth Functions
  const login = async (loginData) => {
    try {
      const { email, password } = loginData;
      
      const response = await api.post("/api/auth/login", {
        email,
        password
      });
      
      // Handle successful login with token
      if (response.data.token) {
        const newToken = response.data.token;
        setToken(newToken);
        setUser(response.data.user);
        // Save token to localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem("token", newToken);
        }
        return { 
          success: true
        };
      }
      // Handle other responses (errors)
      else {
        return {
          success: false,
          message: response.data.message || "Login failed"
        };
      }
    } catch (error) {
      console.error("Login error:", error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || "An error occurred during login"
      };
    }
  };

  const adminLogin = async (email, password) => {
    try {
      const response = await api.post("/api/auth/admin-login", { email, password });
      const { token: newToken, user: userData } = response.data;
      setToken(newToken);
      setUser(userData);
      // Save token to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("token", newToken);
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Admin login failed"
      };
    }
  };

  const superAdminLogin = async (email, password) => {
    try {
      const response = await api.post("/api/superadmin/login", { email, password });
      const { token: newToken, user: userData } = response.data;
      setToken(newToken);
      setUser(userData);
      // Save token to localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("token", newToken);
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "SuperAdmin login failed"
      };
    }
  };

  const register = async (userData) => {
    try {
      const response = await api.post("/api/auth/register", userData);
      return { success: true, message: response.data.message };
    } catch (error) {
      return {
        success: false,
        message: error.response?.data?.message || "Registration failed"
      };
    }
  };

  const logout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
  };

  const updateUser = (userData) => {
    setUser((prev) => ({ ...prev, ...userData }));
  };

  // Add a function to get the current token directly from localStorage
  const getCurrentToken = () => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("token");
    }
    return null;
  };

  const value = {
    user,
    token,
    loading,
    isInitialized,
    login,
    adminLogin,
    superAdminLogin,
    register,
    logout,
    updateUser,
    getCurrentToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};