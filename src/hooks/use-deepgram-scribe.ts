"use client";

import { useCallback, useRef, useState } from "react";

type UseDeepgramScribeOptions = {
  language: string;
  onTranscriptUpdate: (fullText: string) => void;
  onRecordingStop?: (fullText: string) => void;
  onError: (message: string) => void;
};

function deepgramErrorMessage(code: number, reason: string, payload?: string): string {
  if (payload) {
    try {
      const parsed = JSON.parse(payload) as { err_msg?: string; message?: string; description?: string };
      const msg = parsed.err_msg ?? parsed.message ?? parsed.description;
      if (msg) return msg;
    } catch {
      if (payload.length < 200) return payload;
    }
  }
  if (code === 1006) return "Deepgram connection rejected — check DEEPGRAM_API_KEY on the server.";
  if (code === 1008) return reason || "Deepgram rejected the stream configuration.";
  if (code === 1011) return "Deepgram server error — retry in a moment.";
  return reason || `Deepgram connection closed (code ${code}).`;
}

export function useDeepgramScribe({ language, onTranscriptUpdate, onRecordingStop, onError }: UseDeepgramScribeOptions) {
  const [recording, setRecording] = useState(false);
  const [interim, setInterim] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const finalPartsRef = useRef<string[]>([]);
  const intentionalCloseRef = useRef(false);

  const cleanup = useCallback((opts?: { intentional?: boolean }) => {
    intentionalCloseRef.current = opts?.intentional ?? false;
    recorderRef.current?.stop();
    recorderRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: "CloseStream" }));
      socket.close(1000, "session ended");
    }
    socketRef.current = null;
    setRecording(false);
    setInterim("");
  }, []);

  const start = useCallback(async () => {
    try {
      intentionalCloseRef.current = false;
      finalPartsRef.current = [];
      setInterim("");

      const cfgRes = await fetch(`/api/scribe/config?language=${encodeURIComponent(language)}`);
      const cfg = (await cfgRes.json()) as { apiKey?: string; model?: string; deepgramLanguage?: string; error?: string };
      if (!cfgRes.ok || !cfg.apiKey) {
        throw new Error(cfg.error ?? "Could not load scribe configuration.");
      }

      // Containerized webm/opus from MediaRecorder — omit encoding/sample_rate (Deepgram auto-detects).
      const params = new URLSearchParams({
        model: cfg.model ?? "nova-2",
        language: cfg.deepgramLanguage ?? "en-IN",
        punctuate: "true",
        interim_results: "true",
        smart_format: "true",
      });

      const socket = new WebSocket(`wss://api.deepgram.com/v1/listen?${params.toString()}`, ["token", cfg.apiKey]);
      socketRef.current = socket;

      let errorPayload = "";

      await new Promise<void>((resolve, reject) => {
        const timer = window.setTimeout(() => reject(new Error("Deepgram connection timed out.")), 12000);
        let opened = false;

        socket.onmessage = (event) => {
          const raw = String(event.data);
          try {
            const data = JSON.parse(raw) as {
              type?: string;
              is_final?: boolean;
              channel?: { alternatives?: Array<{ transcript?: string }> };
              err_msg?: string;
              message?: string;
            };

            if (data.type === "Error" || data.err_msg) {
              onError(data.err_msg ?? data.message ?? "Deepgram transcription error.");
              return;
            }

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
            errorPayload = raw;
          }
        };

        socket.onopen = () => {
          opened = true;
          window.clearTimeout(timer);
          resolve();
        };

        socket.onerror = () => {
          if (!opened) {
            window.clearTimeout(timer);
            reject(new Error("Deepgram WebSocket failed — verify API key and redeploy."));
          }
        };

        socket.onclose = (ev) => {
          if (opened) {
            if (!intentionalCloseRef.current && ev.code !== 1000) {
              onError(deepgramErrorMessage(ev.code, ev.reason, errorPayload));
            }
            cleanup({ intentional: true });
            return;
          }
          window.clearTimeout(timer);
          reject(new Error(deepgramErrorMessage(ev.code, ev.reason, errorPayload)));
        };
      });

      if (!MediaRecorder.isTypeSupported("audio/webm")) {
        throw new Error("This browser does not support audio/webm recording.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
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

      recorder.start(250);
      setRecording(true);
    } catch (err) {
      cleanup({ intentional: true });
      onError(err instanceof Error ? err.message : "Could not start microphone.");
    }
  }, [cleanup, language, onError, onTranscriptUpdate]);

  const stop = useCallback(() => {
    const finalText = finalPartsRef.current.join(" ");
    cleanup({ intentional: true });
    onTranscriptUpdate(finalText);
    onRecordingStop?.(finalText);
  }, [cleanup, onRecordingStop, onTranscriptUpdate]);

  return { recording, interim, start, stop };
}
