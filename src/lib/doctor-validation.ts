import { z } from "zod";
import { ServerActionError } from "@/server/errors";

export const completeConsultationSchema = z.object({
  treatmentMode: z.enum(["opd", "ipd", "daycare"]),
  recommendCounsellor: z.boolean(),
  skipCounsellor: z.boolean(),
  sendWhatsapp: z.boolean(),
  handoff: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
});

export function validateCompleteConsultation(
  consult: {
    examination: Record<string, string | number | boolean>;
    diagnosis: Record<string, string | number | boolean>;
    treatment: Record<string, string | number | boolean>;
  },
  opts: z.infer<typeof completeConsultationSchema>,
) {
  const parsed = completeConsultationSchema.safeParse(opts);
  if (!parsed.success) {
    throw new ServerActionError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid handoff");
  }

  const exam = consult.examination;
  const dx = consult.diagnosis;
  const tx = consult.treatment;

  const complaint = String(
    exam.chiefComplaint ?? exam.mskExam ?? exam.juniorImpression ?? "",
  ).trim();
  if (!complaint) {
    throw new ServerActionError("VALIDATION", "Examination — chief complaint or MSK exam is required.");
  }

  const diagnosis = String(dx.primaryDiagnosis ?? dx.clinicalImpression ?? "").trim();
  if (!diagnosis) {
    throw new ServerActionError("VALIDATION", "Primary diagnosis or clinical impression is required.");
  }

  const plan = String(tx.plan ?? "").trim();
  if (!plan) {
    throw new ServerActionError("VALIDATION", "Treatment plan is required.");
  }

  return parsed.data;
}
