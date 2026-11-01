import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatusBadge from "../components/StatusBadge";
import PriorityBadge from "../components/PriorityBadge";
import { mockReports } from "../mock/mockData";
import { useAuth } from "../context/AuthContext";
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  User, 
  Clock, 
  MessageSquare, 
  Send,
  Building
} from "lucide-react";

const ReportDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Find report by ID or default to the first mock report
  const report = mockReports.find((r) => r.id === id) || mockReports[0];
  
  const [comments, setComments] = useState(report.comments || []);
  const [newComment, setNewComment] = useState("");

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const commentObj = {
      id: Date.now(),
      author: user?.name || "Student",
      role: user?.role === "admin" ? "Facilities Admin" : "Student",
      createdAt: new Date().toISOString(),
      text: newComment
    };

    setComments([...comments, commentObj]);
    setNewComment("");
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="main-content">
        <div className="container container-md">
          <button onClick={() => navigate(-1)} className="btn-back">
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>

          <div className="details-header-card">
            <div className="details-top-bar">
              <div className="details-id-group">
                <span className="details-ticket-id">{report.id}</span>
                <StatusBadge status={report.status} />
              </div>
              <PriorityBadge priority={report.priority} />
            </div>

            <h1 className="details-title">{report.title}</h1>

            <div className="details-meta-grid">
              <div className="meta-item">
                <Building size={16} />
                <span><strong>Category:</strong> {report.category}</span>
              </div>
              <div className="meta-item">
                <MapPin size={16} />
                <span><strong>Location:</strong> {report.location}</span>
              </div>
              <div className="meta-item">
                <User size={16} />
                <span><strong>Submitted by:</strong> {report.submittedBy}</span>
              </div>
              <div className="meta-item">
                <Calendar size={16} />
                <span><strong>Date:</strong> {formatDate(report.createdAt)}</span>
              </div>
            </div>
          </div>

          <div className="details-content-grid">
            {/* Description Card */}
            <div className="card details-section">
              <h3>Description & Issues</h3>
              <p className="details-body">{report.description}</p>
            </div>

            {/* Updates & Timeline Activity */}
            <div className="card details-section">
              <h3><Clock size={18} /> Maintenance Timeline</h3>
              <div className="timeline">
                <div className="timeline-item">
                  <div className="timeline-dot"></div>
                  <div className="timeline-content">
                    <span className="timeline-date">{formatDate(report.createdAt)}</span>
                    <p className="timeline-title">Ticket Submitted</p>
                    <p className="timeline-desc">Issue ticket was registered in the EngiCare portal.</p>
                  </div>
                </div>

                {report.status !== "Submitted" && (
                  <div className="timeline-item">
                    <div className="timeline-dot active"></div>
                    <div className="timeline-content">
                      <span className="timeline-date">{formatDate(report.updatedAt)}</span>
                      <p className="timeline-title">Status Updated to: {report.status}</p>
                      <p className="timeline-desc">Assigned to facilities team for inspection.</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Comments & Updates Section */}
            <div className="card details-section">
              <h3><MessageSquare size={18} /> Discussion & Comments ({comments.length})</h3>

              <div className="comments-list">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <div key={comment.id} className="comment-bubble">
                      <div className="comment-header">
                        <span className="comment-author">{comment.author} ({comment.role})</span>
                        <span className="comment-time">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="comment-text">{comment.text}</p>
                    </div>
                  ))
                ) : (
                  <p className="no-comments">No comments added yet.</p>
                )}
              </div>

              {/* Add Comment Form */}
              <form onSubmit={handleAddComment} className="add-comment-form">
                <div className="input-with-button">
                  <input
                    type="text"
                    placeholder="Add a remark or update..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn-primary">
                    <Send size={16} />
                    <span>Post</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReportDetails;