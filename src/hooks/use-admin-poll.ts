"use client";

import { useAdminStore } from "@/components/admin/admin-store";
import { useEffect } from "react";

export function useAdminPoll(intervalMs = 20_000) {
  const { refresh, ready } = useAdminStore();

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      void refresh({ silent: true });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [ready, refresh, intervalMs]);
}
