export type ScribeLanguageOption = {
  id: string;
  label: string;
  deepgram: string;
  webSpeech: string;
};

/** Indian regional languages supported for ambient scribe */
export const SCRIBE_LANGUAGES: ScribeLanguageOption[] = [
  { id: "en", label: "English", deepgram: "en-IN", webSpeech: "en-IN" },
  { id: "hi", label: "Hindi", deepgram: "hi", webSpeech: "hi-IN" },
  { id: "hinglish", label: "Hinglish", deepgram: "hi", webSpeech: "hi-IN" },
  { id: "pa", label: "Punjabi", deepgram: "pa", webSpeech: "pa-IN" },
  { id: "mr", label: "Marathi", deepgram: "mr", webSpeech: "mr-IN" },
  { id: "bn", label: "Bengali", deepgram: "bn", webSpeech: "bn-IN" },
  { id: "gu", label: "Gujarati", deepgram: "gu", webSpeech: "gu-IN" },
  { id: "ta", label: "Tamil", deepgram: "ta", webSpeech: "ta-IN" },
  { id: "te", label: "Telugu", deepgram: "te", webSpeech: "te-IN" },
  { id: "kn", label: "Kannada", deepgram: "kn", webSpeech: "kn-IN" },
  { id: "ml", label: "Malayalam", deepgram: "ml", webSpeech: "ml-IN" },
  { id: "ur", label: "Urdu", deepgram: "ur", webSpeech: "ur-IN" },
];

export function deepgramLanguageFor(id: string): string {
  return SCRIBE_LANGUAGES.find((l) => l.id === id)?.deepgram ?? "en-IN";
}

export function speechLanguageFor(id: string): string {
  return SCRIBE_LANGUAGES.find((l) => l.id === id)?.webSpeech ?? "en-IN";
}

export function scribeLanguageLabel(id?: string): string {
  return SCRIBE_LANGUAGES.find((l) => l.id === id)?.label ?? id ?? "Unknown";
}
