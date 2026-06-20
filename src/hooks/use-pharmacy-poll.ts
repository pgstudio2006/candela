"use client";

import { usePharmacyStore } from "@/components/pharmacy/pharmacy-store";
import { useEffect } from "react";

export function usePharmacyPoll(intervalMs = 15_000) {
  const { refresh, ready } = usePharmacyStore();

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      void refresh({ silent: true });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [ready, refresh, intervalMs]);
}
