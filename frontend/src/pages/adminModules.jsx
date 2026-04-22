import { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

function Sidebar({ onLogout }) {
  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⚡</div>
        <h2 className="sidebar-title">V-TRAIN</h2>
      </div>
      <span className="sidebar-section-label">Admin</span>
      <a className="sidebar-link" href="/admin"><span className="link-icon">🏠</span> Dashboard</a>
      <a className="sidebar-link" href="/admin/users"><span className="link-icon">👥</span> User Management</a>
      <a className="sidebar-link active" href="/admin/modules"><span className="link-icon">📦</span> Module Management</a>
      <span className="sidebar-section-label">System</span>
      <a className="sidebar-link" href="/download-launcher"><span className="link-icon">⬇️</span> Download Launcher</a>
      <div className="sidebar-spacer" />
      <button className="logout-btn" onClick={onLogout}><span>🚪</span> Logout</button>
    </div>
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

      <div className="main-content">
        <div className="page-header">
          <h1>Module Management</h1>
          <p>Configure training modules and their scenarios.</p>
        </div>

        {/* Module Selector */}
        <div className="card">
          <h3>Select Module</h3>
          <select
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
              <h3>Add Scenario to "{selectedModule?.module_name}"</h3>
              <input
                placeholder="Scenario name"
                value={newScenario.name}
                onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
              />
              <input
                type="number"
                min="0"
                placeholder="Index (0-based order)"
                value={newScenario.scenario_index}
                onChange={(e) => setNewScenario({ ...newScenario, scenario_index: e.target.value })}
              />
              <button className="primary-btn" onClick={addScenario}>+ Add Scenario</button>
            </div>

            {/* Scenario List */}
            <div className="card">
              <h3>Scenarios ({scenarios.length})</h3>
              {loadingScenarios && <p className="text-muted">Loading…</p>}
              {!loadingScenarios && scenarios.length === 0 && (
                <div className="empty-state" style={{ padding: "20px 0" }}>
                  No scenarios yet. Add one above.
                </div>
              )}
              {!loadingScenarios && scenarios.map((s) => {
                const isEditing = !!editScenario[s.scenario_id];
                const cur = editScenario[s.scenario_id] || s;
                return (
                  <div key={s.scenario_id} className="scenario-row">
                    {!isEditing && (
                      <span className="scenario-index-badge">{s.scenario_index}</span>
                    )}
                    {isEditing ? (
                      <>
                        <input
                          style={{ flex: 2, minWidth: 140, marginBottom: 0 }}
                          value={cur.name}
                          onChange={(e) => handleEditChange(s.scenario_id, "name", e.target.value)}
                          placeholder="Scenario name"
                        />
                        <input
                          type="number"
                          min="0"
                          style={{ width: 80, marginBottom: 0 }}
                          value={cur.scenario_index}
                          onChange={(e) => handleEditChange(s.scenario_id, "scenario_index", e.target.value)}
                          placeholder="Index"
                        />
                      </>
                    ) : (
                      <span className="scenario-name">{s.name}</span>
                    )}
                    <div className="flex-row">
                      {isEditing ? (
                        <>
                          <button className="primary-btn btn-sm" onClick={() => saveScenario(s.scenario_id)}>Save</button>
                          <button className="primary-btn btn-sm btn-secondary" onClick={() => cancelEdit(s.scenario_id)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="primary-btn btn-sm btn-secondary" onClick={() => startEdit(s)}>Edit</button>
                          <button className="primary-btn btn-sm btn-danger" onClick={() => deleteScenario(s.scenario_id, s.name)}>Delete</button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}