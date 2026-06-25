import { SchemaOverrideProvider } from "@/components/candela/schema-override-provider";
import { HrShell } from "@/components/hr/shell";
import { HrStoreProvider } from "@/components/hr/hr-store";

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return (
    <SchemaOverrideProvider>
      <HrStoreProvider>
        <HrShell>{children}</HrShell>
      </HrStoreProvider>
    </SchemaOverrideProvider>
  );
}
