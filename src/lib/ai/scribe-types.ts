import type { PrescriptionLine } from "@/design-system/doctor-data";

export type ScribeDraft = {
  summary: string;
  examination: Record<string, string | number | boolean>;
  diagnosis: Record<string, string | number | boolean>;
  treatment: Record<string, string | number | boolean>;
  prescription: Omit<PrescriptionLine, "id">[];
};

export type CopilotMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type CopilotAction =
  | {
      type: "fill_section";
      visitId: string;
      section: "examination" | "diagnosis" | "treatment";
      data: Record<string, string | number | boolean>;
    }
  | { type: "set_prescription"; visitId: string; lines: Omit<PrescriptionLine, "id">[] }
  | { type: "navigate"; href: string; label?: string };

export type CopilotContext = {
  module: string;
  role: string;
  page: string;
  visitId?: string;
  patient?: { name: string; uhid?: string; age?: number };
  queueSummary?: string;
  consultSnapshot?: {
    examination?: Record<string, unknown>;
    diagnosis?: Record<string, unknown>;
    treatment?: Record<string, unknown>;
    prescription?: PrescriptionLine[];
    transcript?: string;
  };
};
