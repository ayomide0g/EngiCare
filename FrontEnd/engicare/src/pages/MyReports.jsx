import React, { useState } from "react";
import Navbar from "../components/Navbar";
import IssueCard from "../components/IssueCard";
import { mockReports } from "../mock/mockData";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { PlusCircle, FileText } from "lucide-react";

const MyReports = () => {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState("All");

  // Filter reports submitted by current user (or demo user)
  const myReports = mockReports.filter(
    (report) => report.submittedBy === (user?.name || "Alex Morgan")
  );

  const filteredReports = myReports.filter((report) => {
    if (statusFilter === "All") return true;
    return report.status === statusFilter;
  });

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="main-content">
        <div className="container">
          <div className="dashboard-header">
            <div>
              <h1 className="page-title">My Report Tickets</h1>
              <p className="page-subtitle">
                Track status updates and history for issues you have reported.
              </p>
            </div>
            <Link to="/report" className="btn-primary-lg">
              <PlusCircle size={20} />
              <span>Report New Issue</span>
            </Link>
          </div>

          {/* Quick Filter Tabs */}
          <div className="filter-tabs">
            <button
              className={`tab-btn ${statusFilter === "All" ? "active" : ""}`}
              onClick={() => setStatusFilter("All")}
            >
              All ({myReports.length})
            </button>
            <button
              className={`tab-btn ${statusFilter === "Submitted" ? "active" : ""}`}
              onClick={() => setStatusFilter("Submitted")}
            >
              Submitted
            </button>
            <button
              className={`tab-btn ${statusFilter === "In Progress" ? "active" : ""}`}
              onClick={() => setStatusFilter("In Progress")}
            >
              In Progress
            </button>
            <button
              className={`tab-btn ${statusFilter === "Resolved" ? "active" : ""}`}
              onClick={() => setStatusFilter("Resolved")}
            >
              Resolved
            </button>
          </div>

          {/* Reports Grid or Empty State */}
          {filteredReports.length > 0 ? (
            <div className="issues-grid">
              {filteredReports.map((report) => (
                <IssueCard key={report.id} report={report} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <FileText size={48} />
              <h3>No submitted reports found</h3>
              <p>
                You haven't submitted any issue reports matching this status filter yet.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default MyReports;