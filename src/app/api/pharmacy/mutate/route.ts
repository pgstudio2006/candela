import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireModule } from "@/server/auth";
import { serializeForClient } from "@/server/serialize";
import { throwIfPrismaError } from "@/server/prisma-errors";
import { ServerActionError } from "@/server/errors";
import {
  addDrug,
  addSupplier,
  adjustStock,
  approveReturn,
  createPO,
  dispensePrescription,
  fulfillIndent,
  markBillPaid,
  quarantineBatch,
  receivePO,
  rejectPrescription,
  restockReturn,
  updateDrug,
  updatePOStatus,
  updateSupplier,
  verifyPrescription,
} from "@/server/pharmacy/index";
import type { Drug, PaymentMode, PoLine, PurchaseOrder, Supplier } from "@/design-system/pharmacy-data";

type ActionBody = {
  op: string;
  operatorId: string;
  rxId?: string;
  counselingNotes?: string;
  reason?: string;
  quantities?: Record<string, number>;
  witnessName?: string;
  billId?: string;
  mode?: PaymentMode;
  batchId?: string;
  delta?: number;
  quarantined?: boolean;
  drug?: Omit<Drug, "id">;
  id?: string;
  patch?: Partial<Drug> | Partial<Supplier>;
  supplier?: Omit<Supplier, "id">;
  supplierId?: string;
  lines?: PoLine[];
  notes?: string;
  status?: PurchaseOrder["status"];
  poId?: string;
  received?: Record<string, { qty: number; batchNo: string; expiry: string }>;
  qty?: number;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  let body: ActionBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body." }, { status: 400 });
  }

  try {
    const ctx = await requireModule("pharmacy");
    const { op, operatorId } = body;
    let result: unknown;

    switch (op) {
      case "verifyPrescription":
        result = await verifyPrescription(ctx, operatorId, body.rxId!, body.counselingNotes);
        break;
      case "rejectPrescription":
        result = await rejectPrescription(ctx, operatorId, body.rxId!, body.reason!);
        break;
      case "dispensePrescription":
        result = await dispensePrescription(ctx, operatorId, body.rxId!, body.quantities!, body.witnessName);
        break;
      case "markBillPaid":
        result = await markBillPaid(ctx, operatorId, body.billId!, body.mode!);
        break;
      case "adjustStock":
        result = await adjustStock(ctx, operatorId, body.batchId!, body.delta!, body.reason!);
        break;
      case "quarantineBatch":
        result = await quarantineBatch(ctx, operatorId, body.batchId!, body.quarantined!);
        break;
      case "addDrug":
        result = await addDrug(ctx, operatorId, body.drug!);
        break;
      case "updateDrug":
        result = await updateDrug(ctx, operatorId, body.id!, body.patch as Partial<Drug>);
        break;
      case "addSupplier":
        result = await addSupplier(ctx, operatorId, body.supplier!);
        break;
      case "updateSupplier":
        result = await updateSupplier(ctx, operatorId, body.id!, body.patch as Partial<Supplier>);
        break;
      case "createPO":
        result = await createPO(ctx, operatorId, body.supplierId!, body.lines!, body.notes);
        break;
      case "updatePOStatus":
        result = await updatePOStatus(ctx, operatorId, body.id!, body.status!);
        break;
      case "receivePO":
        result = await receivePO(ctx, operatorId, body.poId!, body.received!);
        break;
      case "approveReturn":
        result = await approveReturn(ctx, operatorId, body.id!);
        break;
      case "restockReturn":
        result = await restockReturn(ctx, operatorId, body.id!);
        break;
      case "fulfillIndent":
        result = await fulfillIndent(ctx, operatorId, body.id!, body.qty!);
        break;
      default:
        return NextResponse.json({ ok: false, error: `Unknown operation: ${op}` }, { status: 400 });
    }

    return NextResponse.json({ ok: true, data: serializeForClient(result) });
  } catch (error) {
    try {
      throwIfPrismaError(error);
    } catch (mapped) {
      if (mapped instanceof ServerActionError) {
        return NextResponse.json({ ok: false, error: mapped.message }, { status: 400 });
      }
    }
    if (error instanceof ServerActionError) {
      return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    }
    const msg = error instanceof Error ? error.message : "Something went wrong.";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
