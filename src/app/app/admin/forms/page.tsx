"use client";

import { AdminFormBuilder } from "@/components/admin/form-builder";
import { PageChrome } from "@/components/frontdesk/page-chrome";

export default function AdminFormsPage() {
  return (
    <PageChrome
      breadcrumbs={[{ label: "Admin", href: "/app/admin" }, { label: "Form builder" }]}
      title="Universal form builder"
      meta="All field categories · every department · publish live"
    >
      <AdminFormBuilder />
    </PageChrome>
  );
}
