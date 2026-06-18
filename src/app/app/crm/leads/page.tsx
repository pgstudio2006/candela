import { Suspense } from "react";
import CrmLeadsPageClient from "./leads-client";

export default function CrmLeadsPage() {
  return (
    <Suspense fallback={null}>
      <CrmLeadsPageClient />
    </Suspense>
  );
}
