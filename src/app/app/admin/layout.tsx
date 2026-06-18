import { AdminShell } from "@/components/admin/shell";
import { AdminStoreProvider } from "@/components/admin/admin-store";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminStoreProvider>
      <AdminShell>{children}</AdminShell>
    </AdminStoreProvider>
  );
}
