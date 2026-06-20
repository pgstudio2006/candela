export type ScribeLanguageOption = {
  id: string;
  label: string;
  deepgram: string;
};

/** Indian regional languages supported for ambient scribe */
export const SCRIBE_LANGUAGES: ScribeLanguageOption[] = [
  { id: "en", label: "English", deepgram: "en-IN" },
  { id: "hi", label: "Hindi", deepgram: "hi" },
  { id: "hinglish", label: "Hinglish", deepgram: "hi" },
  { id: "pa", label: "Punjabi", deepgram: "pa" },
  { id: "mr", label: "Marathi", deepgram: "mr" },
  { id: "bn", label: "Bengali", deepgram: "bn" },
  { id: "gu", label: "Gujarati", deepgram: "gu" },
  { id: "ta", label: "Tamil", deepgram: "ta" },
  { id: "te", label: "Telugu", deepgram: "te" },
  { id: "kn", label: "Kannada", deepgram: "kn" },
  { id: "ml", label: "Malayalam", deepgram: "ml" },
  { id: "ur", label: "Urdu", deepgram: "ur" },
];

export function deepgramLanguageFor(id: string): string {
  return SCRIBE_LANGUAGES.find((l) => l.id === id)?.deepgram ?? "en-IN";
}

export function scribeLanguageLabel(id?: string): string {
  return SCRIBE_LANGUAGES.find((l) => l.id === id)?.label ?? id ?? "Unknown";
}
