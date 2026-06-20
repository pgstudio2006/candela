"use client";

import { useCounsellorStore } from "@/components/counsellor/counsellor-store";
import { useEffect } from "react";

export function useCounsellorPoll(intervalMs = 15_000) {
  const { refresh, ready } = useCounsellorStore();

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      void refresh({ silent: true });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [ready, refresh, intervalMs]);
}
