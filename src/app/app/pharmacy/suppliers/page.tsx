"use client";

import { usePharmacyStore } from "@/components/pharmacy/pharmacy-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, StatusBadge } from "@/components/frontdesk/ui";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function PharmacySuppliersPage() {
  const { suppliers, addSupplier, isManager, isPurchase } = usePharmacyStore();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", gstin: "", drugLicense: "", contactPerson: "", phone: "", email: "", address: "", paymentTerms: "Net 30", preferred: false, active: true });

  if (!isManager() && !isPurchase()) {
    return (
      <PageChrome breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Suppliers" }]} title="Suppliers" meta="Purchase team only">
        <p className="text-[13px] text-[var(--attio-text-secondary)]">Supplier management requires purchase or manager access.</p>
      </PageChrome>
    );
  }

  return (
    <PageChrome
      breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Suppliers" }]}
      title="Suppliers"
      meta="GSTIN · drug license · payment terms"
      actions={
        <AttioButton variant="primary" onClick={() => setOpen(true)}>
          Add supplier
        </AttioButton>
      }
    >
      <DataTable
        columns={[
          { key: "name", label: "Name" },
          { key: "gstin", label: "GSTIN" },
          { key: "license", label: "License" },
          { key: "contact", label: "Contact" },
          { key: "terms", label: "Terms" },
          { key: "status", label: "Status" },
        ]}
        rows={suppliers.map((s) => ({
          name: s.name,
          gstin: s.gstin,
          license: s.drugLicense,
          contact: `${s.contactPerson} · ${s.phone}`,
          terms: s.paymentTerms,
          status: <StatusBadge label={s.active ? (s.preferred ? "Preferred" : "Active") : "Inactive"} variant="success" />,
        }))}
      />
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-lg rounded-xl border bg-white p-4">
            <h3 className="mb-3 font-semibold">New supplier</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {(["name", "gstin", "drugLicense", "contactPerson", "phone", "email", "address", "paymentTerms"] as const).map((k) => (
                <Input key={k} placeholder={k} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="h-9 text-[13px]" />
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <AttioButton variant="secondary" onClick={() => setOpen(false)}>Cancel</AttioButton>
              <AttioButton variant="primary" onClick={() => { void addSupplier(form).then(() => setOpen(false)); }}>Save</AttioButton>
            </div>
          </div>
        </div>
      )}
    </PageChrome>
  );
}
