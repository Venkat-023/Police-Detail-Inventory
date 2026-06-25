
# Police Detail Management (PDM) System — Build Plan

## Stack adaptation note
Your spec lists **React Router v6**, but this Lovable project runs on **TanStack Start + TanStack Router** (file-based routing). Swapping in React Router v6 would fight the framework. I'll implement identical UX/routes/guards using TanStack Router — every URL, guard, and behavior stays the same. All other libraries (Zustand, RHF+Zod, TanStack Query, @dnd-kit, react-signature-canvas, react-hot-toast, date-fns, lucide-react) will be used exactly as specified.

If you want strict React Router v6 instead, say so and I'll rescaffold — but it'll mean disabling TanStack file routing.

## Scope
Full frontend, mock-only (no backend, no Lovable Cloud). All 6 roles, all pages, all state machine logic, all role-conditional UI, drag-and-drop reconciliation, signature pad, auto-save, audit trail.

## Build order (single pass)
1. **Design system** — tokens in `src/styles.css` (navy primary, status colors, Inter font via `<link>` in `__root.tsx`), update shadcn variables.
2. **Types & mock data** — `src/types/`, `src/mock/` (users, orgs, ~40 slips spanning all statuses/dates, ~10 invoices, roles, ~30 audit logs).
3. **Mock API** — `src/services/mockApi.ts` with 300–600ms delay, org-scoping, state machine enforcement, reconciliation calc, duplicate detection.
4. **Auth + permissions** — Zustand store w/ localStorage, `useAuth`, `usePermissions` (`can(permission)` only — no role-name checks).
5. **Utilities** — `reconciliation.ts`, `hoursCalc.ts`, `statusConfig.ts`.
6. **UI primitives** — `StatusBadge`, `KPICard`, `Modal`, `Drawer`, `EmptyState`, `SkeletonLoader`, toast setup (top-right 4s).
7. **Layout** — `AppLayout` (sidebar + top header), role-conditional nav, role pill (blue=Utility, green=Vendor), mobile hamburger.
8. **Routes** — TanStack file routes matching every URL in spec:
   - `/login`, `/dashboard`, `/slips`, `/slips/new`, `/slips/$id`, `/slips/$id/edit`
   - `/invoices`, `/invoices/new`, `/invoices/$id`
   - `/admin/users`, `/admin/roles`, `/admin/audit`
   - `_authenticated` layout guards all non-login routes; per-route permission guards redirect on violation.
9. **Dashboards** — 6 distinct components, one per role.
10. **Slips** — list (role-conditional tabs, NG Arborist has no Draft/All), form (5 sections + signature + auto-save 60s + duplicate modal + billable validation), detail (Arborist 5-item checklist gate, audit trail).
11. **Invoices** — list, new form, reconciliation view (@dnd-kit two-pane, mobile Add/Remove fallback, live difference, Paid lock banner, gold Pay button for NG Detail Admin only).
12. **Admin** — Users (drawer add/edit, deactivate modal, org-scoped for Vendor SA), Roles (NG SA only, permissions grouped checklist, delete disabled when assigned), Audit (filters + simulated CSV export).
13. **A11y pass** — labels on every input, focus rings, ARIA on drag lists, status badges always icon+label+color.

## State machine (mock-enforced)
- Slip: Draft→Billable/NonBillable (Vendor GF), Billable→Confirmed/NonBillable (NG Arborist). All else → `INVALID_TRANSITION`. NonBillable terminal.
- Invoice: auto-derived from attached slips & difference; Paid is terminal/locked (409 on mutation).

## What I will NOT do
Backend, email/SMS, real payments, PDF export, 2FA, websockets, i18n. Lovable Cloud stays off.

## Deliverable
~60 files. Single build pass — no stubs. Every role logs in to a working, populated workflow.

Reply **go** to build, or tell me to switch to React Router v6 / change scope.
