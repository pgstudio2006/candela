"use client";

import { ScribeReviewPanel } from "@/components/doctor/scribe-review-panel";
import { AttioButton, Panel } from "@/components/frontdesk/ui";
import { SCRIBE_LANGUAGES } from "@/lib/ai/deepgram-languages";
import type { ScribeDraft } from "@/lib/ai/scribe-types";
import { useDeepgramScribe } from "@/hooks/use-deepgram-scribe";
import { cn } from "@/lib/utils";
import { Loader2, Mic, Sparkles, Square } from "lucide-react";
import { useState } from "react";

type AiScribePanelProps = {
  language: string;
  transcript: string;
  patientContext?: string;
  onLanguageChange: (lang: string) => void;
  onTranscriptChange: (text: string) => void;
  onDraftAccepted: (draft: ScribeDraft) => void;
  applied?: boolean;
};

export function AiScribePanel({
  language,
  transcript,
  patientContext,
  onLanguageChange,
  onTranscriptChange,
  onDraftAccepted,
  applied,
}: AiScribePanelProps) {
  const [draft, setDraft] = useState<ScribeDraft | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState("");

  const { recording, interim, start, stop } = useDeepgramScribe({
    language,
    onTranscriptUpdate: onTranscriptChange,
    onError: setError,
  });

  const analyzeTranscript = async () => {
    if (!transcript.trim()) return;
    setError("");
    setAnalyzing(true);
    try {
      const res = await fetch("/api/scribe/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript, language, patientContext }),
      });
      const data = (await res.json()) as { draft?: ScribeDraft; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Analysis failed");
      setDraft(data.draft ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not analyze transcript.");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Panel
        title="AI Scribe"
        action={
          <span className="flex items-center gap-1 text-[11px] text-[var(--attio-text-tertiary)]">
            <Sparkles className="size-3" />
            Live · Deepgram
          </span>
        }
      >
        <p className="mb-3 text-[12px] text-[var(--attio-text-secondary)]">
          Record the consult in a regional language. Transcript streams live, then AI structures examination, diagnosis,
          treatment, and prescription for your review.
        </p>

        <div className="mb-3 flex flex-wrap gap-1.5">
          {SCRIBE_LANGUAGES.map((lang) => (
            <button
              key={lang.id}
              type="button"
              disabled={recording}
              onClick={() => onLanguageChange(lang.id)}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                language === lang.id
                  ? "border-[var(--attio-accent)] bg-[var(--attio-accent)]/10 text-[var(--attio-accent)]"
                  : "border-[var(--attio-border)] text-[var(--attio-text-secondary)] hover:bg-[var(--attio-hover)]",
              )}
            >
              {lang.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => (recording ? stop() : void start())}
            className={cn(
              "flex flex-1 items-center justify-center gap-2 rounded-lg border py-3 text-[13px] font-medium transition-colors",
              recording
                ? "border-red-200 bg-red-50 text-red-600"
                : "border-[var(--attio-border)] bg-white hover:bg-[var(--attio-surface)]",
            )}
          >
            {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
            {recording ? "Stop recording" : "Start live scribe"}
          </button>
        </div>

        {(transcript || recording) && (
          <div className="mt-4">
            <label className="text-[11px] font-semibold tracking-wide text-[var(--attio-text-tertiary)] uppercase">
              Live transcript
            </label>
            <textarea
              value={transcript}
              onChange={(e) => onTranscriptChange(e.target.value)}
              rows={6}
              className="mt-2 w-full resize-none rounded-lg border border-[var(--attio-border)] bg-[var(--attio-surface)] px-3 py-2 text-[13px] outline-none focus:border-[var(--attio-accent)]"
              placeholder={recording ? "Listening…" : "Transcript appears here"}
            />
            {recording && interim && (
              <p className="mt-1 text-[11px] text-[var(--attio-text-tertiary)]">Hearing: {interim}</p>
            )}
          </div>
        )}

        {error && <p className="mt-2 text-[12px] text-red-600">{error}</p>}

        <AttioButton
          variant="secondary"
          className="mt-4 w-full gap-1.5"
          disabled={!transcript.trim() || analyzing || recording}
          onClick={() => void analyzeTranscript()}
        >
          {analyzing ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          {analyzing ? "Analyzing consult…" : "Analyze & prepare review"}
        </AttioButton>
      </Panel>

      {draft && (
        <ScribeReviewPanel
          draft={draft}
          analyzing={analyzing}
          onDraftChange={setDraft}
          accepted={applied}
          onAccept={() => {
            onDraftAccepted(draft);
          }}
        />
      )}
    </div>
  );
}
