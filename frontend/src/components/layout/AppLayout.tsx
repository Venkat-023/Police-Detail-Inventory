import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, Receipt, Users, Shield, ScrollText, LogOut, Menu, X, Sparkles,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";
import { AI_ENABLED } from "@/config/ai";

const NAV: { to: string; label: string; icon: ReactNode; perm?: string; exact?: boolean }[] = [
  { to: "/dashboard", label: "Dashboard", icon: <LayoutDashboard size={18} /> },
  { to: "/slips", label: "Police Slip Details", icon: <FileText size={18} />, perm: "slips:read" },
  { to: "/invoices", label: "Invoices & Reconciliation", icon: <Receipt size={18} />, perm: "invoices:read" },
  { to: "/admin/users", label: "User Management", icon: <Users size={18} />, perm: "users:read" },
  { to: "/admin/roles", label: "Role Management", icon: <Shield size={18} />, perm: "roles:read" },
  { to: "/admin/audit", label: "Audit Logs", icon: <ScrollText size={18} />, perm: "audit:read" },
  { to: "/ai-reports", label: "AI Reports", icon: <Sparkles size={18} />, perm: "invoices:read" },
];

export function AppLayout({ children, title }: { children: ReactNode; title: string }) {
  const { can, user } = usePermissions();
  const { logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);

  const canUseAiReports = AI_ENABLED && ["admin@avis.com", "finance@nationalgrid.com"].includes(user?.email ?? "");
  const visible = NAV.filter((n) => (!n.perm || can(n.perm)) && (n.to !== "/ai-reports" || canUseAiReports));

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  const scopePillClass =
    user?.scope === "Vendor"
      ? "bg-green-100 text-green-800 border border-green-300"
      : "bg-blue-100 text-blue-800 border border-blue-300";

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-sidebar-border px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground font-bold">
          PD
        </div>
        <div>
          <div className="font-bold text-foreground leading-tight">PDM</div>
          <div className="text-[11px] text-muted-foreground">Police Detail Mgmt</div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-3" aria-label="Main navigation">
        {visible.map((n) => {
          const active = pathname === n.to || (n.to !== "/dashboard" && pathname.startsWith(n.to));
          return (
            <Link
              key={n.to}
              to={n.to as any}
              onClick={() => setMobileOpen(false)}
              className={`mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm transition ${
                active
                  ? "bg-accent text-primary font-medium border-l-4 border-primary"
                  : "text-foreground hover:bg-muted border-l-4 border-transparent"
              }`}
            >
              {n.icon}
              <span>{n.label}</span>
            </Link>
          );
        })}
      </nav>
      {user && (
        <div className="border-t border-sidebar-border p-4">
          <div className="mb-1 truncate text-sm font-medium text-foreground">{user.name}</div>
          <div className="mb-3 flex items-center gap-2">
            <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-medium ${scopePillClass}`}>
              {user.roleName}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-md border border-border bg-surface px-3 py-1.5 text-sm text-foreground transition hover:bg-muted"
          >
            <LogOut size={16} /> Log out
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-dvh bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar xl:block">
        {SidebarContent}
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 xl:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} aria-hidden="true" />
          <aside className="absolute left-0 top-0 h-full w-72 bg-sidebar shadow-xl">
            {SidebarContent}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-surface px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              className="rounded-md p-2 text-foreground hover:bg-muted xl:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          </div>
          {user && (
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-medium text-foreground">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.organisationName}</div>
              </div>
              <span className={`hidden rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-block ${scopePillClass}`}>
                {user.roleName}
              </span>
              <button onClick={handleLogout} aria-label="Log out" className="rounded-md p-2 text-foreground hover:bg-muted">
                <LogOut size={18} />
              </button>
            </div>
          )}
        </header>

        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
