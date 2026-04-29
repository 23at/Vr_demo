import { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

function Sidebar({ onLogout }) {
  return (
    <nav className="sidebar" aria-label="Admin navigation">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon" aria-hidden="true">⚡</div>
        <h2 className="sidebar-title">V-TRAIN</h2>
      </div>
      <span className="sidebar-section-label" aria-hidden="true">Admin</span>
      <a className="sidebar-link" href="/admin">
        <span className="link-icon" aria-hidden="true">🏠</span> Dashboard
      </a>
      <a className="sidebar-link" href="/admin/users">
        <span className="link-icon" aria-hidden="true">👥</span> User Management
      </a>
      <a className="sidebar-link active" href="/admin/modules" aria-current="page">
        <span className="link-icon" aria-hidden="true">📦</span> Module Management
      </a>
      <span className="sidebar-section-label" aria-hidden="true">System</span>
      <a className="sidebar-link" href="/download-launcher">
        <span className="link-icon" aria-hidden="true">⬇️</span> Download Launcher
      </a>
      <div className="sidebar-spacer" />
      <button className="logout-btn" onClick={onLogout} aria-label="Logout">
        <span aria-hidden="true">🚪</span> Logout
      </button>
    </nav>
  );
}

export default function AdminModules() {
  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [scenarios, setScenarios] = useState([]);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
  const [newScenario, setNewScenario] = useState({ name: "", scenario_index: "" });
  const [editScenario, setEditScenario] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Module Management — V-TRAIN";
    loadModules();
    if (!localStorage.getItem("access_token")) navigate("/");
  }, []);

  useEffect(() => {
    if (selectedModuleId) loadScenarios(selectedModuleId);
    else setScenarios([]);
  }, [selectedModuleId]);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/");
  };

  const loadModules = async () => {
    try {
      const res = await api.get("/modules");
      setModules(res.data);
    } catch {
      alert("Failed to load modules");
    }
  };

  const loadScenarios = async (moduleId) => {
    setLoadingScenarios(true);
    try {
      const res = await api.get(`/modules/${moduleId}/scenarios`);
      setScenarios([...res.data].sort((a, b) => a.scenario_index - b.scenario_index));
      setEditScenario({});
    } catch {
      alert("Failed to load scenarios");
    } finally {
      setLoadingScenarios(false);
    }
  };

  const addScenario = async () => {
    if (!selectedModuleId) return alert("Select a module first");
    if (!newScenario.name.trim()) return alert("Scenario name is required");
    if (newScenario.scenario_index === "") return alert("Scenario index is required");
    const index = parseInt(newScenario.scenario_index, 10);
    if (isNaN(index) || index < 0) return alert("Index must be a non-negative integer");
    const dup = scenarios.find((s) => s.scenario_index === index);
    if (dup) return alert(`Index ${index} is already used by "${dup.name}"`);

    try {
      await api.post(`/modules/${selectedModuleId}/scenarios`, {
        name: newScenario.name.trim(),
        module_id: selectedModuleId,
        scenario_index: index,
      });
      setNewScenario({ name: "", scenario_index: "" });
      loadScenarios(selectedModuleId);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to add scenario");
    }
  };

  const saveScenario = async (scenarioId) => {
    const data = editScenario[scenarioId];
    if (!data) return;
    if (!data.name?.trim()) return alert("Name cannot be empty");
    const index = parseInt(data.scenario_index, 10);
    if (isNaN(index) || index < 0) return alert("Index must be a non-negative integer");
    const dup = scenarios.find((s) => s.scenario_index === index && s.scenario_id !== scenarioId);
    if (dup) return alert(`Index ${index} is already used by "${dup.name}"`);

    try {
      await api.put(`/scenarios/${scenarioId}`, { name: data.name.trim(), scenario_index: index });
      setEditScenario((prev) => { const n = { ...prev }; delete n[scenarioId]; return n; });
      loadScenarios(selectedModuleId);
    } catch (err) {
      alert(err.response?.data?.detail || "Failed to update scenario");
    }
  };

  const deleteScenario = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/scenarios/${id}`);
      loadScenarios(selectedModuleId);
    } catch {
      alert("Failed to delete scenario");
    }
  };

  const handleEditChange = (id, field, value) =>
    setEditScenario((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));

  const startEdit = (s) =>
    setEditScenario((prev) => ({ ...prev, [s.scenario_id]: { name: s.name, scenario_index: s.scenario_index } }));

  const cancelEdit = (id) =>
    setEditScenario((prev) => { const n = { ...prev }; delete n[id]; return n; });

  const selectedModule = modules.find((m) => m.module_id === selectedModuleId);

  return (
    <div className="app-layout">
      <Sidebar onLogout={handleLogout} />

      <main className="main-content" id="main-content">
        <div className="page-header">
          <h1>Module Management</h1>
          <p>Configure training modules and their scenarios.</p>
        </div>

        {/* Module Selector */}
        <div className="card">
          <label htmlFor="module-select" className="form-label" style={{ fontSize: 15, fontWeight: 600 }}>
            Select Module
          </label>
          <select
            id="module-select"
            value={selectedModuleId}
            onChange={(e) => setSelectedModuleId(e.target.value)}
          >
            <option value="">— Choose a module —</option>
            {modules.map((m) => (
              <option key={m.module_id} value={m.module_id}>
                {m.module_name} (v{m.version})
              </option>
            ))}
          </select>
        </div>

        {selectedModuleId && (
          <>
            {/* Add Scenario */}
            <div className="card">
              <h2
                id="add-scenario-heading"
                style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}
              >
                Add Scenario to "{selectedModule?.module_name}"
              </h2>
              <div role="group" aria-labelledby="add-scenario-heading">
                <label htmlFor="new-scenario-name" className="form-label">Scenario name</label>
                <input
                  id="new-scenario-name"
                  placeholder="e.g. Fire Extinguisher Check"
                  value={newScenario.name}
                  onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
                />
                <label htmlFor="new-scenario-index" className="form-label">
                  Index <span style={{ fontWeight: 400, color: "var(--text-muted)" }}>(0-based order)</span>
                </label>
                <input
                  id="new-scenario-index"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={newScenario.scenario_index}
                  onChange={(e) => setNewScenario({ ...newScenario, scenario_index: e.target.value })}
                />
                <button className="primary-btn" onClick={addScenario}>+ Add Scenario</button>
              </div>
            </div>

            {/* Scenario List */}
            <div className="card">
              <h2
                id="scenario-list-heading"
                style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}
              >
                Scenarios ({scenarios.length})
              </h2>
              {loadingScenarios && <p className="text-muted" role="status">Loading…</p>}
              {!loadingScenarios && scenarios.length === 0 && (
                <div className="empty-state" style={{ padding: "20px 0" }} role="status">
                  No scenarios yet. Add one above.
                </div>
              )}
              <ul
                aria-labelledby="scenario-list-heading"
                style={{ listStyle: "none", margin: 0, padding: 0 }}
              >
                {!loadingScenarios && scenarios.map((s) => {
                  const isEditing = !!editScenario[s.scenario_id];
                  const cur = editScenario[s.scenario_id] || s;
                  const sid = s.scenario_id;
                  return (
                    <li key={sid} className="scenario-row">
                      {!isEditing && (
                        <span className="scenario-index-badge" aria-label={`Step ${s.scenario_index}`}>
                          {s.scenario_index}
                        </span>
                      )}
                      {isEditing ? (
                        <>
                          <label htmlFor={`s-name-${sid}`} className="sr-only">Scenario name</label>
                          <input
                            id={`s-name-${sid}`}
                            style={{ flex: 2, minWidth: 140, marginBottom: 0 }}
                            value={cur.name}
                            onChange={(e) => handleEditChange(sid, "name", e.target.value)}
                            placeholder="Scenario name"
                          />
                          <label htmlFor={`s-idx-${sid}`} className="sr-only">Scenario index</label>
                          <input
                            id={`s-idx-${sid}`}
                            type="number"
                            min="0"
                            style={{ width: 80, marginBottom: 0 }}
                            value={cur.scenario_index}
                            onChange={(e) => handleEditChange(sid, "scenario_index", e.target.value)}
                            placeholder="Index"
                          />
                        </>
                      ) : (
                        <span className="scenario-name">{s.name}</span>
                      )}
                      <div className="flex-row">
                        {isEditing ? (
                          <>
                            <button
                              className="primary-btn btn-sm"
                              onClick={() => saveScenario(sid)}
                              aria-label={`Save changes to scenario ${s.name}`}
                            >
                              Save
                            </button>
                            <button
                              className="primary-btn btn-sm btn-secondary"
                              onClick={() => cancelEdit(sid)}
                              aria-label={`Cancel editing scenario ${s.name}`}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="primary-btn btn-sm btn-secondary"
                              onClick={() => startEdit(s)}
                              aria-label={`Edit scenario ${s.name}`}
                            >
                              Edit
                            </button>
                            <button
                              className="primary-btn btn-sm btn-danger"
                              onClick={() => deleteScenario(sid, s.name)}
                              aria-label={`Delete scenario ${s.name}`}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        )}
      </main>
    </div>
  );
}