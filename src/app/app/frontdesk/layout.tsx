import { FrontdeskShell } from "@/components/frontdesk/shell";
import { FrontdeskStoreProvider } from "@/components/frontdesk/frontdesk-store";
import { SchemaOverrideProvider } from "@/components/candela/schema-override-provider";

export default function FrontdeskLayout({ children }: { children: React.ReactNode }) {
  return (
    <SchemaOverrideProvider>
      <FrontdeskStoreProvider>
        <FrontdeskShell>{children}</FrontdeskShell>
      </FrontdeskStoreProvider>
    </SchemaOverrideProvider>
  );
}
