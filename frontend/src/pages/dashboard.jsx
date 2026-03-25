import { useEffect, useState } from "react";
import api from "../services/api";

export default function Dashboard() {
/*const [modules, setModules] = useState([]);*activate when backend is ready*/
  const [modules, setModules] = useState([
  { module_id: "c83feb26-d623-443f-8090-f2b1ff67ad68", title: "Safety", completed: false },
  { module_id: "d92a7b1e-a1b7-4cd4-9a33-6e9f4b2b6a2c", title: "Loading", completed: true },
  { module_id: "f6b5c8e1-8a4a-47d8-9cfd-123456789abc", title: "Post-Load", completed: true }
]);
  const [user, setUser] = useState("");

  useEffect(() => {
  loadModules();
  loadUser();
  }, []);

  const loadModules = async () => {
    try {
      const res = await api.get("/modules");
      setModules(res.data);
    } catch (err) {
      alert("You must be logged in.");
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
    console.error("VR launch failed:", err);
    alert("Failed to launch VR module");
  }
};

  

  return (
    <div className="dashboard-page">

      {/* Header */}
      <div className="dashboard-header">
        <div className="home-icon">🏠</div>
        <h1 className="dashboard-title">VTRAIN</h1>
        <div className="user-id">User: {user}</div>
      </div>

      {/* Module List */}
      <div className="module-list">
        {modules.map((mod) => (
          <div key={mod.id} className="module-row">

            {/* WebXR Launch Link */}
            <div
              className="module-link"
              onClick={() => launchVR(mod)}
            >
              VR Training #{mod.id}
            </div>

            {/* Module Name */}
            <div className="module-name">
              {mod.title}
            </div>

            {/* Completion Status */}
            <div
              className={
                mod.completed
                  ? "status complete"
                  : "status incomplete"
              }
            >
              {mod.completed ? "Complete" : "Incomplete"}
            </div>

          </div>
        ))}
      </div>

    </div>
  );
}