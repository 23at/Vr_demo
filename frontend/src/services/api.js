import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:8000", //chanmge to our backend url
  withCredentials: true 
});

export default api;
