/** Web Speech API helpers (Chrome / Edge — cloud-backed, no API key). */

export type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
};

export type SpeechRecognitionResult = {
  readonly length: number;
  readonly isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative | undefined;
  item(index: number): SpeechRecognitionAlternative;
};

export type SpeechRecognitionResultList = {
  readonly length: number;
  [index: number]: SpeechRecognitionResult;
  item(index: number): SpeechRecognitionResult;
};

export type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onaudiostart: ((ev: Event) => void) | null;
  onaudioend: ((ev: Event) => void) | null;
  onstart: ((ev: Event) => void) | null;
  onend: ((ev: Event) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEvent) => void) | null;
  onresult: ((ev: SpeechRecognitionEvent) => void) | null;
};

export type SpeechRecognitionErrorEvent = Event & {
  error:
    | "no-speech"
    | "aborted"
    | "audio-capture"
    | "network"
    | "not-allowed"
    | "service-not-allowed"
    | "bad-grammar"
    | "language-not-supported";
  message?: string;
};

export type SpeechRecognitionEvent = Event & {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(getSpeechRecognitionConstructor());
}

export function getSpeechRecognitionConstructor():
  | (new () => BrowserSpeechRecognition)
  | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as Window & {
    SpeechRecognition?: new () => BrowserSpeechRecognition;
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function createSpeechRecognition(): BrowserSpeechRecognition {
  const Ctor = getSpeechRecognitionConstructor();
  if (!Ctor) {
    throw new Error("Live transcription needs Chrome or Edge (Web Speech API).");
  }
  return new Ctor();
}

/** Pick the highest-confidence alternative from a result set. */
export function bestTranscriptFromResult(result: SpeechRecognitionResult): string {
  if (!result.length) return "";
  let text = result[0]?.transcript ?? "";
  let confidence = result[0]?.confidence ?? 0;
  for (let i = 1; i < result.length; i += 1) {
    const alt = result[i];
    if (!alt) continue;
    const conf = alt.confidence ?? 0;
    if (conf >= confidence) {
      confidence = conf;
      text = alt.transcript;
    }
  }
  return normalizeTranscriptChunk(text);
}

export function normalizeTranscriptChunk(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

export function joinTranscriptParts(parts: string[]): string {
  return parts
    .map(normalizeTranscriptChunk)
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function speechErrorMessage(code: SpeechRecognitionErrorEvent["error"]): string | null {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access denied. Allow the mic in browser settings and retry.";
    case "audio-capture":
      return "No microphone found. Connect a mic and retry.";
    case "network":
      return "Speech recognition needs internet (browser uses Google speech service).";
    case "language-not-supported":
      return "This language is not supported in your browser. Try English or Hindi.";
    case "no-speech":
    case "aborted":
      return null;
    default:
      return null;
  }
}
