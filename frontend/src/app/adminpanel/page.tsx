"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Lock, LogOut, Plus, Save, Send, Trash2 } from "lucide-react";

import adminApi, { ADMIN_TOKEN_KEY } from "@/lib/adminApi";
import { DEFAULT_LANDING, type LandingContent } from "@/lib/landing";
import { toLocalDateTime } from "@/lib/format";

import type {
  AdminRow,
  ContactMsg,
  FeatureDef,
  KeyRow,
  Overview,
  ProjectRow,
  RoleRow,
  SmtpSettings,
  Tab,
  UserRow,
} from "./types";
import { PLAN_KEYS, USER_ROLES } from "./constants";
import { Card, Field } from "./components/FormControls";
import { CmsTab } from "./components/CmsTab";


export default function AdminPanelPage() {
  const [authed, setAuthed] = useState(false);
  const [booting, setBooting] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState<Tab>("cms");

  // CMS
  const [content, setContent] = useState<LandingContent>(DEFAULT_LANDING);
  const [cmsMsg, setCmsMsg] = useState("");
  // SMTP
  const [smtp, setSmtp] = useState<SmtpSettings | null>(null);
  const [smtpMsg, setSmtpMsg] = useState("");
  const [testTo, setTestTo] = useState("");
  // RBAC
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [allFeatures, setAllFeatures] = useState<FeatureDef[]>([]);
  const [rbacMsg, setRbacMsg] = useState("");
  // Data sections
  const [users, setUsers] = useState<UserRow[]>([]);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [keys, setKeys] = useState<KeyRow[]>([]);
  const [overview, setOverview] = useState<Overview>({});
  const [messages, setMessages] = useState<ContactMsg[]>([]);
  const [unread, setUnread] = useState(0);
  const [dataMsg, setDataMsg] = useState("");
  const [keyInputs, setKeyInputs] = useState<Record<string, string>>({});
  const [newAdmin, setNewAdmin] = useState({ username: "", password: "" });

  const [busy, setBusy] = useState(false);

  const reloadData = useCallback(async () => {
    const [us, pr, ad, ks, ov, cm] = await Promise.all([
      adminApi.get<UserRow[]>("/admin/users"),
      adminApi.get<ProjectRow[]>("/admin/projects"),
      adminApi.get<AdminRow[]>("/admin/admins"),
      adminApi.get<KeyRow[]>("/admin/keys"),
      adminApi.get<Overview>("/admin/overview"),
      adminApi.get<{ unread: number; messages: ContactMsg[] }>("/admin/contact-messages"),
    ]);
    setUsers(us.data);
    setProjects(pr.data);
    setAdmins(ad.data);
    setKeys(ks.data);
    setOverview(ov.data);
    setMessages(cm.data.messages);
    setUnread(cm.data.unread);
  }, []);

  const loadAll = useCallback(async () => {
    const [cms, sm, rb] = await Promise.all([
      adminApi.get<LandingContent>("/admin/cms"),
      adminApi.get<SmtpSettings>("/admin/smtp"),
      adminApi.get<{ roles: RoleRow[]; all_features: FeatureDef[] }>("/admin/rbac"),
    ]);
    setContent({
      ...DEFAULT_LANDING,
      ...cms.data,
      about: { ...DEFAULT_LANDING.about, ...(cms.data.about ?? {}) },
      footer: { ...DEFAULT_LANDING.footer, ...(cms.data.footer ?? {}) },
    });
    setSmtp(sm.data);
    setRoles(rb.data.roles);
    setAllFeatures(rb.data.all_features);
    await reloadData().catch(() => {});
  }, [reloadData]);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem(ADMIN_TOKEN_KEY) : null;
    if (!t) {
      setBooting(false);
      return;
    }
    setAuthed(true);
    loadAll()
      .catch(() => {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setAuthed(false);
      })
      .finally(() => setBooting(false));
  }, [loadAll]);

  const login = async () => {
    setLoginError("");
    setBusy(true);
    try {
      const res = await adminApi.post<{ access_token: string }>("/admin/login", {
        username: username.trim(),
        password,
      });
      localStorage.setItem(ADMIN_TOKEN_KEY, res.data.access_token);
      setAuthed(true);
      await loadAll();
    } catch (e) {
      setLoginError(e instanceof Error ? e.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setAuthed(false);
    setUsername("");
    setPassword("");
  };

  const updateContent = (mut: (d: LandingContent) => void) => {
    setContent((prev) => {
      const d = structuredClone(prev);
      mut(d);
      return d;
    });
  };

  const saveCms = async () => {
    setCmsMsg("");
    setBusy(true);
    try {
      await adminApi.put("/admin/cms", { content });
      setCmsMsg("Landing content saved. Refresh the public site to see it.");
    } catch (e) {
      setCmsMsg(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const resetCms = async () => {
    setBusy(true);
    try {
      const res = await adminApi.post<LandingContent>("/admin/cms/reset");
      setContent({ ...DEFAULT_LANDING, ...res.data });
      setCmsMsg("Reset to defaults.");
    } catch (e) {
      setCmsMsg(e instanceof Error ? e.message : "Reset failed.");
    } finally {
      setBusy(false);
    }
  };

  const saveSmtp = async () => {
    if (!smtp) return;
    setSmtpMsg("");
    setBusy(true);
    try {
      await adminApi.put("/admin/smtp", smtp);
      setSmtpMsg("SMTP settings saved.");
    } catch (e) {
      setSmtpMsg(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const testSmtp = async () => {
    setSmtpMsg("");
    setBusy(true);
    try {
      await adminApi.post("/admin/smtp/test", { to_email: testTo.trim() });
      setSmtpMsg(`Test email sent to ${testTo}.`);
    } catch (e) {
      setSmtpMsg(e instanceof Error ? e.message : "Test failed.");
    } finally {
      setBusy(false);
    }
  };

  const toggleRoleFeature = (role: string, feature: string) => {
    setRoles((prev) =>
      prev.map((r) => {
        if (r.role !== role) return r;
        const has = r.features.includes(feature);
        return { ...r, features: has ? r.features.filter((f) => f !== feature) : [...r.features, feature] };
      }),
    );
  };

  const saveRole = async (role: RoleRow) => {
    setRbacMsg("");
    setBusy(true);
    try {
      await adminApi.put("/admin/rbac", { role: role.role, features: role.features });
      setRbacMsg(`Saved permissions for ${role.label}.`);
    } catch (e) {
      setRbacMsg(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  };

  const editUser = async (id: string, patch: { role?: string; plan?: string }) => {
    setDataMsg("");
    setBusy(true);
    try {
      await adminApi.patch(`/admin/users/${id}`, patch);
      await reloadData();
    } catch (e) {
      setDataMsg(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteUser = async (id: string, email: string) => {
    if (!window.confirm(`Delete user ${email}? This also deletes their projects and data.`)) return;
    setDataMsg("");
    setBusy(true);
    try {
      await adminApi.delete(`/admin/users/${id}`);
      await reloadData();
    } catch (e) {
      setDataMsg(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const deleteProject = async (id: string, name: string) => {
    if (!window.confirm(`Delete project "${name}" and all its data?`)) return;
    setDataMsg("");
    setBusy(true);
    try {
      await adminApi.delete(`/admin/projects/${id}`);
      await reloadData();
    } catch (e) {
      setDataMsg(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const markMessage = async (id: string, isRead: boolean) => {
    setDataMsg("");
    try {
      await adminApi.post(`/admin/contact-messages/${id}/read?is_read=${isRead}`);
      await reloadData();
    } catch (e) {
      setDataMsg(e instanceof Error ? e.message : "Update failed.");
    }
  };

  const deleteMessage = async (id: string) => {
    if (!window.confirm("Delete this message?")) return;
    setDataMsg("");
    setBusy(true);
    try {
      await adminApi.delete(`/admin/contact-messages/${id}`);
      await reloadData();
    } catch (e) {
      setDataMsg(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const createAdmin = async () => {
    setDataMsg("");
    setBusy(true);
    try {
      await adminApi.post("/admin/admins", newAdmin);
      setNewAdmin({ username: "", password: "" });
      await reloadData();
      setDataMsg("Admin created.");
    } catch (e) {
      setDataMsg(e instanceof Error ? e.message : "Could not create admin.");
    } finally {
      setBusy(false);
    }
  };

  const deleteAdmin = async (id: string, username: string) => {
    if (!window.confirm(`Delete admin ${username}?`)) return;
    setDataMsg("");
    setBusy(true);
    try {
      await adminApi.delete(`/admin/admins/${id}`);
      await reloadData();
    } catch (e) {
      setDataMsg(e instanceof Error ? e.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  };

  const saveKey = async (key: string) => {
    setDataMsg("");
    setBusy(true);
    try {
      await adminApi.put("/admin/keys", { key, value: keyInputs[key] ?? "" });
      setKeyInputs((p) => ({ ...p, [key]: "" }));
      await reloadData();
      setDataMsg(`${key} updated.`);
    } catch (e) {
      setDataMsg(e instanceof Error ? e.message : "Could not save key.");
    } finally {
      setBusy(false);
    }
  };

  // ── Login screen ──────────────────────────────────────
  if (booting) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </main>
    );
  }

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 text-foreground">
        <div className="w-full max-w-sm rounded-2xl border border-border/70 bg-card p-7 shadow-sm">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <h1 className="text-lg font-semibold">Admin panel</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Restricted area. Authorized staff only.</p>
          <div className="mt-5 grid gap-3">
            <Field label="Username" value={username} onChange={setUsername} />
            <label className="block text-sm">
              <span className="font-medium text-foreground">Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void login()}
                className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-ring/40"
              />
            </label>
            {loginError ? (
              <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {loginError}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void login()}
              disabled={busy || !username.trim() || !password}
              className="btn-brand inline-flex h-11 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Sign in
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Dashboard ─────────────────────────────────────────
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
          <div className="flex items-center gap-2">
            <Lock className="h-5 w-5 text-primary" />
            <span className="font-display text-lg font-semibold">Highlight Admin</span>
          </div>
          <button
            type="button"
            onClick={logout}
            className="inline-flex h-9 items-center gap-2 rounded-lg border border-border bg-background px-3 text-sm font-medium text-muted-foreground transition hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-5">
          {(
            ["overview", "users", "projects", "messages", "admins", "keys", "cms", "smtp", "rbac"] as Tab[]
          ).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`-mb-px whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-semibold capitalize transition ${
                tab === t
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "cms"
                ? "Landing CMS"
                : t === "smtp"
                  ? "SMTP"
                  : t === "rbac"
                    ? "RBAC"
                    : t === "keys"
                      ? "API Keys"
                      : t === "messages"
                        ? unread
                          ? `Messages (${unread})`
                          : "Messages"
                        : t}
            </button>
          ))}
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-8">
        {dataMsg && tab !== "cms" && tab !== "smtp" && tab !== "rbac" ? (
          <p className="mb-4 rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">{dataMsg}</p>
        ) : null}

        {/* ── OVERVIEW TAB ── */}
        {tab === "overview" ? (
          <div className="grid gap-5">
            <h2 className="text-xl font-semibold">Database overview</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {Object.entries(overview).map(([k, v]) => (
                <div key={k} className="rounded-2xl border border-border/70 bg-card p-5 text-center shadow-sm">
                  <p className="text-3xl font-semibold text-foreground">{v}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.15em] text-muted-foreground">{k.replace(/_/g, " ")}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* ── MESSAGES TAB ── */}
        {tab === "messages" ? (
          <div className="grid gap-4">
            <h2 className="text-xl font-semibold">
              Contact messages ({messages.length}
              {unread ? `, ${unread} unread` : ""})
            </h2>
            {messages.length === 0 ? (
              <p className="rounded-2xl border border-border/70 bg-card p-6 text-sm text-muted-foreground">
                No messages yet. Submissions from the public Contact page show up here.
              </p>
            ) : (
              <div className="grid gap-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-2xl border bg-card p-4 shadow-sm ${
                      m.is_read ? "border-border/70" : "border-primary/40"
                    }`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          {!m.is_read ? (
                            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
                          ) : null}
                          <span className="font-semibold text-foreground">{m.name}</span>
                          <a
                            href={`mailto:${m.email}`}
                            className="text-sm text-primary hover:underline"
                          >
                            {m.email}
                          </a>
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {toLocalDateTime(m.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => void markMessage(m.id, !m.is_read)}
                          className="rounded-lg border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                        >
                          {m.is_read ? "Mark unread" : "Mark read"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteMessage(m.id)}
                          disabled={busy}
                          className="rounded-lg border border-destructive/40 px-2 py-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{m.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* ── USERS TAB ── */}
        {tab === "users" ? (
          <div className="grid gap-4">
            <h2 className="text-xl font-semibold">Users ({users.length})</h2>
            <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Projects</th>
                    <th className="px-4 py-3">Scans</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{u.full_name}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <select value={USER_ROLES.includes(u.role) ? u.role : ""} onChange={(e) => void editUser(u.id, { role: e.target.value })} className="h-9 rounded-lg border border-border bg-background px-2 text-sm focus:border-primary">
                          {!USER_ROLES.includes(u.role) ? <option value="">{u.role}</option> : null}
                          {USER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3">
                        <select value={u.plan} onChange={(e) => void editUser(u.id, { plan: e.target.value })} className="h-9 rounded-lg border border-border bg-background px-2 text-sm focus:border-primary">
                          {PLAN_KEYS.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{u.projects}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.scans_used}</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => void deleteUser(u.id, u.email)} disabled={busy} className="rounded-lg border border-destructive/40 px-2 py-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* ── PROJECTS TAB ── */}
        {tab === "projects" ? (
          <div className="grid gap-4">
            <h2 className="text-xl font-semibold">Projects ({projects.length})</h2>
            <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card">
              <table className="min-w-full divide-y divide-border text-sm">
                <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Project</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Pages</th>
                    <th className="px-4 py-3">SEO</th>
                    <th className="px-4 py-3">AI SoV</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {projects.map((p) => (
                    <tr key={p.id}>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{p.name}</div>
                        <a href={p.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline">{p.url}</a>
                        {p.niche ? <div className="text-xs text-muted-foreground">{p.niche}</div> : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{p.owner_email}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.pages_crawled}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.seo_health_score ?? "—"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{p.ai_visibility_score ?? "—"}</td>
                      <td className="px-4 py-3 text-right">
                        <button type="button" onClick={() => void deleteProject(p.id, p.name)} disabled={busy} className="rounded-lg border border-destructive/40 px-2 py-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {/* ── ADMINS TAB ── */}
        {tab === "admins" ? (
          <div className="grid max-w-2xl gap-5">
            <h2 className="text-xl font-semibold">Admin accounts</h2>
            <Card title="Existing admins">
              {admins.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2">
                  <span className="text-sm font-medium text-foreground">{a.username}</span>
                  <button type="button" onClick={() => void deleteAdmin(a.id, a.username)} disabled={busy} className="rounded-lg border border-destructive/40 px-2 py-1.5 text-destructive hover:bg-destructive/10 disabled:opacity-50">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </Card>
            <Card title="Register a new admin">
              <Field label="Username (min 3)" value={newAdmin.username} onChange={(v) => setNewAdmin({ ...newAdmin, username: v })} />
              <label className="block text-sm">
                <span className="font-medium text-foreground">Password (min 8)</span>
                <input type="password" value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary" />
              </label>
              <button type="button" onClick={() => void createAdmin()} disabled={busy || newAdmin.username.trim().length < 3 || newAdmin.password.length < 8} className="btn-brand inline-flex h-10 w-fit items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Create admin
              </button>
            </Card>
          </div>
        ) : null}

        {/* ── API KEYS TAB ── */}
        {tab === "keys" ? (
          <div className="grid max-w-2xl gap-4">
            <h2 className="text-xl font-semibold">API keys</h2>
            <p className="text-sm text-muted-foreground">
              Set a value to override the server&apos;s .env at runtime (applied immediately). Leave
              blank and save to clear the override and fall back to the environment value.
            </p>
            {keys.map((k) => (
              <Card key={k.key} title={k.label}>
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${k.is_set ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"}`}>
                    {k.is_set ? `set (${k.masked})` : "not set"}
                  </span>
                  <span className="text-xs text-muted-foreground">source: {k.source}</span>
                </div>
                <div className="flex gap-2">
                  <input
                    type="password"
                    placeholder="Enter new value (leave blank to clear)"
                    value={keyInputs[k.key] ?? ""}
                    onChange={(e) => setKeyInputs((p) => ({ ...p, [k.key]: e.target.value }))}
                    className="h-11 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary"
                  />
                  <button type="button" onClick={() => void saveKey(k.key)} disabled={busy} className="btn-brand inline-flex h-11 items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 disabled:opacity-60">
                    <Save className="h-4 w-4" /> Save
                  </button>
                </div>
              </Card>
            ))}
          </div>
        ) : null}

        {/* ── CMS TAB ── */}
        {tab === "cms" ? (
          <CmsTab
            content={content}
            updateContent={updateContent}
            busy={busy}
            cmsMsg={cmsMsg}
            saveCms={saveCms}
            resetCms={resetCms}
          />
        ) : null}

        {/* ── SMTP TAB ── */}
        {tab === "smtp" && smtp ? (
          <div className="grid max-w-xl gap-5">
            <h2 className="text-xl font-semibold">SMTP / email settings</h2>
            {smtpMsg ? <p className="text-sm text-muted-foreground">{smtpMsg}</p> : null}
            <Card title="Server">
              <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                <Field label="Host" value={smtp.host} onChange={(v) => setSmtp({ ...smtp, host: v })} />
                <label className="block text-sm">
                  <span className="font-medium text-foreground">Port</span>
                  <input type="number" value={smtp.port} onChange={(e) => setSmtp({ ...smtp, port: Number(e.target.value) })} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary" />
                </label>
              </div>
              <Field label="Username" value={smtp.username} onChange={(v) => setSmtp({ ...smtp, username: v })} />
              <label className="block text-sm">
                <span className="font-medium text-foreground">Password</span>
                <input type="password" value={smtp.password} onChange={(e) => setSmtp({ ...smtp, password: e.target.value })} className="mt-1 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm focus:border-primary" />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="From email" value={smtp.from_email} onChange={(v) => setSmtp({ ...smtp, from_email: v })} />
                <Field label="From name" value={smtp.from_name} onChange={(v) => setSmtp({ ...smtp, from_name: v })} />
              </div>
              <div className="flex gap-5 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={smtp.use_tls} onChange={(e) => setSmtp({ ...smtp, use_tls: e.target.checked })} /> Use TLS (STARTTLS)</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={smtp.enabled} onChange={(e) => setSmtp({ ...smtp, enabled: e.target.checked })} /> Enabled</label>
              </div>
              <button type="button" onClick={() => void saveSmtp()} disabled={busy} className="btn-brand inline-flex h-10 w-fit items-center gap-2 rounded-lg px-5 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 disabled:opacity-60">
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save SMTP
              </button>
            </Card>
            <Card title="Send a test email">
              <div className="flex gap-2">
                <input value={testTo} onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" className="h-11 flex-1 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary" />
                <button type="button" onClick={() => void testSmtp()} disabled={busy || !testTo.trim()} className="inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-primary/50 disabled:opacity-60">
                  <Send className="h-4 w-4" /> Send test
                </button>
              </div>
            </Card>
          </div>
        ) : null}

        {/* ── RBAC TAB ── */}
        {tab === "rbac" ? (
          <div className="grid gap-5">
            <h2 className="text-xl font-semibold">Role-based access control</h2>
            <p className="text-sm text-muted-foreground">
              Toggle which features each role can use. This is enforced on top of the package/plan
              limits.
            </p>
            {rbacMsg ? <p className="text-sm text-muted-foreground">{rbacMsg}</p> : null}
            {roles.map((role) => (
              <Card key={role.role} title={`${role.label}`}>
                {role.description ? <p className="text-xs text-muted-foreground">{role.description}</p> : null}
                <div className="grid gap-2 sm:grid-cols-2">
                  {allFeatures.map((f) => (
                    <label key={f.key} className="flex items-center gap-2 rounded-lg border border-border/60 px-3 py-2 text-sm">
                      <input type="checkbox" checked={role.features.includes(f.key)} onChange={() => toggleRoleFeature(role.role, f.key)} />
                      {f.label}
                    </label>
                  ))}
                </div>
                <button type="button" onClick={() => void saveRole(role)} disabled={busy} className="btn-brand inline-flex h-9 w-fit items-center gap-2 rounded-lg px-4 text-sm font-semibold text-white shadow-glow transition hover:-translate-y-0.5 disabled:opacity-60">
                  {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save {role.label}
                </button>
              </Card>
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}
