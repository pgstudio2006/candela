"use client";

import { useEffect, useRef } from "react";

const RELOAD_KEY = "candela-deploy-reload-at";

function shouldRecoverFromDeploy(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("chunkloaderror") ||
    m.includes("loading chunk") ||
    m.includes("failed to find server action") ||
    m.includes("server action") && m.includes("not found")
  );
}

/** One-time soft reload after a new deployment when stale tabs hit mismatched bundles. */
export function DeployRecovery() {
  const handled = useRef(false);

  useEffect(() => {
    const maybeReload = (message: string) => {
      if (handled.current || !shouldRecoverFromDeploy(message)) return;
      handled.current = true;
      const last = Number(sessionStorage.getItem(RELOAD_KEY) ?? "0");
      const now = Date.now();
      if (now - last < 15_000) return;
      sessionStorage.setItem(RELOAD_KEY, String(now));
      window.location.reload();
    };

    const onError = (event: ErrorEvent) => {
      maybeReload(event.message ?? "");
    };

    const onRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason as { message?: string } | string | undefined;
      const message =
        typeof reason === "string" ? reason : reason?.message ? String(reason.message) : String(reason ?? "");
      maybeReload(message);
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
