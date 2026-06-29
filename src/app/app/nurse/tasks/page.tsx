"use client";

import { useNurseStore } from "@/components/nurse/nurse-store";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel, StatusBadge } from "@/components/frontdesk/ui";
import { useNursePoll } from "@/hooks/use-nurse-poll";
import { useToast } from "@/components/ui/toast-provider";
import { cn } from "@/lib/utils";
import { Check, Circle, Clock } from "lucide-react";
import { useMemo, useState } from "react";

export default function NurseTasksPage() {
  useNursePoll();
  const { toast } = useToast();
  const { episodes, patients, handoffs, createTask, updateTaskStatus } = useNurseStore();
  const [newTitle, setNewTitle] = useState("");
  const [newVisitId, setNewVisitId] = useState("");
  const [saving, setSaving] = useState(false);

  const tasks = useMemo(
    () =>
      episodes.flatMap((ep) => {
        const patient = patients.find((p) => p.id === ep.patientId);
        const handoff = handoffs.find((h) => h.visitId === ep.visitId);
        return ep.tasks.map((t) => ({
          ...t,
          patientName: patient?.name ?? handoff?.patientName ?? "Patient",
          uhid: handoff?.uhid ?? "",
        }));
      }).sort((a, b) => new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()),
    [episodes, patients, handoffs],
  );

  const activeEpisodes = useMemo(
    () => episodes.filter((e) => e.status !== "completed").map((e) => ({
      visitId: e.visitId,
      patientName: patients.find((p) => p.id === e.patientId)?.name ?? handoffs.find((h) => h.visitId === e.visitId)?.patientName ?? "Patient",
    })),
    [episodes, patients, handoffs],
  );

  const addTask = async () => {
    if (!newTitle.trim() || !newVisitId) {
      toast("Enter task and select patient", "error");
      return;
    }
    setSaving(true);
    const result = await createTask(newVisitId, newTitle.trim(), "Doctor");
    setSaving(false);
    if (!result.ok) {
      toast(result.error ?? "Failed to add task", "error");
      return;
    }
    toast("Task added", "success");
    setNewTitle("");
    setNewVisitId("");
  };

  const mark = async (visitId: string, taskId: string, status: "pending" | "in_progress" | "completed") => {
    const result = await updateTaskStatus(visitId, taskId, status);
    if (!result.ok) toast(result.error ?? "Failed to update task", "error");
  };

  return (
    <PageChrome
      breadcrumbs={[{ label: "Nursing", href: "/app/nurse" }, { label: "Doctor tasks" }]}
      title="Doctor tasks"
      meta="Tasks assigned by doctor · mark progress"
    >
      <Panel title="New task">
        <div className="flex flex-wrap gap-3">
          <select
            value={newVisitId}
            onChange={(e) => setNewVisitId(e.target.value)}
            className="h-9 rounded-lg border border-[var(--attio-border)] bg-white px-3 text-[13px]"
          >
            <option value="">Select patient</option>
            {activeEpisodes.map((e) => (
              <option key={e.visitId} value={e.visitId}>{e.patientName}</option>
            ))}
          </select>
          <input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Task description"
            className="h-9 w-full max-w-md rounded-lg border border-[var(--attio-border)] px-3 text-[13px]"
          />
          <AttioButton variant="primary" onClick={addTask} disabled={saving}>
            Add task
          </AttioButton>
        </div>
      </Panel>

      <Panel title="Task list">
        {tasks.length === 0 && (
          <p className="py-6 text-center text-[13px] text-[var(--attio-text-tertiary)]">
            No tasks yet. Create a task from the doctor handoff or add one above.
          </p>
        )}
        <ul className="divide-y divide-[var(--attio-border-subtle)]">
          {tasks.map((t) => (
            <li key={t.id} className="py-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[13px] font-medium">{t.title}</p>
                  <p className="text-[11px] text-[var(--attio-text-tertiary)]">
                    {t.patientName} · {t.uhid} · Assigned by {t.assignedBy}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {t.status === "completed" ? (
                    <StatusBadge label="Completed" variant="success" />
                  ) : t.status === "in_progress" ? (
                    <StatusBadge label="In progress" variant="warning" />
                  ) : (
                    <StatusBadge label="Pending" variant="neutral" />
                  )}
                  <button
                    type="button"
                    onClick={() => mark(t.visitId, t.id, t.status === "completed" ? "pending" : "completed")}
                    className={cn(
                      "flex size-7 items-center justify-center rounded-md border text-[var(--attio-text-secondary)] hover:bg-[var(--attio-surface)]",
                      t.status === "completed" && "border-emerald-300 bg-emerald-50 text-emerald-600",
                    )}
                  >
                    {t.status === "completed" ? <Check className="size-3.5" /> : <Circle className="size-3.5" />}
                  </button>
                  {t.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => mark(t.visitId, t.id, "in_progress")}
                      className="flex size-7 items-center justify-center rounded-md border text-[var(--attio-text-secondary)] hover:bg-[var(--attio-surface)]"
                      title="Start task"
                    >
                      <Clock className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
              {t.notes && <p className="mt-1 text-[12px] text-[var(--attio-text-secondary)]">{t.notes}</p>}
            </li>
          ))}
        </ul>
      </Panel>
    </PageChrome>
  );
}
