import { PharmacyShell } from "@/components/pharmacy/shell";
import { PharmacyStoreProvider } from "@/components/pharmacy/pharmacy-store";

export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  return (
    <PharmacyStoreProvider>
      <PharmacyShell>{children}</PharmacyShell>
    </PharmacyStoreProvider>
  );
}
