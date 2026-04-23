import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Download() {
  const [role, setRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    api.get("/users/me/")
      .then((res) => setRole(res.data.role))
      .catch(() => navigate("/"));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/");
  };

  const isAdmin = role === "ADMIN";

  return (
    <div className="app-layout">
      <div className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚡</div>
          <h2 className="sidebar-title">V-TRAIN</h2>
        </div>

        <span className="sidebar-section-label">{isAdmin ? "Admin" : "Navigation"}</span>

        {isAdmin ? (
          <>
            <a className="sidebar-link" href="/admin"><span className="link-icon">🏠</span> Dashboard</a>
            <a className="sidebar-link" href="/admin/users"><span className="link-icon">👥</span> User Management</a>
            <a className="sidebar-link" href="/admin/modules"><span className="link-icon">📦</span> Module Management</a>
          </>
        ) : (
          <a className="sidebar-link" href="/dashboard"><span className="link-icon">🏠</span> Dashboard</a>
        )}

        <span className="sidebar-section-label">System</span>
        <a className="sidebar-link active" href="/download-launcher"><span className="link-icon">⬇️</span> Download Launcher</a>

        <div className="sidebar-spacer" />
        <button className="logout-btn" onClick={handleLogout}><span>🚪</span> Logout</button>
      </div>

      <div className="main-content">
        <div className="page-header">
          <h1>Download Launcher</h1>
          <p>Install the VR Training Launcher to access your training modules.</p>
        </div>

        <div className="card">
          <h3>VR Training Launcher</h3>
          <p className="text-muted" style={{ marginBottom: 16 }}>
            The launcher connects your browser to the VR training application on your device.
            Install it once, then click "Launch Training" from your dashboard.
          </p>

          <div className="notice notice-info">
            <span>ℹ️</span>
            <span>Requires Windows 10 or later. After installing, restart your browser.</span>
          </div>

          <a
            href="/launcher/VRTrainingLauncher.exe"
            className="primary-btn"
            style={{ textDecoration: "none", display: "inline-flex" }}
          >
            ⬇ Download Launcher (.exe)
          </a>
        </div>
      </div>
    </div>
  );
}