import { z } from "zod";
import { ServerActionError } from "@/server/errors";

export const rejectPrescriptionSchema = z.object({
  reason: z.string().min(3).max(500),
});

export const dispenseQuantitiesSchema = z.record(z.string(), z.number().min(0).max(9999));

export const adjustStockSchema = z.object({
  delta: z.number().int().min(-10000).max(10000).refine((n) => n !== 0, "Adjustment cannot be zero."),
  reason: z.string().min(3).max(500),
});

export const markBillPaidSchema = z.object({
  mode: z.enum(["cash", "upi", "card", "credit_ipd"]),
});

export function validateRejectReason(reason: string) {
  const parsed = rejectPrescriptionSchema.safeParse({ reason });
  if (!parsed.success) {
    throw new ServerActionError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid reject reason.");
  }
  return parsed.data.reason;
}

export function validateDispenseQuantities(quantities: Record<string, number>) {
  const parsed = dispenseQuantitiesSchema.safeParse(quantities);
  if (!parsed.success) {
    throw new ServerActionError("VALIDATION", "Invalid dispense quantities.");
  }
  return parsed.data;
}
