import { useEffect, useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Admin() {
  const [users, setUsers] = useState([]);
  const [modules, setModules] = useState([]);
  const [selectedModule, setSelectedModule] = useState({});
  const navigate = useNavigate();
  const [selectedFileModule, setSelectedFileModule] = useState(""); 
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  
  // NEW: create module state
  const [newModule, setNewModule] = useState({
    module_name: "",
    version: "",
    description: ""
  });

  useEffect(() => {
    loadUsers();
    loadModules();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    navigate("/");
  };

  const loadUsers = async () => {
    const res = await api.get("/admin/users");
    setUsers(res.data);
  };

  const loadModules = async () => {
    const res = await api.get("/modules");
    setModules(res.data);
  };

  const createModule = async () => {
    if (!newModule.module_name || !newModule.version) {
      return alert("Name and version are required");
    }

    try {
      const res = await api.post("/modules", newModule);

      alert("Module created!");
      setNewModule({ module_name: "", version: "", description: "" });

      loadModules(); // refresh list
    } catch (err) {
      console.error(err);
      alert("Failed to create module");
    }
  };
 
  const assignModule = async (userId) => {
    const moduleId = selectedModule[userId];
    if (!moduleId) return alert("Select a module");

    await api.post("/admin/assign", null, {
      params: { user_id: userId, module_id: moduleId },
    });

    loadUsers();
  };
  // Upload file for selected module
  const uploadFile = async () => {
    if (!selectedFileModule || !file) return alert("Select a module and file");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await api.post(
        `/modules/${selectedFileModule}/upload`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percent);
          },
        }
      );

      alert("File uploaded successfully!");
      setFile(null);
      setUploadProgress(0);
      loadModules(); // refresh modules metadata
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }
  };
  return (
    <div className="app-layout">

  <div className="sidebar">
    <h2 className="sidebar-title">V-TRAIN</h2>
    <a className="sidebar-link" href="/admin">Admin Dashboard</a>
    <a className="sidebar-link" href="/admin/users">User Management</a>
    <a className="sidebar-link" href="/download-launcher">Download Launcher</a>
    <button className="logout-btn" onClick={handleLogout}>
          Logout
        </button>
  </div>

    <div className="main-content">
        
        <h1>Admin Dashboard </h1>
        
        
         {/* CREATE MODULE */}
        <div className="card">
          <h3>Create Module</h3>

          <input
            placeholder="Module Name"
            value={newModule.module_name}
            onChange={(e) =>
              setNewModule({ ...newModule, module_name: e.target.value })
            }
          />

          <input
            placeholder="Version"
            value={newModule.version}
            onChange={(e) =>
              setNewModule({ ...newModule, version: e.target.value })
            }
          />

          <textarea
            placeholder="Description"
            value={newModule.description}
            onChange={(e) =>
              setNewModule({ ...newModule, description: e.target.value })
            }
          />
          <button className="primary-btn" onClick={createModule}>
            Create Module
          </button>
        </div>


        {/* File Upload Section */}
        <div className="card">
          <h3>Upload Module File</h3>
          <select
            value={selectedFileModule}
            onChange={(e) => setSelectedFileModule(e.target.value)}
          >
            <option value="">Select Module</option>
            {modules.map((m) => (
              <option key={m.module_id} value={m.module_id}>
                {m.module_name}
              </option>
            ))}
          </select>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files[0])}
          />
          <button className="primary-btn" onClick={uploadFile}>
            Upload
          </button>
          {uploadProgress > 0 && <p>Uploading: {uploadProgress}%</p>}
        </div>
             
        {users.length === 0 && <p>No users found</p>}

        {users.map((user) => (
          <div key={user.user_id} className="card">
            <h3>{user.username}</h3>

            <p><strong>Modules:</strong></p>

            {user.modules.length === 0 && <p>No modules assigned</p>}

            {user.modules.map((m) => (
              <div key={m.module_id}>
                {m.module_name}
                <span className="status-text"> — In Progress</span>
              </div>
            ))}

            <select
              className="dropdown"
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
              className="primary-btn"
              onClick={() => assignModule(user.user_id)}
            >
              Assign
            </button>
          </div>
        ))}
        
      </div>
      
    </div>
    
  );
}