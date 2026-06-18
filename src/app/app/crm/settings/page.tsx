"use client";

import { useCrmStore } from "@/components/crm/crm-store";
import { useSession } from "@/components/candela/session-provider";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel } from "@/components/frontdesk/ui";
import { useRouter } from "next/navigation";

export default function CrmSettingsPage() {
  const router = useRouter();
  const { session, signOut } = useSession();
  const { isManager, getOperator } = useCrmStore();
  const operator = getOperator();

  return (
    <PageChrome breadcrumbs={[{ label: "CRM", href: "/app/crm" }, { label: "Settings" }]} title="CRM settings" meta="Your account">
      <Panel title="Signed in as">
        <dl className="space-y-2 text-[13px]">
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--attio-text-tertiary)]">Name</dt>
            <dd className="font-medium">{operator?.name ?? session?.userName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--attio-text-tertiary)]">Email</dt>
            <dd className="font-mono text-[12px]">{session?.userEmail}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-[var(--attio-text-tertiary)]">Access</dt>
            <dd>{isManager() ? "CRM Manager — full team" : `${operator?.role ?? "Agent"} — personal workspace`}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[12px] text-[var(--attio-text-tertiary)]">
          To use a different workspace, sign out and sign in with that person&apos;s CRM credentials.
        </p>
        <AttioButton
          variant="secondary"
          className="mt-4"
          onClick={() => {
            signOut();
            router.push("/login");
          }}
        >
          Sign out
        </AttioButton>
      </Panel>
      {isManager() && (
        <Panel title="Manager controls" className="mt-4">
          <ul className="space-y-2 text-[13px] text-[var(--attio-text-secondary)]">
            <li>Add people & set their login under Team & routing</li>
            <li>Edit pipeline step names under Workflows</li>
            <li>Connect WhatsApp & Google Forms under Integrations</li>
          </ul>
        </Panel>
      )}
      <Panel title="Demo data" className="mt-4">
        <p className="mb-3 text-[13px] text-[var(--attio-text-secondary)]">Reset CRM workspace to seed data.</p>
        <AttioButton
          variant="secondary"
          onClick={() => {
            if (confirm("Reset CRM data?")) {
              localStorage.removeItem("candela-crm-v1");
              window.location.reload();
            }
          }}
        >
          Reset workspace
        </AttioButton>
      </Panel>
    </PageChrome>
  );
}
