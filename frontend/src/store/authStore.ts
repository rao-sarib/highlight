"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import api, { AUTH_TOKEN_KEY } from "@/lib/api";

export type UserRole =
  | "seo_expert"
  | "content_writer"
  | "analytics_manager"
  | "admin"
  | "seo_manager"
  | "viewer";

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface SignupResult {
  verification_required: boolean;
  emailed: boolean;
  message: string;
  dev_verify_url?: string | null;
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
    role: UserRole;
  }) => Promise<SignupResult>;
  /** Store a freshly-issued token and load the current user (used by login,
   *  email verification, and password reset). */
  establishSession: (token: string) => Promise<AuthUser>;
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
      establishSession: async (token) => {
        syncTokenStorage(token);
        const userResponse = await api.get<AuthUser>("/users/me");
        get().setSession({ token, user: userResponse.data });
        return userResponse.data;
      },
      login: async ({ email, password }) => {
        const tokenResponse = await api.post<TokenResponse>("/auth/login", {
          email,
          password,
        });
        return get().establishSession(tokenResponse.data.access_token);
      },
      signup: async ({ email, password, full_name, role }) => {
        // Signup no longer logs the user in — it creates an unverified account
        // and emails a verification link. The page shows a "check your email"
        // state based on this result.
        const response = await api.post<SignupResult>("/auth/signup", {
          email,
          password,
          full_name,
          role,
        });
        return response.data;
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
