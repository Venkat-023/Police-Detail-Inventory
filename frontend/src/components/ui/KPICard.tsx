import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

interface KPICardProps {
  label: string;
  value: ReactNode;
  accentColor?: string;
  to?: string;
  search?: Record<string, unknown>;
  icon?: ReactNode;
}

export function KPICard({ label, value, accentColor = "#0D47A1", to, search, icon }: KPICardProps) {
  const body = (
    <div
      className="pdm-card p-5 transition hover:shadow-md"
      style={{ borderLeft: `4px solid ${accentColor}` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[28px] font-bold leading-tight text-foreground">{value}</div>
          <div className="mt-1 text-sm text-muted-foreground">{label}</div>
        </div>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </div>
    </div>
  );
  if (!to) return body;
  return (
    <Link to={to as any} search={search as any} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-lg">
      {body}
    </Link>
  );
}
