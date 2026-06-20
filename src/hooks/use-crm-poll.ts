"use client";

import { useCrmStore } from "@/components/crm/crm-store";
import { useEffect } from "react";

export function useCrmPoll(intervalMs = 15_000) {
  const { refresh, ready } = useCrmStore();

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      void refresh({ silent: true });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [ready, refresh, intervalMs]);
}
