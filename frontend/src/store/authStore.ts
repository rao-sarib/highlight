"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import api, { AUTH_TOKEN_KEY } from "@/lib/api";

export type UserRole = "admin" | "seo_manager" | "viewer";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  hasHydrated: boolean;
  setHydrated: (value: boolean) => void;
  setSession: (payload: { token: string; user: AuthUser }) => void;
  clearSession: () => void;
  login: (payload: { email: string; password: string }) => Promise<AuthUser>;
  signup: (payload: {
    email: string;
    password: string;
    full_name: string;
  }) => Promise<AuthUser>;
  fetchCurrentUser: () => Promise<AuthUser | null>;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
}

function syncTokenStorage(token: string | null): void {
  if (typeof window === "undefined") {
    return;
  }

  if (token) {
    window.localStorage.setItem(AUTH_TOKEN_KEY, token);
    document.cookie = `${AUTH_TOKEN_KEY}=${encodeURIComponent(token)}; path=/; max-age=${60 * 60 * 24 * 7}; samesite=lax`;
    return;
  }

  window.localStorage.removeItem(AUTH_TOKEN_KEY);
  document.cookie = `${AUTH_TOKEN_KEY}=; path=/; max-age=0; samesite=lax`;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      setHydrated: (value) => set({ hasHydrated: value }),
      setSession: ({ token, user }) => {
        syncTokenStorage(token);
        set({
          token,
          user,
          isAuthenticated: true,
        });
      },
      clearSession: () => {
        syncTokenStorage(null);
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        });
      },
      login: async ({ email, password }) => {
        const tokenResponse = await api.post<TokenResponse>("/auth/login", {
          email,
          password,
        });

        syncTokenStorage(tokenResponse.data.access_token);

        const userResponse = await api.get<AuthUser>("/users/me");
        get().setSession({
          token: tokenResponse.data.access_token,
          user: userResponse.data,
        });

        return userResponse.data;
      },
      signup: async ({ email, password, full_name }) => {
        const tokenResponse = await api.post<TokenResponse>("/auth/signup", {
          email,
          password,
          full_name,
        });

        syncTokenStorage(tokenResponse.data.access_token);

        const userResponse = await api.get<AuthUser>("/users/me");
        get().setSession({
          token: tokenResponse.data.access_token,
          user: userResponse.data,
        });

        return userResponse.data;
      },
      fetchCurrentUser: async () => {
        const token = get().token;
        if (!token) {
          return null;
        }

        try {
          syncTokenStorage(token);
          const response = await api.get<AuthUser>("/users/me");
          set({
            user: response.data,
            isAuthenticated: true,
          });
          return response.data;
        } catch {
          get().clearSession();
          return null;
        }
      },
    }),
    {
      name: "highlight-auth-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true);
        if (state?.token) {
          syncTokenStorage(state.token);
        }
      },
    },
  ),
);
