"use client";

import { useSession } from "@/components/candela/session-provider";
import { usePharmacyStore } from "@/components/pharmacy/pharmacy-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel } from "@/components/frontdesk/ui";
import { WORKSPACE_SIGN_IN_PATH } from "@/lib/auth-storage";
import { useRouter } from "next/navigation";

export default function PharmacySettingsPage() {
  const router = useRouter();
  const { session, signOut } = useSession();
  const { getOperator, getStaffRole, isManager, activeOperatorName } = usePharmacyStore();
  const op = getOperator();

  return (
    <PageChrome breadcrumbs={[{ label: "Pharmacy", href: "/app/pharmacy" }, { label: "Settings" }]} title="Pharmacy settings" meta="Branch store · operator · compliance">
      <Panel title="Signed in as">
        <dl className="space-y-2 text-[13px]">
          <div className="flex justify-between"><dt className="text-[var(--attio-text-tertiary)]">Name</dt><dd>{op?.name ?? activeOperatorName ?? session?.userName}</dd></div>
          <div className="flex justify-between"><dt className="text-[var(--attio-text-tertiary)]">Email</dt><dd className="font-mono text-[12px]">{session?.userEmail}</dd></div>
          <div className="flex justify-between"><dt className="text-[var(--attio-text-tertiary)]">Role</dt><dd className="capitalize">{getStaffRole()}</dd></div>
          <div className="flex justify-between"><dt className="text-[var(--attio-text-tertiary)]">License</dt><dd>{op?.licenseNo ?? "—"}</dd></div>
        </dl>
        <AttioButton variant="secondary" className="mt-4" onClick={() => { signOut(); router.push(WORKSPACE_SIGN_IN_PATH); }}>
          Sign out
        </AttioButton>
      </Panel>
      {isManager() && (
        <Panel title="Store configuration" className="mt-4">
          <ul className="space-y-1 text-[13px] text-[var(--attio-text-secondary)]">
            <li>Navayu Spine Pharmacy — branch-scoped workspace (Prisma)</li>
            <li>GSTIN: 06AABCN1234F1Z9 · Drug license DL-GJ-PH-2024</li>
            <li>FEFO dispense · Schedule H auto-register · platform audit log</li>
            <li>Doctor Rx ingested to branch workspace · 15s live poll</li>
          </ul>
        </Panel>
      )}
    </PageChrome>
  );
}
