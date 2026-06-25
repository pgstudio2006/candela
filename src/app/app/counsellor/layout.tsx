import { SchemaOverrideProvider } from "@/components/candela/schema-override-provider";
import { CounsellorShell } from "@/components/counsellor/shell";
import { CounsellorStoreProvider } from "@/components/counsellor/counsellor-store";

export default function CounsellorLayout({ children }: { children: React.ReactNode }) {
  return (
    <SchemaOverrideProvider>
      <CounsellorStoreProvider>
        <CounsellorShell>{children}</CounsellorShell>
      </CounsellorStoreProvider>
    </SchemaOverrideProvider>
  );
}
