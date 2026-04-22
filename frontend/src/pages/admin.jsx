import { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

function Sidebar({ onLogout }) {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⚡</div>
        <h2 className="sidebar-title">V-TRAIN</h2>
      </div>
      <span className="sidebar-section-label">Admin</span>
      <a className="sidebar-link" href="/admin">
        <span className="link-icon">🏠</span> Dashboard
      </a>
      <a className="sidebar-link" href="/admin/users">
        <span className="link-icon">👥</span> User Management
      </a>
      <a className="sidebar-link" href="/admin/modules">
        <span className="link-icon">📦</span> Module Management
      </a>
      <span className="sidebar-section-label">System</span>
      <a className="sidebar-link" href="/download-launcher">
        <span className="link-icon">⬇️</span> Download Launcher
      </a>
      <div className="sidebar-spacer" />
      <button className="logout-btn" onClick={onLogout}>
        <span>🚪</span> Logout
      </button>
    </div>
  );
}

function ProgressBar({ pct, complete }) {
  return (
    <div className="progress-track" style={{ margin: 0 }}>
      <div
        className={`progress-fill${complete ? " complete" : ""}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
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

      <div className="main-content">
        <div className="page-header">
          <h1>Admin Dashboard</h1>
          <p>Manage users, modules, and track training progress.</p>
        </div>

        {/* Stats */}
        <div className="stats-row">
          <div className="stat-card">
            <div className="stat-value">{totalUsers}</div>
            <div className="stat-label">Total Users</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{totalModules}</div>
            <div className="stat-label">Modules</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{completedCount}</div>
            <div className="stat-label">Completions</div>
          </div>
        </div>

        {/* Create Module */}
        <div className="card">
          <h3>Create New Module</h3>
          <input
            placeholder="Module name"
            value={newModule.module_name}
            onChange={(e) => setNewModule({ ...newModule, module_name: e.target.value })}
          />
          <input
            placeholder="Version (e.g. 1.0)"
            value={newModule.version}
            onChange={(e) => setNewModule({ ...newModule, version: e.target.value })}
          />
          <textarea
            placeholder="Description (optional)"
            value={newModule.description}
            onChange={(e) => setNewModule({ ...newModule, description: e.target.value })}
          />
          <button className="primary-btn" onClick={createModule}>
            + Create Module
          </button>
        </div>

        {/* Upload Module File */}
        <div className="card">
          <h3>Upload Module File</h3>
          <select
            value={selectedFileModule}
            onChange={(e) => setSelectedFileModule(e.target.value)}
          >
            <option value="">Select a module…</option>
            {modules.map((m) => (
              <option key={m.module_id} value={m.module_id}>
                {m.module_name}
              </option>
            ))}
          </select>
          <input type="file" onChange={(e) => setFile(e.target.files[0])} />
          <button className="primary-btn" onClick={uploadFile}>
            Upload
          </button>
          {uploadProgress > 0 && (
            <div className="upload-progress-wrap">
              <div className="progress-track" style={{ marginTop: 8 }}>
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
              <span style={{ marginTop: 4, display: "block" }}>{uploadProgress}%</span>
            </div>
          )}
        </div>

        {/* User Progress */}
        <p className="section-heading">User Training Progress</p>

        {users.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            No users found
          </div>
        )}

        {users.map((user) => (
          <div key={user.user_id} className="user-card">
            <div className="user-card-header">
              <div className="user-avatar">
                {user.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="user-info">
                <div className="user-name">{user.username}</div>
                <div className="user-meta">
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
                      <ProgressBar pct={m.progress_pct} complete={m.status === "Completed"} />
                    </div>
                    <span className="module-progress-pct">{m.progress_pct}%</span>
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
              <select
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
              >
                Assign
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}