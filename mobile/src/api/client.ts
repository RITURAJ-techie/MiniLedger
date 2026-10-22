
import axios from "axios";

export const API_BASE_URL = "http://10.0.2.2:8000/api";

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});
