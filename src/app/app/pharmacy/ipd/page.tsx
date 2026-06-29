"use client";

import { usePharmacyStore } from "@/components/pharmacy/pharmacy-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { DataTable, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { RX_STATUS_LABELS } from "@/design-system/pharmacy-data";
import { useState } from "react";

export default function PharmacyIpdPage() {
  const { prescriptions, indents, getDrug, fulfillIndent } = usePharmacyStore();
  const [tab, setTab] = useState<"rx" | "indents">("rx");

  const ipdRx = prescriptions.filter((r) => r.source === "ipd");

  return (
    <PageChrome
      breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "IPD" }]}
      title="IPD pharmacy"
      meta="Inpatient prescriptions · ward indents · floor stock"
      tabs={[
        { id: "rx", label: "IPD prescriptions" },
        { id: "indents", label: "Ward indents" },
      ]}
      activeTab={tab}
      onTabChange={(id) => setTab(id as typeof tab)}
    >
      {tab === "rx" && (
        <>
          {ipdRx.length === 0 ? (
            <p className="text-[13px] text-[var(--attio-text-tertiary)]">No IPD prescriptions in queue.</p>
          ) : (
            <DataTable
              columns={[
                { key: "patient", label: "Patient" },
                { key: "uhid", label: "UHID" },
                { key: "doctor", label: "Doctor" },
                { key: "priority", label: "Priority" },
                { key: "items", label: "Items" },
                { key: "status", label: "Status" },
                { key: "time", label: "Received" },
              ]}
              rows={ipdRx.map((r) => ({
                patient: r.patientName,
                uhid: r.uhid,
                doctor: r.doctorName,
                priority: <StatusBadge label={r.priority} variant={r.priority === "stat" ? "danger" : r.priority === "urgent" ? "warning" : "neutral"} />,
                items: r.lines.length,
                status: <StatusBadge label={RX_STATUS_LABELS[r.status]} variant="info" />,
                time: new Date(r.createdAt).toLocaleString("en-IN"),
              }))}
            />
          )}
        </>
      )}
      {tab === "indents" && (
        <DataTable
          columns={[
            { key: "ward", label: "Ward" },
            { key: "drug", label: "Drug" },
            { key: "req", label: "Requested" },
            { key: "issued", label: "Issued" },
            { key: "nurse", label: "Nurse" },
            { key: "urgency", label: "Urgency" },
            { key: "status", label: "Status" },
            { key: "actions", label: "" },
          ]}
          rows={indents.map((i) => ({
            ward: `${i.ward}${i.bed ? ` · ${i.bed}` : ""}`,
            drug: getDrug(i.drugId)?.brandName ?? i.drugId,
            req: i.qtyRequested,
            issued: i.qtyIssued,
            nurse: i.nurseName,
            urgency: i.urgency,
            status: <StatusBadge label={i.status} variant="info" />,
            actions:
              i.status === "pending" ? (
                <button
                  type="button"
                  className="text-[12px] font-medium text-[var(--attio-accent)] hover:underline"
                  onClick={() => void fulfillIndent(i.id, i.qtyRequested)}
                >
                  Issue
                </button>
              ) : null,
          }))}
        />
      )}
    </PageChrome>
  );
}
