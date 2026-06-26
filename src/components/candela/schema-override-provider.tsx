"use client";

import { fetchPublishedFormSchemas } from "@/lib/published-form-schemas-client";
import { setSchemaOverrideCache } from "@/lib/schema-registry";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type SchemaOverrideContextValue = {
  ready: boolean;
  refresh: () => Promise<void>;
};

const SchemaOverrideContext = createContext<SchemaOverrideContextValue | null>(null);

export function SchemaOverrideProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const result = await fetchPublishedFormSchemas({ purge: true });
      if (result.ok) {
        setSchemaOverrideCache(result.data);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("candela-schema-updated"));
        }
      }
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel("candela-schema");
      channel.onmessage = () => void refresh();
    } catch {
      /* ignore */
    }
    return () => {
      channel?.close();
    };
  }, [refresh]);

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
