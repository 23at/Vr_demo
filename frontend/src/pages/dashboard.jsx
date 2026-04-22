import { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const [modules, setModules] = useState([]);
  const [user, setUser] = useState("");

  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/");
  };

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
    try {
      const res = await api.get("/users/me"); // backend endpoint that returns logged-in user
      setUser(res.data.username);
    } catch (err) {
      console.error("Could not load user");
    }
  };

const launchVR = async (module) => {

  const jwt = localStorage.getItem("access_token");

  alert(jwt);
  try {
    // 1. Call backend to create session
    console.log("Launching module:", module);
    const res = await api.post("/launch-module", {
    module_id: module.module_id,
   });

    const data = res.data;
   

    // 2. Extract session info
    const sessionToken = data.session_token;
    const scenarioId = data.scenario_id;
    
    // 3. Launch VR launcher via custom protocol
    const url = `vrlauncher://launch?module=${encodeURIComponent(
      module.module_id
    )}&session=${encodeURIComponent(sessionToken)}&scenario=${encodeURIComponent(
      scenarioId
    )}&token=${encodeURIComponent(jwt)}`;

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
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>


      {/* Main */}
      <div className="main-content">
        <h1>Welcome, {user}</h1>

        {modules.length === 0 && <p>No modules assigned</p>}

        {modules.map((mod) => (
          <div key={mod.module_id} className="card">
          <h3>{mod.module_name}</h3>
          <p>Version: {mod.version}</p>

          <div className="progress-section">
            <div className="progress-label">
              <span>Progress</span>
              <span className={mod.status === "COMPLETED" ? "status complete" : "status incomplete"}>
                {mod.status === "COMPLETED" ? "Complete" : `${mod.progress_pct}%`}
              </span>
            </div>
            <div className="progress-bar-track">
              <div
                className="progress-bar-fill"
                style={{ width: `${mod.progress_pct}%` }}
              />
            </div>
          </div>

          <button className="primary-btn" onClick={() => launchVR(mod)}>
            Launch Training
          </button>
        </div>
        ))}
      </div>
    </div>
  );
}