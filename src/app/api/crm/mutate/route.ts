import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { requireModule } from "@/server/auth";
import { serializeForClient } from "@/server/serialize";
import { throwIfPrismaError } from "@/server/prisma-errors";
import { ServerActionError } from "@/server/errors";
import {
  addAgent,
  addFollowUp,
  addRule,
  addStage,
  assignLeadManual,
  clearAgentUnavailable,
  completeFollowUp,
  createLead,
  ingestFromIntegration,
  logActivity,
  markAgentUnavailable,
  markMissedFollowUp,
  moveLeadStage,
  removeAgent,
  removeStage,
  reorderStage,
  rescheduleFollowUp,
  setAgentPassword,
  toggleIntegration,
  transferOpenLeads,
  updateAgent,
  updateLead,
  updateRule,
  updateStage,
  updateStages,
} from "@/server/crm/index";
import type {
  CrmAgent,
  CrmAssignmentRule,
  CrmFollowUp,
  CrmIntegrationId,
  CrmLead,
  CrmPipelineStage,
} from "@/design-system/crm-data";

type ActionBody = {
  op: string;
  operatorId: string;
  // lead ops
  partial?: Omit<CrmLead, "id" | "createdAt" | "updatedAt" | "stageId" | "assigneeId"> & Partial<Pick<CrmLead, "stageId" | "assigneeId">>;
  leadId?: string;
  patch?: Partial<CrmLead>;
  agentId?: string;
  // agent ops
  agent?: Omit<CrmAgent, "id">;
  password?: string;
  id?: string;
  // rule ops
  rule?: Omit<CrmAssignmentRule, "id">;
  // stage ops
  label?: string;
  color?: string;
  dir?: -1 | 1;
  stages?: CrmPipelineStage[];
  // follow-up ops
  fu?: Omit<CrmFollowUp, "id" | "status"> & { status?: CrmFollowUp["status"] };
  outcome?: string;
  scheduledAt?: string;
  notes?: string;
  reason?: string;
  // integration ops
  integrationId?: CrmIntegrationId;
  payload?: { name: string; phone: string; specialty?: string; notes?: string };
  connected?: boolean;
  // absence ops
  until?: string;
  transferLeads?: boolean;
  // transfer ops
  fromAgentId?: string;
  toAgentId?: string;
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
    const ctx = await requireModule("crm");
    const { op, operatorId } = body;

    let result: unknown;

    switch (op) {
      case "createLead":
        result = await createLead(ctx, operatorId, body.partial!);
        break;
      case "updateLead":
        result = await updateLead(ctx, operatorId, body.leadId!, body.patch!);
        break;
      case "assignLeadManual":
        result = await assignLeadManual(ctx, operatorId, body.leadId!, body.agentId!);
        break;
      case "moveLeadStage":
        result = await moveLeadStage(ctx, operatorId, body.leadId!, body.agentId!);
        break;
      case "ingestFromIntegration":
        result = await ingestFromIntegration(ctx, operatorId, body.integrationId!, body.payload!);
        break;
      case "toggleIntegration":
        result = await toggleIntegration(ctx, operatorId, body.integrationId!, body.connected!);
        break;
      case "updateRule":
        result = await updateRule(ctx, operatorId, body.id!, body.patch as Partial<CrmAssignmentRule>);
        break;
      case "addRule":
        result = await addRule(ctx, operatorId, body.rule!);
        break;
      case "addAgent":
        result = await addAgent(ctx, operatorId, body.agent!, body.password);
        break;
      case "updateAgent":
        result = await updateAgent(ctx, operatorId, body.id!, body.patch as Partial<CrmAgent>);
        break;
      case "setAgentPassword":
        result = await setAgentPassword(ctx, operatorId, body.id!, body.password!);
        break;
      case "removeAgent":
        result = await removeAgent(ctx, operatorId, body.id!);
        break;
      case "updateStage":
        result = await updateStage(ctx, operatorId, body.id!, body.patch as Partial<CrmPipelineStage>);
        break;
      case "addStage":
        result = await addStage(ctx, operatorId, body.label!, body.color);
        break;
      case "removeStage":
        result = await removeStage(ctx, operatorId, body.id!);
        break;
      case "reorderStage":
        result = await reorderStage(ctx, operatorId, body.id!, body.dir!);
        break;
      case "updateStages":
        result = await updateStages(ctx, operatorId, body.stages!);
        break;
      case "addFollowUp":
        result = await addFollowUp(ctx, operatorId, body.fu!);
        break;
      case "completeFollowUp":
        result = await completeFollowUp(ctx, operatorId, body.id!, body.outcome!);
        break;
      case "rescheduleFollowUp":
        result = await rescheduleFollowUp(ctx, operatorId, body.id!, body.scheduledAt!, body.notes);
        break;
      case "markMissedFollowUp":
        result = await markMissedFollowUp(ctx, operatorId, body.id!, body.reason);
        break;
      case "logActivity":
        result = await logActivity(ctx, operatorId, body.leadId!, body.outcome!, body.reason);
        break;
      case "markAgentUnavailable":
        result = await markAgentUnavailable(ctx, operatorId, body.agentId!, body.until!, body.reason!, body.transferLeads);
        break;
      case "clearAgentUnavailable":
        result = await clearAgentUnavailable(ctx, operatorId, body.agentId!);
        break;
      case "transferOpenLeads":
        result = await transferOpenLeads(ctx, operatorId, body.fromAgentId!, body.toAgentId);
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
