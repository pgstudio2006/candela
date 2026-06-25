"use client";

import { PublishedSchemaForm } from "@/components/candela/published-schema-form";
import { useFrontdeskStore } from "@/components/frontdesk/frontdesk-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { useFrontdeskFormSchema } from "@/components/frontdesk/use-frontdesk-form-schema";
import { AttioButton, Panel } from "@/components/frontdesk/ui";
import { useToast } from "@/components/ui/toast-provider";
import { canOverrideDuplicateAction, checkDuplicatePatientAction } from "@/app/actions/clinical-actions";
import { schemaFingerprint } from "@/lib/schema-field-utils";
import { AlertTriangle, LogIn } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type DuplicateInfo = { id: string; uhid: string; name: string; phone: string };

export default function RegistrationPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { registerPatientAsync, saveSubmission, counters, roster } = useFrontdeskStore();
  const [draft, setDraft] = useState<Record<string, string | number | boolean>>({});
  const [savedUhid, setSavedUhid] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [phoneWarning, setPhoneWarning] = useState<DuplicateInfo | null>(null);
  const [canOverrideDuplicate, setCanOverrideDuplicate] = useState(false);

  useEffect(() => {
    void canOverrideDuplicateAction().then(setCanOverrideDuplicate);
  }, []);

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

  const submitRegistration = async (
    data: Record<string, string | number | boolean>,
    opts?: { forceDuplicate?: boolean },
  ) => {
    if (phoneWarning && !opts?.forceDuplicate) {
      toast("This phone is already registered. Use check-in for the existing patient.", "error");
      return;
    }

    setSubmitting(true);
    const result = await registerPatientAsync(data, { forceDuplicate: opts?.forceDuplicate });
    setSubmitting(false);

    if (!result.ok) {
      if (result.code === "DUPLICATE_PHONE" || result.code === "DUPLICATE_PATIENT") {
        toast("Duplicate blocked — open check-in for the existing patient.", "error");
      } else {
        toast(result.error ?? "Registration failed", "error");
      }
      return;
    }

    if (!result.visitId) {
      toast("Patient saved but visit was not created. Open check-in manually.", "error");
      router.push(`/app/frontdesk/patients/${result.patientId}`);
      return;
    }

    await saveSubmission("registration", data, { patientId: result.patientId, visitId: result.visitId });
    setSavedUhid(result.uhid);
    toast(`Registered ${result.uhid}`, "success");
    router.push(`/app/frontdesk/check-in?visit=${result.visitId}&patient=${result.patientId}`);
  };

  const checkInHref = phoneWarning
    ? `/app/frontdesk/check-in?patient=${phoneWarning.id}`
    : "/app/frontdesk/check-in";

  return (
    <PageChrome
      breadcrumbs={[{ label: "Front Desk", href: "/app/frontdesk" }, { label: "Registration" }]}
      title="Patient registration"
      meta="New capture · duplicate phone guard · billing-first routing"
    >
      <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
        <Panel title="Patient details">
          <PublishedSchemaForm
            schema={schema}
            formKey={`registration-${schemaFingerprint(schema)}`}
            submitLabel={
              submitting
                ? "Saving…"
                : phoneWarning
                  ? "Blocked — use check-in"
                  : "Save & continue to check-in"
            }
            onValuesChange={setDraft}
            roster={roster}
            onSubmit={(data) => void submitRegistration(data)}
          />
        </Panel>

        <div className="space-y-4">
          <Panel title="Duplicate guard">
            {phoneWarning ? (
              <div className="flex gap-3 rounded-md border border-amber-200/80 bg-amber-50/50 p-3">
                <AlertTriangle className="size-4 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-amber-900">Phone number already registered</p>
                  <p className="mt-1 text-[12px] text-amber-800">
                    {phoneWarning.name} · {phoneWarning.uhid} · {phoneWarning.phone}
                  </p>
                  <p className="mt-2 text-[11px] text-amber-700">
                    Registration is blocked for this number. Check in the existing patient instead.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link href={checkInHref}>
                      <AttioButton variant="primary" className="h-8 gap-1.5 text-[11px]">
                        <LogIn className="size-3.5" />
                        Go to check-in
                      </AttioButton>
                    </Link>
                    <Link href={`/app/frontdesk/patients/${phoneWarning.id}`}>
                      <AttioButton variant="secondary" className="h-8 text-[11px]">
                        Open record
                      </AttioButton>
                    </Link>
                  </div>
                  {canOverrideDuplicate && (
                    <AttioButton
                      variant="secondary"
                      className="mt-2 h-8 w-full text-[11px]"
                      disabled={submitting}
                      onClick={() => void submitRegistration(draft, { forceDuplicate: true })}
                    >
                      Register anyway (supervisor override)
                    </AttioButton>
                  )}
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
