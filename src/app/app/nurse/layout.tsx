import { SchemaOverrideProvider } from "@/components/candela/schema-override-provider";
import { NurseShell } from "@/components/nurse/shell";
import { NurseStoreProvider } from "@/components/nurse/nurse-store";

export default function NurseLayout({ children }: { children: React.ReactNode }) {
  return (
    <SchemaOverrideProvider>
      <NurseStoreProvider>
        <NurseShell>{children}</NurseShell>
      </NurseStoreProvider>
    </SchemaOverrideProvider>
  );
}
