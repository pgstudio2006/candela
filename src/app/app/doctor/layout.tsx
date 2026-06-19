"use client";

import { SchemaOverrideProvider } from "@/components/candela/schema-override-provider";
import { DoctorStoreProvider } from "@/components/doctor/doctor-store";
import { DoctorShell } from "@/components/doctor/shell";
import type { ReactNode } from "react";

export default function DoctorLayout({ children }: { children: ReactNode }) {
  return (
    <SchemaOverrideProvider>
      <DoctorStoreProvider>
        <DoctorShell>{children}</DoctorShell>
      </DoctorStoreProvider>
    </SchemaOverrideProvider>
  );
}
