"use client";

import { CARE_PACKAGES, PACKAGE_ADDONS } from "@/design-system/counsellor-data";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { Panel } from "@/components/frontdesk/ui";

export default function CounsellorPackagesPage() {
  return (
    <PageChrome breadcrumbs={[{ label: "Counsellor", href: "/app/counsellor" }, { label: "Packages" }]} title="Package catalog" meta="Care programs · add-ons · used in counsel sessions">
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Care packages">
          <ul className="divide-y divide-[var(--attio-border-subtle)]">
            {CARE_PACKAGES.map((p) => (
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
          <p className="mt-4 text-[11px] text-[var(--attio-text-tertiary)]">Admin catalog editing coming in Admin module — counsellors apply during session.</p>
        </Panel>
      </div>
    </PageChrome>
  );
}
