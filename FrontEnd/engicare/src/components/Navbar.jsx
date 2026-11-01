import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Wrench, User, LogOut, Repeat, PlusCircle, FileText, LayoutDashboard, Sun, Moon } from "lucide-react";

const Navbar = () => {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(document.documentElement.dataset.theme || "light");

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) { /* ignore */ }
    setTheme(next);
  };

  const handleLogout = () => { logout(); navigate("/login"); };
  const home = user?.role === "admin" ? "/admin" : "/dashboard";

  return (
    <header className="navbar">
      <div className="navbar-container">
        <Link to={home} className="navbar-brand">
          <div className="brand-icon"><Wrench size={20} color="#fff" /></div>
          <div className="brand-text">
            <span className="brand-name">EngiCare</span>
            <span className="brand-sub">Faculty Issue Tracker</span>
          </div>
        </Link>

        {user && (
          <nav className="navbar-nav">
            {user.role === "admin" ? (
              <NavLink to="/admin" className="nav-link"><LayoutDashboard size={17} /><span>Admin Console</span></NavLink>
            ) : (
              <>
                <NavLink to="/dashboard" className="nav-link"><LayoutDashboard size={17} /><span>Dashboard</span></NavLink>
                <NavLink to="/my-reports" className="nav-link"><FileText size={17} /><span>My Reports</span></NavLink>
                <NavLink to="/report" className="nav-btn-primary"><PlusCircle size={17} /><span>Report Issue</span></NavLink>
              </>
            )}
          </nav>
        )}

        <div className="navbar-actions">
          <button className="icon-btn" onClick={toggleTheme} title="Toggle dark mode" aria-label="Toggle dark mode">
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          {user && (
            <>
              <button className="role-switch-badge desktop-only" onClick={() => switchRole(user.role === "admin" ? "student" : "admin")} title="Switch between Student and Admin view (demo)">
                <Repeat size={14} /><span>View as {user.role === "admin" ? "Student" : "Admin"}</span>
              </button>
              <div className="user-profile-menu">
                <div className="profile-info">
                  <div className="avatar"><User size={17} /></div>
                  <div className="user-details desktop-only">
                    <span className="user-name">{user.name}</span>
                    <span className="user-role">{user.role}</span>
                  </div>
                </div>
                <button onClick={handleLogout} className="btn-logout" title="Log out" aria-label="Log out"><LogOut size={18} /></button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
