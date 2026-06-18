# Candela by Adrine

Navayu Healthcare Operating System — **UI phase** (mock data).

## 8 modules

| Module | Route | Notes |
|--------|-------|--------|
| Admin | `/app/admin` | Master data, dashboard, finance, MIS |
| Front Desk | `/app/frontdesk` | Registration, billing, queue — **includes junior doctor intake** |
| Nurse | `/app/nurse` | Handoff, vitals, consent |
| Doctor | `/app/doctor` | Queue, consultation |
| Pharmacy | `/app/pharmacy` | Dispensary, inventory |
| Counsellor | `/app/counsellor` | Package & conversion |
| CRM | `/app/crm` | Leads, follow-ups, referrals |
| HR | `/app/hr` | Staff, scheduling, leave |

Each module uses **in-page views** (`?view=`) — no module tabs under the top bar.

## Run

```bash
npm install
npm run dev
```

`/login` → Navayu → branch → pick one of **8 roles** → app.

## Design

[`design/CANDELA_DESIGN.md`](design/CANDELA_DESIGN.md) — single unified palette, no per-module colors.
