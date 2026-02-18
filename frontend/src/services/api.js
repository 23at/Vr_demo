import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:8000", // update to our backend URL,,,, I need to re-install my vscode so i am pushing this early.
});

export const login = (email, password) =>
    api.post("/login", { email, password });

export const getSessions = (token) =>
    api.get("/sessions", {
        headers: { Authorization: `Bearer ${token}` },
    });
