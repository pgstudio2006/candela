import { CrmShell } from "@/components/crm/shell";
import { CrmStoreProvider } from "@/components/crm/crm-store";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <CrmStoreProvider>
      <CrmShell>{children}</CrmShell>
    </CrmStoreProvider>
  );
}
