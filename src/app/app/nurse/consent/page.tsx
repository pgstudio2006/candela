"use client";

import { CONSENT_TEMPLATES } from "@/components/nurse/nurse-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { Panel, StatusBadge } from "@/components/frontdesk/ui";

export default function NurseConsentRegistryPage() {
  return (
    <PageChrome
      breadcrumbs={[{ label: "Nursing", href: "/app/nurse" }, { label: "Consent registry" }]}
      title="Clinical consent templates"
      meta="Treatment-specific forms mapped to packages & care paths"
    >
      <div className="grid gap-4">
        {CONSENT_TEMPLATES.map((t) => (
          <Panel key={t.id} title={t.label} action={<StatusBadge label={`v${t.version}`} variant="neutral" />}>
            <p className="text-[13px] leading-relaxed text-[var(--attio-text-secondary)]">{t.body}</p>
            <div className="mt-3 flex flex-wrap gap-1">
              {t.required && <StatusBadge label="Required" variant="warning" />}
              <StatusBadge label={t.language} variant="neutral" />
              {t.treatmentPaths.map((p) => (
                <StatusBadge key={p} label={p.toUpperCase()} variant="info" />
              ))}
            </div>
            {t.risks.length > 0 && (
              <ul className="mt-3 list-disc space-y-1 pl-4 text-[12px] text-[var(--attio-text-tertiary)]">
                {t.risks.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            )}
          </Panel>
        ))}
      </div>
    </PageChrome>
  );
}
