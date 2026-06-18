import { NurseShell } from "@/components/nurse/shell";
import { NurseStoreProvider } from "@/components/nurse/nurse-store";

export default function NurseLayout({ children }: { children: React.ReactNode }) {
  return (
    <NurseStoreProvider>
      <NurseShell>{children}</NurseShell>
    </NurseStoreProvider>
  );
}
