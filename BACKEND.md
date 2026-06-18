# Candela Backend Foundation

This backend foundation is implemented **inside the Candela Next.js app** using:

- Prisma + PostgreSQL
- Next.js Route Handlers and Server Actions
- Auth.js v5 (`next-auth@beta`) credentials auth with bcrypt password validation

## Environment

Copy `.env.example` to `.env`:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_APP_URL`

## Database Models

### Tenancy & Access

- `Tenant`
- `Branch`
- `User`
- `Role`
- `Permission`
- `RolePermission`
- `UserRole`
- `Session`

### Clinical

- `Patient`
- `Appointment`
- `OpdVisit`
- `Queue`
- `Visit`
- `Vitals`
- `NursingTask`
- `Consent`
- `Prescription`
- `ConsultNote`
- `DocumentTemplate`

### Pharmacy

- `Drug`
- `Inventory`
- `PrescriptionFulfillment`
- `PurchaseOrder`
- `Supplier`
- `StockMovement`

### Counsellor

- `Package`
- `CounsellorSession`
- `Approval`
- `BillingHandoff`

### CRM

- `Agent`
- `Pipeline`
- `Stage`
- `Lead`
- `Activity`
- `Rule`
- `FollowUp`
- `Integration`

### HR

- `Employee`
- `Department`
- `Shift`
- `LeaveRequest`
- `Attendance`
- `PayrollLine`

### Admin

- `AuditLog`
- `FormSchema`
- `StaffAccess`
- `GeoPin`
- `MisAggregate`
- `Department` (department config support via `config` JSON)

### Billing

- `Invoice`
- `InvoiceLine`
- `Payment`

## Auth Implementation

- Auth.js v5 credentials provider in `src/lib/auth/config.ts`
- Password verification uses `bcryptjs.compare`
- Session cookie handled by Auth.js JWT strategy
- DB session audit trail stored in `Session` table on login
- Middleware protection on `/app/*` in `middleware.ts`
- Session compatibility endpoint at `src/app/api/session/compat/route.ts` for existing client store consumers

## Server Foundation Structure

- `src/lib/db.ts` — Prisma singleton
- `src/lib/auth/*` — auth config/session helpers
- `src/server/context.ts` — tenant/branch/user context resolver
- `src/server/errors.ts` — shared typed server errors
- `src/server/validation.ts` — Zod parser helper
- `src/server/actions/auth-actions.ts` — server action auth wrappers

## Seed Coverage (Navayu Demo)

`prisma/seed.ts` seeds:

- Navayu tenant + Gurgaon/Pataudi branches
- Role/permission/access matrix for all 8 modules
- Users with bcrypt passwords (frontdesk, nurse, doctor, pharmacy, counsellor, crm, hr, admin)
- Frontdesk/clinical patient + visit + queue records
- Nurse consent templates + task + vitals
- Doctor consult note + document templates
- Pharmacy formulary, inventory, suppliers, purchase orders, prescriptions, fulfillment, stock moves
- Counsellor package, session, approval, billing handoff
- CRM pipeline, stages, agents, leads, activities, follow-ups, rules, integrations
- HR departments, employees, shifts, leave, attendance, payroll
- Admin staff access, audit logs, schemas, geo pins, MIS aggregates
- Billing invoices, lines, and payments

## Commands

- `npm run db:generate`
- `npm run db:push`
- `npm run db:migrate`
- `npm run db:seed`

## Module Agent Ownership

Backend foundation is complete. Module action wiring ownership:

- **Frontdesk agent**: patient registration, appointment booking, billing/check-in action handlers
- **Nurse agent**: vitals capture, consent progression, nursing task transitions
- **Doctor agent**: consult note drafting/finalization, prescription drafting, template actions
- **Pharmacy agent**: fulfillment workflows, inventory adjustments, PO/stock movement actions
- **Counsellor agent**: package quote sessions, approvals, billing handoff actions
- **CRM agent**: lead capture/routing, follow-up lifecycle, activity timeline actions
- **HR agent**: staff scheduling, leave/attendance/payroll actions
- **Admin/Billing agent**: audit/event actions, form schema ops, MIS rollups, invoice/payment settlement actions
