import React from "react";
import { AlertCircle, AlertTriangle, ArrowUpRight, CheckCircle2 } from "lucide-react";

const priorityConfig = {
  Low: {
    className: "priority-low",
    icon: CheckCircle2,
    label: "Low"
  },
  Medium: {
    className: "priority-medium",
    icon: ArrowUpRight,
    label: "Medium"
  },
  High: {
    className: "priority-high",
    icon: AlertTriangle,
    label: "High"
  },
  Critical: {
    className: "priority-critical",
    icon: AlertCircle,
    label: "Critical"
  }
};

const PriorityBadge = ({ priority }) => {
  const config = priorityConfig[priority] || priorityConfig["Low"];
  const IconComponent = config.icon;

  return (
    <span className={`priority-badge ${config.className}`}>
      <IconComponent size={14} className="priority-icon" />
      <span>{config.label}</span>
    </span>
  );
};

export default PriorityBadge;