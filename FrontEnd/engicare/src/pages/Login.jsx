import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldAlert, Mail, Lock, UserCheck, ArrowRight } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = login(email, password, role);
    if (success) {
      if (role === "admin") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    }
  };

  const handleQuickDemo = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === "admin") {
      setEmail("admin@university.edu");
    } else {
      setEmail("alex.morgan@university.edu");
    }
    setPassword("demo1234");
  };

  return (
    <div className="auth-page">
      <div className="auth-grid" aria-hidden="true" />
      <div className="auth-container">
        <div className="auth-header">
          <div className="brand-icon-large">
            <ShieldAlert size={36} color="#ffffff" />
          </div>
          <h2>Welcome to EngiCare</h2>
          <p>Faculty Equipment & Facilities Issue Reporting System</p>
        </div>

        <div className="demo-switcher-box">
          <span className="demo-label">Quick Demo Access:</span>
          <div className="demo-buttons">
            <button
              type="button"
              className={`demo-btn ${role === "student" ? "active" : ""}`}
              onClick={() => handleQuickDemo("student")}
            >
              <UserCheck size={14} /> Student Demo
            </button>
            <button
              type="button"
              className={`demo-btn ${role === "admin" ? "active" : ""}`}
              onClick={() => handleQuickDemo("admin")}
            >
              <UserCheck size={14} /> Admin Demo
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">University Email</label>
            <div className="input-with-icon">
              <Mail className="input-icon" size={18} />
              <input
                id="email"
                type="email"
                placeholder="student@university.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock className="input-icon" size={18} />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Login As Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="role-select"
            >
              <option value="student">Student / Faculty Staff</option>
              <option value="admin">Facilities Administrator</option>
            </select>
          </div>

          <button type="submit" className="btn-auth-submit">
            <span>Sign In</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-footer">
          <p>
            Don't have an account? <Link to="/register">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;