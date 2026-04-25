import { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [modules, setModules] = useState([]);
  const [firstName, setFirstName] = useState("");
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/");
  };

  useEffect(() => {
    loadModules();
    loadUser();
  }, []);

  const loadModules = async () => {
    try {
      const res = await api.get("/modules");
      setModules(res.data);
    } catch {
      alert("Failed to load modules");
    }
  };

  const loadUser = async () => {
    try {
      const res = await api.get("/users/me/");
      // Use first_name if set, fall back to username
      setFirstName(res.data.first_name || res.data.username);
    } catch {
      console.error("Could not load user");
    }
  };

  const launchVR = async (module) => {
    const jwt = localStorage.getItem("access_token");
    try {
      const res = await api.post("/launch-module", { module_id: module.module_id });
      const { session_token, scenario_id } = res.data;
      const url = `vrlauncher://launch?module=${encodeURIComponent(module.module_id)}&session=${encodeURIComponent(session_token)}&scenario=${encodeURIComponent(scenario_id)}&token=${encodeURIComponent(jwt)}`;
      window.location.href = url;
    } catch (err) {
      console.error(err);
      alert("Failed to launch module");
    }
  };

  const completedCount = modules.filter((m) => m.status === "Completed").length;

  return (
    <div className="app-layout">
      <div className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">⚡</div>
          <h2 className="sidebar-title">V-TRAIN</h2>
        </div>
        <span className="sidebar-section-label">Navigation</span>
        <a className="sidebar-link active" href="/dashboard">
          <span className="link-icon">🏠</span> Dashboard
        </a>
        <a className="sidebar-link" href="/download-launcher">
          <span className="link-icon">⬇️</span> Download Launcher
        </a>
        <div className="sidebar-spacer" />
        <button className="logout-btn" onClick={handleLogout}>
          <span>🚪</span> Logout
        </button>
      </div>

      <div className="main-content">
        <div className="page-header">
          {/* Shows "Welcome, John" if first_name is set, else "Welcome, johndoe" */}
          <h1>Welcome, {firstName || "—"}</h1>
          <p>Your assigned training modules are below.</p>
        </div>

        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{modules.length}</div>
            <div className="stat-label">Assigned</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{completedCount}</div>
            <div className="stat-label">Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{modules.length - completedCount}</div>
            <div className="stat-label">Remaining</div>
          </div>
        </div>

        {modules.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            No modules assigned yet. Contact your administrator.
          </div>
        )}

        {modules.map((mod) => {
          const isComplete = mod.status === "Completed";
          return (
            <div key={mod.module_id} className="module-card">
              <div className="module-card-header">
                <div>
                  <div className="module-card-title">{mod.module_name}</div>
                  <div className="module-card-version">v{mod.version}</div>
                </div>
                <span className={`badge ${isComplete ? "badge-success" : mod.progress_pct > 0 ? "badge-info" : "badge-muted"}`}>
                  {isComplete ? "✓ Complete" : mod.progress_pct > 0 ? "In Progress" : "Not Started"}
                </span>
              </div>

              <div className="progress-section">
                <div className="progress-label">
                  <span>Progress</span>
                  <span className="pct">{mod.progress_pct}%</span>
                </div>
                <div className="progress-track">
                  <div
                    className={`progress-fill${isComplete ? " complete" : ""}`}
                    style={{ width: `${mod.progress_pct}%` }}
                  />
                </div>
              </div>

              <button
                className="primary-btn"
                onClick={() => launchVR(mod)}
                disabled={isComplete}
                style={isComplete ? { opacity: 0.5, cursor: "not-allowed" } : {}}
              >
                {isComplete ? "✓ Completed" : "▶ Launch Training"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}