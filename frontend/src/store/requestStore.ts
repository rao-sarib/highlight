"use client";

import { create } from "zustand";

/**
 * Tracks in-flight mutating requests (POST/PUT/PATCH/DELETE) globally so the UI
 * can lock the project switcher while a real task is running — preventing a
 * mid-task project switch. Incremented/decremented by the axios interceptors.
 */
interface RequestState {
  pendingMutations: number;
  begin: () => void;
  end: () => void;
}

export const useRequestStore = create<RequestState>((set, get) => ({
  pendingMutations: 0,
  begin: () => set({ pendingMutations: get().pendingMutations + 1 }),
  end: () => set({ pendingMutations: Math.max(0, get().pendingMutations - 1) }),
}));
