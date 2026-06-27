import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireModule } from "@/server/auth";
import { serializeForClient } from "@/server/serialize";
import { throwIfPrismaError } from "@/server/prisma-errors";
import { ServerActionError } from "@/server/errors";
import {
  claimCounselSession,
  completeCounselSession,
  requestDiscountApproval,
  resolveDiscountApproval,
  saveCounsellorPrefs,
} from "@/server/counsellor/index";
import type { CounselQuote, DiscountPolicy } from "@/design-system/counsellor-data";

type ActionBody = {
  op: string;
  visitId?: string;
  approvalId?: string;
  approved?: boolean;
  quote?: CounselQuote;
  reason?: string;
  prefs?: { seniorMode?: boolean; discountPolicy?: DiscountPolicy };
  outcome?: "converted" | "deferred" | "lost" | "callback";
  internalNotes?: string;
  objections?: string[];
  callbackAt?: string;
  sendToBilling?: boolean;
  paymentExpectation?: "pay_now" | "desk" | "corporate";
  consentCaptured?: boolean;
  whatsappSent?: boolean;
  voiceNote?: string;
  aiScript?: string;
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
    const ctx = await requireModule("counsellor");
    const { op } = body;
    let result: unknown;

    switch (op) {
      case "claimSession":
        result = await claimCounselSession(ctx, body.visitId!);
        break;
      case "completeSession":
        result = await completeCounselSession(ctx, body.visitId!, {
          outcome: body.outcome!,
          quote: body.quote,
          internalNotes: body.internalNotes ?? "",
          objections: body.objections ?? [],
          callbackAt: body.callbackAt,
          sendToBilling: body.sendToBilling ?? false,
          paymentExpectation: body.paymentExpectation ?? "desk",
          consentCaptured: body.consentCaptured,
          whatsappSent: body.whatsappSent,
          voiceNote: body.voiceNote,
          aiScript: body.aiScript,
        });
        break;
      case "requestDiscountApproval":
        result = await requestDiscountApproval(ctx, body.visitId!, body.quote!, body.reason!);
        break;
      case "resolveDiscountApproval":
        result = await resolveDiscountApproval(ctx, body.approvalId!, body.approved!);
        break;
      case "savePrefs":
        result = await saveCounsellorPrefs(ctx, body.prefs!);
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
