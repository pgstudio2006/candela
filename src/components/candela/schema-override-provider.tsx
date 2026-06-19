"use client";

import { getPublishedFormSchemasAction } from "@/app/actions/form-schema-actions";
import { setSchemaOverrideCache } from "@/lib/schema-registry";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type SchemaOverrideContextValue = {
  ready: boolean;
  refresh: () => Promise<void>;
};

const SchemaOverrideContext = createContext<SchemaOverrideContextValue | null>(null);

export function SchemaOverrideProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  const refresh = async () => {
    try {
      const overrides = await getPublishedFormSchemasAction();
      setSchemaOverrideCache(overrides);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("candela-schema-updated"));
      }
    } finally {
      setReady(true);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <SchemaOverrideContext.Provider value={{ ready, refresh }}>
      {children}
    </SchemaOverrideContext.Provider>
  );
}

export function useSchemaOverrides() {
  const ctx = useContext(SchemaOverrideContext);
  if (!ctx) throw new Error("useSchemaOverrides must be used within SchemaOverrideProvider");
  return ctx;
}
