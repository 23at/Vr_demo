import { useEffect, useState } from "react";
import api from "../services/api";

export default function Dashboard() {
  const [modules, setModules] = useState([]);

  useEffect(() => {
    api.get("/modules")
      .then(res => setModules(res.data))
      .catch(() => alert("Not authorized"));
  }, []);

  return (
    <div>
      <h2>Available Training Modules</h2>
      {modules.map((m) => (
        <div key={m.id}>
          <h3>{m.title}</h3>
          <p>{m.description}</p>
        </div>
      ))}
    </div>
  );
}
