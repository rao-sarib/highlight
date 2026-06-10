import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

const AUTH_TOKEN_KEY = "highlight-auth-token";

function getStoredToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  const directToken = window.localStorage.getItem(AUTH_TOKEN_KEY);
  if (directToken) {
    return directToken;
  }

  const persistedAuthState = window.localStorage.getItem("highlight-auth-store");
  if (!persistedAuthState) {
    return null;
  }

  try {
    const parsed = JSON.parse(persistedAuthState) as {
      state?: { token?: string | null };
    };
    return parsed.state?.token ?? null;
  } catch {
    return null;
  }
}

function clearStoredToken(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
}

export const api = axios.create({
  baseURL: (() => {
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
      return process.env.NEXT_PUBLIC_API_BASE_URL;
    }

    if (process.env.NEXT_PUBLIC_API_URL) {
      return `${process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, "")}/api/v1`;
    }

    return "http://127.0.0.1:8000/api/v1";
  })(),
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  timeout: 60000,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getStoredToken();

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ detail?: string }>) => {
    if (error.response?.status === 401) {
      clearStoredToken();
    }

    if (!error.response) {
      const url = error.config?.baseURL ?? "the backend";
      return Promise.reject(
        new Error(
          `Cannot reach ${url}. Make sure the backend is running on port 8000 and try again.`,
        ),
      );
    }

    const rawDetail = error.response?.data?.detail;
    const message = Array.isArray(rawDetail)
      ? rawDetail.map((e: { msg?: string }) => e.msg ?? String(e)).join("; ")
      : rawDetail || error.message || "An unexpected API error occurred.";

    return Promise.reject(new Error(message));
  },
);

export { AUTH_TOKEN_KEY };
export default api;
