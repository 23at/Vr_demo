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

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({ username: "", email: "", password: "", role: "USER" });
  const [editUser, setEditUser] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();
    if (!localStorage.getItem("access_token")) navigate("/");
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
      return alert("All fields are required");
    try {
      await api.post("/auth/register", newUser);
      setNewUser({ username: "", email: "", password: "", role: "USER" });
      loadUsers();
    } catch {
      alert("Failed to create user");
    }
  };

  const updateUser = async (userId) => {
    const data = editUser[userId];
    await api.put(`/admin/users/${userId}`, null, {
      params: { username: data.username, email: data.email, password: data.password, role: data.role },
    });
    alert("User updated!");
    loadUsers();
  };

  const deleteUser = async (userId) => {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    await api.delete(`/admin/users/${userId}`);
    loadUsers();
  };

  return (
    <div className="app-layout">
      <Sidebar onLogout={handleLogout} />

      <div className="main-content">
        <div className="page-header">
          <h1>User Management</h1>
          <p>Create, edit, and manage trainee accounts.</p>
        </div>

        {/* Create User */}
        <div className="card">
          <h3>Create New User</h3>
          <input
            placeholder="Username"
            value={newUser.username}
            onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
          />
          <input
            placeholder="Email address"
            value={newUser.email}
            onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
          />
          <input
            type="password"
            placeholder="Password"
            value={newUser.password}
            onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          />
          <select
            value={newUser.role}
            onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          >
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>
          <button className="primary-btn" onClick={createUser}>+ Create User</button>
        </div>

        {/* User List */}
        <p className="section-heading">All Users ({users.length})</p>

        {users.length === 0 && (
          <div className="empty-state">
            <div className="empty-state-icon">👥</div>
            No users found
          </div>
        )}

        {users.map((user) => {
          const current = editUser[user.user_id] || user;
          return (
            <div key={user.user_id} className="user-card">
              <div className="user-card-header">
                <div className="user-avatar">{user.username.slice(0, 2).toUpperCase()}</div>
                <div className="user-info">
                  <div className="user-name">{user.username}</div>
                  <div className="user-meta">ID #{user.user_id}</div>
                </div>
              </div>
              <div className="user-card-body">
                <input
                  value={current.username || ""}
                  placeholder="Username"
                  onChange={(e) =>
                    setEditUser({ ...editUser, [user.user_id]: { ...current, username: e.target.value } })
                  }
                />
                <input
                  value={current.email || ""}
                  placeholder="Email"
                  onChange={(e) =>
                    setEditUser({ ...editUser, [user.user_id]: { ...current, email: e.target.value } })
                  }
                />
                <input
                  type="password"
                  placeholder="New password (leave blank to keep)"
                  onChange={(e) =>
                    setEditUser({ ...editUser, [user.user_id]: { ...current, password: e.target.value } })
                  }
                />
                <select
                  value={current.role || "USER"}
                  onChange={(e) =>
                    setEditUser({ ...editUser, [user.user_id]: { ...current, role: e.target.value } })
                  }
                >
                  <option value="USER">User</option>
                  <option value="ADMIN">Admin</option>
                </select>
              </div>
              <div className="user-card-footer">
                <button className="primary-btn btn-sm" onClick={() => updateUser(user.user_id)}>
                  Save Changes
                </button>
                <button
                  className="primary-btn btn-sm btn-danger"
                  onClick={() => deleteUser(user.user_id)}
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}