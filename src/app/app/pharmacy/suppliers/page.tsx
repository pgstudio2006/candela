"use client";

import { usePharmacyStore } from "@/components/pharmacy/pharmacy-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, StatusBadge } from "@/components/frontdesk/ui";
import { PharmacyDialog, PharmacyInput, PharmacySelect, FormRow } from "@/components/pharmacy/ui";
import type { Supplier } from "@/design-system/pharmacy-data";
import { useState } from "react";

export default function PharmacySuppliersPage() {
  const { suppliers, drugs, stock, purchaseOrders, addSupplier, isManager, isPurchase } = usePharmacyStore();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: "", gstin: "", drugLicense: "", contactPerson: "", phone: "", email: "", address: "", paymentTerms: "Net 30", preferred: false, active: true });

  if (!isManager() && !isPurchase()) {
    return (
      <PageChrome breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Suppliers" }]} title="Suppliers" meta="Purchase team only">
        <p className="text-[13px] text-[var(--attio-text-secondary)]">Supplier management requires purchase or manager access.</p>
      </PageChrome>
    );
  }

  const reset = () => {
    setForm({ name: "", gstin: "", drugLicense: "", contactPerson: "", phone: "", email: "", address: "", paymentTerms: "Net 30", preferred: false, active: true });
    setSelected(null);
  };

  return (
    <PageChrome
      breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Suppliers" }]}
      title="Suppliers"
      meta="GSTIN · drug license · payment terms · supplied medicines · PO history"
      actions={
        <AttioButton variant="primary" onClick={() => { reset(); setOpen(true); }}>
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
          { key: "actions", label: "" },
        ]}
        rows={suppliers.map((s) => ({
          name: (
            <button type="button" className="text-left hover:underline" onClick={() => setSelected(s)}>
              {s.name}
            </button>
          ),
          gstin: s.gstin,
          license: s.drugLicense,
          contact: `${s.contactPerson} · ${s.phone}`,
          terms: s.paymentTerms,
          status: <StatusBadge label={s.active ? (s.preferred ? "Preferred" : "Active") : "Inactive"} variant="success" />,
          actions: (
            <button type="button" className="text-[12px] text-[var(--attio-accent)] hover:underline" onClick={() => setSelected(s)}>
              View
            </button>
          ),
        }))}
      />

      {open && (
        <PharmacyDialog open={open} title="New supplier" onClose={() => { setOpen(false); reset(); }}>
          <div className="grid gap-3 sm:grid-cols-2">
            {(["name", "gstin", "drugLicense", "contactPerson", "phone", "email", "address", "paymentTerms"] as const).map((k) => (
              <FormRow key={k} label={k}>
                <PharmacyInput value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} placeholder={k} />
              </FormRow>
            ))}
            <FormRow label="Preferred">
              <PharmacySelect value={form.preferred ? "yes" : "no"} onChange={(e) => setForm({ ...form, preferred: e.target.value === "yes" })}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </PharmacySelect>
            </FormRow>
            <FormRow label="Active">
              <PharmacySelect value={form.active ? "yes" : "no"} onChange={(e) => setForm({ ...form, active: e.target.value === "yes" })}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </PharmacySelect>
            </FormRow>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <AttioButton variant="secondary" onClick={() => { setOpen(false); reset(); }}>Cancel</AttioButton>
            <AttioButton variant="primary" onClick={() => { void addSupplier(form).then(() => { setOpen(false); reset(); }); }}>Save</AttioButton>
          </div>
        </PharmacyDialog>
      )}

      {selected && (
        <PharmacyDialog open={!!selected} title={selected.name} subtitle={`${selected.gstin} · ${selected.drugLicense}`} onClose={() => setSelected(null)} width="max-w-2xl">
          <div className="space-y-4 text-[13px]">
            <div className="grid grid-cols-2 gap-3 rounded-lg border p-3">
              <div><p className="text-[11px] text-[var(--attio-text-tertiary)]">Contact</p><p>{selected.contactPerson} · {selected.phone}</p></div>
              <div><p className="text-[11px] text-[var(--attio-text-tertiary)]">Email</p><p>{selected.email}</p></div>
              <div><p className="text-[11px] text-[var(--attio-text-tertiary)]">Address</p><p>{selected.address}</p></div>
              <div><p className="text-[11px] text-[var(--attio-text-tertiary)]">Payment terms</p><p>{selected.paymentTerms}</p></div>
            </div>
            <div>
              <p className="mb-2 text-[12px] font-medium text-[var(--attio-text-secondary)]">Supplied medicines</p>
              <ul className="divide-y rounded-lg border">
                {stock
                  .filter((s) => s.supplierId === selected.id)
                  .map((s) => {
                    const drug = drugs.find((d) => d.id === s.drugId);
                    return (
                      <li key={s.id} className="flex justify-between px-3 py-2">
                        <span>{drug?.brandName ?? s.drugId} · batch {s.batchNo}</span>
                        <span>{s.qtyOnHand} units @ ₹{s.purchaseRate}</span>
                      </li>
                    );
                  })}
                {stock.filter((s) => s.supplierId === selected.id).length === 0 && (
                  <li className="px-3 py-2 text-[var(--attio-text-tertiary)]">No stock received from this supplier yet.</li>
                )}
              </ul>
            </div>
            <div>
              <p className="mb-2 text-[12px] font-medium text-[var(--attio-text-secondary)]">Purchase orders</p>
              <ul className="divide-y rounded-lg border">
                {purchaseOrders
                  .filter((p) => p.supplierId === selected.id)
                  .map((p) => (
                    <li key={p.id} className="flex justify-between px-3 py-2">
                      <span>{p.id}</span>
                      <StatusBadge label={p.status} variant="info" />
                    </li>
                  ))}
                {purchaseOrders.filter((p) => p.supplierId === selected.id).length === 0 && (
                  <li className="px-3 py-2 text-[var(--attio-text-tertiary)]">No purchase orders yet.</li>
                )}
              </ul>
            </div>
          </div>
        </PharmacyDialog>
      )}
    </PageChrome>
  );
}
