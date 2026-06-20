"use client";

import { useNurseStore } from "@/components/nurse/nurse-store";
import { useEffect } from "react";

export function useNursePoll(intervalMs = 15_000) {
  const { refresh, ready } = useNurseStore();

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      void refresh({ silent: true });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [ready, refresh, intervalMs]);
}
