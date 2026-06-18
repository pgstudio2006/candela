# Candela by Adrine — Design Constitution (2026)

> **Product:** Navayu-first Hospital Operating System  
> **Rule:** One visual language everywhere. No rainbow modules. No per-area accent colors.  
> **References:** Linear shell · Attio records · Stripe finance · Notion forms · Figma focus · Cursor AI · PostHog density

---

## 1. Aesthetic direction

**Tone:** Refined industrial utilitarian — hospital operators, not consumers.

**Memorable hook:** A near-black clinical terminal with a single vermillion accent (`#E53935`) and paper-calm focus panels for deep work.

**NOT:** Purple SaaS gradients · per-module color stripes · Inter-only generic dashboards · HMS clutter

---

## 2. Unified color system (mandatory)

Use **only** this palette across all 11 modules. Semantic colors are for **meaning**, not decoration.

| Token | Value | Use |
|-------|-------|-----|
| `--c-canvas` | `#09090b` | App background |
| `--c-surface` | `#111113` | Panels, sidebars |
| `--c-surface-raised` | `#18181b` | Cards, inputs |
| `--c-surface-hover` | `#1f1f23` | Hover rows |
| `--c-border` | `rgba(255,255,255,0.08)` | Hairlines |
| `--c-border-strong` | `rgba(255,255,255,0.14)` | Focus borders |
| `--c-text` | `#fafafa` | Primary text |
| `--c-text-secondary` | `#a1a1aa` | Labels |
| `--c-text-tertiary` | `#71717a` | Meta, timestamps |
| `--c-accent` | `#e53935` | Brand, primary CTA, focus ring |
| `--c-accent-hover` | `#c62828` | CTA hover |
| `--c-accent-muted` | `rgba(229,57,53,0.12)` | Accent backgrounds |
| `--c-success` | `#22c55e` | Paid, complete, approved |
| `--c-warning` | `#f59e0b` | Deferred, pending, skip |
| `--c-critical` | `#ef4444` | Errors, reject |
| `--c-info` | `#3b82f6` | Informational only |
| `--c-focus-panel` | `#f7f7f4` | Figma-style consult/forms (light island on dark shell) |
| `--c-focus-ink` | `#26251e` | Text on focus panels |

**Forbidden:** workspace chroma colors, department color coding, gradient heroes in app chrome.

---

## 3. Typography

| Role | Family | Size | Weight |
|------|--------|------|--------|
| UI body | Geist Sans | 14px | 400 |
| UI small | Geist Sans | 12px | 400 |
| Display / page title | Geist Sans | 20–24px | 600, tracking -0.02em |
| Mono (UHID, amounts) | Geist Mono | 12–13px | 500 |

---

## 4. Shell (no module tabs)

```
┌──────────────────────────────────────────────────────────────────┐
│ TOP BAR (48px) — logo · module links · ⌘K · branch · user        │
├──────────────────────────────────────────────────────────────────┤
│ PATIENT BAR (optional, 44px) — active patient context            │
├──────────────────────────────────────────────────────────────────┤
│ MAIN CANVAS — queue-split · record · form · briefing             │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
                              Patient drawer (480px) — P key
```

- **L1:** Top bar module destinations (not tabs underneath)
- **L2:** In-page view switcher (Attio-style) when needed
- **L3:** Patterns on canvas
- **L4:** ⌘K actions

---

## 5. Pattern library

| Pattern | Modules |
|---------|---------|
| `briefing` | Master Control dashboard |
| `queue-split` | Reception queue, doctor queue, counsellor queue, billing queue |
| `record` | Patient profile, master data editors |
| `schema-form` | Registration, MSK, consent, expense entry |
| `stripe-table` | Billing, MIS exports, ledger |
| `focus-workspace` | Doctor consultation (light panel) |
| `handoff-card` | Doctor → counsellor payload review |
| `command-palette` | Global ⌘K |

---

## 6. Motion (framer-motion)

- Page enter: 180ms fade + 4px Y, stagger children 40ms
- Drawer: spring stiffness 380, damping 32
- Palette: scale 0.98→1, 150ms
- Restraint: no bounce on tables

---

## 7. getdesign.md references (in `design/references/`)

| File | Steal |
|------|-------|
| `linear.app` | Shell density, hairlines, dark canvas |
| `stripe` | Financial tables, tabular nums |
| `notion` | Form blocks, properties |
| `vercel` | Empty states, skeletons |
| `figma` | Focus panel contrast |
| `raycast` | Command palette |
| `airtable` | Record layout |
| `posthog` | Command metrics density |
| `cursor` | AI stage timeline colors (muted, on focus panel only) |
| `superhuman` | Queue keyboard speed |

---

## 8. Navayu 8 modules → routes

| # | Module | Route | In-page views |
|---|--------|-------|----------------|
| 1 | **Admin** | `/app/admin` | Dashboard, master data, finance, disease mapping, MIS |
| 2 | **Front Desk** (+ junior doctor) | `/app/frontdesk` | Registration, appointments, billing, queue, closure, **junior intake/MSK** |
| 3 | **Nurse** | `/app/nurse` | Exam handoff, vitals, consent |
| 4 | **Doctor** | `/app/doctor` | Queue, consultation |
| 5 | **Pharmacy** | `/app/pharmacy` | Dispensary, inventory |
| 6 | **Counsellor** | `/app/counsellor` | Counsellor desk |
| 7 | **CRM** | `/app/crm` | Leads, follow-ups, referrals, analytics |
| 8 | **HR** | `/app/hr` | Staff, scheduling, leave |

Top bar = 8 modules only. Views switch **inside** each module (`?view=`), not a second global tab row.

---

## 9. Auth flow (UI only, mock)

1. `/login` — Candela by Adrine  
2. `/tenant` — Navayu credentials  
3. `/branch` — Gurgaon · Pataudi  
4. `/app` — role-based landing  

---

## 10. Implementation checklist

- [x] Scaffold Next.js  
- [x] Unified tokens  
- [ ] Shell + palette + drawer  
- [ ] Auth screens  
- [ ] All 11 module pages (mock data)  
- [ ] Backend (phase 2)
