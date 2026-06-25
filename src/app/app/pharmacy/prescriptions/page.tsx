"use client";

import { RxWorkspaceModal } from "@/components/pharmacy/rx-workspace";
import { PublishedSchemaForm } from "@/components/candela/published-schema-form";
import { saveSubmissionAction } from "@/app/actions/clinical-actions";
import { usePharmacyStore } from "@/components/pharmacy/pharmacy-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { DataTable, Panel, StatusBadge } from "@/components/frontdesk/ui";
import type { Prescription } from "@/design-system/pharmacy-data";
import { RX_STATUS_LABELS } from "@/design-system/pharmacy-data";
import { usePharmacyPoll } from "@/hooks/use-pharmacy-poll";
import { useToast } from "@/components/ui/toast-provider";
import { useState } from "react";

export default function PharmacyPrescriptionsPage() {
  usePharmacyPoll();
  const { toast } = useToast();
  const { getActivePrescriptions, prescriptions } = usePharmacyStore();
  const [selected, setSelected] = useState<Prescription | null>(null);
  const [filter, setFilter] = useState<string>("active");

  const rows =
    filter === "active" ? getActivePrescriptions() : prescriptions;

  return (
    <PageChrome
      breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Prescriptions" }]}
      title="Prescriptions queue"
      meta="Verify · dispense · FEFO batch pick · Schedule H register · live refresh"
      actions={
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="h-8 rounded-md border px-2 text-[12px]">
          <option value="active">Active queue</option>
          <option value="all">All prescriptions</option>
        </select>
      }
    >
      <div className="mb-6">
        <Panel title="Walk-in pharmacy intake">
          <PublishedSchemaForm
            schemaId="pharmacy-intake"
            submitLabel="Save intake"
            onSubmit={async (data) => {
              await saveSubmissionAction("pharmacy-intake", data, {});
              toast("Intake saved", "success");
            }}
          />
        </Panel>
      </div>
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
          priority: <StatusBadge label={r.priority} variant={r.priority === "stat" ? "danger" : r.priority === "urgent" ? "warning" : "neutral"} />,
          items: r.lines.length,
          status: <StatusBadge label={RX_STATUS_LABELS[r.status]} variant="info" />,
          time: new Date(r.createdAt).toLocaleString("en-IN"),
        }))}
      />
      {selected && <RxWorkspaceModal rx={selected} onClose={() => setSelected(null)} />}
    </PageChrome>
  );
}
