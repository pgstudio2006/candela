import { CounsellorShell } from "@/components/counsellor/shell";
import { CounsellorStoreProvider } from "@/components/counsellor/counsellor-store";

export default function CounsellorLayout({ children }: { children: React.ReactNode }) {
  return (
    <CounsellorStoreProvider>
      <CounsellorShell>{children}</CounsellorShell>
    </CounsellorStoreProvider>
  );
}
