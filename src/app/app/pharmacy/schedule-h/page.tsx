"use client";

import { usePharmacyStore } from "@/components/pharmacy/pharmacy-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { DataTable } from "@/components/frontdesk/ui";

export default function PharmacyScheduleHPage() {
  const { scheduleH, getDrug, staff, isManager } = usePharmacyStore();

  if (!isManager()) {
    return (
      <PageChrome breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Schedule H" }]} title="Schedule H register" meta="Manager view">
        <p className="text-[13px]">Controlled drug register is visible to pharmacy manager. Entries auto-create on H/H1/X dispense.</p>
        <p className="mt-2 text-[12px] text-[var(--attio-text-tertiary)]">{scheduleH.length} entries in register.</p>
      </PageChrome>
    );
  }

  return (
    <PageChrome breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Schedule H" }]} title="Schedule H / H1 register" meta="India regulatory ledger · auto from controlled dispense">
      <DataTable
        columns={[
          { key: "at", label: "Date/time" },
          { key: "patient", label: "Patient" },
          { key: "uhid", label: "UHID" },
          { key: "doctor", label: "Doctor" },
          { key: "drug", label: "Drug" },
          { key: "batch", label: "Batch" },
          { key: "qty", label: "Qty" },
          { key: "balance", label: "Balance" },
          { key: "pharmacist", label: "Pharmacist" },
          { key: "witness", label: "Witness" },
        ]}
        rows={
          scheduleH.length
            ? scheduleH.map((e) => ({
                at: new Date(e.at).toLocaleString("en-IN"),
                patient: e.patientName,
                uhid: e.uhid,
                doctor: e.doctorName,
                drug: getDrug(e.drugId)?.brandName ?? e.drugId,
                batch: e.batchId,
                qty: e.qty,
                balance: e.balanceAfter,
                pharmacist: staff.find((s) => s.id === e.pharmacistId)?.name ?? e.pharmacistId,
                witness: e.witnessName ?? "—",
              }))
            : [{ at: "—", patient: "No entries yet", uhid: "", doctor: "", drug: "Dispense Schedule H/H1 drugs to populate", batch: "", qty: "", balance: "", pharmacist: "", witness: "" }]
        }
      />
    </PageChrome>
  );
}
