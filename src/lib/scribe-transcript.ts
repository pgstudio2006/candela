import { SCRIBE_LANGUAGES } from "@/lib/ai/deepgram-languages";

const SESSION_MARKER = /^--- AI Scribe · .+ ---$/m;

export function scribeLanguageLabel(languageId: string): string {
  return SCRIBE_LANGUAGES.find((l) => l.id === languageId)?.label ?? languageId;
}

/** Prefix a new live-scribe session so multiple recordings stay distinct in the patient profile. */
export function appendScribeSessionHeader(existing: string, languageId: string): string {
  const stamp = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const lang = scribeLanguageLabel(languageId);
  const header = `--- AI Scribe · ${stamp} · ${lang} ---`;
  const trimmed = existing.trim();
  if (!trimmed) return `${header}\n`;
  if (trimmed.endsWith(header)) return existing;
  return `${trimmed}\n\n${header}\n`;
}

export type ScribeSessionEntry = {
  recordedAt: string;
  language: string;
  transcript: string;
};

/** Split stored transcript into session blocks for the patient profile. */
export function parseScribeSessions(fullText: string): ScribeSessionEntry[] {
  const text = fullText.trim();
  if (!text) return [];

  const parts = text.split(/\n\n(?=--- AI Scribe · )/);
  if (parts.length === 1 && !SESSION_MARKER.test(parts[0] ?? "")) {
    return [{ recordedAt: "", language: "", transcript: text }];
  }

  return parts
    .map((block) => {
      const lines = block.split("\n");
      const first = lines[0] ?? "";
      const match = first.match(/^--- AI Scribe · (.+?) · (.+?) ---$/);
      const body = (match ? lines.slice(1) : lines).join("\n").trim();
      if (!body) return null;
      return {
        recordedAt: match?.[1] ?? "",
        language: match?.[2] ?? "",
        transcript: body,
      };
    })
    .filter((x): x is ScribeSessionEntry => Boolean(x));
}
