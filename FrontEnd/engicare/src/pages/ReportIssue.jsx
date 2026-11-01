import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { CATEGORIES, LOCATIONS } from "../mock/mockData";
import { 
  Send, 
  MapPin, 
  Folder, 
  AlertCircle, 
  FileText, 
  CheckCircle,
  ArrowLeft,
  Camera,
  Image as ImageIcon
} from "lucide-react";

const ReportIssue = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: "",
    category: CATEGORIES[0],
    location: LOCATIONS[0],
    description: "",
    priority: "Medium",
    image: null,
    imagePreview: ""
  });

  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData({
        ...formData,
        image: file,
        imagePreview: URL.createObjectURL(file)
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      navigate("/my-reports");
    }, 1500);
  };

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="main-content">
        <div className="container container-sm">
          <button 
            onClick={() => navigate(-1)} 
            className="btn-back"
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </button>

          <div className="form-card">
            <div className="form-card-header">
              <h2>Report a Faculty Issue</h2>
              <p>Submit details regarding broken facilities or equipment for prompt repair.</p>
            </div>

            {submitted ? (
              <div className="success-banner">
                <CheckCircle size={32} />
                <div>
                  <h4>Issue Submitted Successfully!</h4>
                  <p>Redirecting you to your reports page...</p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="report-form">
                <div className="form-group">
                  <label htmlFor="title">Issue Title *</label>
                  <div className="input-with-icon">
                    <FileText className="input-icon" size={18} />
                    <input
                      id="title"
                      name="title"
                      type="text"
                      placeholder="e.g. Broken Projector or Leaking Water Tap"
                      value={formData.title}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="category">Category *</label>
                    <div className="input-with-icon">
                      <Folder className="input-icon" size={18} />
                      <select
                        id="category"
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="select-input"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="priority">Estimated Priority</label>
                    <div className="input-with-icon">
                      <AlertCircle className="input-icon" size={18} />
                      <select
                        id="priority"
                        name="priority"
                        value={formData.priority}
                        onChange={handleChange}
                        className="select-input"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="location">Location / Class Number *</label>
                  <div className="input-with-icon">
                    <MapPin className="input-icon" size={18} />
                    <select
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="select-input"
                    >
                      {LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                  <div className="form-group">
                  <label htmlFor="issueImage">Attach Photo / Take Picture</label>
                  <div className="input-with-icon">
                    <Camera className="input-icon" size={18} />
                    <input
                      id="issueImage"
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleImageChange}
                      style={{ paddingLeft: "40px", paddingTop: "8px" }}
                    />
                  </div>

                  {formData.imagePreview && (
                    <div style={{ marginTop: "12px", borderRadius: "8px", overflow: "hidden", border: "1px solid #e2e8f0" }}>
                      <img 
                        src={formData.imagePreview} 
                        alt="Issue Preview" 
                        style={{ width: "100%", maxHeight: "200px", objectFit: "cover" }} 
                      />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label htmlFor="description">Detailed Description *</label>
                  <textarea
                    id="description"
                    name="description"
                    rows="4"
                    placeholder="Provide additional context (e.g. error codes, physical condition, impact on lectures)..."
                    value={formData.description}
                    onChange={handleChange}
                    required
                    className="textarea-input"
                  ></textarea>
                </div>

                <div className="form-actions">
                  <button type="submit" className="btn-primary-lg full-width">
                    <Send size={18} />
                    <span>Submit Report Ticket</span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReportIssue;