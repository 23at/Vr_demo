import { useEffect, useState } from "react";
import api from "../services/api";

export default function Dashboard() {
  const [modules, setModules] = useState([]);
  const [user, setUser] = useState("");

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
    const res = await api.get("/users/me/");
    setUser(res.data.username);
  };

  // LAUNCH
  const launchVR = async (module) => {
    try {
      const res = await api.post("/launch-module", {
        module_id: module.module_id,
      });

      const data = res.data;

      const token = localStorage.getItem("access_token");
      const url = `vrlauncher://launch?module=${encodeURIComponent(
        module.module_id
      )}&session=${encodeURIComponent(
        data.session_token
      )}&scenario=${encodeURIComponent(
        data.scenario_id
      )}&token=${encodeURIComponent(token)}`;

      window.location.href = url;
    } catch (err) {
      console.error(err);
      alert("Failed to launch module");
    }
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <h2 className="sidebar-title">V-TRAIN</h2>
        <a className="sidebar-link" href="/dashboard">Dashboard</a>
        <a className="sidebar-link" href="/download-launcher">Download Launcher</a>
      </div>

      {/* Main */}
      <div className="main-content">
        <h1>Welcome, {user}</h1>

        {modules.length === 0 && <p>No modules assigned</p>}

        {modules.map((mod) => (
          <div key={mod.module_id} className="card">
            <h3>{mod.module_name}</h3>
            <p>Version: {mod.version}</p>

            <button
              className="primary-btn"
              onClick={() => launchVR(mod)}
            >
              Launch Training
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}