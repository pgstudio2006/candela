"use client";

import { speechLanguageFor } from "@/lib/ai/deepgram-languages";
import {
  bestTranscriptFromResult,
  createSpeechRecognition,
  joinTranscriptParts,
  normalizeTranscriptChunk,
  speechErrorMessage,
  type BrowserSpeechRecognition,
} from "@/lib/speech-recognition";
import { useCallback, useEffect, useRef, useState } from "react";

type UseSpeechScribeOptions = {
  language: string;
  /** Existing transcript text — new speech is appended after this. */
  seedTranscript?: string;
  onTranscriptUpdate: (fullText: string) => void;
  onRecordingStop?: (fullText: string) => void;
  onError: (message: string) => void;
};

const RESTART_MS = 120;

export function useSpeechScribe({
  language,
  seedTranscript = "",
  onTranscriptUpdate,
  onRecordingStop,
  onError,
}: UseSpeechScribeOptions) {
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");

  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const finalPartsRef = useRef<string[]>([]);
  const interimRef = useRef("");
  const activeRef = useRef(false);
  const stoppingRef = useRef(false);
  const restartTimerRef = useRef<number | null>(null);
  const languageRef = useRef(language);

  languageRef.current = language;

  const emitFull = useCallback(() => {
    const full = joinTranscriptParts([
      ...finalPartsRef.current,
      interimRef.current || interim,
    ]);
    onTranscriptUpdate(full);
    return full;
  }, [interim, onTranscriptUpdate]);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const teardown = useCallback(
    (opts?: { intentional?: boolean }) => {
      stoppingRef.current = opts?.intentional ?? false;
      activeRef.current = false;
      clearRestartTimer();

      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      if (recognition) {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        try {
          recognition.abort();
        } catch {
          /* ignore */
        }
      }

      setRecording(false);
      setInterim("");
      interimRef.current = "";
    },
    [clearRestartTimer],
  );

  const scheduleRestart = useCallback(() => {
    if (!activeRef.current || stoppingRef.current) return;
    clearRestartTimer();
    restartTimerRef.current = window.setTimeout(() => {
      restartTimerRef.current = null;
      if (!activeRef.current || stoppingRef.current) return;
      const recognition = recognitionRef.current;
      if (!recognition) return;
      try {
        recognition.lang = speechLanguageFor(languageRef.current);
        recognition.start();
      } catch {
        /* "already started" — safe to ignore */
      }
    }, RESTART_MS);
  }, [clearRestartTimer]);

  const attachHandlers = useCallback(
    (recognition: BrowserSpeechRecognition) => {
      recognition.onresult = (event) => {
        let nextInterim = "";

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const chunk = bestTranscriptFromResult(result);
          if (!chunk) continue;

          if (result.isFinal) {
            const last = finalPartsRef.current[finalPartsRef.current.length - 1];
            if (last !== chunk) {
              finalPartsRef.current.push(chunk);
            }
            nextInterim = "";
          } else {
            nextInterim = chunk;
          }
        }

        interimRef.current = nextInterim;
        setInterim(nextInterim);
        emitFull();
      };

      recognition.onerror = (event) => {
        const message = speechErrorMessage(event.error);
        if (message) {
          onError(message);
          if (event.error === "not-allowed" || event.error === "service-not-allowed") {
            teardown({ intentional: true });
          }
          return;
        }
        if (event.error === "no-speech" && activeRef.current) {
          scheduleRestart();
        }
      };

      recognition.onend = () => {
        if (activeRef.current && !stoppingRef.current) {
          scheduleRestart();
          return;
        }
        setRecording(false);
      };
    },
    [emitFull, onError, scheduleRestart, teardown],
  );

  const start = useCallback(() => {
    try {
      stoppingRef.current = false;
      activeRef.current = true;

      const seed = normalizeTranscriptChunk(seedTranscript);
      finalPartsRef.current = seed ? [seed] : [];
      interimRef.current = "";
      setInterim("");
      clearRestartTimer();

      const existing = recognitionRef.current;
      if (existing) {
        try {
          existing.abort();
        } catch {
          /* ignore */
        }
        recognitionRef.current = null;
      }

      const recognition = createSpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 3;
      recognition.lang = speechLanguageFor(languageRef.current);

      recognitionRef.current = recognition;
      attachHandlers(recognition);

      recognition.start();
      setRecording(true);
      emitFull();
    } catch (err) {
      teardown({ intentional: true });
      onError(err instanceof Error ? err.message : "Could not start live transcription.");
    }
  }, [attachHandlers, clearRestartTimer, emitFull, onError, seedTranscript, teardown]);

  const stop = useCallback(() => {
    stoppingRef.current = true;
    activeRef.current = false;
    clearRestartTimer();

    const trailing = interimRef.current;
    if (trailing) {
      finalPartsRef.current.push(trailing);
      interimRef.current = "";
      setInterim("");
    }

    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        recognition.abort();
      }
    }

    const finalText = joinTranscriptParts(finalPartsRef.current);
    onTranscriptUpdate(finalText);
    setRecording(false);
    onRecordingStop?.(finalText);

    window.setTimeout(() => {
      recognitionRef.current = null;
    }, 0);
  }, [clearRestartTimer, onRecordingStop, onTranscriptUpdate]);

  useEffect(() => {
    return () => {
      teardown({ intentional: true });
    };
  }, [teardown]);

  return { recording, interim, start, stop };
}
