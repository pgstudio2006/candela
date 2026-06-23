"use client";

import { searchPatientsPaginatedAction } from "@/app/actions/clinical-actions";
import { useSession } from "@/components/candela/session-provider";
import type { Patient } from "@/design-system/frontdesk-data";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, StatusBadge } from "@/components/frontdesk/ui";
import { useFrontdeskPoll } from "@/hooks/use-frontdesk-poll";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const VIEWS = [
  { id: "all" as const, label: "All" },
  { id: "today" as const, label: "Today's visitors" },
  { id: "balance" as const, label: "Outstanding balance" },
];

export default function PatientsPage() {
  useFrontdeskPoll();
  const router = useRouter();
  const { setActivePatientId } = useSession();
  const [view, setView] = useState<(typeof VIEWS)[number]["id"]>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const pageSize = 25;

  const load = useCallback(async () => {
    const result = await searchPatientsPaginatedAction({
      q: q || undefined,
      page,
      pageSize,
      view: view === "all" ? "all" : view,
    });
    if (result.ok) {
      setPatients(result.data.patients);
      setTotal(result.data.total);
    }
  }, [q, page, view]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [view, q]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Front Desk", href: "/app/frontdesk" },
        { label: "Patients" },
      ]}
      title="Patients"
      meta={`${total} records · page ${page} of ${totalPages}`}
      actions={
        <Link href="/app/frontdesk/registration">
          <AttioButton variant="primary" className="gap-1.5">
            <Plus className="size-3.5" />
            New patient
          </AttioButton>
        </Link>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => setView(v.id)}
            className={`rounded-md px-2.5 py-1 text-[12px] font-medium ${
              view === v.id
                ? "bg-[var(--attio-text)] text-white"
                : "text-[var(--attio-text-secondary)] hover:bg-[var(--attio-hover)]"
            }`}
          >
            {v.label}
          </button>
        ))}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, UHID, phone…"
          className="ml-auto h-9 min-w-[200px] rounded-md border px-3 text-[13px]"
        />
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
        rows={patients.map((p) => ({
          name: <span className="font-medium text-[var(--attio-text)]">{p.name}</span>,
          uhid: <span className="font-mono text-[12px]">{p.uhid}</span>,
          phone: p.phone,
          dept: p.department,
          balance: p.balance > 0 ? <span className="text-amber-700">₹{p.balance}</span> : "—",
          tags: (
            <div className="flex flex-wrap gap-1">
              {p.tags.slice(0, 3).map((t) => (
                <StatusBadge key={t} label={t} variant="neutral" />
              ))}
            </div>
          ),
        }))}
        onRowClick={(i) => {
          setActivePatientId(patients[i].id);
          router.push(`/app/frontdesk/patients/${patients[i].id}`);
        }}
      />

      <div className="mt-4 flex items-center justify-between text-[13px]">
        <p className="text-[var(--attio-text-tertiary)]">
          Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
        </p>
        <div className="flex gap-1">
          <AttioButton variant="secondary" className="!h-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            <ChevronLeft className="size-3.5" />
          </AttioButton>
          <AttioButton variant="secondary" className="!h-8" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
            <ChevronRight className="size-3.5" />
          </AttioButton>
        </div>
      </div>
    </PageChrome>
  );
}
