"use client";

import { searchAdminPatientsAction } from "@/server/admin/actions";
import type { Patient } from "@/design-system/frontdesk-data";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, DataTable, StatusBadge } from "@/components/frontdesk/ui";
import { ChevronLeft, ChevronRight, Trash2, CheckSquare, Square } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type PatientSearchResult = {
  patients: Patient[];
  total: number;
  page: number;
  pageSize: number;
};

type PatientSearchResponse =
  | { ok: true; data: PatientSearchResult }
  | { ok: false; error: string };

async function fetchAdminPatients(input: {
  q?: string;
  page: number;
  pageSize: number;
  view: "all" | "balance" | "today";
}): Promise<PatientSearchResponse> {
  const params = new URLSearchParams({
    page: String(input.page),
    pageSize: String(input.pageSize),
    view: input.view,
  });
  if (input.q) params.set("q", input.q);

  const res = await fetch(`/api/admin/patients?${params}`, {
    cache: "no-store",
    credentials: "include",
  });
  const json = (await res.json()) as PatientSearchResponse;
  if (res.ok && json.ok) return json;
  return {
    ok: false,
    error: (!json.ok && json.error) || "Failed to load patients.",
  };
}

async function loadAdminPatients(input: {
  q?: string;
  page: number;
  pageSize: number;
  view: "all" | "balance" | "today";
}): Promise<PatientSearchResponse> {
  const api = await fetchAdminPatients(input);
  if (api.ok) return api;

  try {
    const action = await searchAdminPatientsAction(input);
    if (action.ok) return { ok: true, data: action.data };
    return { ok: false, error: action.error };
  } catch {
    return { ok: false, error: api.error };
  }
}

const VIEWS = [
  { id: "all" as const, label: "All patients" },
  { id: "today" as const, label: "Today's visitors" },
  { id: "balance" as const, label: "Outstanding balance" },
];

export default function AdminPatientsPage() {
  const router = useRouter();
  const [view, setView] = useState<(typeof VIEWS)[number]["id"]>("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const pageSize = 25;

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await loadAdminPatients({
        q: q || undefined,
        page,
        pageSize,
        view: view === "all" ? "all" : view,
      });
      if (result.ok) {
        setPatients(result.data.patients);
        setTotal(result.data.total);
      } else {
        setPatients([]);
        setTotal(0);
        setError(result.error);
      }
    } catch (err) {
      setPatients([]);
      setTotal(0);
      setError(err instanceof Error ? err.message : "Failed to load patients.");
    } finally {
      setLoading(false);
    }
  }, [q, page, view]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [view, q]);

  const handleDelete = async (patientId: string) => {
    if (!confirm("Are you sure you want to delete this patient? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/patients/${patientId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json();
      if (json.ok) {
        await load();
      } else {
        alert(json.error || "Failed to delete patient");
      }
    } catch (err) {
      console.error("Failed to delete patient:", err);
      alert("Failed to delete patient");
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedIds.size} patient(s)? This action cannot be undone.`)) return;
    let successCount = 0;
    let failCount = 0;
    try {
      for (const id of selectedIds) {
        try {
          const res = await fetch(`/api/admin/patients/${id}`, {
            method: "DELETE",
            credentials: "include",
          });
          const json = await res.json();
          if (json.ok) {
            successCount++;
          } else {
            console.error("Failed to delete patient:", json.error);
            failCount++;
          }
        } catch (err) {
          console.error("Error deleting patient:", err);
          failCount++;
        }
      }
      setSelectedIds(new Set());
      await load();
      if (failCount > 0) {
        alert(`Deleted ${successCount} patient(s), ${failCount} failed`);
      } else {
        alert(`Successfully deleted ${successCount} patient(s)`);
      }
    } catch (err) {
      alert("Failed to delete some patients");
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === patients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(patients.map((p) => p.id)));
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <PageChrome
      breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Patients" }]}
      title="Patient registry"
      meta={`${total} records · full history & delete`}
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
        {selectedIds.size > 0 && (
          <AttioButton
            variant="secondary"
            className="ml-2 gap-1 text-red-600"
            onClick={handleBulkDelete}
          >
            <Trash2 className="size-3.5" />
            Delete {selectedIds.size}
          </AttioButton>
        )}
      </div>

      {error && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-[13px] text-[var(--attio-text-tertiary)]">Loading patients…</p>
      ) : (
        <DataTable
          columns={[
            { key: "select", label: "" },
            { key: "name", label: "Name" },
            { key: "uhid", label: "UHID" },
            { key: "phone", label: "Phone" },
            { key: "dept", label: "Department" },
            { key: "balance", label: "Balance" },
            { key: "tags", label: "Tags" },
            { key: "actions", label: "Actions" },
          ]}
          rows={patients.map((p) => ({
            select: (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSelect(p.id);
                }}
                className="p-1"
              >
                {selectedIds.has(p.id) ? (
                  <CheckSquare className="size-4 text-[var(--attio-accent)]" />
                ) : (
                  <Square className="size-4 text-[var(--attio-text-tertiary)]" />
                )}
              </button>
            ),
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
            actions: (
              <AttioButton
                variant="ghost"
                className="!h-7 !px-2 text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(p.id);
                }}
              >
                <Trash2 className="size-3" />
              </AttioButton>
            ),
          }))}
          onRowClick={(i) => router.push(`/app/admin/patients/${patients[i].id}`)}
        />
      )}

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
