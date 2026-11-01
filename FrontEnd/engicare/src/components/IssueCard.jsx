import React from "react";
import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import PriorityBadge from "./PriorityBadge";
import { MapPin, Calendar, ArrowRight, Folder } from "lucide-react";

const IssueCard = ({ report }) => {
  const formatDate = (dateString) => {
    const options = { year: "numeric", month: "short", day: "numeric" };
    return new Date(dateString).toLocaleDateString(undefined, options);
  };

  return (
    <div className="card issue-card">
      <div className="issue-card-header">
        <div className="issue-card-meta">
          <span className="issue-id">{report.id}</span>
          <StatusBadge status={report.status} />
        </div>
        {report.priority && <PriorityBadge priority={report.priority} />}
      </div>

      <h3 className="issue-title">
        <Link to={`/reports/${report.id}`}>{report.title}</Link>
      </h3>

      <p className="issue-description">{report.description}</p>

      <div className="issue-details">
        <div className="detail-item">
          <Folder size={14} />
          <span>{report.category}</span>
        </div>
        <div className="detail-item">
          <MapPin size={14} />
          <span>{report.location}</span>
        </div>
        <div className="detail-item">
          <Calendar size={14} />
          <span>{formatDate(report.createdAt)}</span>
        </div>
      </div>

      <div className="issue-card-footer">
        <Link to={`/reports/${report.id}`} className="btn-view-details">
          <span>View Details</span>
          <ArrowRight size={16} />
        </Link>
      </div>
    </div>
  );
};

export default IssueCard;