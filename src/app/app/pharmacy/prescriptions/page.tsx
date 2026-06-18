"use client";

import { RxWorkspaceModal } from "@/components/pharmacy/rx-workspace";
import { usePharmacyStore } from "@/components/pharmacy/pharmacy-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { DataTable, StatusBadge } from "@/components/frontdesk/ui";
import type { Prescription } from "@/design-system/pharmacy-data";
import { RX_STATUS_LABELS } from "@/design-system/pharmacy-data";
import { useState } from "react";

export default function PharmacyPrescriptionsPage() {
  const { prescriptions } = usePharmacyStore();
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [filter, setFilter] = useState<string>("active");

  const rows =
    filter === "active"
      ? prescriptions.filter((r) => !["dispensed", "cancelled", "rejected"].includes(r.status))
      : prescriptions;

  return (
    <PageChrome
      breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Prescriptions" }]}
      title="Prescriptions queue"
      meta="Verify · dispense · FEFO batch pick · Schedule H register"
      actions={
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-8 rounded-md border px-2 text-[12px]">
          <option value="active">Active queue</option>
          <option value="all">All prescriptions</option>
        </select>
      }
    >
      <DataTable
        columns={[
          { key: "patient", label: "Patient" },
          { key: "uhid", label: "UHID" },
          { key: "doctor", label: "Doctor" },
          { key: "source", label: "Source" },
          { key: "priority", label: "Priority" },
          { key: "items", label: "Items" },
          { key: "status", label: "Status" },
          { key: "time", label: "Received" },
        ]}
        rows={rows.map((r) => ({
          patient: (
            <button type="button" className="font-medium text-left hover:underline" onClick={() => setSelected(r)}>
              {r.patientName}
            </button>
          ),
          uhid: r.uhid,
          doctor: r.doctorName,
          source: r.source.toUpperCase(),
          priority: <StatusBadge label={r.priority} variant={r.priority === "stat" ? "danger" : "neutral"} />,
          items: r.lines.length,
          status: <StatusBadge label={RX_STATUS_LABELS[r.status]} variant="info" />,
          time: new Date(r.createdAt).toLocaleString("en-IN"),
        }))}
      />
      {selected && <RxWorkspaceModal rx={selected} onClose={() => setSelected(null)} />}
    </PageChrome>
  );
}
