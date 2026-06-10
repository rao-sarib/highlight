"use client";

import { useEffect, useState } from "react";

import { FeaturePageFrame } from "@/components/global/feature-page-frame";
import api from "@/lib/api";
import { useAuthStore } from "@/store/authStore";

interface UserRecord {
  id: string;
  full_name: string;
  email: string;
  role: "admin" | "seo_manager" | "viewer";
}

export default function RbacPage() {
  const currentUser = useAuthStore((state) => state.user);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const loadUsers = async () => {
      try {
        const response = await api.get<UserRecord[]>("/users");
        setUsers(response.data);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load RBAC data.",
        );
      }
    };

    if (currentUser?.role === "admin") {
      void loadUsers();
    }
  }, [currentUser?.role]);

  if (currentUser?.role !== "admin") {
    return (
      <FeaturePageFrame
        eyebrow="Settings"
        title="RBAC settings"
        description="This area is restricted to administrators."
      >
        <div className="rounded-[1.5rem] border border-border/70 bg-card p-6 text-sm text-muted-foreground">
          Your current role does not permit access to role management.
        </div>
      </FeaturePageFrame>
    );
  }

  return (
    <FeaturePageFrame
      eyebrow="Settings"
      title="Role-based access control"
      description="Review who has access to the workspace. The backend enforces admin-only access for this page."
    >
      {errorMessage ? (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-4 text-sm text-destructive">
          {errorMessage}
        </div>
      ) : null}
      <div className="overflow-hidden rounded-[1.5rem] border border-border/70 bg-card">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-muted/60">
            <tr className="text-left text-xs uppercase tracking-[0.22em] text-muted-foreground">
              <th className="px-5 py-4">Name</th>
              <th className="px-5 py-4">Email</th>
              <th className="px-5 py-4">Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-5 py-4 font-medium text-foreground">{user.full_name}</td>
                <td className="px-5 py-4 text-muted-foreground">{user.email}</td>
                <td className="px-5 py-4 text-foreground">{user.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </FeaturePageFrame>
  );
}
