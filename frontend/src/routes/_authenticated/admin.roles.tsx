import { createFileRoute, redirect } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { mockApi } from "@/services/mockApi";
import { SkeletonRows } from "@/components/ui/SkeletonRows";
import { Drawer } from "@/components/ui/Overlays";
import { ALL_PERMISSION_LIST } from "@/mock/roles";
import { useState } from "react";
import toast from "react-hot-toast";

export const Route = createFileRoute("/_authenticated/admin/roles")({
  ssr: false,
  beforeLoad: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("pdm_auth_v1");
      const perms: string[] = JSON.parse(raw || "{}")?.state?.user?.permissions ?? [];
      if (!perms.includes("roles:read") && !perms.some((p) => p === "*")) throw redirect({ to: "/dashboard" });
    } catch (e) { if (e && typeof e === "object" && "to" in e) throw e; }
  },
  component: RolesPage,
});

const CATEGORIES: Record<string, string[]> = {
  Slips: ALL_PERMISSION_LIST.filter((p) => p.startsWith("slips:")),
  Invoices: ALL_PERMISSION_LIST.filter((p) => p.startsWith("invoices:")),
  Users: ALL_PERMISSION_LIST.filter((p) => p.startsWith("users:")),
  Roles: ALL_PERMISSION_LIST.filter((p) => p.startsWith("roles:")),
  Global: ALL_PERMISSION_LIST.filter((p) => p.startsWith("audit:") || p.startsWith("orgs:")),
};

function RolesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [drawer, setDrawer] = useState<{ mode: "create" | "edit"; role?: any } | null>(null);
  const { data: roles, isLoading } = useQuery({ queryKey: ["roles"], queryFn: () => mockApi.listRoles(user!), enabled: !!user });

  const updateM = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => mockApi.updateRole(user!, id, patch),
    onSuccess: () => { toast.success("Role updated"); qc.invalidateQueries({ queryKey: ["roles"] }); setDrawer(null); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });
  const createM = useMutation({
    mutationFn: (data: any) => mockApi.createRole(user!, data),
    onSuccess: () => { toast.success("Role created"); qc.invalidateQueries({ queryKey: ["roles"] }); setDrawer(null); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (!user) return null;
  return (
    <AppLayout title="Role Management">
      <div className="mb-4 flex justify-end">
        <button onClick={() => setDrawer({ mode: "create" })} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
          + Add Role
        </button>
      </div>
      <div className="pdm-card overflow-x-auto">
        {isLoading || !roles ? <div className="p-4"><SkeletonRows /></div> : (
          <table className="min-w-full text-sm">
            <thead className="border-b border-border bg-muted/40">
              <tr className="text-left text-xs uppercase text-muted-foreground">
                <th className="px-3 py-2.5">Role</th><th className="px-3 py-2.5">Scope</th>
                <th className="px-3 py-2.5">Type</th><th className="px-3 py-2.5">Permissions</th>
                <th className="px-3 py-2.5">Users</th><th className="px-3 py-2.5">Actions</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r: any, i: number) => (
                <tr key={r.id} className={`border-b border-border/40 hover:bg-row-hover ${i % 2 ? "bg-row-alt" : ""}`}>
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2">{r.scope}</td>
                  <td className="px-3 py-2">{r.type}</td>
                  <td className="px-3 py-2"><div className="flex flex-wrap gap-1">{r.permissions.slice(0, 4).map((p: string) => (
                    <span key={p} className="rounded-full bg-muted px-2 py-0.5 text-[10px]">{p}</span>
                  ))}{r.permissions.length > 4 && <span className="text-[10px] text-muted-foreground">+{r.permissions.length - 4}</span>}</div></td>
                  <td className="px-3 py-2">{r.usersAssigned}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <button onClick={() => setDrawer({ mode: "edit", role: r })} className="text-primary hover:underline">Edit</button>
                      <button disabled={r.usersAssigned > 0} title={r.usersAssigned > 0 ? "Cannot delete: users assigned" : ""}
                        className="text-destructive hover:underline disabled:cursor-not-allowed disabled:opacity-40">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Drawer open={!!drawer} onClose={() => setDrawer(null)} title={drawer?.mode === "create" ? "Create Role" : "Edit Role"}>
        {drawer && (
          <RoleForm
            initial={drawer.role}
            onSubmit={(d) => drawer.mode === "create" ? createM.mutate(d) : updateM.mutate({ id: drawer.role.id, patch: d })}
            submitting={createM.isPending || updateM.isPending}
          />
        )}
      </Drawer>
    </AppLayout>
  );
}

function RoleForm({ initial, onSubmit, submitting }: { initial?: any; onSubmit: (d: any) => void; submitting: boolean }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [scope, setScope] = useState<"Vendor" | "Utility">(initial?.scope ?? "Vendor");
  const [perms, setPerms] = useState<string[]>(initial?.permissions ?? []);
  const toggle = (p: string) => setPerms((arr) => arr.includes(p) ? arr.filter((x) => x !== p) : [...arr, p]);

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, scope, permissions: perms }); }} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium">Name</label>
        <input className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">Scope</label>
        <select className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm" value={scope} onChange={(e) => setScope(e.target.value as any)}>
          <option value="Vendor">Vendor</option><option value="Utility">Utility</option>
        </select>
      </div>
      <div>
        <label className="mb-2 block text-sm font-medium">Permissions</label>
        <div className="space-y-3">
          {Object.entries(CATEGORIES).map(([cat, list]) => (
            <div key={cat}>
              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{cat}</div>
              <div className="grid grid-cols-1 gap-1">
                {list.map((p) => (
                  <label key={p} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={perms.includes(p)} onChange={() => toggle(p)} />
                    <span className="font-mono text-xs">{p}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex justify-end pt-2">
        <button type="submit" disabled={submitting} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover disabled:opacity-50">
          {submitting ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
