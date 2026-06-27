# Police Detail Inventory

A full-stack Police Detail Inventory and reconciliation system for managing police detail slips, Arborist review, vendor invoice reconciliation, and National Grid payment release.

The application is built as a local full-stack development system with:

- React/TanStack frontend
- Node.js, Express, and TypeScript backend
- PostgreSQL through Prisma ORM
- Docker-based local database startup
- JWT authentication, role permissions, audit logs, workflow validation, and automated user-story QA

## Current Verification Status

Latest local verification:

- User-story workflow QA: `26 PASS`, `0 FAIL`, `0 GAP`, `1 WARN`
- Backend build: passing
- Frontend build: passing
- Working frontend URL: `http://127.0.0.1:3000/`
- Backend health URL: `http://localhost:3001/health`

The remaining warning is a production-hardening note: entry and exit photos are verified with browser geolocation captured at upload time. The system does not yet parse EXIF GPS metadata from the image file itself, because many mobile cameras and upload flows strip EXIF data.

## Personas

| Persona | Email | Password | Main Responsibility |
| --- | --- | --- | --- |
| Vendor General Foreman | `gf@compilecraft.com` | `Test1234!` | Create drafts, submit billable slips, revise returned slips |
| Vendor Billing | `billing@compilecraft.com` | `Test1234!` | Create invoices and reconcile confirmed slips |
| Vendor Super Admin | `admin@compilecraft.com` | `Test1234!` | Vendor user administration |
| NG Arborist | `arborist@nationalgrid.com` | `Test1234!` | Confirm, reject, or return billable slips |
| NG Detail Admin | `finance@nationalgrid.com` | `Test1234!` | Mark reconciled or partially reconciled invoices as paid |
| NG Super Admin | `super@nationalgrid.com` | `Test1234!` | Full system administration and audit access |

## Requirements

Install these before running the application:

- Node.js 20 or newer
- npm
- Docker Desktop
- Git

Docker Desktop must be running before starting the app because the local PostgreSQL database runs in Docker.

## One-Command Start

From the project root:

```powershell
npm run app:start
```

This command:

- Checks Node, npm, and Docker
- Starts Docker Desktop if available and needed
- Starts or creates the `pdm-postgres` PostgreSQL container
- Installs missing dependencies
- Generates the Prisma client
- Pushes the database schema
- Seeds roles, organisations, and test users
- Starts the backend and frontend dev servers
- Verifies backend health, frontend availability, and login

Open the app here:

```text
http://127.0.0.1:3000/
```

## Automated Verification

After the app is running, execute:

```powershell
npm run test:stories
```

This runs the end-to-end user-story workflow checks across all personas:

- Login for every seeded persona
- Frontend route shell checks
- Empty slip validation
- Partial draft save
- Complete draft save
- Billable evidence enforcement
- Badge plus entry/exit geo-photo submission
- Arborist confirmation
- Arborist non-billable rejection with comments
- Arborist return-for-revision
- Vendor GF resubmission after revision
- Vendor Billing invoice creation
- Confirmed slip availability
- Billing reconciliation
- NG Detail Admin blocked from reconciliation
- NG Detail Admin payment of reconciled invoices
- Partial reconciliation exception handling
- NG Detail Admin payment of partially reconciled invoices
- Invoice audit trail visibility
- Vendor and NG admin access checks

The latest run writes:

```text
USER_STORY_QA_REPORT.md
```

## Manual Setup

Use this only if you do not want the one-command starter.

1. Install backend dependencies:

```powershell
npm install
```

2. Install frontend dependencies:

```powershell
cd frontend
npm install
cd ..
```

3. Start PostgreSQL:

```powershell
docker run -d --name pdm-postgres -e POSTGRES_USER=pdm_user -e POSTGRES_PASSWORD=pdm_password -e POSTGRES_DB=pdm_db -p 5432:5432 postgres:15
```

If the container already exists:

```powershell
docker start pdm-postgres
```

4. Prepare the database:

```powershell
npm run prisma:generate
npm run prisma:push
npm run seed
```

5. Start the backend:

```powershell
npm run dev
```

6. Start the frontend in another terminal:

```powershell
cd frontend
npm run dev -- --host 127.0.0.1 --port 3000
```

## Core Workflows

### Slip Creation

- Vendor GF can save incomplete slips as drafts.
- Empty draft submissions are rejected.
- Billable submission requires complete slip data.
- Billable submission requires police badge verification.
- Billable submission requires entry and exit geo-photo evidence.
- Entry and exit timestamps must match the detail date and be in order.
- Entry and exit coordinates must be within 500 meters of the worksite.
- Duplicate billable slips are blocked unless explicitly bypassed.

### Arborist Review

- NG Arborist can view billable slips.
- NG Arborist can confirm valid billable slips.
- NG Arborist can mark slips non-billable with a required reason.
- NG Arborist can return slips for revision with comments.
- Returned slips can be edited and resubmitted by the Vendor GF.

### Invoice Reconciliation

- Vendor Billing creates invoices.
- Vendor Billing attaches confirmed slips.
- Invoice status is calculated from invoice total hours versus attached slip hours:
  - `NotReconciled`
  - `PartiallyReconciled`
  - `Reconciled`
- NG Detail Admin cannot reconcile invoices.
- Billing users can reconcile invoices.

### Payment

- NG Detail Admin can mark `Reconciled` invoices as `Paid`.
- NG Detail Admin can also mark reviewed `PartiallyReconciled` invoices as `Paid`.
- Paid invoices record paid timestamp and paid-by user.
- Paid invoices cannot be edited or reconciled further.

## Useful Commands

Root project:

```powershell
npm run app:start
npm run test:stories
npm run test:smoke
npm run build
npm run prisma:generate
npm run prisma:push
npm run seed
```

Frontend:

```powershell
cd frontend
npm run build
npm run dev -- --host 127.0.0.1 --port 3000
```

Docker:

```powershell
docker ps
docker logs pdm-postgres
docker start pdm-postgres
docker stop pdm-postgres
```

## Environment

Create `.env` from `.env.example` if it does not exist. Local development uses:

```env
DATABASE_URL="postgresql://pdm_user:pdm_password@localhost:5432/pdm_db"
JWT_SECRET="local-dev-access-secret-change-me-32-chars"
JWT_REFRESH_SECRET="local-dev-refresh-secret-change-me-32-chars"
NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:3000"
CORS_ORIGIN="http://localhost:3000"
AUTH_RATE_LIMIT_MAX=1000
AUTH_RATE_LIMIT_WINDOW_MS=900000
```

## Project Structure

```text
.
|-- frontend/                  React/TanStack frontend
|-- prisma/
|   |-- schema.prisma          Prisma schema
|   `-- seed.ts                Seed roles, organisations, users
|-- scripts/
|   |-- start-and-verify.ps1   One-command local startup
|   |-- smoke-test.ts          Basic backend smoke test
|   `-- story-workflow-check.ts User-story workflow QA
|-- src/
|   `-- server.ts              Express backend API
|-- USER_STORY_QA_REPORT.md    Latest workflow QA output
|-- package.json
`-- README.md
```

## API Overview

The backend API is mounted at:

```text
/api/v1
```

Important endpoints:

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/slips`
- `POST /api/v1/slips`
- `GET /api/v1/slips/:id`
- `PUT /api/v1/slips/:id`
- `PATCH /api/v1/slips/:id/status`
- `GET /api/v1/invoices`
- `POST /api/v1/invoices`
- `GET /api/v1/invoices/:id`
- `POST /api/v1/invoices/:id/reconcile`
- `PATCH /api/v1/invoices/:id/mark-paid`
- `GET /api/v1/users`
- `GET /api/v1/roles`
- `GET /api/v1/organisations`
- `GET /api/v1/audit-logs`

Authenticated write requests require:

```http
Authorization: Bearer <access-token>
X-PDM-Request: true
```

## Troubleshooting

### Docker Desktop is not running

Open Docker Desktop and wait until the engine is ready, then run:

```powershell
npm run app:start
```

### Port 5432 is already in use

Another PostgreSQL service may already be running. Stop it or change the Docker port and `DATABASE_URL`.

### Login says too many requests

The one-command starter sets local development auth limits to a high value. Restart with:

```powershell
npm run app:start
```

### Prisma generate fails with EPERM on Windows

Stop the running backend Node process and retry:

```powershell
npm run prisma:generate
```

This happens when Windows is holding Prisma's generated query-engine DLL open.

## Production Notes

Before production deployment:

- Use strong JWT secrets.
- Use managed PostgreSQL with backups.
- Configure durable object/image storage.
- Restrict CORS to production frontend origins.
- Use HTTPS.
- Tune rate limits for real traffic.
- Add monitoring and structured logging.
- Run Prisma migrations through a controlled release process.
- Decide whether EXIF GPS extraction is required in addition to browser geolocation capture.
