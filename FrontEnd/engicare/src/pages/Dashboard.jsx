import React, { useState } from "react";
import Navbar from "../components/Navbar";
import IssueCard from "../components/IssueCard";
import { mockReports, CATEGORIES } from "../mock/mockData";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { 
  PlusCircle, 
  Search, 
  Filter, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileSpreadsheet
} from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // Multi-criteria Filtering logic
  const filteredReports = mockReports.filter((report) => {
    const matchesSearch =
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" || report.category === selectedCategory;

    const matchesStatus =
      selectedStatus === "All" || report.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Calculate Metrics
  const totalCount = mockReports.length;
  const inProgressCount = mockReports.filter((r) => r.status === "In Progress" || r.status === "Under Review").length;
  const resolvedCount = mockReports.filter((r) => r.status === "Resolved").length;

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="main-content">
        <div className="container">
          {/* Welcome Header */}
          <div className="dashboard-header">
            <div>
              <h1 className="page-title">Student Overview</h1>
              <p className="page-subtitle">
                Welcome back, {user?.name || "Student"}. Track ongoing maintenance and report new campus issues.
              </p>
            </div>
            <Link to="/report" className="btn-primary-lg">
              <PlusCircle size={20} />
              <span>Report New Issue</span>
            </Link>
          </div>

          {/* Quick Metrics Cards */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon metric-total">
                <FileSpreadsheet size={24} />
              </div>
              <div className="metric-data">
                <span className="metric-value">{totalCount}</span>
                <span className="metric-label">Total Reported Issues</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon metric-progress">
                <Clock size={24} />
              </div>
              <div className="metric-data">
                <span className="metric-value">{inProgressCount}</span>
                <span className="metric-label">Active / In Progress</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon metric-resolved">
                <CheckCircle2 size={24} />
              </div>
              <div className="metric-data">
                <span className="metric-value">{resolvedCount}</span>
                <span className="metric-label">Resolved Issues</span>
              </div>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="filter-bar-card">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={18} />
              <input
                type="text"
                placeholder="Search by title, location, or Ticket ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-dropdowns">
              <div className="select-wrapper">
                <Filter size={16} className="filter-icon" />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="filter-select"
                >
                  <option value="All">All Categories</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="select-wrapper">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="filter-select"
                >
                  <option value="All">All Statuses</option>
                  <option value="Submitted">Submitted</option>
                  <option value="Under Review">Under Review</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>

          {/* Issues List Feed */}
          <section className="issues-feed-section">
            <div className="feed-header">
              <h2>Faculty Feed ({filteredReports.length})</h2>
            </div>

            {filteredReports.length > 0 ? (
              <div className="issues-grid">
                {filteredReports.map((report) => (
                  <IssueCard key={report.id} report={report} />
                ))}
              </div>
            ) : (
              <div className="empty-state-card">
                <AlertCircle size={48} className="empty-icon" />
                <h3>No issues match your filter</h3>
                <p>Try adjusting your search term or filter dropdowns to view existing tickets.</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;