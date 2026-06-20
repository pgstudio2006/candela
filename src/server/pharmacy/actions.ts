"use server";

import { prisma } from "@/lib/prisma";
import { requireModule } from "@/server/auth";
import { ensureRevenueSeeded } from "@/server/revenue/bootstrap";
import { hashPassword, verifyPassword } from "@/server/revenue/password";
import { readPharmacyWorkspace, writePharmacyWorkspace } from "@/server/workspace-state";
import { getServerContext } from "@/server/context";
import { defaultPharmacyState, type PharmacyStateShape } from "@/server/revenue/state-seeds";
import type {
  Drug,
  PharmacyActivity,
  PharmacyBill,
  Prescription,
  PurchaseOrder,
  ReturnRecord,
  ScheduleHEntry,
  StockBatch,
  Supplier,
  WardIndent,
} from "@/design-system/pharmacy-data";

export type PharmacyLoginResult =
  | { ok: true; operatorId: string; name: string; email: string }
  | { ok: false; error: string };

async function readState(): Promise<PharmacyStateShape> {
  await ensureRevenueSeeded();
  const ctx = await getServerContext();
  return readPharmacyWorkspace(ctx, () => defaultPharmacyState({}));
}

async function writeState(next: PharmacyStateShape): Promise<void> {
  const ctx = await getServerContext();
  const { operatorId: _drop, ...payload } = next;
  await writePharmacyWorkspace(ctx, payload);
}

export async function getPharmacyStateAction(): Promise<PharmacyStateShape> {
  await requireModule("pharmacy");
  return readState();
}

export async function savePharmacyStateAction(next: PharmacyStateShape): Promise<void> {
  await requireModule("pharmacy");
  await ensureRevenueSeeded();
  await writeState(next);
  await Promise.all(
    next.staff.map(async (member) =>
      prisma.pharmacyOperatorCredential.upsert({
        where: { id: member.id },
        create: {
          id: member.id,
          name: member.name,
          email: member.email.toLowerCase(),
          role: member.role,
          active: member.active,
          licenseNo: member.licenseNo,
          passwordHash: await hashPassword(next.staffPasswords[member.id] ?? "welcome123"),
        },
        update: {
          name: member.name,
          email: member.email.toLowerCase(),
          role: member.role,
          active: member.active,
          licenseNo: member.licenseNo,
          passwordHash: await hashPassword(next.staffPasswords[member.id] ?? "welcome123"),
        },
      }),
    ),
  );
}

export async function validatePharmacyLoginAction(email: string, password: string): Promise<PharmacyLoginResult> {
  await ensureRevenueSeeded();
  const normalized = email.trim().toLowerCase();
  const pwd = password.trim();
  if (!normalized || !pwd) return { ok: false, error: "Enter email and password." };

  const operator = await prisma.pharmacyOperatorCredential.findUnique({
    where: { email: normalized },
  });
  if (!operator) return { ok: false, error: "No pharmacy account for this email." };
  if (!operator.active) return { ok: false, error: "Account inactive." };
  if (!(await verifyPassword(pwd, operator.passwordHash))) {
    return { ok: false, error: "Incorrect password." };
  }
  return { ok: true, operatorId: operator.id, name: operator.name, email: operator.email };
}

export async function upsertPharmacyOperatorAction(input: {
  id: string;
  name: string;
  email: string;
  role: "manager" | "opd" | "purchase";
  active: boolean;
  licenseNo?: string;
  password: string;
}) {
  await requireModule("pharmacy");
  await ensureRevenueSeeded();
  const passwordHash = await hashPassword(input.password);
  await prisma.pharmacyOperatorCredential.upsert({
    where: { id: input.id },
    create: {
      ...input,
      email: input.email.trim().toLowerCase(),
      passwordHash,
    },
    update: {
      ...input,
      email: input.email.trim().toLowerCase(),
      passwordHash,
    },
  });
}

export async function listDrugsAction(): Promise<Drug[]> {
  await requireModule("pharmacy");
  return (await readState()).drugs;
}

export async function listInventoryAction(): Promise<StockBatch[]> {
  await requireModule("pharmacy");
  return (await readState()).stock;
}

export async function listPrescriptionsAction(): Promise<Prescription[]> {
  await requireModule("pharmacy");
  return (await readState()).prescriptions;
}

export async function listBillingAction(): Promise<PharmacyBill[]> {
  await requireModule("pharmacy");
  return (await readState()).bills;
}

export async function listPurchaseOrdersAction(): Promise<PurchaseOrder[]> {
  await requireModule("pharmacy");
  return (await readState()).purchaseOrders;
}

export async function listSuppliersAction(): Promise<Supplier[]> {
  await requireModule("pharmacy");
  return (await readState()).suppliers;
}

export async function listReturnsAction(): Promise<ReturnRecord[]> {
  await requireModule("pharmacy");
  return (await readState()).returns;
}

export async function listIndentsAction(): Promise<WardIndent[]> {
  await requireModule("pharmacy");
  return (await readState()).indents;
}

export async function listAuditAction(): Promise<PharmacyActivity[]> {
  await requireModule("pharmacy");
  return (await readState()).activities;
}

export async function listScheduleHAction(): Promise<ScheduleHEntry[]> {
  await requireModule("pharmacy");
  return (await readState()).scheduleH;
}

export async function listExpiryRiskAction() {
  await requireModule("pharmacy");
  const now = Date.now();
  const state = await readState();
  return state.stock
    .map((batch) => ({
      batch,
      daysToExpiry: Math.ceil((new Date(batch.expiry).getTime() - now) / (1000 * 60 * 60 * 24)),
    }))
    .sort((a, b) => a.daysToExpiry - b.daysToExpiry);
}
