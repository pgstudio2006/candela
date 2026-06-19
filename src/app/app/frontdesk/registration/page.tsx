"use client";

import { SchemaForm } from "@/components/candela/schema-form";
import { useFrontdeskStore } from "@/components/frontdesk/frontdesk-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { useFrontdeskFormSchema } from "@/components/frontdesk/use-frontdesk-form-schema";
import { AttioButton, Panel } from "@/components/frontdesk/ui";
import { useToast } from "@/components/ui/toast-provider";
import { checkDuplicatePatientAction } from "@/app/actions/clinical-actions";
import { AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type DuplicateInfo = { id: string; uhid: string; name: string; phone: string };

export default function RegistrationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { registerPatientAsync, saveSubmission, counters, roster, patients } = useFrontdeskStore();
  const [draft, setDraft] = useState<Record<string, string | number | boolean>>({});
  const [savedUhid, setSavedUhid] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [phoneWarning, setPhoneWarning] = useState<DuplicateInfo | null>(null);

  const checkPhone = useCallback(async (phone: string) => {
    if (!phone || phone.replace(/\D/g, "").length < 10) {
      setPhoneWarning(null);
      return;
    }
    const result = await checkDuplicatePatientAction(phone);
    setPhoneWarning(result.duplicate ? result.patient : null);
  }, []);

  useEffect(() => {
    const phone = String(draft.phone ?? "");
    const timer = setTimeout(() => void checkPhone(phone), 400);
    return () => clearTimeout(timer);
  }, [draft.phone, checkPhone]);

  const schema = useFrontdeskFormSchema("registration", roster);

  const submitRegistration = async (data: Record<string, string | number | boolean>) => {
    setSubmitting(true);
    const result = await registerPatientAsync(data, { forceDuplicate: Boolean(phoneWarning) });
    setSubmitting(false);

    if (!result.ok) {
      toast(result.error, "error");
      return;
    }

    if (!result.visitId) {
      toast("Patient saved but visit was not created. Open check-in manually.", "error");
      router.push(`/app/frontdesk/patients/${result.patientId}`);
      return;
    }

    saveSubmission("registration", data, { patientId: result.patientId, visitId: result.visitId });
    setSavedUhid(result.uhid);
    toast(`Registered ${result.uhid}`, "success");
    router.push(`/app/frontdesk/check-in?visit=${result.visitId}&patient=${result.patientId}`);
  };

  return (
    <PageChrome
      breadcrumbs={[{ label: "Front Desk", href: "/app/frontdesk" }, { label: "Registration" }]}
      title="Patient registration"
      meta="New capture · duplicate phone warning · billing-first routing"
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <Panel title="Patient details">
          <SchemaForm
            schema={schema}
            formKey={schema.id}
            submitLabel={submitting ? "Saving…" : "Save & continue to check-in"}
            onValuesChange={setDraft}
            onSubmit={(data) => void submitRegistration(data)}
          />
        </Panel>

        <div className="space-y-4">
          <Panel title="Duplicate guard">
            {phoneWarning ? (
              <div className="flex gap-3 rounded-md border border-amber-200/80 bg-amber-50/50 p-3">
                <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                <div>
                  <p className="text-[13px] font-medium text-amber-900">Phone number already registered</p>
                  <p className="mt-1 text-[12px] text-amber-800">
                    {phoneWarning.name} · {phoneWarning.uhid} · {phoneWarning.phone}
                  </p>
                  <p className="mt-2 text-[11px] text-amber-700">You can still register — this is a warning only.</p>
                  <Link href={`/app/frontdesk/patients/${phoneWarning.id}`}>
                    <AttioButton variant="secondary" className="mt-2 h-7 text-[11px]">
                      Open existing record
                    </AttioButton>
                  </Link>
                </div>
              </div>
            ) : (
              <p className="text-[12px] text-[var(--attio-text-tertiary)]">No duplicate phone detected</p>
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
