import { SchemaOverrideProvider } from "@/components/candela/schema-override-provider";
import { CrmShell } from "@/components/crm/shell";
import { CrmStoreProvider } from "@/components/crm/crm-store";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <SchemaOverrideProvider>
      <CrmStoreProvider>
        <CrmShell>{children}</CrmShell>
      </CrmStoreProvider>
    </SchemaOverrideProvider>
  );
}
