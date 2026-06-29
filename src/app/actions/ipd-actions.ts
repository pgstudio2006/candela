"use server";

import type { IpdAdmissionInput, IpdAdmissionStatus } from "@/design-system/ipd-data";
import { runAction, type ActionResult } from "@/server/action-result";
import { requireModule } from "@/server/auth";
import { admitPatient, getIpdAdmission, getIpdSnapshot, updateIpdAdmission, type IpdSnapshot } from "@/server/ipd";

export async function getIpdSnapshotAction(): Promise<ActionResult<IpdSnapshot>> {
  return runAction(async () => {
    const ctx = await requireModule("frontdesk");
    return getIpdSnapshot(ctx);
  });
}

export async function getIpdAdmissionAction(id: string) {
  return runAction(async () => {
    const ctx = await requireModule("frontdesk");
    return getIpdAdmission(ctx, id);
  });
}

export async function admitPatientAction(input: IpdAdmissionInput): Promise<ActionResult<{ id: string; visitId: string; patientId: string }>> {
  return runAction(async () => {
    const ctx = await requireModule("frontdesk");
    return admitPatient(ctx, input);
  });
}

export async function updateIpdAdmissionAction(
  id: string,
  patch: {
    status?: IpdAdmissionStatus;
    expectedDischarge?: string;
    bed?: string;
    ward?: string;
    diagnosis?: string;
  },
) {
  return runAction(async () => {
    const ctx = await requireModule("frontdesk");
    return updateIpdAdmission(ctx, id, patch);
  });
}
