"use client";

import { PrintableOpdReceipt } from "@/components/frontdesk/print/printable-opd-receipt";
import { PrintPreviewModal } from "@/components/doctor/print/print-preview-modal";
import { getVisitReceiptAction } from "@/app/actions/clinical-actions";
import type { OpdReceiptPayload } from "@/lib/opd-receipt";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

type BillingReceiptModalProps = {
  open: boolean;
  visitId: string | null;
  onClose: () => void;
};

export function BillingReceiptModal({
  open,
  visitId,
  onClose,
}: BillingReceiptModalProps) {
  const [receipt, setReceipt] = useState<OpdReceiptPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !visitId) {
      setReceipt(null);
      setError("");
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError("");

    void getVisitReceiptAction(visitId)
      .then((data) => {
        if (cancelled) return;
        if ("error" in data) {
          setError(data.error ?? "Could not load receipt.");
          setReceipt(null);
        } else {
          setReceipt(data.receipt);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Could not load receipt.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, visitId]);

  if (!open) return null;

  const printId = `opd-receipt-${visitId ?? "preview"}`;

  return (
    <PrintPreviewModal open={open} onClose={onClose} title="OPD receipt" printId={printId}>
      {loading && (
        <div className="flex items-center justify-center gap-2 py-16 text-[13px] text-[var(--attio-text-tertiary)]">
          <Loader2 className="size-4 animate-spin" />
          Preparing receipt…
        </div>
      )}
      {error && !loading && (
        <p className="py-16 text-center text-[13px] text-red-600">{error}</p>
      )}
      {receipt && !loading && <PrintableOpdReceipt receipt={receipt} />}
    </PrintPreviewModal>
  );
}
