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
      <a className="sidebar-link" href="/admin">
        <span className="link-icon" aria-hidden="true">🏠</span> Dashboard
      </a>
      <a className="sidebar-link active" href="/admin/users" aria-current="page">
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

const emptyNew = { username: "", email: "", password: "", role: "USER", first_name: "", last_name: "" };

function displayName(user) {
  const full = [user.first_name, user.last_name].filter(Boolean).join(" ");
  return full || user.username;
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState(emptyNew);
  const [editUser, setEditUser] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "User Management — V-TRAIN";
    if (!localStorage.getItem("access_token")) navigate("/");
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const res = await api.get("/admin/users");
    setUsers(res.data);
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/");
  };

  const createUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password)
      return alert("Username, email, and password are required");
    try {
      await api.post("/auth/register", newUser);
      setNewUser(emptyNew);
      loadUsers();
    } catch {
      alert("Failed to create user");
    }
  };

  const updateUser = async (userId) => {
    const data = editUser[userId];
    if (!data) return;
    try {
      const payload = {};
      if (data.username)                 payload.username   = data.username;
      if (data.email)                    payload.email      = data.email;
      if (data.first_name !== undefined) payload.first_name = data.first_name || null;
      if (data.last_name !== undefined)  payload.last_name  = data.last_name  || null;
      if (data.password)                 payload.password   = data.password;

      await api.put(`/admin/users/${userId}`, payload);
      alert("User updated!");
      setEditUser((prev) => { const n = { ...prev }; delete n[userId]; return n; });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update user");
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    try {
      await api.delete(`/admin/users/${userId}`);
      loadUsers();
    } catch {
      alert("Failed to delete user");
    }
  };

  const startEdit = (user) =>
    setEditUser((prev) => ({
      ...prev,
      [user.user_id]: {
        username:   user.username,
        email:      user.email      || "",
        first_name: user.first_name || "",
        last_name:  user.last_name  || "",
        password:   "",
      },
    }));

  const cancelEdit = (userId) =>
    setEditUser((prev) => { const n = { ...prev }; delete n[userId]; return n; });

  const setField = (userId, field, value) =>
    setEditUser((prev) => ({ ...prev, [userId]: { ...prev[userId], [field]: value } }));

  return (
    <div className="app-layout">
      <Sidebar onLogout={handleLogout} />

      <main className="main-content" id="main-content">
        <div className="page-header">
          <h1>User Management</h1>
          <p>Create, edit, and manage trainee accounts.</p>
        </div>

        {/* ── Create User ── */}
        <div className="card">
          <h2 id="create-user-heading" style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>
            Create New User
          </h2>
          <div role="group" aria-labelledby="create-user-heading">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
              <div>
                <label htmlFor="new-first-name" className="form-label">First Name</label>
                <input
                  id="new-first-name"
                  placeholder="First name"
                  value={newUser.first_name}
                  onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                />
              </div>
              <div>
                <label htmlFor="new-last-name" className="form-label">Last Name</label>
                <input
                  id="new-last-name"
                  placeholder="Last name"
                  value={newUser.last_name}
                  onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                />
              </div>
            </div>

            <label htmlFor="new-username" className="form-label">Username</label>
            <input
              id="new-username"
              placeholder="e.g. jsmith"
              value={newUser.username}
              onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
              autoComplete="username"
            />

            <label htmlFor="new-email" className="form-label">Email</label>
            <input
              id="new-email"
              type="email"
              placeholder="e.g. j.smith@company.com"
              value={newUser.email}
              onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              autoComplete="email"
            />

            <label htmlFor="new-password" className="form-label">Password</label>
            <input
              id="new-password"
              type="password"
              placeholder="Set initial password"
              value={newUser.password}
              onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              autoComplete="new-password"
            />

            <label htmlFor="new-role" className="form-label">Role</label>
            <select
              id="new-role"
              value={newUser.role}
              onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            >
              <option value="USER">User</option>
              <option value="ADMIN">Admin</option>
            </select>

            <button className="primary-btn" onClick={createUser}>+ Create User</button>
          </div>
        </div>

        {/* ── User List ── */}
        <h2 className="section-heading" id="user-list-heading">
          All Users ({users.length})
        </h2>

        {users.length === 0 && (
          <div className="empty-state" role="status">
            <div className="empty-state-icon" aria-hidden="true">👥</div>
            No users found
          </div>
        )}

        <section aria-labelledby="user-list-heading">
          {users.map((user) => {
            const isEditing = !!editUser[user.user_id];
            const cur = editUser[user.user_id] || {};
            const uid = user.user_id;

            return (
              <article key={uid} className="user-card" aria-label={`User: ${displayName(user)}`}>
                <div className="user-card-header">
                  <div className="user-avatar" aria-hidden="true">
                    {(user.first_name || user.username).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="user-info">
                    <div className="user-name">{displayName(user)}</div>
                    <div className="user-meta">@{user.username} · ID #{uid}</div>
                  </div>
                </div>

                {isEditing && (
                  <div className="user-card-body">
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                      <div>
                        <label htmlFor={`edit-fn-${uid}`} className="form-label">First Name</label>
                        <input
                          id={`edit-fn-${uid}`}
                          value={cur.first_name}
                          placeholder="First name"
                          onChange={(e) => setField(uid, "first_name", e.target.value)}
                        />
                      </div>
                      <div>
                        <label htmlFor={`edit-ln-${uid}`} className="form-label">Last Name</label>
                        <input
                          id={`edit-ln-${uid}`}
                          value={cur.last_name}
                          placeholder="Last name"
                          onChange={(e) => setField(uid, "last_name", e.target.value)}
                        />
                      </div>
                    </div>

                    <label htmlFor={`edit-un-${uid}`} className="form-label">Username</label>
                    <input
                      id={`edit-un-${uid}`}
                      value={cur.username}
                      placeholder="Username"
                      onChange={(e) => setField(uid, "username", e.target.value)}
                    />

                    <label htmlFor={`edit-em-${uid}`} className="form-label">Email</label>
                    <input
                      id={`edit-em-${uid}`}
                      type="email"
                      value={cur.email}
                      placeholder="Email"
                      onChange={(e) => setField(uid, "email", e.target.value)}
                    />

                    <label htmlFor={`edit-pw-${uid}`} className="form-label">New Password</label>
                    <input
                      id={`edit-pw-${uid}`}
                      type="password"
                      placeholder="Leave blank to keep current"
                      value={cur.password}
                      onChange={(e) => setField(uid, "password", e.target.value)}
                      autoComplete="new-password"
                    />
                  </div>
                )}

                <div className="user-card-footer">
                  {isEditing ? (
                    <>
                      <button
                        className="primary-btn btn-sm"
                        onClick={() => updateUser(uid)}
                        aria-label={`Save changes for ${displayName(user)}`}
                      >
                        Save Changes
                      </button>
                      <button
                        className="primary-btn btn-sm btn-secondary"
                        onClick={() => cancelEdit(uid)}
                        aria-label={`Cancel editing ${displayName(user)}`}
                      >
                        Cancel
                      </button>
                      <button
                        className="primary-btn btn-sm btn-danger"
                        onClick={() => deleteUser(uid)}
                        aria-label={`Delete user ${displayName(user)}`}
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <button
                      className="primary-btn btn-sm btn-secondary"
                      onClick={() => startEdit(user)}
                      aria-label={`Edit ${displayName(user)}`}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}