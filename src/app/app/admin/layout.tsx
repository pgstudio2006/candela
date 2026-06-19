import { AdminShell } from "@/components/admin/shell";
import { AdminStoreProvider } from "@/components/admin/admin-store";
import { SchemaOverrideProvider } from "@/components/candela/schema-override-provider";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <SchemaOverrideProvider>
      <AdminStoreProvider>
        <AdminShell>{children}</AdminShell>
      </AdminStoreProvider>
    </SchemaOverrideProvider>
  );
}
