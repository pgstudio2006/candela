import type { PrescriptionLine as DoctorPrescriptionLine } from "@/design-system/doctor-data";
import type { Prescription } from "@/design-system/pharmacy-data";
import { prisma } from "@/lib/prisma";
import { parseJson, defaultPharmacyState, type PharmacyStateShape } from "@/server/revenue/state-seeds";
import { ensureRevenueSeeded } from "@/server/revenue/bootstrap";
import { writePlatformAudit } from "@/server/platform-audit";
import type { ServerContext } from "@/server/context";
import { queueNotification } from "@/server/notifications";

async function readPharmacyState(): Promise<PharmacyStateShape> {
  await ensureRevenueSeeded();
  const row = await prisma.pharmacyWorkspaceState.findUnique({ where: { id: "default" } });
  if (!row) return defaultPharmacyState({});
  return parseJson<PharmacyStateShape>(row.payload);
}

async function writePharmacyState(next: PharmacyStateShape) {
  await prisma.pharmacyWorkspaceState.upsert({
    where: { id: "default" },
    create: { id: "default", payload: next },
    update: { payload: next },
  });
}

/** Push doctor Rx into pharmacy queue after consult complete */
export async function pushPrescriptionToPharmacy(
  ctx: ServerContext,
  input: {
    visitId: string;
    patientId: string;
    patientName: string;
    uhid: string;
    doctorId: string;
    doctorName: string;
    lines: DoctorPrescriptionLine[];
  },
) {
  if (!input.lines.length) return null;

  const state = await readPharmacyState();
  const rxId = `rx_${input.visitId}_${Date.now()}`;
  const rx: Prescription = {
    id: rxId,
    encounterId: input.visitId,
    patientName: input.patientName,
    uhid: input.uhid,
    doctorName: input.doctorName,
    source: "opd",
    priority: "routine",
    status: "pending",
    lines: input.lines.map((l, idx) => {
      const drugId = l.drug.toLowerCase().replace(/\s+/g, "_");
      const qty = Math.max(1, Math.ceil(parseInt(l.duration, 10) || 7));
      return {
        id: l.id || `rxl_${rxId}_${idx}`,
        drugId,
        dose: l.dose,
        frequency: l.frequency,
        duration: l.duration,
        qtyPrescribed: qty,
        qtyDispensed: 0,
        notes: l.instructions,
      };
    }),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  state.prescriptions = [rx, ...(state.prescriptions ?? [])];
  state.activities = [
    {
      id: `act_${rxId}`,
      at: new Date().toISOString(),
      actor: input.doctorName,
      type: "rx_received",
      summary: `Prescription from consult ${input.visitId} — ${input.lines.length} item(s)`,
      refId: rxId,
    },
    ...(state.activities ?? []),
  ];

  await writePharmacyState(state);

  await writePlatformAudit({
    ctx,
    module: "pharmacy",
    action: "prescription_received",
    entityType: "prescription",
    entityId: rxId,
    summary: `Rx queued for ${input.patientName} from ${input.doctorName}`,
    payload: { visitId: input.visitId, lineCount: input.lines.length },
  });

  await queueNotification(ctx, {
    channel: "in_app",
    recipient: "opd@navayu.in",
    subject: "New prescription to verify",
    body: `${input.patientName} (${input.uhid}) — ${input.lines.length} item(s) from Dr. ${input.doctorName}`,
    module: "pharmacy",
    entityId: rxId,
  });

  return rxId;
}
