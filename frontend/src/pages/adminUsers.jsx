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
      <a className="sidebar-link" href="/admin"><span className="link-icon">🏠</span> Dashboard</a>
      <a className="sidebar-link active" href="/admin/users"><span className="link-icon">👥</span> User Management</a>
      <a className="sidebar-link" href="/admin/modules"><span className="link-icon">📦</span> Module Management</a>
      <span className="sidebar-section-label">System</span>
      <a className="sidebar-link" href="/download-launcher"><span className="link-icon">⬇️</span> Download Launcher</a>
      <div className="sidebar-spacer" />
      <button className="logout-btn" onClick={onLogout}><span>🚪</span> Logout</button>
    </div>
  );
}

const emptyNew = { username: "", email: "", password: "", role: "USER", first_name: "", last_name: "" };

// Prefer "First Last" over username when available
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
      // Only send fields that have actual values
      const payload = {};
      if (data.username)   payload.username   = data.username;
      if (data.email)      payload.email      = data.email;
      if (data.first_name !== undefined) payload.first_name = data.first_name || null;
      if (data.last_name !== undefined)  payload.last_name  = data.last_name || null;
      if (data.password)   payload.password   = data.password;

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
        username: user.username,
        email: user.email || "",
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        password: "",
      },
    }));

  const cancelEdit = (userId) =>
    setEditUser((prev) => { const n = { ...prev }; delete n[userId]; return n; });

  const setField = (userId, field, value) =>
    setEditUser((prev) => ({ ...prev, [userId]: { ...prev[userId], [field]: value } }));

  return (
    <div className="app-layout">
      <Sidebar onLogout={handleLogout} />

      <div className="main-content">
        <div className="page-header">
          <h1>User Management</h1>
          <p>Create, edit, and manage trainee accounts.</p>
        </div>

        {/* ── Create User ── */}
        <div className="card">
          <h3>Create New User</h3>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
            <div>
              <label className="form-label">First Name</label>
              <input
                placeholder="First name"
                value={newUser.first_name}
                onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
              />
            </div>
            <div>
              <label className="form-label">Last Name</label>
              <input
                placeholder="Last name"
                value={newUser.last_name}
                onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
              />
            </div>
          </div>

          <label className="form-label">Username</label>
          <input
            placeholder="Username"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
          />
          <label className="form-label">Email</label>
          <input
            placeholder="Email address"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          />
          <label className="form-label">Password</label>
          <input
            type="password"
            placeholder="Password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          />
          <label className="form-label">Role</label>
          <select
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          >
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>

          <button className="primary-btn" onClick={createUser}>+ Create User</button>
        </div>

        {/* ── User List ── */}
        <p className="section-heading">All Users ({users.length})</p>

        {users.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            No users found
          </div>
        )}

        {users.map((user) => {
          const isEditing = !!editUser[user.user_id];
          const cur = editUser[user.user_id] || {};

          return (
            <div key={user.user_id} className="user-card">
              {/* Header — shows full name when available */}
              <div className="user-card-header">
                <div className="user-avatar">
                  {(user.first_name || user.username).slice(0, 2).toUpperCase()}
                </div>
                <div className="user-info">
                  <div className="user-name">{displayName(user)}</div>
                  <div className="user-meta">@{user.username} · ID #{user.user_id}</div>
                </div>
              </div>

              {/* Edit form — only shown when editing */}
              {isEditing && (
                <div className="user-card-body">
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 12px" }}>
                    <div>
                      <label className="form-label">First Name</label>
                      <input
                        value={cur.first_name}
                        placeholder="First name"
                        onChange={(e) => setField(user.user_id, "first_name", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="form-label">Last Name</label>
                      <input
                        value={cur.last_name}
                        placeholder="Last name"
                        onChange={(e) => setField(user.user_id, "last_name", e.target.value)}
                      />
                    </div>
                  </div>
                  <label className="form-label">Username</label>
                  <input
                    value={cur.username}
                    placeholder="Username"
                    onChange={(e) => setField(user.user_id, "username", e.target.value)}
                  />
                  <label className="form-label">Email</label>
                  <input
                    value={cur.email}
                    placeholder="Email"
                    onChange={(e) => setField(user.user_id, "email", e.target.value)}
                  />
                  <label className="form-label">New Password</label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep current"
                    value={cur.password}
                    onChange={(e) => setField(user.user_id, "password", e.target.value)}
                  />
                </div>
              )}

              {/* Footer buttons */}
              <div className="user-card-footer">
                {isEditing ? (
                  <>
                    <button className="primary-btn btn-sm" onClick={() => updateUser(user.user_id)}>
                      Save Changes
                    </button>
                    <button className="primary-btn btn-sm btn-secondary" onClick={() => cancelEdit(user.user_id)}>
                      Cancel
                    </button>
                    <button className="primary-btn btn-sm btn-danger" onClick={() => deleteUser(user.user_id)}>
                      Delete
                    </button>
                  </>
                ) : (
                  <button className="primary-btn btn-sm btn-secondary" onClick={() => startEdit(user)}>
                    Edit
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}