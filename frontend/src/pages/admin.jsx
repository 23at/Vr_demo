import { useEffect, useState } from "react";
import api from "../services/api";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState({});

  useEffect(() => {
    loadUsers();
    loadModules();
  }, []);

  const loadUsers = async () => {
    const res = await api.get("/admin/users");
    setUsers(res.data);
  };

  const loadModules = async () => {
    const res = await api.get("/modules");
    setModules(res.data);
  };

  const assignModule = async (userId) => {
    const moduleId = selectedModule[userId];
    if (!moduleId) return alert("Select a module");

    await api.post("/admin/assign", null, {
      params: { user_id: userId, module_id: moduleId },
    });

    loadUsers();
  };

  return (
    <div className="app-layout">

      {/* Main */}
      <div className="main-content">
        <h1>Admin Dashboard</h1>

        {users.length === 0 && <p>No users found</p>}

        {users.map((user) => (
          <div key={user.user_id} className="card">
            <h3>{user.username}</h3>

            <p><strong>Modules:</strong></p>

            {user.modules.length === 0 && <p>No modules assigned</p>}

            {user.modules.map((m) => (
              <div key={m.module_id}>
                {m.module_name}
                <span className="status-text"> — In Progress</span>
              </div>
            ))}

            <select
              className="dropdown"
              onChange={(e) =>
                setSelectedModule({
                  ...selectedModule,
                  [user.user_id]: e.target.value,
                })
              }
            >
              <option value="">Select Module</option>
              {modules.map((m) => (
                <option key={m.module_id} value={m.module_id}>
                  {m.module_name}
                </option>
              ))}
            </select>

            <button
              className="primary-btn"
              onClick={() => assignModule(user.user_id)}
            >
              Assign
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}