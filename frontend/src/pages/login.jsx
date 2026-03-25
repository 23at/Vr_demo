import { useState } from "react";
import api from "../services/api";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  // DEBUG LINE
  console.log("LOGIN COMPONENT LOADED");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const params=new URLSearchParams();
      params.append("username", username);
      params.append("password", password);

      const response = await api.post("/auth/token",params, {
        headers: {"Content-Type": "application/x-www-form-urlencoded" },
      });
      const token = response.data.access_token;
      localStorage.setItem("access_token", token)
      const userRes = await api.get("/users/me/");
      const role = userRes.data.role;

      if (role === "ADMIN") {
        navigate("/admin");
      } else {
        navigate("/dashboard");
      }
    } catch (err) {
      console.error("login failed:", err)
      alert("Invalid credentials");
    }
  };

  return (
    <div className="login-page">
      <div className="login-box">
        <h1 className="title">V-TRAIN</h1>

        <form onSubmit={handleSubmit} className="login-form">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="input-field"
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input-field"
          />

          <button type="submit" className="login-button">
            Login
          </button>
        </form>

        <button
          className="create-button"
          onClick={() => navigate("/register")}
        >
          Create Account
        </button>
      </div>
    </div>
  );
}