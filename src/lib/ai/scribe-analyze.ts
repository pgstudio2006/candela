import { openRouterChat } from "@/lib/ai/openrouter-client";
import type { ScribeDraft } from "@/lib/ai/scribe-types";

const SCRIBE_SYSTEM = `You are a clinical documentation assistant for an Indian MSK/spine hospital.
Convert doctor-patient conversation transcripts into structured OPD consult fields.
Return ONLY valid JSON matching this schema:
{
  "summary": "2-3 sentence clinical summary",
  "examination": {
    "chiefComplaint": "string",
    "historyPresent": "string",
    "pastHistory": "string optional",
    "allergies": "string optional",
    "generalExam": "string optional",
    "mskExam": "string",
    "neuroExam": "string optional",
    "specialTests": "string optional",
    "vitalsBp": "string optional",
    "vitalsPulse": "number optional",
    "vitalsSpo2": "number optional"
  },
  "diagnosis": {
    "primaryDiagnosis": "string",
    "secondaryDiagnosis": "string optional",
    "icdTag": "M51.1|M47.8|M25.5|E88.81 or best ICD",
    "severity": "mild|moderate|severe",
    "clinicalImpression": "string"
  },
  "treatment": {
    "plan": "string",
    "procedures": "string optional",
    "physioProtocol": "string optional",
    "followUp": "string",
    "lifestyleAdvice": "string optional",
    "referrals": "string optional"
  },
  "prescription": [
    { "drug": "full drug with strength", "dose": "e.g. 1 tab", "frequency": "OD|BD|TDS|SOS", "duration": "e.g. 7 days", "instructions": "optional" }
  ]
}
Use Indian brand/generic medicine names when mentioned. If no medicines discussed, return empty prescription array.
Do not invent critical findings not supported by the transcript.`;

export async function analyzeScribeTranscript(input: {
  transcript: string;
  language: string;
  patientContext?: string;
}): Promise<ScribeDraft> {
  const user = [
    `Language: ${input.language}`,
    input.patientContext ? `Patient context: ${input.patientContext}` : "",
    "Transcript:",
    input.transcript.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");

  const { content } = await openRouterChat({
    messages: [
      { role: "system", content: SCRIBE_SYSTEM },
      { role: "user", content: user },
    ],
    jsonMode: true,
    temperature: 0.1,
  });

  let parsed: ScribeDraft;
  try {
    parsed = JSON.parse(content) as ScribeDraft;
  } catch {
    throw new Error("AI returned invalid structured consult JSON.");
  }

  return {
    summary: parsed.summary ?? "",
    examination: parsed.examination ?? {},
    diagnosis: parsed.diagnosis ?? {},
    treatment: parsed.treatment ?? {},
    prescription: Array.isArray(parsed.prescription) ? parsed.prescription : [],
  };
}
