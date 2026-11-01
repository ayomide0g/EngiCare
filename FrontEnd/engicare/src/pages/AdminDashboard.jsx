import React, { useState } from "react";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import { mockReports, CATEGORIES } from "../mock/mockData";
import { Link } from "react-router-dom";
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Edit3,
  Eye,
  ArrowUpDown
} from "lucide-react";

const AdminDashboard = () => {
  const [reports, setReports] = useState(mockReports);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");

  // Handle status update directly from admin table
  const handleStatusChange = (id, newStatus) => {
    setReports((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
  };

  // Filter Reports
  const filteredReports = reports.filter((report) => {
    const matchesSearch =
      report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.submittedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" || report.category === selectedCategory;

    const matchesStatus =
      selectedStatus === "All" || report.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const totalReports = reports.length;
  const pendingReports = reports.filter((r) => r.status === "Submitted" || r.status === "Under Review").length;
  const inProgressReports = reports.filter((r) => r.status === "In Progress").length;
  const resolvedReports = reports.filter((r) => r.status === "Resolved").length;

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="main-content">
        <div className="container">
          <div className="dashboard-header">
            <div>
              <h1 className="page-title">Facilities Admin Console</h1>
              <p className="page-subtitle">
                Manage, assign, and update equipment repair requests across faculty buildings.
              </p>
            </div>
          </div>

          {/* Admin Stats Grid */}
          <div className="metrics-grid">
            <div className="metric-card">
              <div className="metric-icon metric-total">
                <ShieldCheck size={24} />
              </div>
              <div className="metric-data">
                <span className="metric-value">{totalReports}</span>
                <span className="metric-label">Total Submissions</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon metric-pending">
                <AlertTriangle size={24} />
              </div>
              <div className="metric-data">
                <span className="metric-value">{pendingReports}</span>
                <span className="metric-label">Pending Review</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon metric-progress">
                <Clock size={24} />
              </div>
              <div className="metric-data">
                <span className="metric-value">{inProgressReports}</span>
                <span className="metric-label">In Progress</span>
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-icon metric-resolved">
                <CheckCircle2 size={24} />
              </div>
              <div className="metric-data">
                <span className="metric-value">{resolvedReports}</span>
                <span className="metric-label">Resolved</span>
              </div>
            </div>
          </div>

          {/* Search & Filter Bar */}
          <div className="filter-bar-card">
            <div className="search-input-wrapper">
              <Search className="search-icon" size={18} />
              <input
                type="text"
                placeholder="Search ticket ID, student name, or issue title..."
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

          {/* Admin Table View */}
          <div className="card table-card">
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Issue Title</th>
                    <th>Category</th>
                    <th>Location</th>
                    <th>Submitted By</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Update Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredReports.map((report) => (
                    <tr key={report.id}>
                      <td className="font-mono text-bold">{report.id}</td>
                      <td>
                        <span className="table-title">{report.title}</span>
                      </td>
                      <td>{report.category}</td>
                      <td>{report.location}</td>
                      <td>{report.submittedBy}</td>
                      <td>
                        <PriorityBadge priority={report.priority} />
                      </td>
                      <td>
                        <StatusBadge status={report.status} />
                      </td>
                      <td>
                        <select
                          value={report.status}
                          onChange={(e) => handleStatusChange(report.id, e.target.value)}
                          className="table-status-select"
                        >
                          <option value="Submitted">Submitted</option>
                          <option value="Under Review">Under Review</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Rejected">Rejected</option>
                        </select>
                      </td>
                      <td>
                        <Link to={`/reports/${report.id}`} className="btn-icon-only" title="View Full Details">
                          <Eye size={18} />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;