import { useEffect, useState } from "react";
import api from "../services/api";

export default function Dashboard() {
/*const [modules, setModules] = useState([]);*activate when backend is ready*/
  const [modules, setModules] = useState([
  { id: 1, title: "Railcar Inspection", completed: false },
  { id: 2, title: "Loading", completed: true },
  { id: 3, title: "Post-Load", completed: true }
]);
  const [user, setUser] = useState("");

  useEffect(() => {
  //loadModules(); disabled for UI testing//
 // loadUser();
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
      const res = await api.get("/me"); // backend endpoint that returns logged-in user
      setUser(res.data.username);
    } catch (err) {
      console.error("Could not load user");
    }
  };

  const launchVR = (module) => {
    const sessionUrl = `https://your-vr-host.com/module/${module.id}`;
    const encoded = encodeURIComponent(sessionUrl);

    window.location.href =
      `https://www.oculus.com/open_url/?url=${encoded}`;
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