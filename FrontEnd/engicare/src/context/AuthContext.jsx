import React, { createContext, useContext, useState } from "react";
import { mockCurrentUser } from "../mock/mockData";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(mockCurrentUser);

  // Mock login handler
  const login = (email, password, role = "student") => {
    const loggedInUser = {
      id: role === "admin" ? "ADM-001" : "USR-001",
      name: role === "admin" ? "Prof. Sarah Jenkins" : "Alex Morgan",
      email: email || (role === "admin" ? "admin@university.edu" : "alex.morgan@university.edu"),
      role: role,
      department: "Computer Engineering",
      studentId: role === "admin" ? null : "65010482"
    };
    setUser(loggedInUser);
    return true;
  };

  // Mock register handler
  const register = (userData) => {
    const newUser = {
      id: `USR-${Math.floor(100 + Math.random() * 900)}`,
      name: userData.fullName,
      email: userData.email,
      role: "student",
      department: userData.department || "Computer Engineering",
      studentId: userData.studentId || "65000000"
    };
    setUser(newUser);
    return true;
  };

  // Logout handler
  const logout = () => {
    setUser(null);
  };

  // Quick switch role helper (for easy university project demo testing)
  const switchRole = (newRole) => {
    if (!user) return;
    setUser({
      ...user,
      role: newRole,
      name: newRole === "admin" ? "Prof. Sarah Jenkins" : "Alex Morgan"
    });
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, switchRole }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};