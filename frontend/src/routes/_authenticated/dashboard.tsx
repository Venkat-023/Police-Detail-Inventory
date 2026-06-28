import { createFileRoute, Link } from "@tanstack/react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { mockApi } from "@/services/mockApi";
import { KPICard } from "@/components/ui/KPICard";
import { SkeletonRows } from "@/components/ui/SkeletonRows";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Plus, ArrowUp, CheckCircle, XCircle, Clock, DollarSign, ScrollText, Users, Building2 } from "lucide-react";
import type { User, PoliceSlip } from "@/types";
import { AiFeatureShowcase } from "@/components/ai/AiFeatureShowcase";

export const Route = createFileRoute("/_authenticated/dashboard")({
  ssr: false,
  component: DashboardPage,
});

function DashboardPage() {
  const { user } = useAuth();
  if (!user) return <AppLayout title="Dashboard"><SkeletonRows /></AppLayout>;
  return (
    <AppLayout title="Dashboard">
      <Greeting user={user} />
      <AiFeatureShowcase />
      {user.roleName === "Vendor GF" && <VendorGFDashboard user={user} />}
      {user.roleName === "Vendor Billing" && <VendorBillingDashboard user={user} />}
      {user.roleName === "Vendor Super Admin" && <VendorSADashboard user={user} />}
      {user.roleName === "NG Arborist" && <NGArboristDashboard user={user} />}
      {user.roleName === "NG Detail Admin" && <NGDADashboard user={user} />}
      {user.roleName === "NG Super Admin" && <NGSADashboard user={user} />}
    </AppLayout>
  );
}

function Greeting({ user }: { user: User }) {
  return (
    <div className="mb-6">
      <h2 className="text-xl font-semibold text-foreground">Welcome, {user.name.split(" ")[0]}</h2>
      <p className="text-sm text-muted-foreground">
        Signed in as <span className="font-medium">{user.roleName}</span> · {user.organisationName}
      </p>
    </div>
  );
}

function useStats(user: User) {
  return useQuery({ queryKey: ["stats", user.id], queryFn: () => mockApi.dashboardStats(user) });
}

function VendorGFDashboard({ user }: { user: User }) {
  const { data: stats, isLoading } = useStats(user);
  const { data: recent } = useQuery({
    queryKey: ["recentSlips", "mine", user.id],
    queryFn: () => mockApi.listSlips(user, { onlyMine: true, pageSize: 10 }).then((r) => r.items),
  });
  if (isLoading || !stats) return <SkeletonRows />;
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard label="My Drafts" value={stats.mySlipsDraft} accentColor="#9E9E9E" to="/slips/" search={{ status: "Draft" }} icon={<Clock size={20} />} />
        <KPICard label="My Billable" value={stats.mySlipsBillable} accentColor="#1976D2" to="/slips/" search={{ status: "Billable" }} icon={<ArrowUp size={20} />} />
        <KPICard label="My Confirmed" value={stats.mySlipsConfirmed} accentColor="#1B5E20" to="/slips/" search={{ status: "Confirmed" }} icon={<CheckCircle size={20} />} />
        <KPICard label="My Non-Billable" value={stats.mySlipsNonBillable} accentColor="#B71C1C" to="/slips/" search={{ status: "NonBillable" }} icon={<XCircle size={20} />} />
      </div>
      <div className="mt-6 flex justify-end">
        <Link to="/slips/new" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
          <Plus size={16} /> New Slip
        </Link>
      </div>
      <RecentSlipsTable title="My Recent Slips" slips={recent ?? []} />
    </>
  );
}

function VendorBillingDashboard({ user }: { user: User }) {
  const { data: stats, isLoading } = useStats(user);
  if (isLoading || !stats) return <SkeletonRows />;
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard label="Confirmed Available" value={stats.invoiceConfirmedAvailable} accentColor="#1B5E20" to="/slips/" search={{ status: "Confirmed" }} />
        <KPICard label="Not Reconciled" value={stats.invoiceNotReconciled} accentColor="#E65100" to="/invoices/" search={{ status: "NotReconciled" }} />
        <KPICard label="Partially Reconciled" value={stats.invoicePartiallyReconciled} accentColor="#F57F17" to="/invoices/" search={{ status: "PartiallyReconciled" }} />
        <KPICard label="Reconciled Awaiting Payment" value={stats.invoiceReconciled} accentColor="#1B5E20" to="/invoices/" search={{ status: "Reconciled" }} />
      </div>
      <div className="mt-6 flex justify-end">
        <Link to="/invoices/new" className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
          <Plus size={16} /> Add Invoice
        </Link>
      </div>
    </>
  );
}

function VendorSADashboard({ user }: { user: User }) {
  const { data: stats, isLoading } = useStats(user);
  if (isLoading || !stats) return <SkeletonRows />;
  return (
    <>
      <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Slips</h3>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard label="Draft" value={stats.orgSlipsDraft} accentColor="#9E9E9E" to="/slips/" search={{ status: "Draft" }} />
        <KPICard label="Billable" value={stats.orgSlipsBillable} accentColor="#1976D2" to="/slips/" search={{ status: "Billable" }} />
        <KPICard label="Confirmed" value={stats.orgSlipsConfirmed} accentColor="#1B5E20" to="/slips/" search={{ status: "Confirmed" }} />
        <KPICard label="Non-Billable" value={stats.orgSlipsNonBillable} accentColor="#B71C1C" to="/slips/" search={{ status: "NonBillable" }} />
      </div>
      <h3 className="mb-2 mt-6 text-sm font-semibold uppercase text-muted-foreground">Invoices</h3>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard label="Not Reconciled" value={stats.invoiceNotReconciled} accentColor="#E65100" />
        <KPICard label="Partially Reconciled" value={stats.invoicePartiallyReconciled} accentColor="#F57F17" />
        <KPICard label="Reconciled" value={stats.invoiceReconciled} accentColor="#1B5E20" />
        <KPICard label="Paid" value={stats.invoicePaid} accentColor="#1A237E" />
      </div>
      <h3 className="mb-2 mt-6 text-sm font-semibold uppercase text-muted-foreground">Organisation</h3>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard label="Active Users" value={stats.activeUsers} accentColor="#0D47A1" to="/admin/users" />
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Link to="/slips/new" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">+ New Slip</Link>
        <Link to="/invoices/new" className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-accent">+ Add Invoice</Link>
        <Link to="/admin/users" className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-accent">+ Add User</Link>
      </div>
    </>
  );
}

function NGArboristDashboard({ user }: { user: User }) {
  const { data: stats, isLoading } = useStats(user);
  const { data: queue } = useQuery({
    queryKey: ["queueBillable", user.id],
    queryFn: () => mockApi.listSlips(user, { status: "Billable", pageSize: 5 }).then((r) => r.items),
  });
  if (isLoading || !stats) return <SkeletonRows />;
  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <KPICard label="Pending Review" value={stats.pendingReview} accentColor="#1976D2" to="/slips/" search={{ status: "Billable" }} icon={<ArrowUp size={20} />} />
        <KPICard label="Confirmed Today" value={stats.confirmedToday} accentColor="#1B5E20" to="/slips/" search={{ status: "Confirmed" }} icon={<CheckCircle size={20} />} />
        <KPICard label="Non-Billable This Month" value={stats.nonBillableThisMonth} accentColor="#B71C1C" to="/slips/" search={{ status: "NonBillable" }} icon={<XCircle size={20} />} />
      </div>
      <div className="mt-6 flex justify-end">
        <Link to="/slips/" search={{ status: "Billable" } as any} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
          Review Billable Slips
        </Link>
      </div>
      <RecentSlipsTable title="Work Queue — Oldest Billable" slips={queue ?? []} />
    </>
  );
}

function NGDADashboard({ user }: { user: User }) {
  const { data: stats, isLoading } = useStats(user);
  if (isLoading || !stats) return <SkeletonRows />;
  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <KPICard label="Reconciled Awaiting Payment" value={stats.reconciledAwaitingPayment} accentColor="#1B5E20" to="/invoices/" search={{ status: "Reconciled" }} />
        <KPICard label="Total Paid This Month" value={`$${stats.totalPaidThisMonth.toLocaleString()}`} accentColor="#1A237E" icon={<DollarSign size={20} />} />
        <KPICard label="Total Pending" value={`$${stats.totalPending.toLocaleString()}`} accentColor="#F57F17" icon={<DollarSign size={20} />} />
      </div>
      <div className="mt-6 flex justify-end">
        <Link to="/invoices/" search={{ status: "Reconciled" } as any} className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">
          Review Reconciled Invoices
        </Link>
      </div>
    </>
  );
}

function NGSADashboard({ user }: { user: User }) {
  const { data: stats, isLoading } = useStats(user);
  if (isLoading || !stats) return <SkeletonRows />;
  return (
    <>
      <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Global KPIs</h3>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KPICard label="Total Slips" value={stats.totalSlips} accentColor="#0D47A1" to="/slips/" icon={<ScrollText size={20} />} />
        <KPICard label="Total Invoices" value={stats.totalInvoices} accentColor="#0D47A1" to="/invoices/" />
        <KPICard label="Active Vendors" value={stats.activeVendors} accentColor="#1B5E20" icon={<Building2 size={20} />} />
        <KPICard label="Active Users" value={stats.activeUsers} accentColor="#1976D2" to="/admin/users" icon={<Users size={20} />} />
      </div>
      <h3 className="mb-2 mt-6 text-sm font-semibold uppercase text-muted-foreground">System Health</h3>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <KPICard label="Failed Logins (24h)" value={stats.failedLogins24h} accentColor="#B71C1C" />
        <KPICard label="Audit Entries Today" value={stats.auditEntriesToday} accentColor="#1976D2" to="/admin/audit" />
      </div>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <Link to="/admin/users" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover">Manage Users</Link>
        <Link to="/admin/roles" className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-accent">Manage Roles</Link>
        <Link to="/admin/audit" className="rounded-md border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-accent">Audit Logs</Link>
      </div>
    </>
  );
}

function RecentSlipsTable({ title, slips }: { title: string; slips: PoliceSlip[] }) {
  return (
    <div className="mt-8">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <div className="pdm-card overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr className="text-left text-xs uppercase text-muted-foreground">
              <th className="px-4 py-2.5">Slip #</th>
              <th className="px-4 py-2.5">Officer</th>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Hours</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {slips.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No slips yet.</td></tr>
            )}
            {slips.map((s, idx) => (
              <tr key={s.id} className={`border-b border-border/50 hover:bg-row-hover ${idx % 2 ? "bg-row-alt" : ""}`}>
                <td className="px-4 py-2 font-mono text-xs">{s.slipNumber}</td>
                <td className="px-4 py-2">{s.officerName}</td>
                <td className="px-4 py-2">{s.detailDate}</td>
                <td className="px-4 py-2">{s.hoursToBeBilled.toFixed(2)}</td>
                <td className="px-4 py-2"><StatusBadge status={s.status} size="sm" /></td>
                <td className="px-4 py-2 text-right">
                  <Link to="/slips/$id" params={{ id: s.id }} className="text-primary hover:underline">View</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
