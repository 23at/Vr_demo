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
    const res = await api.get("/modules/");
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
    <div style={{ padding: "40px" }}>
      <h1>Admin Dashboard</h1>

      <div style={{ marginTop: "30px" }}>
        {users.map((user) => (
          <div
            key={user.user_id}
            style={{
              border: "1px solid #ccc",
              padding: "15px",
              marginBottom: "15px",
              borderRadius: "8px",
            }}
          >
            <h3>{user.username}</h3>

            <p><strong>Assigned Modules:</strong></p>
            {user.modules.length === 0 && <p>No modules assigned</p>}
            {user.modules.map((m) => (
              <div key={m.module_id}>{m.module_name}</div>
            ))}

            <div style={{ marginTop: "10px" }}>
              <select
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
                onClick={() => assignModule(user.user_id)}
                style={{ marginLeft: "10px" }}
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