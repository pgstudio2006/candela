import { HrShell } from "@/components/hr/shell";
import { HrStoreProvider } from "@/components/hr/hr-store";

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return (
    <HrStoreProvider>
      <HrShell>{children}</HrShell>
    </HrStoreProvider>
  );
}
