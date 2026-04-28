import { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

function Sidebar({ onLogout }) {
  return (
    <nav className="sidebar" aria-label="Admin navigation">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" aria-hidden="true">⚡</div>
        <h2 className="sidebar-title">V-TRAIN</h2>
      </div>
      <span className="sidebar-section-label" aria-hidden="true">Admin</span>
      <a className="sidebar-link active" href="/admin" aria-current="page">
        <span className="link-icon" aria-hidden="true">🏠</span> Dashboard
      </a>
      <a className="sidebar-link" href="/admin/users">
        <span className="link-icon" aria-hidden="true">👥</span> User Management
      </a>
      <a className="sidebar-link" href="/admin/modules">
        <span className="link-icon" aria-hidden="true">📦</span> Module Management
      </a>
      <span className="sidebar-section-label" aria-hidden="true">System</span>
      <a className="sidebar-link" href="/download-launcher">
        <span className="link-icon" aria-hidden="true">⬇️</span> Download Launcher
      </a>
      <div className="sidebar-spacer" />
      <button className="logout-btn" onClick={onLogout} aria-label="Logout">
        <span aria-hidden="true">🚪</span> Logout
      </button>
    </nav>
  );
}

function ProgressBar({ pct, complete, label }) {
  return (
    <div
      className="progress-track"
      style={{ margin: 0 }}
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ? `${label}: ${pct}%` : `${pct}%`}
    >
      <div
        className={`progress-fill${complete ? " complete" : ""}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function displayName(user) {
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return full || user.username;
}

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState({});
  const [selectedFileModule, setSelectedFileModule] = useState("");
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [newModule, setNewModule] = useState({ module_name: "", version: "", description: "" });
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Admin Dashboard — V-TRAIN";
    loadUsers();
    loadModules();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/");
  };

  const loadUsers = async () => {
    const res = await api.get("/admin/users");
    setUsers(res.data);
  };

  const loadModules = async () => {
    const res = await api.get("/modules");
    setModules(res.data);
  };

  const createModule = async () => {
    if (!newModule.module_name || !newModule.version)
      return alert("Name and version are required");
    try {
      await api.post("/modules", newModule);
      setNewModule({ module_name: "", version: "", description: "" });
      loadModules();
    } catch {
      alert("Failed to create module");
    }
  };

  const assignModule = async (userId) => {
    const moduleId = selectedModule[userId];
    if (!moduleId) return alert("Select a module");
    await api.post("/admin/assign", null, {
      params: { user_id: userId, module_id: moduleId },
    });
    loadUsers();
  };

  const uploadFile = async () => {
    if (!selectedFileModule || !file) return alert("Select a module and file");
    const formData = new FormData();
    formData.append("file", file);
    try {
      await api.post(`/modules/${selectedFileModule}/upload`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => {
          setUploadProgress(Math.round((e.loaded * 100) / e.total));
        },
      });
      alert("File uploaded successfully!");
      setFile(null);
      setUploadProgress(0);
      loadModules();
    } catch {
      alert("Upload failed");
    }
  };

  const totalUsers = users.length;
  const totalModules = modules.length;
  const completedCount = users.reduce(
    (acc, u) => acc + u.modules.filter((m) => m.status === "Completed").length,
    0
  );

  return (
    <div className="app-layout">
      <Sidebar onLogout={handleLogout} />

      <main className="main-content" id="main-content">
        <div className="page-header">
          <h1>Admin Dashboard</h1>
          <p>Manage users, modules, and track training progress.</p>
        </div>

        {/* Stats */}
        <div className="stats-row" aria-label="Summary statistics">
          <div className="stat-card">
            <div className="stat-value" aria-label={`${totalUsers} total users`}>{totalUsers}</div>
            <div className="stat-label" aria-hidden="true">Total Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" aria-label={`${totalModules} modules`}>{totalModules}</div>
            <div className="stat-label" aria-hidden="true">Modules</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" aria-label={`${completedCount} completions`}>{completedCount}</div>
            <div className="stat-label" aria-hidden="true">Completions</div>
          </div>
        </div>

        {/* Create Module */}
        <div className="card">
          <h3 id="create-module-heading">Create New Module</h3>
          <div role="group" aria-labelledby="create-module-heading">
            <label htmlFor="new-module-name" className="form-label">Module name</label>
            <input
              id="new-module-name"
              placeholder="e.g. Safety Training"
              value={newModule.module_name}
              onChange={(e) => setNewModule({ ...newModule, module_name: e.target.value })}
            />
            <label htmlFor="new-module-version" className="form-label">Version</label>
            <input
              id="new-module-version"
              placeholder="e.g. 1.0"
              value={newModule.version}
              onChange={(e) => setNewModule({ ...newModule, version: e.target.value })}
            />
            <label htmlFor="new-module-desc" className="form-label">Description (optional)</label>
            <textarea
              id="new-module-desc"
              placeholder="Brief description of this module"
              value={newModule.description}
              onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
            />
            <button className="primary-btn" onClick={createModule}>
              + Create Module
            </button>
          </div>
        </div>

        {/* Upload Module File */}
        <div className="card">
          <h3 id="upload-module-heading">Upload Module File</h3>
          <div role="group" aria-labelledby="upload-module-heading">
            <label htmlFor="upload-module-select" className="form-label">Select module</label>
            <select
              id="upload-module-select"
              value={selectedFileModule}
              onChange={(e) => setSelectedFileModule(e.target.value)}
            >
              <option value="">— Choose a module —</option>
              {modules.map((m) => (
                <option key={m.module_id} value={m.module_id}>
                  {m.module_name}
                </option>
              ))}
            </select>
            <label htmlFor="upload-file-input" className="form-label">Module file (.zip)</label>
            <input
              id="upload-file-input"
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              aria-describedby={uploadProgress > 0 ? "upload-progress-status" : undefined}
            />
            <button className="primary-btn" onClick={uploadFile}>
              Upload
            </button>
            {uploadProgress > 0 && (
              <div className="upload-progress-wrap">
                <div
                  className="progress-track"
                  style={{ marginTop: 8 }}
                  role="progressbar"
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`Upload progress: ${uploadProgress}%`}
                >
                  <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
                </div>
                <span
                  id="upload-progress-status"
                  style={{ marginTop: 4, display: "block" }}
                  aria-live="polite"
                >
                  {uploadProgress}%
                </span>
              </div>
            )}
          </div>
        </div>

        {/* User Progress */}
        <h2 className="section-heading" id="user-progress-heading">User Training Progress</h2>

        {users.length === 0 && (
          <div className="empty-state" role="status">
            <div className="empty-state-icon" aria-hidden="true">👥</div>
            No users found
          </div>
        )}

        <section aria-labelledby="user-progress-heading">
          {users.map((user) => (
            <article key={user.user_id} className="user-card" aria-label={`Training progress for ${displayName(user)}`}>
              <div className="user-card-header">
                <div className="user-avatar" aria-hidden="true">
                  {(user.first_name || user.username).slice(0, 2).toUpperCase()}
                </div>
                <div className="user-info">
                  <div className="user-name">{displayName(user)}</div>
                  <div className="user-meta">
                    @{user.username} ·{" "}
                    {user.modules.length === 0
                      ? "No modules assigned"
                      : `${user.modules.length} module${user.modules.length > 1 ? "s" : ""} assigned`}
                  </div>
                </div>
                <span
                  className={`badge ${
                    user.modules.some((m) => m.status === "Completed")
                      ? "badge-success"
                      : user.modules.some((m) => m.progress_pct > 0)
                      ? "badge-info"
                      : "badge-muted"
                  }`}
                  aria-label={`Overall status: ${
                    user.modules.some((m) => m.status === "Completed")
                      ? "Has completions"
                      : user.modules.some((m) => m.progress_pct > 0)
                      ? "In Progress"
                      : "Not Started"
                  }`}
                >
                  {user.modules.some((m) => m.status === "Completed")
                    ? "✓ Has Completions"
                    : user.modules.some((m) => m.progress_pct > 0)
                    ? "In Progress"
                    : "Not Started"}
                </span>
              </div>

              <div className="user-card-body">
                {user.modules.length === 0 ? (
                  <p className="text-muted">No modules assigned yet.</p>
                ) : (
                  user.modules.map((m) => (
                    <div key={m.module_id} className="module-progress-row">
                      <span className="module-progress-name">{m.module_name}</span>
                      <div className="module-progress-bar-wrap">
                        <ProgressBar
                          pct={m.progress_pct}
                          complete={m.status === "Completed"}
                          label={m.module_name}
                        />
                      </div>
                      <span className="module-progress-pct" aria-hidden="true">{m.progress_pct}%</span>
                      <span
                        className={`badge badge-sm ${
                          m.status === "Completed"
                            ? "badge-success"
                            : m.progress_pct > 0
                            ? "badge-info"
                            : "badge-muted"
                        }`}
                        style={{ fontSize: 11, padding: "2px 8px" }}
                      >
                        {m.status}
                      </span>
                    </div>
                  ))
                )}
              </div>

              <div className="user-card-footer">
                <label htmlFor={`assign-module-${user.user_id}`} className="sr-only">
                  Assign module to {displayName(user)}
                </label>
                <select
                  id={`assign-module-${user.user_id}`}
                  onChange={(e) =>
                    setSelectedModule({ ...selectedModule, [user.user_id]: e.target.value })
                  }
                  defaultValue=""
                >
                  <option value="">Assign a module…</option>
                  {modules.map((m) => (
                    <option key={m.module_id} value={m.module_id}>
                      {m.module_name}
                    </option>
                  ))}
                </select>
                <button
                  className="primary-btn btn-sm"
                  onClick={() => assignModule(user.user_id)}
                  aria-label={`Assign selected module to ${displayName(user)}`}
                >
                  Assign
                </button>
              </div>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}