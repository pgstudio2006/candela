import type {
  Drug,
  PaymentMode,
  PharmacyBill,
  PoLine,
  Prescription,
  PurchaseOrder,
  Supplier,
} from "@/design-system/pharmacy-data";
import {
  mutateAddDrug,
  mutateAddSupplier,
  mutateAdjustStock,
  mutateApproveReturn,
  mutateCreatePO,
  mutateDispensePrescription,
  mutateFulfillIndent,
  mutateMarkBillPaid,
  mutateQuarantineBatch,
  mutateReceivePO,
  mutateRejectPrescription,
  mutateRestockReturn,
  mutateUpdateDrug,
  mutateUpdatePOStatus,
  mutateUpdateSupplier,
  mutateVerifyPrescription,
  resolveStaffOperator,
} from "@/lib/pharmacy-state-mutations";
import { validateDispenseQuantities, validateRejectReason } from "@/lib/pharmacy-validation";
import { prisma } from "@/lib/prisma";
import type { ServerContext } from "@/server/context";
import { assertManager, assertPurchaseOrManager } from "@/server/pharmacy/guards";
import { writePlatformAudit } from "@/server/platform-audit";
import { ensureRevenueSeeded } from "@/server/revenue/bootstrap";
import { defaultPharmacyState, type PharmacyStateShape } from "@/server/revenue/state-seeds";
import { branchScope } from "@/server/tenancy";
import { readPharmacyWorkspace, writePharmacyWorkspace } from "@/server/workspace-state";
import { syncVisitFromOpdVisit } from "@/server/visit-sync";
import { notifyPharmacyDispenseWhatsapp } from "@/server/notifications";

export type PharmacySnapshot = PharmacyStateShape & {
  activeOperatorId: string;
  activeOperatorName: string;
  activeOperatorRole: "manager" | "opd" | "purchase";
};

async function readState(ctx: ServerContext): Promise<PharmacyStateShape> {
  await ensureRevenueSeeded();
  return readPharmacyWorkspace(ctx, () => defaultPharmacyState({}));
}

async function persistState(ctx: ServerContext, state: PharmacyStateShape) {
  const { operatorId: _drop, ...payload } = state;
  await writePharmacyWorkspace(ctx, payload);
}

async function withOperator(ctx: ServerContext, operatorId: string, fn: (state: PharmacyStateShape, operator: ReturnType<typeof resolveStaffOperator>) => Promise<PharmacyStateShape>) {
  const state = await readState(ctx);
  const operator = resolveStaffOperator(state, operatorId);
  const next = await fn(state, operator);
  await persistState(ctx, next);
  return next;
}

export async function getPharmacySnapshot(ctx: ServerContext, operatorId: string): Promise<PharmacySnapshot> {
  const state = await readState(ctx);
  let activeOperatorId = operatorId;
  let activeOperatorName = "Pharmacist";
  let activeOperatorRole: PharmacySnapshot["activeOperatorRole"] = "opd";

  if (operatorId) {
    try {
      const op = resolveStaffOperator(state, operatorId);
      activeOperatorId = op.id;
      activeOperatorName = op.name;
      activeOperatorRole = op.role;
    } catch {
      /* client may not have operator yet */
    }
  }

  return {
    ...state,
    operatorId: activeOperatorId,
    activeOperatorId,
    activeOperatorName,
    activeOperatorRole,
  };
}

export async function getPharmacySnapshotForContext(ctx: ServerContext): Promise<PharmacyStateShape> {
  return readState(ctx);
}

export async function verifyPrescription(
  ctx: ServerContext,
  operatorId: string,
  rxId: string,
  counselingNotes?: string,
) {
  await withOperator(ctx, operatorId, async (state, operator) => {
    const next = mutateVerifyPrescription(state, rxId, operator, counselingNotes);
    await writePlatformAudit({
      ctx,
      module: "pharmacy",
      action: "prescription_verified",
      entityType: "prescription",
      entityId: rxId,
      summary: `Prescription verified by ${operator.name}`,
      payload: { operatorId: operator.id },
    });
    return next;
  });
}

export async function rejectPrescription(ctx: ServerContext, operatorId: string, rxId: string, reason: string) {
  const validatedReason = validateRejectReason(reason);
  await withOperator(ctx, operatorId, async (state, operator) => {
    const next = mutateRejectPrescription(state, rxId, operator, validatedReason);
    await writePlatformAudit({
      ctx,
      module: "pharmacy",
      action: "prescription_rejected",
      entityType: "prescription",
      entityId: rxId,
      summary: `Prescription rejected by ${operator.name}: ${validatedReason}`,
      severity: "warning",
    });
    return next;
  });
}

export async function dispensePrescription(
  ctx: ServerContext,
  operatorId: string,
  rxId: string,
  quantities: Record<string, number>,
  witnessName?: string,
) {
  validateDispenseQuantities(quantities);
  let dispenseResult: Awaited<ReturnType<typeof mutateDispensePrescription>>["result"] | null = null;

  await withOperator(ctx, operatorId, async (state, operator) => {
    const { state: next, result } = mutateDispensePrescription(state, rxId, operator, quantities, witnessName);
    dispenseResult = result;

    await writePlatformAudit({
      ctx,
      module: "pharmacy",
      action: "prescription_dispensed",
      entityType: "prescription",
      entityId: rxId,
      summary: `Dispensed ${result.patientName} — bill ${result.billId} · ₹${result.total.toFixed(0)}`,
      payload: { billId: result.billId, allDone: result.allDone },
    });

    if (result.visitId) {
      await prisma.opdVisit.updateMany({
        where: { id: result.visitId, ...branchScope(ctx) },
        data: {
          routingNote: result.allDone
            ? `Pharmacy dispensed · bill ${result.billId} · ₹${result.total.toFixed(0)} — collect at counter`
            : `Partial pharmacy dispense · bill ${result.billId}`,
        },
      });
      const opd = await prisma.opdVisit.findUnique({ where: { id: result.visitId } });
      if (opd) await syncVisitFromOpdVisit(ctx, opd);
    }

    if (result.allDone && result.visitId) {
      const visit = await prisma.opdVisit.findFirst({
        where: { id: result.visitId, ...branchScope(ctx) },
      });
      if (visit?.patientId) {
        const patient = await prisma.patient.findUnique({ where: { id: visit.patientId } });
        const phone = patient?.phone;
        if (phone) {
          await notifyPharmacyDispenseWhatsapp(ctx, {
            patientName: result.patientName,
            phone,
            visitId: result.visitId,
            billId: result.billId,
            total: result.total,
          });
        }
      }
    }

    return next;
  });

  return dispenseResult!;
}

export async function markBillPaid(ctx: ServerContext, operatorId: string, billId: string, mode: PaymentMode) {
  await withOperator(ctx, operatorId, async (state, operator) => {
    const next = mutateMarkBillPaid(state, billId, operator, mode);
    await writePlatformAudit({
      ctx,
      module: "pharmacy",
      action: "bill_paid",
      entityType: "bill",
      entityId: billId,
      summary: `Bill ${billId} marked paid (${mode}) by ${operator.name}`,
    });
    return next;
  });
}

export async function adjustStock(ctx: ServerContext, operatorId: string, batchId: string, delta: number, reason: string) {
  await withOperator(ctx, operatorId, async (state, operator) => {
    assertManager(operator);
    const next = mutateAdjustStock(state, batchId, operator, delta, reason);
    await writePlatformAudit({
      ctx,
      module: "pharmacy",
      action: "stock_adjusted",
      entityType: "batch",
      entityId: batchId,
      summary: `Stock adjusted ${delta} by ${operator.name}: ${reason}`,
      payload: { delta, reason },
    });
    return next;
  });
}

export async function quarantineBatch(ctx: ServerContext, operatorId: string, batchId: string, quarantined: boolean) {
  await withOperator(ctx, operatorId, async (state, operator) => {
    const next = mutateQuarantineBatch(state, batchId, operator, quarantined);
    await writePlatformAudit({
      ctx,
      module: "pharmacy",
      action: quarantined ? "batch_quarantined" : "batch_released",
      entityType: "batch",
      entityId: batchId,
      summary: `${quarantined ? "Quarantined" : "Released"} batch by ${operator.name}`,
      severity: quarantined ? "warning" : "info",
    });
    return next;
  });
}

export async function addDrug(ctx: ServerContext, operatorId: string, drug: Omit<Drug, "id">) {
  await withOperator(ctx, operatorId, async (state, operator) => {
    assertPurchaseOrManager(operator);
    const next = mutateAddDrug(state, operator, drug);
    await writePlatformAudit({
      ctx,
      module: "pharmacy",
      action: "drug_added",
      entityType: "drug",
      entityId: next.drugs.at(-1)?.id ?? "drug",
      summary: `Drug added: ${drug.brandName} by ${operator.name}`,
    });
    return next;
  });
}

export async function updateDrug(ctx: ServerContext, operatorId: string, id: string, patch: Partial<Drug>) {
  await withOperator(ctx, operatorId, async (state, operator) => {
    assertPurchaseOrManager(operator);
    return mutateUpdateDrug(state, id, patch);
  });
}

export async function addSupplier(ctx: ServerContext, operatorId: string, supplier: Omit<Supplier, "id">) {
  await withOperator(ctx, operatorId, async (state, operator) => {
    assertPurchaseOrManager(operator);
    return mutateAddSupplier(state, supplier);
  });
}

export async function updateSupplier(ctx: ServerContext, operatorId: string, id: string, patch: Partial<Supplier>) {
  await withOperator(ctx, operatorId, async (state, operator) => {
    assertPurchaseOrManager(operator);
    return mutateUpdateSupplier(state, id, patch);
  });
}

export async function createPO(ctx: ServerContext, operatorId: string, supplierId: string, lines: PoLine[], notes?: string) {
  await withOperator(ctx, operatorId, async (state, operator) => {
    assertPurchaseOrManager(operator);
    const next = mutateCreatePO(state, operator, supplierId, lines, notes);
    await writePlatformAudit({
      ctx,
      module: "pharmacy",
      action: "po_created",
      entityType: "purchase_order",
      entityId: next.purchaseOrders[0]?.id ?? "po",
      summary: `PO created by ${operator.name}`,
    });
    return next;
  });
}

export async function updatePOStatus(
  ctx: ServerContext,
  operatorId: string,
  id: string,
  status: PurchaseOrder["status"],
) {
  await withOperator(ctx, operatorId, async (state, operator) => {
    assertPurchaseOrManager(operator);
    const next = mutateUpdatePOStatus(state, id, status);
    await writePlatformAudit({
      ctx,
      module: "pharmacy",
      action: "po_status_updated",
      entityType: "purchase_order",
      entityId: id,
      summary: `PO ${id} → ${status} by ${operator.name}`,
    });
    return next;
  });
}

export async function receivePO(
  ctx: ServerContext,
  operatorId: string,
  poId: string,
  received: Record<string, { qty: number; batchNo: string; expiry: string }>,
) {
  await withOperator(ctx, operatorId, async (state, operator) => {
    assertPurchaseOrManager(operator);
    const next = mutateReceivePO(state, operator, poId, received);
    await writePlatformAudit({
      ctx,
      module: "pharmacy",
      action: "po_received",
      entityType: "purchase_order",
      entityId: poId,
      summary: `GRN recorded for ${poId} by ${operator.name}`,
    });
    return next;
  });
}

export async function approveReturn(ctx: ServerContext, operatorId: string, id: string) {
  await withOperator(ctx, operatorId, async (state, operator) => {
    assertManager(operator);
    return mutateApproveReturn(state, id);
  });
}

export async function restockReturn(ctx: ServerContext, operatorId: string, id: string) {
  await withOperator(ctx, operatorId, async (state, operator) => {
    assertManager(operator);
    const next = mutateRestockReturn(state, operator, id);
    await writePlatformAudit({
      ctx,
      module: "pharmacy",
      action: "return_restocked",
      entityType: "return",
      entityId: id,
      summary: `Return restocked by ${operator.name}`,
    });
    return next;
  });
}

export async function fulfillIndent(ctx: ServerContext, operatorId: string, id: string, qty: number) {
  await withOperator(ctx, operatorId, async (state, operator) => {
    const next = mutateFulfillIndent(state, operator, id, qty);
    await writePlatformAudit({
      ctx,
      module: "pharmacy",
      action: "indent_fulfilled",
      entityType: "indent",
      entityId: id,
      summary: `Ward indent fulfilled (${qty} units) by ${operator.name}`,
    });
    return next;
  });
}

export async function listPharmacyAuditLogs(ctx: ServerContext, input: { limit?: number; cursor?: string }) {
  const limit = Math.min(100, Math.max(10, input.limit ?? 50));
  const rows = await prisma.auditLog.findMany({
    where: {
      tenantId: ctx.tenantId,
      branchId: ctx.branchId,
      module: "pharmacy",
      ...(input.cursor ? { createdAt: { lt: new Date(input.cursor) } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map((r) => ({
    id: r.id,
    at: r.createdAt.toISOString(),
    actor: r.actor,
    actorRole: r.actorRole ?? "",
    action: r.action,
    entityType: r.entityType,
    entityId: r.entityId,
    summary: r.summary,
    severity: r.severity,
  }));
}

export async function pushPrescriptionFromDoctor(
  ctx: ServerContext,
  input: {
    visitId: string;
    patientId: string;
    patientName: string;
    uhid: string;
    doctorId: string;
    doctorName: string;
    lines: Array<{ id?: string; drug: string; dose: string; frequency: string; duration: string; instructions?: string }>;
    priority?: Prescription["priority"];
  },
) {
  if (!input.lines.length) return null;

  const state = await readState(ctx);
  const rxId = `rx_${input.visitId}_${Date.now()}`;
  const priority = input.priority ?? "routine";
  const rx: Prescription = {
    id: rxId,
    encounterId: input.visitId,
    patientName: input.patientName,
    uhid: input.uhid,
    doctorName: input.doctorName,
    source: "opd",
    priority,
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

  const next: PharmacyStateShape = {
    ...state,
    prescriptions: [rx, ...state.prescriptions],
    activities: [
      {
        id: `act_${rxId}`,
        at: new Date().toISOString(),
        actor: input.doctorName,
        type: "rx_received",
        summary: `Prescription from consult ${input.visitId} — ${input.lines.length} item(s)`,
        refId: rxId,
      },
      ...state.activities,
    ].slice(0, 200),
  };

  await persistState(ctx, next);

  await writePlatformAudit({
    ctx,
    module: "pharmacy",
    action: "prescription_received",
    entityType: "prescription",
    entityId: rxId,
    summary: `Rx queued for ${input.patientName} from ${input.doctorName}`,
    payload: { visitId: input.visitId, lineCount: input.lines.length, priority },
  });

  return rxId;
}
