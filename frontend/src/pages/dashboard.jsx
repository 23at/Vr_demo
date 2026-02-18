import { useEffect, useState } from "react";
import api from "../services/api";

export default function Dashboard() {
  const [modules, setModules] = useState([]);

  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      const res = await api.get("/modules");
      setModules(res.data);
    } catch (err) {
      alert("You must be logged in.");
    }
  };

  const launchVR = (module) => {
    // Replace with actual WebXR URL when ready
    const sessionUrl = `https://your-vr-host.com/module/${module.id}`;
    const encoded = encodeURIComponent(sessionUrl);

    window.location.href =
      `https://www.oculus.com/open_url/?url=${encoded}`;
  };

  return (
    <div>
      <h2>Training Modules</h2>

      {modules.map((mod) => (
        <div key={mod.id}>
          <h3>{mod.title}</h3>
          <p>{mod.description}</p>

          <button onClick={() => launchVR(mod)}>
            Launch in VR
          </button>
        </div>
      ))}
    </div>
  );
}
