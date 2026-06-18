"use client";

import { HawkEyeGrid } from "@/components/admin/hawk-eye-panel";
import { useAdminStore } from "@/components/admin/admin-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { Panel } from "@/components/frontdesk/ui";

export default function AdminHawkEyePage() {
  const { getHawkEye } = useAdminStore();
  const items = getHawkEye();

  return (
    <PageChrome
      breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Hawk-eye control" }]}
      title="Hawk-eye control panel"
      meta="Read-only live snapshots · configure policies in Control modules"
    >
      <HawkEyeGrid items={items} />
      <Panel title="Control without context switch" className="mt-4">
        <p className="text-[13px] text-[var(--attio-text-secondary)]">
          Each tile reflects live data from Front Desk, Doctor, Counsellor, and Nursing stores. Use Staff, Departments, Form builder, and Revenue sharing to change behavior — modules update instantly on publish.
        </p>
      </Panel>
    </PageChrome>
  );
}
