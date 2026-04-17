import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import Admin from "./pages/admin";
import Download from "./pages/download";
import AdminUsers from "./pages/adminUsers";
import AdminModules from "./pages/adminModules";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/download-launcher" element={<Download />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/modules" element={<AdminModules />} />
      </Routes>
    </BrowserRouter>
  );
}
