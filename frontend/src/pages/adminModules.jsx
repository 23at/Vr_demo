import { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";
 
export default function AdminModules() {
  const [modules, setModules] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [scenarios, setScenarios] = useState([]);
  const [loadingScenarios, setLoadingScenarios] = useState(false);
 
  // New scenario form state
  const [newScenario, setNewScenario] = useState({ name: "", scenario_index: "" });
 
  // Edit state: { [scenario_id]: { name, scenario_index } }
  const [editScenario, setEditScenario] = useState({});
 
  const navigate = useNavigate();
 
  useEffect(() => {
    loadModules();
    const token = localStorage.getItem("access_token");
    if (!token) navigate("/");
  }, []);
 
  useEffect(() => {
    if (selectedModuleId) {
      loadScenarios(selectedModuleId);
    } else {
      setScenarios([]);
    }
  }, [selectedModuleId]);
 
  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/");
  };
 
  const loadModules = async () => {
    try {
      const res = await api.get("/modules");
      setModules(res.data);
    } catch (err) {
      console.error("Failed to load modules", err);
      alert("Failed to load modules");
    }
  };
 
  const loadScenarios = async (moduleId) => {
    setLoadingScenarios(true);
    try {
      const res = await api.get(`/modules/${moduleId}/scenarios`);
      // Sort by scenario_index for consistent display
      const sorted = [...res.data].sort((a, b) => a.scenario_index - b.scenario_index);
      setScenarios(sorted);
      setEditScenario({});
    } catch (err) {
      console.error("Failed to load scenarios", err);
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
    if (isNaN(index) || index < 0) return alert("Scenario index must be a non-negative integer");
 
    // Check for duplicate index locally before hitting the API
    const duplicate = scenarios.find((s) => s.scenario_index === index);
    if (duplicate) return alert(`Index ${index} is already used by "${duplicate.name}"`);
 
    try {
      await api.post(`/modules/${selectedModuleId}/scenarios`, {
        name: newScenario.name.trim(),
        module_id: selectedModuleId,
        scenario_index: index,
      });
      setNewScenario({ name: "", scenario_index: "" });
      loadScenarios(selectedModuleId);
    } catch (err) {
      console.error("Failed to add scenario", err);
      const detail = err.response?.data?.detail || "Failed to add scenario";
      alert(detail);
    }
  };
 
  const saveScenario = async (scenarioId) => {
    const data = editScenario[scenarioId];
    if (!data) return;
 
    if (!data.name?.trim()) return alert("Name cannot be empty");
    const index = parseInt(data.scenario_index, 10);
    if (isNaN(index) || index < 0) return alert("Index must be a non-negative integer");
 
    // Check for duplicate index among OTHER scenarios
    const duplicate = scenarios.find(
      (s) => s.scenario_index === index && s.scenario_id !== scenarioId
    );
    if (duplicate) return alert(`Index ${index} is already used by "${duplicate.name}"`);
 
    try {
      await api.put(`/scenarios/${scenarioId}`, {
        name: data.name.trim(),
        scenario_index: index,
      });
      // Clear edit state for this row and reload
      setEditScenario((prev) => {
        const next = { ...prev };
        delete next[scenarioId];
        return next;
      });
      loadScenarios(selectedModuleId);
    } catch (err) {
      console.error("Failed to update scenario", err);
      const detail = err.response?.data?.detail || "Failed to update scenario";
      alert(detail);
    }
  };
 
  const deleteScenario = async (scenarioId, scenarioName) => {
    if (!window.confirm(`Delete scenario "${scenarioName}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/scenarios/${scenarioId}`);
      loadScenarios(selectedModuleId);
    } catch (err) {
      console.error("Failed to delete scenario", err);
      alert("Failed to delete scenario");
    }
  };
 
  const handleEditChange = (scenarioId, field, value) => {
    setEditScenario((prev) => ({
      ...prev,
      [scenarioId]: {
        ...prev[scenarioId],
        [field]: value,
      },
    }));
  };
 
  const startEdit = (scenario) => {
    setEditScenario((prev) => ({
      ...prev,
      [scenario.scenario_id]: {
        name: scenario.name,
        scenario_index: scenario.scenario_index,
      },
    }));
  };
 
  const cancelEdit = (scenarioId) => {
    setEditScenario((prev) => {
      const next = { ...prev };
      delete next[scenarioId];
      return next;
    });
  };
 
  const selectedModule = modules.find((m) => m.module_id === selectedModuleId);
 
  return (
    <div className="app-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <h2 className="sidebar-title">V-TRAIN</h2>
        <a className="sidebar-link" href="/admin">Admin Dashboard</a>
        <a className="sidebar-link" href="/admin/users">User Management</a>
        <a className="sidebar-link" href="/admin/modules">Module Management</a>
        <a className="sidebar-link" href="/download-launcher">Download Launcher</a>
        <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
      </div>
 
      {/* Main */}
      <div className="main-content">
        <h1>Module Management</h1>
 
        {/* Module selector */}
        <div className="card">
          <h3>Select Module</h3>
          <select
            className="dropdown"
            value={selectedModuleId}
            onChange={(e) => setSelectedModuleId(e.target.value)}
            style={{ width: "100%", marginBottom: 0 }}
          >
            <option value="">— Choose a module —</option>
            {modules.map((m) => (
              <option key={m.module_id} value={m.module_id}>
                {m.module_name}
              </option>
            ))}
          </select>
        </div>
 
        {/* Only show the rest once a module is selected */}
        {selectedModuleId && (
          <>
            {/* Add Scenario */}
            <div className="card">
              <h3>Add Scenario to &ldquo;{selectedModule?.module_name}&rdquo;</h3>
 
              <input
                placeholder="Scenario Name"
                value={newScenario.name}
                onChange={(e) => setNewScenario({ ...newScenario, name: e.target.value })}
              />
 
              <input
                type="number"
                min="0"
                placeholder="Scenario Index (0-based order)"
                value={newScenario.scenario_index}
                onChange={(e) =>
                  setNewScenario({ ...newScenario, scenario_index: e.target.value })
                }
              />
 
              <button className="primary-btn" onClick={addScenario}>
                Add Scenario
              </button>
            </div>
 
            {/* Scenario List */}
            <div className="card">
              <h3>Scenarios</h3>
 
              {loadingScenarios && <p>Loading scenarios...</p>}
 
              {!loadingScenarios && scenarios.length === 0 && (
                <p style={{ color: "#888" }}>No scenarios yet. Add one above.</p>
              )}
 
              {!loadingScenarios &&
                scenarios.map((scenario) => {
                  const isEditing = !!editScenario[scenario.scenario_id];
                  const current = editScenario[scenario.scenario_id] || scenario;
 
                  return (
                    <div
                      key={scenario.scenario_id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        padding: "10px 0",
                        borderBottom: "1px solid #eee",
                        flexWrap: "wrap",
                      }}
                    >
                      {/* Index badge */}
                      {!isEditing && (
                        <span
                          style={{
                            minWidth: "32px",
                            textAlign: "center",
                            background: "#2a7ae4",
                            color: "white",
                            borderRadius: "50%",
                            padding: "4px 8px",
                            fontWeight: "bold",
                            fontSize: "13px",
                          }}
                        >
                          {scenario.scenario_index}
                        </span>
                      )}
 
                      {/* Editable fields */}
                      {isEditing ? (
                        <>
                          <input
                            style={{ flex: 2, minWidth: "160px", marginBottom: 0 }}
                            value={current.name}
                            onChange={(e) =>
                              handleEditChange(scenario.scenario_id, "name", e.target.value)
                            }
                            placeholder="Scenario Name"
                          />
                          <input
                            type="number"
                            min="0"
                            style={{ width: "90px", marginBottom: 0 }}
                            value={current.scenario_index}
                            onChange={(e) =>
                              handleEditChange(
                                scenario.scenario_id,
                                "scenario_index",
                                e.target.value
                              )
                            }
                            placeholder="Index"
                          />
                        </>
                      ) : (
                        <span style={{ flex: 2 }}>{scenario.name}</span>
                      )}
 
                      {/* Action buttons */}
                      <div style={{ display: "flex", gap: "8px" }}>
                        {isEditing ? (
                          <>
                            <button
                              className="primary-btn"
                              onClick={() => saveScenario(scenario.scenario_id)}
                            >
                              Save
                            </button>
                            <button
                              className="primary-btn"
                              style={{ backgroundColor: "#888" }}
                              onClick={() => cancelEdit(scenario.scenario_id)}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="primary-btn"
                              onClick={() => startEdit(scenario)}
                            >
                              Edit
                            </button>
                            <button
                              className="primary-btn"
                              style={{ backgroundColor: "#d9534f" }}
                              onClick={() =>
                                deleteScenario(scenario.scenario_id, scenario.name)
                              }
                            >
                              Delete
                            </button>
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