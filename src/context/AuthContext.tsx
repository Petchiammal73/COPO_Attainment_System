import React, { createContext, useContext, useState, useCallback } from "react";
import { User } from "@/types";

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string, role: "admin" | "faculty") => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_USERS: Record<string, User & { password: string }> = {
  "admin@university.edu": {
    id: "1",
    facultyCode: "ADM001",
    name: "Dr. Admin",
    department: "Computer Science",
    email: "admin@university.edu",
    role: "admin",
    status: "active",
    password: "admin123",
  },
  "faculty@university.edu": {
    id: "2",
    facultyCode: "FAC001",
    name: "Prof. Sharma",
    department: "Computer Science",
    email: "faculty@university.edu",
    role: "faculty",
    status: "active",
    password: "faculty123",
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem("copa_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback(async (email: string, _password: string, _role: "admin" | "faculty") => {
    const demoUser = DEMO_USERS[email];
    if (!demoUser) throw new Error("Invalid credentials");
    const { password: _, ...userData } = demoUser;
    setUser(userData);
    localStorage.setItem("copa_user", JSON.stringify(userData));
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("copa_user");
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
