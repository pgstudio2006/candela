"use client";

import { AttioButton } from "@/components/frontdesk/ui";
import { printHtmlElement } from "@/lib/doctor-records";
import { Printer, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";

type PrintPreviewModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  printId: string;
  children: ReactNode;
};

export function PrintPreviewModal({
  open,
  onClose,
  title,
  printId,
  children,
}: PrintPreviewModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[300] flex items-start justify-center overflow-y-auto bg-black/30 p-4 pt-8 backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="mb-8 w-full max-w-[210mm] overflow-hidden rounded-xl border border-[var(--attio-border)] bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between border-b border-[var(--attio-border-subtle)] px-4 py-3">
          <h2 className="text-[14px] font-semibold">{title}</h2>
          <div className="flex gap-2">
            <AttioButton
              variant="primary"
              className="gap-1.5"
              onClick={() => printHtmlElement(printId, title)}
            >
              <Printer className="size-3.5" />
              Print
            </AttioButton>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1.5 text-[var(--attio-text-tertiary)] hover:bg-[var(--attio-hover)]"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
        <div className="max-h-[75vh] overflow-y-auto bg-[#f5f5f4] p-6">
          <div id={printId} className="mx-auto bg-white p-8 shadow-sm" style={{ width: "210mm", minHeight: "297mm" }}>
            {children}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
