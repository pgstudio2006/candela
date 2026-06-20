"use client";

import { CONSENT_TEMPLATES, useNurseStore } from "@/components/nurse/nurse-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { Panel, StatusBadge } from "@/components/frontdesk/ui";
import { useNursePoll } from "@/hooks/use-nurse-poll";
import Link from "next/link";

function statusVariant(status: string) {
  if (status === "verified" || status === "locked") return "success" as const;
  if (status === "declined") return "danger" as const;
  if (status === "signed" || status === "uploaded") return "warning" as const;
  return "neutral" as const;
}

export default function NurseConsentRegistryPage() {
  useNursePoll(30_000);
  const { getAllConsents } = useNurseStore();
  const liveConsents = getAllConsents().sort((a, b) => (b.signedAt ?? b.verifiedAt ?? "").localeCompare(a.signedAt ?? a.verifiedAt ?? ""));

  return (
    <PageChrome
      breadcrumbs={[{ label: "Nursing", href: "/app/nurse" }, { label: "Consent registry" }]}
      title="Clinical consent registry"
      meta="Signed & verified consents · template library"
    >
      <Panel title="Live consent records" className="mb-4">
        {liveConsents.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[var(--attio-text-tertiary)]">
            No signed consents yet — records appear as nurses complete consent workflows
          </p>
        ) : (
          <ul className="divide-y divide-[var(--attio-border-subtle)]">
            {liveConsents.slice(0, 40).map((c) => (
              <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                <div>
                  <p className="text-[13px] font-medium">{c.label}</p>
                  <p className="text-[11px] text-[var(--attio-text-tertiary)]">
                    {c.patientName} · {c.signerName ?? "—"} · Nurse {c.nurseName}
                  </p>
                  {c.verifiedBy && (
                    <p className="text-[11px] text-emerald-700">Verified by {c.verifiedBy}</p>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={c.status} variant={statusVariant(c.status)} />
                  <Link href={`/app/nurse/episode/${c.visitId}`} className="text-[12px] text-[var(--attio-accent)] hover:underline">
                    Open episode
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

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
