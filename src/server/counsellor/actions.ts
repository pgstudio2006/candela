"use server";

import type { CounselQuote, DiscountPolicy } from "@/design-system/counsellor-data";
import { requireModule } from "@/server/auth";
import { runAction, type ActionResult } from "@/server/action-result";
import {
  claimCounselSession,
  completeCounselSession,
  getCounsellorSnapshot,
  listCounsellorAuditLogs,
  requestDiscountApproval,
  resolveDiscountApproval,
  saveCounsellorPrefs,
  validateCounsellorLogin,
} from "@/server/counsellor/index";
import type { CounsellorSnapshot } from "@/server/counsellor/index";

export async function getCounsellorSnapshotAction(): Promise<ActionResult<CounsellorSnapshot>> {
  return runAction(async () => {
    const ctx = await requireModule("counsellor");
    return getCounsellorSnapshot(ctx);
  });
}

export async function claimCounselSessionAction(visitId: string) {
  const ctx = await requireModule("counsellor");
  return claimCounselSession(ctx, visitId);
}

export async function completeCounselSessionAction(
  visitId: string,
  opts: {
    outcome: "converted" | "deferred" | "lost" | "callback";
    quote?: CounselQuote;
    internalNotes: string;
    objections: string[];
    callbackAt?: string;
    sendToBilling: boolean;
    paymentExpectation: "pay_now" | "desk" | "corporate";
    consentCaptured?: boolean;
    whatsappSent?: boolean;
    voiceNote?: string;
    aiScript?: string;
  },
) {
  const ctx = await requireModule("counsellor");
  return completeCounselSession(ctx, visitId, opts);
}

export async function requestDiscountApprovalAction(visitId: string, quote: CounselQuote, reason: string) {
  const ctx = await requireModule("counsellor");
  return requestDiscountApproval(ctx, visitId, quote, reason);
}

export async function resolveDiscountApprovalAction(approvalId: string, approved: boolean) {
  const ctx = await requireModule("counsellor");
  return resolveDiscountApproval(ctx, approvalId, approved);
}

export async function saveCounsellorPrefsAction(prefs: {
  seniorMode?: boolean;
  discountPolicy?: DiscountPolicy;
}) {
  const ctx = await requireModule("counsellor");
  return saveCounsellorPrefs(ctx, prefs);
}

export async function listCounsellorAuditLogsAction(input?: { limit?: number; cursor?: string }) {
  const ctx = await requireModule("counsellor");
  return listCounsellorAuditLogs(ctx, input ?? {});
}

export async function validateCounsellorLoginAction(email: string, password: string) {
  return validateCounsellorLogin(email, password);
}
