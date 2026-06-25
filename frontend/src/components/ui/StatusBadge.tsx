import {
  Clock, ArrowUp, CheckCircle, XCircle, AlertCircle, MinusCircle, DollarSign,
  type LucideIcon,
} from "lucide-react";
import { STATUS_CONFIG } from "@/utils/statusConfig";
import type { SlipStatus, InvoiceStatus } from "@/types";

const ICONS: Record<string, LucideIcon> = {
  Clock, ArrowUp, CheckCircle, XCircle, AlertCircle, MinusCircle, DollarSign,
};

export function StatusBadge({ status, size = "md" }: { status: SlipStatus | InvoiceStatus; size?: "sm" | "md" | "lg" }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg) return null;
  const Icon = ICONS[cfg.icon] ?? Clock;
  const sizes = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  };
  const iconSizes = { sm: 12, md: 14, lg: 16 };
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizes[size]}`}
      style={{ color: cfg.color, backgroundColor: cfg.bg }}
      role="status"
      aria-label={`Status: ${cfg.label}`}
    >
      <Icon size={iconSizes[size]} aria-hidden="true" />
      <span>{cfg.label}</span>
    </span>
  );
}
