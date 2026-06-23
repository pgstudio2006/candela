"use client";

import { BillingBadge, QueueSplit } from "@/components/candela/queue-split";
import { StatusPill } from "@/components/candela/status-pill";
import {
  Card,
  GhostButton,
  MetricTile,
  PrimaryButton,
} from "@/components/candela/ui-primitives";
import {
  COUNSELLOR_HANDOFF,
  DEPARTMENTS,
  DOCTORS_BY_DEPT,
  MASTER_KPIS,
  QUEUE_PATIENTS,
} from "@/design-system/mock-data";
import { useState } from "react";

/* ─── Admin ─── */
export function AdminDashboardView() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {MASTER_KPIS.map((k) => (
        <MetricTile key={k.label} {...k} />
      ))}
    </div>
  );
}

export function AdminMasterDataView() {
  return (
    <Card className="p-4">
      <ul className="space-y-2 text-[13px] text-[var(--c-text-secondary)]">
        <li>· Departments: Spine & Joint Care, Wellness & Metabolic</li>
        <li>· Doctor ↔ department mapping</li>
        <li>· Role ↔ department mapping</li>
        <li>· Expense categories</li>
        <li>· Dashboard block toggles</li>
      </ul>
    </Card>
  );
}

export function AdminFinanceView() {
  return (
    <Card className="p-4">
      <p className="mb-4 text-[12px] text-[var(--c-text-tertiary)]">
        Expense entry · supplier verification · approve/reject · ledger export
      </p>
      <div className="flex gap-2">
        <PrimaryButton>New expense</PrimaryButton>
        <GhostButton>Approval queue (7)</GhostButton>
      </div>
    </Card>
  );
}

export function AdminDiseaseMappingView() {
  return (
    <Card className="p-4 text-[13px] text-[var(--c-text-secondary)]">
      Navayu geography-focused disease clustering · exportable mapping data
    </Card>
  );
}

export function AdminMisView() {
  const reports = ["Billing ledger", "Queue throughput", "Deferred leakage", "Conversion funnel"];
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {reports.map((r) => (
        <Card key={r} className="flex items-center justify-between p-4" hover>
          <span className="text-[13px] text-[var(--c-text-secondary)]">{r}</span>
          <GhostButton className="!h-7 !text-[11px]">Export</GhostButton>
        </Card>
      ))}
    </div>
  );
}

/* ─── Front desk ─── */
export function FrontdeskRegistrationView() {
  const [dept, setDept] = useState("");
  const [opdOn, setOpdOn] = useState(false);
  const doctors = dept ? DOCTORS_BY_DEPT[dept] ?? [] : [];
  const canStart = opdOn && dept && doctors.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-[var(--c-focus-border)] bg-[var(--c-focus-panel)] p-5 text-[var(--c-focus-ink)]">
        <h2 className="mb-4 text-[13px] font-semibold">Patient details</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {["Full name", "Mobile", "WhatsApp", "Email", "Age", "Gender"].map((f) => (
            <label key={f} className="block">
              <span className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-[var(--c-focus-muted)]">
                {f}
              </span>
              <input className="h-8 w-full rounded-md border border-[var(--c-focus-border)] bg-white px-2 text-[13px] outline-none focus:border-[var(--c-accent)]" />
            </label>
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <Card className="p-4">
          <select
            value={dept}
            onChange={(e) => setDept(e.target.value)}
            className="mb-3 h-9 w-full rounded-md border border-[var(--c-border)] bg-[var(--c-surface-raised)] px-2 text-[13px]"
          >
            <option value="">Department</option>
            {DEPARTMENTS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
          <select className="mb-3 h-9 w-full rounded-md border border-[var(--c-border)] bg-[var(--c-surface-raised)] px-2 text-[13px]">
            <option value="">Doctor (required)</option>
            {doctors.map((d) => (
              <option key={d.id}>{d.name}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={opdOn} onChange={(e) => setOpdOn(e.target.checked)} />
            OPD toggle
          </label>
        </Card>
        <PrimaryButton disabled={!canStart}>OPD Start → billing-first</PrimaryButton>
      </div>
    </div>
  );
}

export function FrontdeskAppointmentsView() {
  return (
    <Card className="p-4">
      <p className="mb-3 text-[13px] text-[var(--c-text-secondary)]">
        Book · check-in → billing-first · new registration from appointment screen
      </p>
      <PrimaryButton>Today&apos;s check-ins (1)</PrimaryButton>
    </Card>
  );
}

export function FrontdeskBillingView() {
  const [selected, setSelected] = useState(QUEUE_PATIENTS[0]?.id ?? "");
  const patient = QUEUE_PATIENTS.find((p) => p.id === selected);
  if (!patient) {
    return (
      <Card className="p-4 text-[13px] text-[var(--c-text-secondary)]">
        No patients in billing queue.
      </Card>
    );
  }
  return (
    <QueueSplit
      listTitle="Billing queue"
      items={QUEUE_PATIENTS}
      selectedId={selected}
      onSelect={setSelected}
      renderItem={(item) => {
        const p = QUEUE_PATIENTS.find((x) => x.id === item.id)!;
        return <p className="text-[13px] font-medium">{p.name}</p>;
      }}
      detail={
        <Card className="p-5">
          <h2 className="text-lg font-semibold">{patient.name}</h2>
          <p className="mt-4 font-mono text-[13px]">OPD consultation · ₹800</p>
          <div className="mt-6 flex gap-2">
            <PrimaryButton>Collect payment</PrimaryButton>
            <GhostButton>Skip (defer)</GhostButton>
          </div>
        </Card>
      }
    />
  );
}

export function FrontdeskQueueView() {
  const [selected, setSelected] = useState(QUEUE_PATIENTS[0]?.id ?? "");
  const patient = QUEUE_PATIENTS.find((p) => p.id === selected);
  if (!patient) {
    return (
      <Card className="p-4 text-[13px] text-[var(--c-text-secondary)]">
        No patients in queue.
      </Card>
    );
  }
  return (
    <QueueSplit
      listTitle="By doctor · FIFO"
      items={QUEUE_PATIENTS}
      selectedId={selected}
      onSelect={setSelected}
      renderItem={(item) => {
        const p = QUEUE_PATIENTS.find((x) => x.id === item.id)!;
        return (
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px]">#{p.token}</span>
            <span className="text-[13px]">{p.name}</span>
            {p.appointment && <StatusPill variant="info">Appt</StatusPill>}
          </div>
        );
      }}
      detail={
        <Card className="p-5">
          <h2 className="text-lg font-semibold">{patient.name}</h2>
          <div className="mt-2 flex gap-2">
            <BillingBadge status={patient.billing} />
            <StatusPill variant={patient.exam === "done" ? "success" : "warning"}>
              Exam {patient.exam}
            </StatusPill>
          </div>
          <PrimaryButton className="mt-4">Examination & history handoff</PrimaryButton>
        </Card>
      }
    />
  );
}

export function FrontdeskClosureView() {
  return (
    <Card className="max-w-xl p-5">
      <h2 className="font-semibold">Post-counsellor billing</h2>
      <p className="mt-2 font-mono text-[13px]">Package due · ₹50,000 partial</p>
      <div className="mt-4 flex gap-2">
        <PrimaryButton>Full payment</PrimaryButton>
        <GhostButton>Partial · IPD convert</GhostButton>
      </div>
    </Card>
  );
}

export function FrontdeskIntakeView() {
  return (
    <div className="rounded-xl border border-[var(--c-focus-border)] bg-[var(--c-focus-panel)] p-5 text-[var(--c-focus-ink)]">
      <h2 className="mb-4 text-[13px] font-semibold">Junior doctor · MSK intake</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {["Chief complaint", "Pain severity (VAS)", "ODI score", "Functional difficulty", "Red flags"].map(
          (f) => (
            <label key={f} className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-wider text-[var(--c-focus-muted)]">
                {f}
              </span>
              <input className="h-8 w-full rounded-md border border-[var(--c-focus-border)] bg-white px-2 text-[13px]" />
            </label>
          ),
        )}
      </div>
      <PrimaryButton className="mt-4">Mark ready for senior doctor</PrimaryButton>
    </div>
  );
}

/* ─── Nurse ─── */
export function NurseHandoffView() {
  return (
    <Card className="p-4">
      <p className="text-[13px] text-[var(--c-text-secondary)]">
        Patients awaiting examination & history from reception handoff
      </p>
      <ul className="mt-3 space-y-2">
        {QUEUE_PATIENTS.filter((p) => p.exam === "pending").map((p) => (
          <li key={p.id} className="flex justify-between rounded-md border border-[var(--c-border)] px-3 py-2 text-[13px]">
            <span>{p.name}</span>
            <PrimaryButton className="!h-7 !text-[11px]">Start assessment</PrimaryButton>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function NurseVitalsView() {
  return (
    <div className="rounded-xl border border-[var(--c-focus-border)] bg-[var(--c-focus-panel)] p-5 text-[var(--c-focus-ink)]">
      <h2 className="mb-3 text-[13px] font-semibold">Vitals & nursing assessment</h2>
      <div className="grid grid-cols-3 gap-3">
        {["BP", "Pulse", "SpO2", "Temp", "Weight", "Notes"].map((f) => (
          <input key={f} placeholder={f} className="h-8 rounded-md border border-[var(--c-focus-border)] bg-white px-2 text-[13px]" />
        ))}
      </div>
    </div>
  );
}

export function NurseConsentView() {
  return (
    <Card className="p-5">
      <div className="rounded-lg border border-dashed border-[var(--c-border)] p-8 text-center text-[12px] text-[var(--c-text-tertiary)]">
        Treatment consent · signature capture · upload scan
      </div>
      <PrimaryButton className="mt-4">Capture signature</PrimaryButton>
    </Card>
  );
}

/* ─── Doctor ─── */
export function DoctorQueueView() {
  const [selected, setSelected] = useState(QUEUE_PATIENTS[0]?.id ?? "");
  const patient = QUEUE_PATIENTS.find((p) => p.id === selected);
  if (!patient) {
    return (
      <Card className="p-4 text-[13px] text-[var(--c-text-secondary)]">
        No patients in doctor queue.
      </Card>
    );
  }
  return (
    <QueueSplit
      listTitle="Doctor queue"
      items={QUEUE_PATIENTS}
      selectedId={selected}
      onSelect={setSelected}
      renderItem={(item) => {
        const p = QUEUE_PATIENTS.find((x) => x.id === item.id)!;
        return <p className="text-[13px]">{p.name}</p>;
      }}
      detail={
        <Card className="p-5">
          <h2 className="text-lg font-semibold">{patient.name}</h2>
          <div className="mt-2 flex gap-2">
            <BillingBadge status={patient.billing} />
            <StatusPill variant={patient.exam === "done" ? "success" : "warning"}>
              Exam {patient.exam}
            </StatusPill>
          </div>
          <PrimaryButton className="mt-4">Open consultation</PrimaryButton>
        </Card>
      }
    />
  );
}

export function DoctorConsultationView() {
  const h = COUNSELLOR_HANDOFF;
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="rounded-xl border border-[var(--c-focus-border)] bg-[var(--c-focus-panel)] p-5 text-[var(--c-focus-ink)]">
        <textarea
          className="min-h-[200px] w-full rounded-lg border border-[var(--c-focus-border)] bg-white p-3 text-[13px]"
          defaultValue="Diagnosis · treatment · prescription · counsellor notes"
        />
        <PrimaryButton className="mt-4">Send full payload to counsellor</PrimaryButton>
      </div>
      <Card className="p-4 text-[12px] text-[var(--c-text-secondary)]">
        Handoff includes: diagnosis, treatment, packages, Rx, advice — {h.patient}
      </Card>
    </div>
  );
}

/* ─── Pharmacy ─── */
export function PharmacyDispensaryView() {
  return (
    <Card className="p-4">
      <p className="mb-3 text-[13px] text-[var(--c-text-secondary)]">Prescription fulfillment queue</p>
      <ul className="space-y-2 text-[13px]">
        <li className="flex justify-between border-b border-[var(--c-border)] py-2">
          <span>Suresh Patel — Pregabalin 75mg</span>
          <PrimaryButton className="!h-7 !text-[11px]">Dispense</PrimaryButton>
        </li>
      </ul>
    </Card>
  );
}

export function PharmacyInventoryView() {
  return <Card className="p-4 text-[13px] text-[var(--c-text-secondary)]">Stock levels · reorder alerts (mock)</Card>;
}

/* ─── Counsellor ─── */
export function CounsellorDeskView() {
  const h = COUNSELLOR_HANDOFF;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="text-lg font-semibold">{h.patient}</h2>
        <dl className="mt-4 space-y-2 text-[13px] text-[var(--c-text-secondary)]">
          <div>
            <dt className="text-[10px] uppercase text-[var(--c-text-tertiary)]">Diagnosis</dt>
            <dd>{h.diagnosis}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase text-[var(--c-text-tertiary)]">Packages</dt>
            <dd>{h.packages.join(" · ")}</dd>
          </div>
        </dl>
      </Card>
      <Card className="p-5">
        <PrimaryButton>Send to billing closure</PrimaryButton>
      </Card>
    </div>
  );
}

/* ─── CRM ─── */
const CRM_LEADS = [
  { name: "Amit Shah", source: "Instagram", stage: "Interested" },
  { name: "Ritu Malhotra", source: "Doctor referral", stage: "Appointment scheduled" },
];

export function CrmLeadsView() {
  return (
    <div className="space-y-2">
      {CRM_LEADS.map((l) => (
        <Card key={l.name} className="flex items-center justify-between p-3" hover>
          <div>
            <p className="text-[13px] font-medium">{l.name}</p>
            <p className="text-[11px] text-[var(--c-text-tertiary)]">{l.source}</p>
          </div>
          <StatusPill variant="info">{l.stage}</StatusPill>
        </Card>
      ))}
    </div>
  );
}

export function CrmFollowUpsView() {
  return <Card className="p-4 text-[13px] text-[var(--c-text-secondary)]">5 follow-ups due today (mock)</Card>;
}

export function CrmReferralsView() {
  return <Card className="p-4 text-[13px] text-[var(--c-text-secondary)]">Referral source tracking (mock)</Card>;
}

export function CrmAnalyticsView() {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <MetricTile label="Leads MTD" value="142" delta="+18%" />
      <MetricTile label="Conversion" value="24%" delta="+2pp" />
      <MetricTile label="Top source" value="Instagram" />
    </div>
  );
}

/* ─── HR ─── */
export function HrStaffView() {
  return <Card className="p-4 text-[13px] text-[var(--c-text-secondary)]">Staff directory · role assignments per branch</Card>;
}

export function HrSchedulingView() {
  return <Card className="p-4 text-[13px] text-[var(--c-text-secondary)]">Doctor & staff schedules</Card>;
}

export function HrLeaveView() {
  return <Card className="p-4 text-[13px] text-[var(--c-text-secondary)]">Leave requests · approvals</Card>;
}
