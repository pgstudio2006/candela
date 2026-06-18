"use client";

import { SchemaForm } from "@/components/candela/schema-form";
import { useFrontdeskStore } from "@/components/frontdesk/frontdesk-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { useFormSchema } from "@/components/frontdesk/use-form-schema";
import { AttioButton, Panel } from "@/components/frontdesk/ui";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

export default function RegistrationPage() {
  const router = useRouter();
  const schema = useFormSchema("registration");
  const { registerPatient, findDuplicates, saveSubmission, counters } = useFrontdeskStore();
  const [draft, setDraft] = useState<Record<string, string | number | boolean>>({});
  const [savedUhid, setSavedUhid] = useState<string | null>(null);

  const duplicates = useMemo(
    () => findDuplicates(String(draft.phone ?? ""), String(draft.firstName ?? "")),
    [draft.phone, draft.firstName, findDuplicates],
  );

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Front Desk", href: "/app/frontdesk" },
        { label: "Registration" },
      ]}
      title="Patient registration"
      meta="New capture · duplicate detection · billing-first routing"
      actions={
        <>
          <Link href="/app/frontdesk/check-in">
            <AttioButton variant="secondary">Register + check-in</AttioButton>
          </Link>
          <Link href="/app/frontdesk/appointments">
            <AttioButton variant="primary">Register + book</AttioButton>
          </Link>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <Panel title="Patient details">
          <SchemaForm
            schema={schema}
            formKey={schema.id}
            submitLabel="Save & continue to check-in"
            onSubmit={(data) => {
              setDraft(data);
              const { patientId, visitId, uhid } = registerPatient(data);
              saveSubmission("registration", data, { patientId, visitId });
              setSavedUhid(uhid);
              router.push(`/app/frontdesk/check-in?visit=${visitId}&patient=${patientId}`);
            }}
          />
        </Panel>

        <div className="space-y-4">
          <Panel title="Duplicate guard">
            {duplicates.length > 0 ? (
              duplicates.map((p) => (
                <div key={p.id} className="mb-2 flex gap-3 rounded-md border border-amber-200/80 bg-amber-50/50 p-3">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-[13px] font-medium text-amber-900">Possible match</p>
                    <p className="mt-1 text-[12px] text-amber-800">{p.name} · {p.uhid}</p>
                    <Link href={`/app/frontdesk/patients/${p.id}`}>
                      <AttioButton variant="secondary" className="mt-2 h-7 text-[11px]">
                        Use existing
                      </AttioButton>
                    </Link>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-[12px] text-[var(--attio-text-tertiary)]">No duplicates detected yet</p>
            )}
          </Panel>
          <Panel title="Preview">
            <p className="text-[12px] text-[var(--attio-text-tertiary)]">
              {savedUhid ? "UHID assigned on last save" : "UHID auto-generated on save"}
            </p>
            <p className="mt-1 font-mono text-[13px]">
              {savedUhid ?? `NV-2026-${String(counters.patient + 1).padStart(4, "0")}`}
            </p>
          </Panel>
        </div>
      </div>
    </PageChrome>
  );
}
