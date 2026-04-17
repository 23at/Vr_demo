import { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "USER",
  });
  const [editUser, setEditUser] = useState({});

  const navigate = useNavigate();

  useEffect(() => {
    loadUsers();

    const token = localStorage.getItem("access_token");
    if (!token) navigate("/");
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
    await api.post("/auth/register", newUser);
    setNewUser({ username: "", email: "", password: "", role: "USER" });
    loadUsers();
  };

  const updateUser = async (userId) => {
  const data = editUser[userId];

  await api.put(`/admin/users/${userId}`, null, {
    params: {
      username: data.username,
      email: data.email,
      password: data.password,
      role: data.role,
    },
  });

  alert("User updated!");
  loadUsers();
};

  const deleteUser = async (userId) => {
    if (!window.confirm("Delete this user?")) return;
    await api.delete(`/admin/users/${userId}`);
    loadUsers();
  };

  return (
    <div className="app-layout">

      {/* Sidebar */}
      <div className="sidebar">
        <h2 className="sidebar-title">V-TRAIN</h2>
        <a className="sidebar-link" href="/admin">Admin Dashboard</a>
        <a className="sidebar-link" href="/admin/users">User Management</a>
        <a className="sidebar-link" href="/admin/modules">Module Management</a>
        <a className="sidebar-link" href="/download-launcher">Download Launcher</a>
        <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
      </div>

      {/* Main */}
      <div className="main-content">

    
        <h1>User Management</h1>

        {/* CREATE USER */}
        <div className="card">
          <h3>Create User</h3>

          <input placeholder="Username"
            value={newUser.username}
            onChange={(e) =>
              setNewUser({ ...newUser, username: e.target.value })
            }
          />

          <input placeholder="Email"
            value={newUser.email}
            onChange={(e) =>
              setNewUser({ ...newUser, email: e.target.value })
            }
          />

          <input type="password" placeholder="Password"
            onChange={(e) =>
              setNewUser({ ...newUser, password: e.target.value })
            }
          />

          <select
            value={newUser.role}
            onChange={(e) =>
              setNewUser({ ...newUser, role: e.target.value })
            }
          >
            <option value="USER">User</option>
            <option value="ADMIN">Admin</option>
          </select>

          <button className="primary-btn" onClick={createUser}>
            Create User
          </button>
        </div>

        {/* USER LIST */}
        {users.map((user) => {
  const current = editUser[user.user_id] || user;

  return (
    <div key={user.user_id} className="card">
      <h3>User #{user.user_id}</h3>

      {/* Username */}
      <input
        value={current.username || ""}
        onChange={(e) =>
          setEditUser({
            ...editUser,
            [user.user_id]: {
              ...current,
              username: e.target.value,
            },
          })
        }
        placeholder="Username"
      />

      {/* Email */}
      <input
        value={current.email || ""}
        onChange={(e) =>
          setEditUser({
            ...editUser,
            [user.user_id]: {
              ...current,
              email: e.target.value,
            },
          })
        }
        placeholder="Email"
      />

      {/* Password */}
      <input
        type="password"
        placeholder="New Password"
        onChange={(e) =>
          setEditUser({
            ...editUser,
            [user.user_id]: {
              ...current,
              password: e.target.value,
            },
          })
        }
      />

      {/* Role */}
      <select
        value={current.role || "USER"}
        onChange={(e) =>
          setEditUser({
            ...editUser,
            [user.user_id]: {
              ...current,
              role: e.target.value,
            },
          })
        }
      >
        <option value="USER">User</option>
        <option value="ADMIN">Admin</option>
      </select>

      {/* Buttons */}
      <div style={{ marginTop: "10px" }}>
        <button
          className="primary-btn"
          onClick={() => updateUser(user.user_id)}
        >
          Save Changes
        </button>

        <button
          className="primary-btn"
          style={{ marginLeft: "10px" }}
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