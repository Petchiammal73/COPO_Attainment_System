import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { User } from "@/types";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: "admin" | "faculty") => Promise<void>;
  logout: () => void;
  token: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check token on app start
  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    const savedUser = localStorage.getItem("copa_user");
    
    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string, role: "admin" | "faculty") => {
    // Call YOUR BACKEND API
    const response = await fetch("http://localhost:8000/auth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        username: email,
        password: password,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || "Invalid credentials");
    }

    // ✅ SAVE JWT TOKEN
    localStorage.setItem("token", data.access_token);
    setToken(data.access_token);

    // Fetch user profile from backend
    const profileResponse = await fetch("http://localhost:8000/users/me", {
      headers: { 
        "Authorization": `Bearer ${data.access_token}`,
        "Content-Type": "application/json"
      },
    });

    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      
      // Map backend response to your User type
      const userData: User = {
        id: profileData.id?.toString() || "1",
        facultyCode: profileData.faculty_code || profileData.facultyCode,
        name: profileData.name,
        department: profileData.department,
        email: profileData.email,
        role: role as "admin" | "faculty", // Keep frontend role
        status: profileData.status || "active"
      };

      setUser(userData);
      localStorage.setItem("copa_user", JSON.stringify(userData));
      setIsAuthenticated(true);
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
    localStorage.removeItem("token");
    localStorage.removeItem("copa_user");
  }, []);

  // Don't render children while checking auth
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      isAuthenticated, 
      login, 
      logout, 
      token 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
