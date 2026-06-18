import { FrontdeskShell } from "@/components/frontdesk/shell";
import { FrontdeskStoreProvider } from "@/components/frontdesk/frontdesk-store";

export default function FrontdeskLayout({ children }: { children: React.ReactNode }) {
  return (
    <FrontdeskStoreProvider>
      <FrontdeskShell>{children}</FrontdeskShell>
    </FrontdeskStoreProvider>
  );
}
