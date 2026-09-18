"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import { API_BASE, apiFetch } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────

export interface UserRead {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  occupation: string | null;
  currency: string;
  monthly_income: number;
  risk_profile: string;
  created_at: string;
}

export interface LoginPayload {
  username: string; // email per OAuth2 form
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  full_name?: string;
  monthly_income: number;
  risk_profile?: string;
}

interface AuthState {
  token: string | null;
  user: UserRead | null;
  loading: boolean;
  error: string | null;

  /** Log in with email + password, store JWT and user profile. */
  login: (email: string, password: string) => Promise<void>;

  /** Register a new account, then auto-login. */
  register: (payload: RegisterPayload) => Promise<void>;

  /** Fetch the current user profile from the backend. */
  fetchUser: () => Promise<void>;

  /** Replace the cached profile after a local update (e.g. the profile page). */
  setUser: (user: UserRead) => void;

  /** Clear auth state and remove token. */
  logout: () => void;

  /** Clear transient error. */
  clearError: () => void;
}

// ── Store ──────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      loading: false,
      error: null,

      // ── login ────────────────────────────────────────────────────
      login: async (email: string, password: string) => {
        set({ loading: true, error: null });

        try {
          // OAuth2 password flow — POST as form data.
          const params = new URLSearchParams();
          params.set("username", email);
          params.set("password", password);

          const tokenRes = await fetch(`${API_BASE}/api/v1/auth/login`, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: params,
          });

          if (!tokenRes.ok) {
            const err = await tokenRes.json().catch(() => null);
            throw new Error(err?.detail ?? "Login failed");
          }

          const { access_token } = await tokenRes.json();
          set({ token: access_token });

          // Fetch user profile with the new token.
          await get().fetchUser();
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Login failed";
          set({ error: msg, loading: false });
          throw e;
        }

        set({ loading: false });
      },

      // ── register ─────────────────────────────────────────────────
      register: async (payload: RegisterPayload) => {
        set({ loading: true, error: null });

        try {
          // Create the account.
          const user: UserRead = await apiFetch("/api/v1/auth/register", {
            method: "POST",
            body: JSON.stringify(payload),
          });

          // Auto-login.
          await get().login(payload.email, payload.password);
          set({ user });
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : "Registration failed";
          set({ error: msg, loading: false });
          throw e;
        }

        set({ loading: false });
      },

      // ── fetchUser ────────────────────────────────────────────────
      fetchUser: async () => {
        try {
          const user: UserRead = await apiFetch("/api/v1/auth/me");
          set({ user });
        } catch {
          set({ token: null, user: null });
        }
      },

      // ── setUser ──────────────────────────────────────────────────
      setUser: (user: UserRead) => set({ user }),

      // ── logout ───────────────────────────────────────────────────
      logout: () => {
        set({ token: null, user: null, error: null });
      },

      // ── clearError ───────────────────────────────────────────────
      clearError: () => set({ error: null }),
    }),
    {
      name: "xpense-auth",
      partialize: (state) => ({ token: state.token, user: state.user }),
    },
  ),
);
