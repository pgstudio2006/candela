"use client";

import { useFrontdeskStore } from "@/components/frontdesk/frontdesk-store";
import { useEffect } from "react";

/** Silent background refresh for multi-desk front desk screens. */
export function useFrontdeskPoll(intervalMs = 15_000) {
  const { refresh, ready } = useFrontdeskStore();

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      void refresh({ silent: true });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [ready, refresh, intervalMs]);
}
