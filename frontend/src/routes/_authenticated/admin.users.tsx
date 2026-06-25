import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockApi } from "@/services/mockApi";
import { SkeletonRows } from "@/components/ui/SkeletonRows";
import { Drawer, Modal } from "@/components/ui/Overlays";
import { useState } from "react";
import toast from "react-hot-toast";
import type { User, Role } from "@/types";

export const Route = createFileRoute("/_authenticated/admin/users")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("pdm_auth_v1");
      const perms: string[] = JSON.parse(raw || "{}")?.state?.user?.permissions ?? [];
      if (!perms.includes("users:read") && !perms.some((p) => p === "*")) throw redirect({ to: "/dashboard" });
    } catch (e) { if (e && typeof e === "object" && "to" in e) throw e; }
  },
  component: UsersPage,
});

function UsersPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [drawer, setDrawer] = useState<{ mode: "create" | "edit"; user?: User } | null>(null);
  const [deactivate, setDeactivate] = useState<User | null>(null);

  const { data: users, isLoading } = useQuery({
    queryKey: ["users"], queryFn: () => mockApi.listUsers(user!), enabled: !!user,
  });
  const { data: roles } = useQuery({ queryKey: ["roles"], queryFn: () => mockApi.listRoles(user!), enabled: !!user });
  const { data: orgs } = useQuery({ queryKey: ["orgs"], queryFn: () => mockApi.listOrganisations(), enabled: !!user });

  const updateM = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => mockApi.updateUser(user!, id, patch),
    onSuccess: () => { toast.success("User updated"); qc.invalidateQueries({ queryKey: ["users"] }); setDrawer(null); setDeactivate(null); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const createM = useMutation({
    mutationFn: (data: any) => mockApi.createUser(user!, data),
    onSuccess: () => { toast.success("User created"); qc.invalidateQueries({ queryKey: ["users"] }); setDrawer(null); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (!user) return null;
  return (
    <AppLayout title="User Management">
      <div className="mb-4 flex justify-end">
        <button onClick={() => setDrawer({ mode: "create" })} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
          + Add User
        </button>
      </div>

      <div className="pdm-card overflow-x-auto">
        {isLoading || !users ? <div className="p-4"><SkeletonRows /></div> : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2.5">Name</th><th className="px-3 py-2.5">Email</th><th className="px-3 py-2.5">Phone</th>
                <th className="px-3 py-2.5">Organisation</th><th className="px-3 py-2.5">Role</th>
                <th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Created</th><th className="px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr key={u.id} className={`border-b border-border/40 hover:bg-row-hover ${i % 2 ? "bg-row-alt" : ""}`}>
                  <td className="px-3 py-2 font-medium">{u.name}</td>
                  <td className="px-3 py-2">{u.email}</td>
                  <td className="px-3 py-2">{u.phone}</td>
                  <td className="px-3 py-2">{u.organisationName}</td>
                  <td className="px-3 py-2">{u.roleName}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${u.active ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                      {u.active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{u.createdAt.slice(0,10)}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button onClick={() => setDrawer({ mode: "edit", user: u })} className="text-primary hover:underline">Edit</button>
                      <button onClick={() => setDeactivate(u)} className="text-destructive hover:underline">
                        {u.active ? "Deactivate" : "Reactivate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Drawer open={!!drawer} onClose={() => setDrawer(null)} title={drawer?.mode === "create" ? "Add User" : "Edit User"}>
        {drawer && (
          <UserForm
            initial={drawer.user}
            roles={(roles ?? []) as any}
            orgs={orgs ?? []}
            isVendor={user.scope === "Vendor"}
            currentOrgId={user.organisationId}
            onSubmit={(data) => drawer.mode === "create" ? createM.mutate(data) : updateM.mutate({ id: drawer.user!.id, patch: { name: data.name, phone: data.phone, roleId: data.roleId } })}
            submitting={createM.isPending || updateM.isPending}
          />
        )}
      </Drawer>

      <Modal open={!!deactivate} onClose={() => setDeactivate(null)} title={deactivate?.active ? "Deactivate User" : "Reactivate User"}
        footer={
          <>
            <button onClick={() => setDeactivate(null)} className="rounded-md px-4 py-2 text-sm">Cancel</button>
            <button onClick={() => deactivate && updateM.mutate({ id: deactivate.id, patch: { active: !deactivate.active } })}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground">
              Confirm
            </button>
          </>
        }
      >
        <p className="text-sm">
          {deactivate?.active ? `Deactivate ${deactivate?.name}? They will lose access immediately.` : `Reactivate ${deactivate?.name}?`}
        </p>
      </Modal>
    </AppLayout>
  );
}

function UserForm({ initial, roles, orgs, isVendor, currentOrgId, onSubmit, submitting }: {
  initial?: User; roles: Role[]; orgs: any[]; isVendor: boolean; currentOrgId: string;
  onSubmit: (data: any) => void; submitting: boolean;
}) {
  const [data, setData] = useState({
    name: initial?.name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    roleId: initial?.roleId ?? roles[0]?.id ?? "",
    organisationId: initial?.organisationId ?? (isVendor ? currentOrgId : orgs[0]?.id ?? ""),
    active: initial?.active ?? true,
  });
  const cls = "w-full rounded-md border border-input bg-surface px-3 py-2 text-sm";
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit(data); }} className="space-y-3">
      <div><label className="mb-1 block text-sm font-medium">Name</label>
        <input className={cls} value={data.name} onChange={(e) => setData({ ...data, name: e.target.value })} required /></div>
      <div><label className="mb-1 block text-sm font-medium">Email</label>
        <input className={`${cls} ${initial ? "bg-muted cursor-not-allowed" : ""}`} type="email"
          value={data.email} onChange={(e) => setData({ ...data, email: e.target.value })} disabled={!!initial} required />
        {initial && <p className="mt-1 text-xs text-muted-foreground">Email cannot be changed.</p>}
      </div>
      <div><label className="mb-1 block text-sm font-medium">Phone</label>
        <input className={cls} value={data.phone} onChange={(e) => setData({ ...data, phone: e.target.value })} required /></div>
      {!isVendor && (
        <div><label className="mb-1 block text-sm font-medium">Organisation</label>
          <select className={cls} value={data.organisationId} onChange={(e) => setData({ ...data, organisationId: e.target.value })}>
            {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </select>
        </div>
      )}
      <div><label className="mb-1 block text-sm font-medium">Role</label>
        <select className={cls} value={data.roleId} onChange={(e) => setData({ ...data, roleId: e.target.value })}>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
