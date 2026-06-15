import axios, { AxiosError } from "axios";

export const ADMIN_TOKEN_KEY = "highlight-admin-token";

function baseURL(): string {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL;
  if (process.env.NEXT_PUBLIC_API_URL)
    return `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api/v1`;
  return "http://127.0.0.1:8000/api/v1";
}

// Separate axios instance so the admin panel uses its OWN token, fully
// independent of the user app's auth.
const adminApi = axios.create({
  baseURL: baseURL(),
  headers: { "Content-Type": "application/json", Accept: "application/json" },
  timeout: 60000,
});

adminApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (r) => r,
  (error: AxiosError<{ detail?: string }>) => {
    const raw = error.response?.data?.detail;
    const message = Array.isArray(raw)
      ? raw.map((e: { msg?: string }) => e.msg ?? String(e)).join("; ")
      : raw || error.message || "Admin API error.";
    return Promise.reject(new Error(message));
  },
);

export default adminApi;
