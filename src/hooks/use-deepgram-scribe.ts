"use client";

import { useCallback, useRef, useState } from "react";

type UseDeepgramScribeOptions = {
  language: string;
  onTranscriptUpdate: (fullText: string) => void;
  onError: (message: string) => void;
};

export function useDeepgramScribe({ language, onTranscriptUpdate, onError }: UseDeepgramScribeOptions) {
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const finalPartsRef = useRef<string[]>([]);

  const cleanup = useCallback(() => {
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "CloseStream" }));
      socketRef.current.close();
    }
    socketRef.current = null;
    setRecording(false);
    setInterim("");
  }, []);

  const start = useCallback(async () => {
    try {
      finalPartsRef.current = [];
      setInterim("");

      const cfgRes = await fetch(`/api/scribe/config?language=${encodeURIComponent(language)}`);
      const cfg = (await cfgRes.json()) as { apiKey?: string; model?: string; deepgramLanguage?: string; error?: string };
      if (!cfgRes.ok || !cfg.apiKey) {
        throw new Error(cfg.error ?? "Could not load scribe configuration.");
      }

      const params = new URLSearchParams({
        model: cfg.model ?? "nova-2",
        language: cfg.deepgramLanguage ?? "en-IN",
        punctuate: "true",
        interim_results: "true",
        smart_format: "true",
        encoding: "webm",
      });

      const socket = new WebSocket(`wss://api.deepgram.com/v1/listen?${params.toString()}`, ["token", cfg.apiKey]);
      socketRef.current = socket;

      await new Promise<void>((resolve, reject) => {
        socket.onopen = () => resolve();
        socket.onerror = () => reject(new Error("Deepgram connection failed."));
        setTimeout(() => reject(new Error("Deepgram connection timed out.")), 12000);
      });

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(String(event.data)) as {
            is_final?: boolean;
            channel?: { alternatives?: Array<{ transcript?: string }> };
          };
          const chunk = data.channel?.alternatives?.[0]?.transcript?.trim();
          if (!chunk) return;

          if (data.is_final) {
            finalPartsRef.current.push(chunk);
            setInterim("");
            onTranscriptUpdate(finalPartsRef.current.join(" "));
          } else {
            setInterim(chunk);
            onTranscriptUpdate([...finalPartsRef.current, chunk].join(" "));
          }
        } catch {
          /* ignore malformed frames */
        }
      };

      socket.onerror = () => onError("Live transcription connection error.");

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
          socket.send(e.data);
        }
      };

      recorder.start(300);
      setRecording(true);
    } catch (err) {
      cleanup();
      onError(err instanceof Error ? err.message : "Could not start microphone.");
    }
  }, [cleanup, language, onError, onTranscriptUpdate]);

  const stop = useCallback(() => {
    cleanup();
    onTranscriptUpdate(finalPartsRef.current.join(" "));
  }, [cleanup, onTranscriptUpdate]);

  return { recording, interim, start, stop };
}
