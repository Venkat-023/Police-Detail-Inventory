# Police Detail Management Portal

A full-stack Police Detail Management (PDM) portal for creating police detail slips, reviewing billable work, reconciling invoices, and releasing payments through role-based workflows.

The system includes:

- A React/TanStack frontend for operational users.
- A Node.js/Express/TypeScript backend API.
- PostgreSQL persistence through Prisma ORM.
- Docker-based local database setup.
- JWT authentication, role-based permissions, audit logging, and invoice reconciliation.

## Table of Contents

- [System Overview](#system-overview)
- [Core Workflows](#core-workflows)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Requirements](#requirements)
- [Environment Variables](#environment-variables)
- [Local Setup](#local-setup)
- [Run the Application](#run-the-application)
- [Seeded Test Users](#seeded-test-users)
- [Useful Commands](#useful-commands)
- [API Overview](#api-overview)
- [Feature Coverage](#feature-coverage)
- [Troubleshooting](#troubleshooting)

## System Overview

The PDM portal supports a complete operational flow for police detail work:

1. A General Foreman creates a police detail slip.
2. The slip can be saved as a draft or submitted as billable.
3. An Arborist reviews billable slips and confirms eligible work.
4. Vendor billing/admin users create invoices and attach confirmed slips.
5. The system reconciles invoice hours against attached slip hours.
6. A National Grid Detail Admin marks reconciled invoices as paid.

The backend enforces workflow rules, organisation scoping, status transitions, and audit logging. The frontend provides role-specific dashboards and workflow screens for each persona.

## Core Workflows

### Slip Creation

- Create a new police detail slip.
- Capture region, district, arborist, work type, budget code, circuit, worksite, crew, officer, time, and billing details.
- Save a slip as `Draft`.
- Edit draft slips.
- Capture officer signature.
- Submit a slip as `Billable`.
- Prevent duplicate slips for the same officer/date/time unless explicitly bypassed.

### Arborist Review

- View billable slips waiting for review.
- Open slip details.
- Confirm a billable slip as `Confirmed`.
- Mark a slip as `NonBillable` with a required reason.
- Audit review transitions.

### Invoice Reconciliation

- Create invoices for a vendor organisation.
- Attach available confirmed slips to an invoice.
- Reconcile invoice total hours against attached slip billable hours.
- Set invoice status to:
  - `NotReconciled`
  - `PartiallyReconciled`
  - `Reconciled`
  - `Paid`

### Payment Release

- NG Detail Admin reviews reconciled invoices.
- Mark reconciled invoices as `Paid`.
- Record paid timestamp and paid-by user.
- Prevent paid invoices from being edited or reconciled further.

## Technology Stack

### Frontend

- React 19
- TanStack Router
- TanStack React Query
- Vite
- Tailwind CSS
- Radix UI components
- Lucide icons
- Zustand auth store
- React Hook Form and Zod validation

### Backend

- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT authentication
- bcrypt password hashing
- Zod request validation
- Helmet, CORS, Morgan, cookie-parser, rate limiting
- AWS S3 presigned upload support for production document/image uploads

### Local Infrastructure

- Docker Desktop
- PostgreSQL 15 container

## Project Structure

```text
.
├── frontend/                 # React/TanStack frontend application
│   ├── src/
│   │   ├── components/       # Shared UI and workflow components
│   │   ├── hooks/            # Auth and utility hooks
│   │   ├── routes/           # TanStack file routes
│   │   ├── services/         # API adapter used by the UI
│   │   ├── store/            # Zustand auth store
│   │   ├── types/            # Domain types
│   │   └── utils/            # Status, hours, reconciliation helpers
│   ├── package.json
│   └── vite.config.ts
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Seed roles, organisations, users
├── scripts/
│   ├── smoke-test.ts         # Backend smoke test helper
│   └── dev-memory-api.mjs    # Optional in-memory local API fallback
├── src/
│   └── server.ts             # Express API server
├── .env.example
├── package.json              # Backend package scripts
└── README.md
```

## Requirements

Install these before running the system:

- Windows 10/11, macOS, or Linux
- Node.js 20 or newer
- npm
- Docker Desktop
- Git

Recommended:

- Docker Desktop with Linux containers enabled
- At least 4 GB free memory for Docker and the dev servers

## Environment Variables

Create a `.env` file in the project root. You can copy from `.env.example`.

```bash
cp .env.example .env
```

For local Docker-based development, use:

```env
DATABASE_URL="postgresql://pdm_user:pdm_password@localhost:5432/pdm_db"
JWT_SECRET="local-dev-access-secret-change-me-32-chars"
JWT_REFRESH_SECRET="local-dev-refresh-secret-change-me-32-chars"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""
AWS_REGION="us-east-1"
AWS_S3_BUCKET="pdm-signatures"
S3_SIGNED_URL_EXPIRY=3600
NODE_ENV="development"
PORT=3001
FRONTEND_URL="http://localhost:3000"
CORS_ORIGIN="http://localhost:3000"
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
AUTH_RATE_LIMIT_WINDOW_MS=900000
```

## Local Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <repository-folder>
```

### 2. Install Backend Dependencies

From the project root:

```bash
npm install
```

### 3. Install Frontend Dependencies

```bash
cd frontend
npm install
cd ..
```

### 4. Start PostgreSQL with Docker

Make sure Docker Desktop is running, then start a local PostgreSQL 15 container:

```bash
docker run -d --name pdm-postgres ^
  -e POSTGRES_USER=pdm_user ^
  -e POSTGRES_PASSWORD=pdm_password ^
  -e POSTGRES_DB=pdm_db ^
  -p 5432:5432 ^
  postgres:15
```

PowerShell users can also run it on one line:

```powershell
docker run -d --name pdm-postgres -e POSTGRES_USER=pdm_user -e POSTGRES_PASSWORD=pdm_password -e POSTGRES_DB=pdm_db -p 5432:5432 postgres:15
```

If the container already exists:

```bash
docker start pdm-postgres
```

### 5. Generate Prisma Client

```bash
npm run prisma:generate
```

### 6. Push the Database Schema

```bash
npm run prisma:push
```

### 7. Seed Roles, Organisations, and Users

```bash
npm run seed
```

All seeded users use this password:

```text
Test1234!
```

## Run the Application

Open two terminals.

### Terminal 1: Backend API

From the project root:

```bash
npm run dev
```

The backend runs at:

```text
http://localhost:3001
```

Health check:

```text
http://localhost:3001/health
```

### Terminal 2: Frontend

From the `frontend` folder:

```bash
npm run dev -- --host 127.0.0.1 --port 3000
```

Open:

```text
http://127.0.0.1:3000/
```

The frontend Vite proxy forwards `/api` requests to the backend at `http://localhost:3001`.

## Seeded Test Users

| Persona | Email | Password | Organisation |
| --- | --- | --- | --- |
| Vendor General Foreman | `gf@compilecraft.com` | `Test1234!` | Compile Craft |
| Vendor Billing | `billing@compilecraft.com` | `Test1234!` | Compile Craft |
| Vendor Super Admin | `admin@compilecraft.com` | `Test1234!` | Compile Craft |
| NG Arborist | `arborist@nationalgrid.com` | `Test1234!` | National Grid |
| NG Detail Admin | `finance@nationalgrid.com` | `Test1234!` | National Grid |
| NG Super Admin | `super@nationalgrid.com` | `Test1234!` | National Grid |

## Suggested Manual Test Flow

### 1. Create and Submit a Slip

1. Login as `gf@compilecraft.com`.
2. Go to `Police Slip Details`.
3. Select `New Slip`.
4. Fill all required fields.
5. Draw or save an officer signature.
6. Select `Submit as Billable`.
7. Confirm the slip appears with status `Billable`.

### 2. Confirm the Slip

1. Login as `arborist@nationalgrid.com`.
2. Go to the Billable review queue.
3. Open the slip.
4. Select `Mark as Confirmed`.
5. Confirm the slip status becomes `Confirmed`.

### 3. Create and Reconcile an Invoice

1. Login as `admin@compilecraft.com`.
2. Go to `Invoices & Reconciliation`.
3. Create an invoice.
4. Open the invoice detail screen.
5. Attach a confirmed slip.
6. Save reconciliation.
7. Confirm the invoice status becomes `Reconciled` when hours match.

### 4. Mark Invoice Paid

1. Login as `finance@nationalgrid.com`.
2. Open a `Reconciled` invoice.
3. Select `Mark as Paid`.
4. Confirm the invoice status becomes `Paid`.

## Useful Commands

### Backend

```bash
npm run dev
npm run build
npm run start
npm run prisma:generate
npm run prisma:push
npm run seed
npm run test:smoke
```

### Frontend

```bash
cd frontend
npm run dev
npm run build
npm run preview
npm run lint
```

### Docker

```bash
docker ps
docker logs pdm-postgres
docker start pdm-postgres
docker stop pdm-postgres
```

To reset the local database completely:

```bash
docker stop pdm-postgres
docker rm pdm-postgres
docker run -d --name pdm-postgres -e POSTGRES_USER=pdm_user -e POSTGRES_PASSWORD=pdm_password -e POSTGRES_DB=pdm_db -p 5432:5432 postgres:15
npm run prisma:push
npm run seed
```

## API Overview

The backend API is mounted at:

```text
/api/v1
```

Important endpoint groups:

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

## Feature Coverage

Implemented:

- Role-based login and dashboards
- Slip creation and draft saving
- Billable slip submission
- Officer signature capture
- Arborist review and confirmation
- Non-billable transition with reason
- Invoice creation
- Confirmed slip attachment
- Hour-based reconciliation
- Paid status transition
- User, role, organisation, and audit administration
- Vendor organisation scoping
- Audit log persistence

Known gaps and next improvements:

- Add a `Returned for Revision` workflow.
- Add stakeholder comments/notes on slips.
- Add explicit signature signer name, signed date, and signed timestamp fields.
- Add billing period and payment reference fields on invoices.
- Add slip amount/rate modelling if reconciliation must compare money instead of hours.
- Decide whether Vendor Billing should receive `invoices:reconcile`.
- Decide whether NG Detail Admin may move `PartiallyReconciled` invoices directly to `Paid`, or whether the current stricter `Reconciled -> Paid` rule should remain.

For detailed story mapping, see:

```text
USER_STORY_FEATURE_NOTES.md
```

## Troubleshooting

### Docker says permission denied

Make sure Docker Desktop is open and fully started. On Windows, restart Docker Desktop and try again.

### Port 5432 is already in use

Another PostgreSQL instance is already running. Either stop it or change the `DATABASE_URL` and Docker port mapping.

### Backend cannot connect to database

Check the database container:

```bash
docker ps
docker logs pdm-postgres
```

Then confirm `.env` contains:

```env
DATABASE_URL="postgresql://pdm_user:pdm_password@localhost:5432/pdm_db"
```

### Login returns too many requests

The backend has an auth rate limiter. Wait for the configured window or restart the backend dev server during local development.

### Frontend cannot call the backend

Confirm:

- Backend is running at `http://localhost:3001`.
- Frontend is running at `http://127.0.0.1:3000`.
- `frontend/vite.config.ts` contains the `/api` proxy.

### Prisma seed fails with spawn EPERM on Windows

Run the seed command from an elevated terminal:

```bash
npm run seed
```

## Production Notes

Before production deployment:

- Use strong JWT secrets.
- Use managed PostgreSQL with backups.
- Configure AWS S3 credentials for real uploads.
- Restrict CORS to production frontend origins.
- Use HTTPS.
- Review rate-limit settings.
- Add monitoring and structured logging.
- Run database migrations through a controlled release process.
