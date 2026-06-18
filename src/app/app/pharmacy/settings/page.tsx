"use client";

import { useSession } from "@/components/candela/session-provider";
import { usePharmacyStore } from "@/components/pharmacy/pharmacy-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel } from "@/components/frontdesk/ui";
import { useRouter } from "next/navigation";

export default function PharmacySettingsPage() {
  const router = useRouter();
  const { session, signOut } = useSession();
  const { getOperator, getStaffRole, isManager } = usePharmacyStore();
  const op = getOperator();

  return (
    <PageChrome breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Settings" }]} title="Pharmacy settings" meta="Store · account · demo">
      <Panel title="Signed in as">
        <dl className="space-y-2 text-[13px]">
          <div className="flex justify-between"><dt className="text-[var(--attio-text-tertiary)]">Name</dt><dd>{op?.name ?? session?.userName}</dd></div>
          <div className="flex justify-between"><dt className="text-[var(--attio-text-tertiary)]">Email</dt><dd className="font-mono text-[12px]">{session?.userEmail}</dd></div>
          <div className="flex justify-between"><dt className="text-[var(--attio-text-tertiary)]">Role</dt><dd className="capitalize">{getStaffRole()}</dd></div>
          <div className="flex justify-between"><dt className="text-[var(--attio-text-tertiary)]">License</dt><dd>{op?.licenseNo ?? "—"}</dd></div>
        </dl>
        <AttioButton variant="secondary" className="mt-4" onClick={() => { signOut(); router.push("/login"); }}>
          Sign out
        </AttioButton>
      </Panel>
      {isManager() && (
        <Panel title="Store configuration" className="mt-4">
          <ul className="space-y-1 text-[13px] text-[var(--attio-text-secondary)]">
            <li>Navayu Spine Pharmacy — Gurgaon main store</li>
            <li>GSTIN: 06AABCN1234F1Z9 · Drug license DL-GJ-PH-2024</li>
            <li>FEFO dispense · Schedule H auto-register enabled</li>
          </ul>
        </Panel>
      )}
      <Panel title="Backend note" className="mt-4">
        <p className="text-[13px] text-[var(--attio-text-secondary)]">
          Data persists in browser localStorage (<code className="text-[11px]">candela-pharmacy-v1</code>). Next phase: NestJS API routes in this Candela project with Postgres — same store shape.
        </p>
      </Panel>
      <Panel title="Reset demo" className="mt-4">
        <AttioButton
          variant="secondary"
          onClick={() => {
            if (confirm("Reset all pharmacy data?")) {
              localStorage.removeItem("candela-pharmacy-v1");
              window.location.reload();
            }
          }}
        >
          Reset pharmacy workspace
        </AttioButton>
      </Panel>
    </PageChrome>
  );
}
