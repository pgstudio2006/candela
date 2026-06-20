"use client";

import { useHrStore } from "@/components/hr/hr-store";
import { useEffect } from "react";

export function useHrPoll(intervalMs = 15_000) {
  const { refresh, ready } = useHrStore();

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      void refresh({ silent: true });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [ready, refresh, intervalMs]);
}
