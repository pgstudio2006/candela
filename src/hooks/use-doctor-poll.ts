"use client";

import { useDoctorStore } from "@/components/doctor/doctor-store";
import { useEffect } from "react";

export function useDoctorPoll(intervalMs = 15_000) {
  const { refresh, ready } = useDoctorStore();

  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      void refresh({ silent: true });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [ready, refresh, intervalMs]);
}
