import React from "react";
import { 
  Clock, 
  Search, 
  Wrench, 
  CheckCircle2, 
  XCircle 
} from "lucide-react";

const statusConfig = {
  "Submitted": {
    className: "badge-submitted",
    icon: Clock
  },
  "Under Review": {
    className: "badge-review",
    icon: Search
  },
  "In Progress": {
    className: "badge-progress",
    icon: Wrench
  },
  "Resolved": {
    className: "badge-resolved",
    icon: CheckCircle2
  },
  "Rejected": {
    className: "badge-rejected",
    icon: XCircle
  }
};

const StatusBadge = ({ status }) => {
  const config = statusConfig[status] || {
    className: "badge-submitted",
    icon: Clock
  };

  const IconComponent = config.icon;

  return (
    <span className={`status-badge ${config.className}`}>
      <IconComponent className="status-badge-icon" size={13} />
      <span>{status}</span>
    </span>
  );
};

export default StatusBadge;