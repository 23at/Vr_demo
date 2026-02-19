import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000",//update to match backend
  withCredentials: true
});

export default api;
