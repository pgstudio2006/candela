"use client";

import { DoctorStoreProvider } from "@/components/doctor/doctor-store";
import { DoctorShell } from "@/components/doctor/shell";
import type { ReactNode } from "react";

export default function DoctorLayout({ children }: { children: ReactNode }) {
  return (
    <DoctorStoreProvider>
      <DoctorShell>{children}</DoctorShell>
    </DoctorStoreProvider>
  );
}
