export default function Download() {
  return (
    <div className="app-layout">
      {/* Sidebar */}
      <div className="sidebar">
        <h2 className="sidebar-title">V-TRAIN</h2>
        <a className="sidebar-link" href="/dashboard">Dashboard</a>
        <a className="sidebar-link" href="/download-launcher">Download Launcher</a>
      </div>

      <div className="main-content">
        <h1>Download Launcher</h1>

        <div className="card">
          <p>Install the VR Training Launcher to run modules.</p>

          <a
            href="/launcher/VRTrainingLauncher.exe"//TODO: BUILD .EXE, ADD FOLDER
            className="primary-btn"
          >
            Download Launcher
          </a>
        </div>
      </div>
    </div>
  );
}