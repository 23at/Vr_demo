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

  useEffect(() => {
    if (firstName) document.title = `Dashboard — ${firstName} — V-TRAIN`;
    else document.title = "Dashboard — V-TRAIN";
  }, [firstName]);

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
      <nav className="sidebar" aria-label="Main navigation">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon" aria-hidden="true">⚡</div>
          <h2 className="sidebar-title">V-TRAIN</h2>
        </div>
        <span className="sidebar-section-label" aria-hidden="true">Navigation</span>
        <a className="sidebar-link active" href="/dashboard" aria-current="page">
          <span className="link-icon" aria-hidden="true">🏠</span> Dashboard
        </a>
        <a className="sidebar-link" href="/download-launcher">
          <span className="link-icon" aria-hidden="true">⬇️</span> Download Launcher
        </a>
        <div className="sidebar-spacer" />
        <button className="logout-btn" onClick={handleLogout} aria-label="Logout">
          <span aria-hidden="true">🚪</span> Logout
        </button>
      </nav>

      <main className="main-content" id="main-content">
        <div className="page-header">
          <h1>Welcome, {firstName || "—"}</h1>
          <p>Your assigned training modules are below.</p>
        </div>

        <div className="stats-row" aria-label="Training summary">
          <div className="stat-card">
            <div className="stat-value" aria-label={`${modules.length} modules assigned`}>{modules.length}</div>
            <div className="stat-label" aria-hidden="true">Assigned</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" aria-label={`${completedCount} modules completed`}>{completedCount}</div>
            <div className="stat-label" aria-hidden="true">Completed</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" aria-label={`${modules.length - completedCount} modules remaining`}>{modules.length - completedCount}</div>
            <div className="stat-label" aria-hidden="true">Remaining</div>
          </div>
        </div>

        {modules.length === 0 && (
          <div className="empty-state" role="status">
            <div className="empty-state-icon" aria-hidden="true">📦</div>
            No modules assigned yet. Contact your administrator.
          </div>
        )}

        <ul style={{ listStyle: "none", margin: 0, padding: 0 }} aria-label="Training modules">
          {modules.map((mod) => {
            const isComplete = mod.status === "Completed";
            return (
              <li key={mod.module_id} className="module-card">
                <div className="module-card-header">
                  <div>
                    <div className="module-card-title">{mod.module_name}</div>
                    <div className="module-card-version">v{mod.version}</div>
                  </div>
                  <span
                    className={`badge ${isComplete ? "badge-success" : mod.progress_pct > 0 ? "badge-info" : "badge-muted"}`}
                    aria-label={`Status: ${isComplete ? "Complete" : mod.progress_pct > 0 ? "In Progress" : "Not Started"}`}
                  >
                    {isComplete ? "✓ Complete" : mod.progress_pct > 0 ? "In Progress" : "Not Started"}
                  </span>
                </div>

                <div className="progress-section">
                  <div className="progress-label">
                    <span>Progress</span>
                    <span className="pct" aria-hidden="true">{mod.progress_pct}%</span>
                  </div>
                  <div
                    className="progress-track"
                    role="progressbar"
                    aria-valuenow={mod.progress_pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${mod.module_name} progress: ${mod.progress_pct}%`}
                  >
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
                  aria-disabled={isComplete}
                  aria-label={isComplete ? `${mod.module_name} — already completed` : `Launch ${mod.module_name} training`}
                  style={isComplete ? { opacity: 0.5, cursor: "not-allowed" } : {}}
                >
                  {isComplete ? "✓ Completed" : "▶ Launch Training"}
                </button>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}