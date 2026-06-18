"use client";

import { ModuleViewNav, useModuleView } from "@/components/candela/module-view-nav";
import { PageHeader } from "@/components/candela/ui-primitives";
import type { CandelaModule } from "@/design-system/modules";
import type { ReactNode } from "react";
import { Suspense } from "react";

export function ModulePage({
  module,
  renderView,
}: {
  module: CandelaModule;
  renderView: (viewId: string) => ReactNode;
}) {
  return (
    <Suspense fallback={<div className="text-[var(--c-text-tertiary)]">Loading…</div>}>
      <ModulePageInner module={module} renderView={renderView} />
    </Suspense>
  );
}

function ModulePageInner({
  module,
  renderView,
}: {
  module: CandelaModule;
  renderView: (viewId: string) => ReactNode;
}) {
  const viewId = useModuleView(module);
  return (
    <div>
      <PageHeader title={module.label} description={module.description} />
      <ModuleViewNav module={module} />
      {renderView(viewId)}
    </div>
  );
}
