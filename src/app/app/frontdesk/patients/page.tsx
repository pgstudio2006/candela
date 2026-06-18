"use client";

import { useSession } from "@/components/candela/session-provider";
import { useFrontdeskStore } from "@/components/frontdesk/frontdesk-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, StatusBadge } from "@/components/frontdesk/ui";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const VIEWS = ["All", "Today's visitors", "Outstanding balance", "Follow-up due"] as const;

export default function PatientsPage() {
  const router = useRouter();
  const { setActivePatientId } = useSession();
  const { patients, visits } = useFrontdeskStore();
  const [view, setView] = useState<(typeof VIEWS)[number]>("All");

  const filtered = useMemo(() => {
    if (view === "Outstanding balance") return patients.filter((p) => p.balance > 0);
    if (view === "Today's visitors") {
      const ids = new Set(visits.filter((v) => v.checkInAt).map((v) => v.patientId));
      return patients.filter((p) => ids.has(p.id));
    }
    return patients;
  }, [patients, visits, view]);

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Front Desk", href: "/app/frontdesk" },
        { label: "Patients" },
      ]}
      title="Patients"
      meta={`${filtered.length} records · Spine & Wellness`}
      actions={
        <Link href="/app/frontdesk/registration">
          <AttioButton variant="primary" className="gap-1.5">
            <Plus className="size-3.5" />
            New patient
          </AttioButton>
        </Link>
      }
    >
      <div className="mb-4 flex gap-1">
        {VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`rounded-md px-2.5 py-1 text-[12px] font-medium ${
              view === v
                ? "bg-[var(--attio-text)] text-white"
                : "text-[var(--attio-text-secondary)] hover:bg-[var(--attio-hover)]"
            }`}
          >
            {v}
          </button>
        ))}
      </div>

      <DataTable
        columns={[
          { key: "name", label: "Name" },
          { key: "uhid", label: "UHID" },
          { key: "phone", label: "Phone" },
          { key: "dept", label: "Department" },
          { key: "balance", label: "Balance" },
          { key: "tags", label: "Tags" },
        ]}
        rows={filtered.map((p) => ({
          name: <span className="font-medium text-[var(--attio-text)]">{p.name}</span>,
          uhid: <span className="font-mono text-[12px]">{p.uhid}</span>,
          phone: p.phone,
          dept: p.department,
          balance: p.balance > 0 ? <span className="text-amber-700">₹{p.balance}</span> : "—",
          tags: (
            <div className="flex flex-wrap gap-1">
              {p.tags.map((t) => (
                <StatusBadge key={t} label={t} variant="neutral" />
              ))}
            </div>
          ),
        }))}
        onRowClick={(i) => {
          setActivePatientId(filtered[i].id);
          router.push(`/app/frontdesk/patients/${filtered[i].id}`);
        }}
      />
    </PageChrome>
  );
}
