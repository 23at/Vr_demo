import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

export default function Download() {
  const [role, setRole] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Download Launcher — V-TRAIN";
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
      <nav className="sidebar" aria-label={isAdmin ? "Admin navigation" : "Main navigation"}>
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" aria-hidden="true">⚡</div>
          <h2 className="sidebar-title">V-TRAIN</h2>
        </div>

        <span className="sidebar-section-label" aria-hidden="true">{isAdmin ? "Admin" : "Navigation"}</span>

        {isAdmin ? (
          <>
            <a className="sidebar-link" href="/admin">
              <span className="link-icon" aria-hidden="true">🏠</span> Dashboard
            </a>
            <a className="sidebar-link" href="/admin/users">
              <span className="link-icon" aria-hidden="true">👥</span> User Management
            </a>
            <a className="sidebar-link" href="/admin/modules">
              <span className="link-icon" aria-hidden="true">📦</span> Module Management
            </a>
          </>
        ) : (
          <a className="sidebar-link" href="/dashboard">
            <span className="link-icon" aria-hidden="true">🏠</span> Dashboard
          </a>
        )}

        <span className="sidebar-section-label" aria-hidden="true">System</span>
        <a className="sidebar-link active" href="/download-launcher" aria-current="page">
          <span className="link-icon" aria-hidden="true">⬇️</span> Download Launcher
        </a>

        <div className="sidebar-spacer" />
        <button className="logout-btn" onClick={handleLogout} aria-label="Logout">
          <span aria-hidden="true">🚪</span> Logout
        </button>
      </nav>

      <main className="main-content" id="main-content">
        <div className="page-header">
          <h1>Download Launcher</h1>
          <p>Install the VR Training Launcher to access your training modules.</p>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>VR Training Launcher</h2>
          <p className="text-muted" style={{ marginBottom: 16 }}>
            The launcher connects your browser to the VR training application on your device.
            Install it once, then click "Launch Training" from your dashboard.
          </p>

          <div className="notice notice-info" role="note">
            <span aria-hidden="true">ℹ️</span>
            <span>Requires Windows 10 or later. After installing, restart your browser.</span>
          </div>

          <a
            href="/launcher/VRTrainingLauncher.exe"
            className="primary-btn"
            style={{ textDecoration: "none", display: "inline-flex" }}
            aria-label="Download VR Training Launcher for Windows (.exe file)"
          >
            <span aria-hidden="true">⬇</span> Download Launcher (.exe)
          </a>
        </div>
      </main>
    </div>
  );
}