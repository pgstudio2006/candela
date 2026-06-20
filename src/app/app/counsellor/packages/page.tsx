"use client";

import { useCounsellorStore } from "@/components/counsellor/counsellor-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { Panel } from "@/components/frontdesk/ui";
import { PACKAGE_ADDONS } from "@/design-system/counsellor-data";
import { useCounsellorPoll } from "@/hooks/use-counsellor-poll";

export default function CounsellorPackagesPage() {
  useCounsellorPoll();
  const { packages } = useCounsellorStore();

  return (
    <PageChrome breadcrumbs={[{ label: "Counsellor", href: "/app/counsellor" }, { label: "Packages" }]} title="Package catalog" meta="Branch packages from admin · add-ons">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Care packages">
          <ul className="divide-y divide-[var(--attio-border-subtle)]">
            {packages.map((p) => (
              <li key={p.id} className="py-3">
                <p className="text-[14px] font-medium">{p.label}</p>
                <p className="mt-1 text-[18px] font-semibold tabular-nums">₹{p.amount.toLocaleString("en-IN")}</p>
                <p className="text-[12px] text-[var(--attio-text-tertiary)]">{p.sessions} sessions · {p.dept.replace("dept_", "")}</p>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Add-ons">
          <ul className="divide-y divide-[var(--attio-border-subtle)]">
            {PACKAGE_ADDONS.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3 text-[13px]">
                <span>{a.label}</span>
                <span className="font-medium tabular-nums">₹{a.amount.toLocaleString("en-IN")}</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </PageChrome>
  );
}
