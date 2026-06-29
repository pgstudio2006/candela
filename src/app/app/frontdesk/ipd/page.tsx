"use client";

import {
  admitPatientAction,
  getIpdAdmissionAction,
  getIpdSnapshotAction,
  updateIpdAdmissionAction,
} from "@/app/actions/ipd-actions";
import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, MetricStrip, Panel } from "@/components/frontdesk/ui";
import { useToast } from "@/components/ui/toast-provider";
import { IPD_WARD_OPTIONS } from "@/design-system/ipd-data";
import type { IpdAdmissionDetail, IpdAdmissionStatus, IpdBillingMode, IpdPatientType, IpdSnapshot } from "@/design-system/ipd-data";
import { cn } from "@/lib/utils";
import { BedDouble, Calendar, Loader2, Pencil, Plus, Stethoscope, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

export default function FrontdeskIpdPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [snapshot, setSnapshot] = useState<IpdSnapshot | null>(null);
  const [selectedBed, setSelectedBed] = useState<{ wardId: string; bedId: string } | null>(null);
  const [selectedAdmission, setSelectedAdmission] = useState<IpdAdmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState<"admit" | "edit" | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    const result = await getIpdSnapshotAction();
    if (result.ok) {
      setSnapshot(result.data);
    } else {
      toast(result.error ?? "Failed to load IPD snapshot", "error");
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (selectedBed?.bedId) {
      const ward = snapshot?.wards.find((w) => w.wardId === selectedBed.wardId);
      const bed = ward?.beds.find((b) => b.id === selectedBed.bedId);
      if (bed?.admission) {
        void getIpdAdmissionAction(bed.admission.id).then((res) => {
          if (res.ok) setSelectedAdmission(res.data);
        });
      } else {
        setSelectedAdmission(null);
      }
    }
  }, [selectedBed, snapshot]);

  const metrics = useMemo(() => {
    if (!snapshot) return [];
    return [
      { label: "Total beds", value: String(snapshot.totalBeds), delta: "", trend: "neutral" as const },
      { label: "Occupied", value: String(snapshot.occupiedBeds), delta: "", trend: "neutral" as const },
      { label: "Free beds", value: String(snapshot.freeBeds), delta: "", trend: "neutral" as const },
    ];
  }, [snapshot]);

  const handleAdmit = async (formData: FormData) => {
    const patientId = formData.get("patientId") as string;
    const name = formData.get("name") as string;
    const phone = formData.get("phone") as string;
    const age = Number(formData.get("age") ?? 0);
    const gender = formData.get("gender") as string;
    const doctorId = formData.get("doctorId") as string;
    const departmentId = formData.get("departmentId") as string;
    const diagnosis = formData.get("diagnosis") as string;
    const wardId = formData.get("wardId") as string;
    const bed = formData.get("bed") as string;
    const patientType = formData.get("patientType") as string;
    const billingMode = formData.get("billingMode") as string;
    const expectedDischarge = formData.get("expectedDischarge") as string;

    const result = await admitPatientAction({
      patientId: patientId || undefined,
      newPatient: patientId ? undefined : { name, phone, age, gender },
      doctorId,
      departmentId,
      diagnosis,
      wardId,
      bed,
      patientType: patientType as IpdPatientType,
      billingMode: billingMode as IpdBillingMode,
      expectedDischarge: expectedDischarge || undefined,
    });

    if (result.ok) {
      toast("Patient admitted successfully", "success");
      setDialog(null);
      setRefreshKey((k) => k + 1);
    } else {
      toast(result.error ?? "Admission failed", "error");
    }
  };

  const handleUpdate = async (formData: FormData) => {
    if (!selectedAdmission) return;
    const status = formData.get("status") as IpdAdmissionStatus;
    const expectedDischarge = formData.get("expectedDischarge") as string;
    const result = await updateIpdAdmissionAction(selectedAdmission.id, {
      status,
      expectedDischarge: expectedDischarge || undefined,
    });
    if (result.ok) {
      toast("Admission updated", "success");
      setDialog(null);
      setRefreshKey((k) => k + 1);
      const updated = await getIpdAdmissionAction(selectedAdmission.id);
      if (updated.ok) setSelectedAdmission(updated.data);
    } else {
      toast(result.error ?? "Update failed", "error");
    }
  };

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Front Desk", href: "/app/frontdesk" },
        { label: "IPD" },
      ]}
      title="Inpatient ward"
      meta="Bed map · admissions · live occupancy"
      actions={
        <AttioButton variant="primary" className="gap-1.5" onClick={() => setDialog("admit")}>
          <Plus className="size-3.5" />
          Admit patient
        </AttioButton>
      }
    >
      {loading && !snapshot ? (
        <div className="flex items-center gap-2 py-12 text-[13px] text-[var(--attio-text-tertiary)]">
          <Loader2 className="size-4 animate-spin" />
          Loading IPD snapshot…
        </div>
      ) : (
        <>
          <MetricStrip metrics={metrics} />

          <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="space-y-4">
              {snapshot?.wards.map((ward) => (
                <Panel key={ward.wardId} title={ward.ward}>
                  <div className="flex flex-wrap gap-2">
                    {ward.beds.map((bed) => {
                      const isSelected = selectedBed?.wardId === ward.wardId && selectedBed?.bedId === bed.id;
                      return (
                        <button
                          key={bed.id}
                          type="button"
                          onClick={() => setSelectedBed({ wardId: ward.wardId, bedId: bed.id })}
                          className={cn(
                            "flex min-w-[110px] flex-col gap-1 rounded-lg border px-3 py-2 text-left transition-colors",
                            bed.occupied
                              ? "border-amber-200 bg-amber-50"
                              : "border-emerald-200 bg-emerald-50",
                            isSelected && "ring-2 ring-[var(--attio-accent)]",
                          )}
                        >
                          <span className="flex items-center gap-1.5 text-[12px] font-medium">
                            <BedDouble className="size-3.5" />
                            {bed.id}
                          </span>
                          <span className="text-[11px] text-[var(--attio-text-secondary)]">
                            {bed.occupied ? (
                              <span className="flex items-center gap-1">
                                <span className="size-1.5 rounded-full bg-amber-500" />
                                {bed.admission?.patientName ?? "Occupied"}
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-emerald-600">
                                <span className="size-1.5 rounded-full bg-emerald-500" />
                                Free
                              </span>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </Panel>
              ))}
            </div>

            <div className="space-y-4">
              {selectedBed ? (
                <>
                  <Panel title="Bed details">
                    {selectedAdmission ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <User className="size-4 text-[var(--attio-accent)]" />
                          <div>
                            <p className="text-[13px] font-medium">{selectedAdmission.patientName}</p>
                            <p className="text-[11px] text-[var(--attio-text-tertiary)]">{selectedAdmission.uhid ?? "—"}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[12px]">
                          <div className="rounded-md bg-[var(--attio-surface)] p-2">
                            <p className="text-[10px] uppercase text-[var(--attio-text-tertiary)]">Doctor</p>
                            <p className="mt-0.5 font-medium">{selectedAdmission.doctorName}</p>
                          </div>
                          <div className="rounded-md bg-[var(--attio-surface)] p-2">
                            <p className="text-[10px] uppercase text-[var(--attio-text-tertiary)]">Status</p>
                            <p className="mt-0.5 font-medium capitalize">{selectedAdmission.status.replace("_", " ")}</p>
                          </div>
                          <div className="rounded-md bg-[var(--attio-surface)] p-2">
                            <p className="text-[10px] uppercase text-[var(--attio-text-tertiary)]">Patient type</p>
                            <p className="mt-0.5 font-medium capitalize">{selectedAdmission.patientType}</p>
                          </div>
                          <div className="rounded-md bg-[var(--attio-surface)] p-2">
                            <p className="text-[10px] uppercase text-[var(--attio-text-tertiary)]">Billing</p>
                            <p className="mt-0.5 font-medium capitalize">{selectedAdmission.billingMode}</p>
                          </div>
                        </div>
                        <div className="rounded-md bg-[var(--attio-surface)] p-2 text-[12px]">
                          <p className="text-[10px] uppercase text-[var(--attio-text-tertiary)]">Diagnosis</p>
                          <p className="mt-0.5">{selectedAdmission.diagnosis}</p>
                        </div>
                        {selectedAdmission.expectedDischarge && (
                          <div className="flex items-center gap-1.5 text-[12px] text-[var(--attio-text-secondary)]">
                            <Calendar className="size-3.5" />
                            Expected discharge: {selectedAdmission.expectedDischarge}
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <AttioButton variant="secondary" className="gap-1.5" onClick={() => setDialog("edit")}>
                            <Pencil className="size-3.5" />
                            Edit
                          </AttioButton>
                          <AttioButton
                            variant="secondary"
                            className="gap-1.5"
                            onClick={() => router.push(`/app/frontdesk/patients/${selectedAdmission.patientId}`)}
                          >
                            <Stethoscope className="size-3.5" />
                            Profile
                          </AttioButton>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-[13px] text-[var(--attio-text-secondary)]">
                          Bed {selectedBed.bedId} is free.
                        </p>
                        <AttioButton variant="primary" onClick={() => setDialog("admit")}>
                          <Plus className="mr-1.5 size-3.5" />
                          Admit here
                        </AttioButton>
                      </div>
                    )}
                  </Panel>

                  {selectedAdmission && (
                    <Panel title="Clinical summary">
                      <div className="space-y-2 text-[12px]">
                        <p className="text-[var(--attio-text-secondary)]">
                          <span className="text-[var(--attio-text-tertiary)]">Admitted on:</span>{" "}
                          {selectedAdmission.admittedAt}
                        </p>
                        <p className="text-[var(--attio-text-secondary)]">
                          <span className="text-[var(--attio-text-tertiary)]">Ward:</span>{" "}
                          {selectedAdmission.ward} · Bed {selectedAdmission.bed}
                        </p>
                        {selectedAdmission.lastRoundNote && (
                          <div className="rounded-md bg-[var(--attio-surface)] p-2">
                            <p className="text-[10px] uppercase text-[var(--attio-text-tertiary)]">Last round</p>
                            <p className="mt-1 whitespace-pre-wrap">{selectedAdmission.lastRoundNote}</p>
                          </div>
                        )}
                      </div>
                    </Panel>
                  )}
                </>
              ) : (
                <Panel title="Select a bed">
                  <p className="py-8 text-center text-[13px] text-[var(--attio-text-tertiary)]">
                    Click any bed on the map to view details or admit a patient.
                  </p>
                </Panel>
              )}
            </div>
          </div>
        </>
      )}

      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg overflow-hidden rounded-xl border border-[var(--attio-border)] bg-white shadow-xl">
            <div className="border-b border-[var(--attio-border-subtle)] px-4 py-3">
              <h3 className="text-[15px] font-semibold">
                {dialog === "admit" ? "Admit patient" : "Update admission"}
              </h3>
            </div>
            <form
              action={dialog === "admit" ? handleAdmit : handleUpdate}
              className="max-h-[80vh] overflow-y-auto p-4"
            >
              {dialog === "admit" ? (
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-[12px]">
                      <span className="mb-1 block text-[var(--attio-text-tertiary)]">Full name</span>
                      <input
                        name="name"
                        type="text"
                        required
                        className="h-9 w-full rounded-lg border border-[var(--attio-border)] px-3"
                      />
                    </label>
                    <label className="block text-[12px]">
                      <span className="mb-1 block text-[var(--attio-text-tertiary)]">Phone</span>
                      <input
                        name="phone"
                        type="tel"
                        className="h-9 w-full rounded-lg border border-[var(--attio-border)] px-3"
                      />
                    </label>
                    <label className="block text-[12px]">
                      <span className="mb-1 block text-[var(--attio-text-tertiary)]">Age</span>
                      <input
                        name="age"
                        type="number"
                        min={0}
                        max={120}
                        className="h-9 w-full rounded-lg border border-[var(--attio-border)] px-3"
                      />
                    </label>
                    <label className="block text-[12px]">
                      <span className="mb-1 block text-[var(--attio-text-tertiary)]">Gender</span>
                      <select name="gender" className="h-9 w-full rounded-lg border border-[var(--attio-border)] bg-white px-3">
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="O">Other</option>
                      </select>
                    </label>
                  </div>
                  <label className="block text-[12px]">
                    <span className="mb-1 block text-[var(--attio-text-tertiary)]">Diagnosis</span>
                    <input
                      name="diagnosis"
                      type="text"
                      required
                      placeholder="e.g. Total knee replacement"
                      className="h-9 w-full rounded-lg border border-[var(--attio-border)] px-3"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-[12px]">
                      <span className="mb-1 block text-[var(--attio-text-tertiary)]">Ward</span>
                      <select
                        name="wardId"
                        defaultValue={selectedBed?.wardId ?? IPD_WARD_OPTIONS[0].id}
                        className="h-9 w-full rounded-lg border border-[var(--attio-border)] bg-white px-3"
                      >
                        {IPD_WARD_OPTIONS.map((w) => (
                          <option key={w.id} value={w.id}>
                            {w.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-[12px]">
                      <span className="mb-1 block text-[var(--attio-text-tertiary)]">Bed</span>
                      <select
                        name="bed"
                        defaultValue={selectedBed?.bedId}
                        className="h-9 w-full rounded-lg border border-[var(--attio-border)] bg-white px-3"
                      >
                        {IPD_WARD_OPTIONS.find((w) => w.id === (selectedBed?.wardId ?? IPD_WARD_OPTIONS[0].id))?.beds.map((b) => (
                          <option key={b} value={b}>
                            {b}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-[12px]">
                      <span className="mb-1 block text-[var(--attio-text-tertiary)]">Patient type</span>
                      <select name="patientType" className="h-9 w-full rounded-lg border border-[var(--attio-border)] bg-white px-3">
                        <option value="general">General</option>
                        <option value="corporate">Corporate</option>
                        <option value="insurance">Insurance</option>
                        <option value="vip">VIP</option>
                      </select>
                    </label>
                    <label className="block text-[12px]">
                      <span className="mb-1 block text-[var(--attio-text-tertiary)]">Billing mode</span>
                      <select name="billingMode" className="h-9 w-full rounded-lg border border-[var(--attio-border)] bg-white px-3">
                        <option value="prepaid">Prepaid</option>
                        <option value="postpaid">Postpaid</option>
                      </select>
                    </label>
                  </div>
                  <label className="block text-[12px]">
                    <span className="mb-1 block text-[var(--attio-text-tertiary)]">Expected discharge</span>
                    <input
                      name="expectedDischarge"
                      type="date"
                      className="h-9 w-full rounded-lg border border-[var(--attio-border)] px-3"
                    />
                  </label>
                  <label className="block text-[12px]">
                    <span className="mb-1 block text-[var(--attio-text-tertiary)]">Attending doctor ID</span>
                    <input
                      name="doctorId"
                      type="text"
                      required
                      className="h-9 w-full rounded-lg border border-[var(--attio-border)] px-3"
                    />
                  </label>
                  <label className="block text-[12px]">
                    <span className="mb-1 block text-[var(--attio-text-tertiary)]">Department ID</span>
                    <input
                      name="departmentId"
                      type="text"
                      className="h-9 w-full rounded-lg border border-[var(--attio-border)] px-3"
                    />
                  </label>
                </div>
              ) : (
                <div className="space-y-3">
                  <label className="block text-[12px]">
                    <span className="mb-1 block text-[var(--attio-text-tertiary)]">Status</span>
                    <select
                      name="status"
                      defaultValue={selectedAdmission?.status ?? "admitted"}
                      className="h-9 w-full rounded-lg border border-[var(--attio-border)] bg-white px-3"
                    >
                      <option value="admitted">Admitted</option>
                      <option value="discharge_planned">Discharge planned</option>
                      <option value="discharged">Discharged</option>
                    </select>
                  </label>
                  <label className="block text-[12px]">
                    <span className="mb-1 block text-[var(--attio-text-tertiary)]">Expected discharge</span>
                    <input
                      name="expectedDischarge"
                      type="date"
                      defaultValue={selectedAdmission?.expectedDischarge ?? ""}
                      className="h-9 w-full rounded-lg border border-[var(--attio-border)] px-3"
                    />
                  </label>
                </div>
              )}

              <div className="mt-5 flex justify-end gap-2">
                <AttioButton type="button" variant="secondary" onClick={() => setDialog(null)}>
                  Cancel
                </AttioButton>
                <AttioButton type="submit" variant="primary">
                  {dialog === "admit" ? "Admit" : "Save"}
                </AttioButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageChrome>
  );
}
