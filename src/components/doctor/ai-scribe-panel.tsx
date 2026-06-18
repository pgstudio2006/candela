"use client";

import { AttioButton, Panel } from "@/components/frontdesk/ui";
import { SCRIBE_LANGUAGES } from "@/design-system/doctor-data";
import { cn } from "@/lib/utils";
import { Check, Mic, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";

const DEMO_TRANSCRIPTS: Record<string, string> = {
  en: "Patient reports lower back pain radiating to left leg for 3 weeks. Pain worsens on sitting and forward bending. No bowel or bladder symptoms. On examination: reduced lumbar flexion, positive straight leg raise on left at 40 degrees. Sensation intact. Suggested conservative management with physiotherapy and analgesics.",
  hi: "मरीज़ को 3 सप्ताह से कमर में दर्द है जो बाएं पैर में जाता है। बैठने पर दर्द बढ़ता है। परीक्षण में सीधी पैर उठाने का परीक्षण सकारात्मक। रोगी को फिजियोथेरेपी और दर्द निवारक दवाओं की सलाह दी गई।",
  hinglish: "Patient ko 3 weeks se lower back pain hai, left leg mein ja raha hai. Sitting pe worse hota hai. SLR positive left side. Physio aur pain meds suggest kiye.",
  pa: "ਮਰੀਜ਼ ਨੂੰ 3 ਹਫ਼ਤੇ ਤੋਂ ਕਮਰ ਦਰਦ ਹੈ। ਖੱਬੇ ਪੈਰ ਵੱਲ ਜਾਂਦਾ ਹੈ। ਬੈਠਣ ਤੇ ਵਧਦਾ ਹੈ। ਫਿਜ਼ੀਓਥੈਰੇਪੀ ਦੀ ਸਿਫਾਰਸ਼।",
  mr: "रुग्णाला 3 आठवड्यांपासून कमरदुखी आहे, डाव्या पायाकडे जाते. बसल्यावर वाढते. SLR सकारात्मक. फिजिओथेरपी सुचवली.",
};

type AiScribePanelProps = {
  language: string;
  transcript: string;
  onLanguageChange: (lang: string) => void;
  onTranscriptChange: (text: string) => void;
  onApprove: () => void;
  applied?: boolean;
};

export function AiScribePanel({
  language,
  transcript,
  onLanguageChange,
  onTranscriptChange,
  onApprove,
  applied,
}: AiScribePanelProps) {
  const [recording, setRecording] = useState(false);
  const [pending, setPending] = useState("");

  useEffect(() => {
    if (!recording) return;
    const t = window.setTimeout(() => {
      const demo = DEMO_TRANSCRIPTS[language] ?? DEMO_TRANSCRIPTS.en;
      setPending(demo);
      setRecording(false);
    }, 1800);
    return () => window.clearTimeout(t);
  }, [recording, language]);

  const draft = pending || transcript;

  return (
    <Panel
      title="AI Scribe"
      action={
        <span className="flex items-center gap-1 text-[11px] text-[var(--attio-text-tertiary)]">
          <Sparkles className="size-3" />
          Approve before apply
        </span>
      }
    >
      <p className="mb-3 text-[12px] text-[var(--attio-text-secondary)]">
        Multilingual ambient scribe — review transcript, then apply to examination fields.
      </p>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {SCRIBE_LANGUAGES.map((lang) => (
          <button
            key={lang.id}
            type="button"
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

      <button
        type="button"
        onClick={() => {
          setPending("");
          setRecording(true);
        }}
        disabled={recording}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-lg border py-3 text-[13px] font-medium transition-colors",
          recording
            ? "border-red-200 bg-red-50 text-red-600"
            : "border-[var(--attio-border)] bg-white hover:bg-[var(--attio-surface)]",
        )}
      >
        <Mic className={cn("size-4", recording && "animate-pulse")} />
        {recording ? "Listening…" : "Start scribe session"}
      </button>

      {(draft || recording) && (
        <div className="mt-4">
          <label className="text-[11px] font-semibold tracking-wide text-[var(--attio-text-tertiary)] uppercase">
            Transcript (editable)
          </label>
          <textarea
            value={draft}
            onChange={(e) => {
              setPending(e.target.value);
              onTranscriptChange(e.target.value);
            }}
            rows={6}
            className="mt-2 w-full resize-none rounded-lg border border-[var(--attio-border)] bg-[var(--attio-surface)] px-3 py-2 text-[13px] outline-none focus:border-[var(--attio-accent)]"
            placeholder={recording ? "Transcribing…" : "Transcript appears here"}
          />
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <AttioButton
          variant="primary"
          className="flex-1 gap-1.5"
          disabled={!draft || applied}
          onClick={() => {
            onTranscriptChange(draft);
            onApprove();
            setPending("");
          }}
        >
          <Check className="size-3.5" />
          {applied ? "Applied to examination" : "Approve & apply"}
        </AttioButton>
      </div>

      {applied && (
        <p className="mt-2 text-[11px] text-emerald-600">
          Chief complaint and HPI updated from scribe transcript.
        </p>
      )}
    </Panel>
  );
}
