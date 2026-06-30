"use client";

import { PageChrome } from "@/components/frontdesk/page-chrome";
import { AttioButton, Panel } from "@/components/frontdesk/ui";
import { useEffect, useState, useCallback } from "react";

type Template = {
  id: string | null;
  trigger: string;
  label: string;
  body: string;
  enabled: boolean;
};

type WhatsAppLog = {
  id: string;
  trigger: string;
  recipient: string;
  body: string;
  status: string;
  error: string | null;
  createdAt: string;
};

const TRIGGER_DESCRIPTIONS: Record<string, string> = {
  checkin_doctor_schedule: "When a patient checks in at frontdesk, the assigned doctor receives their schedule details.",
  lead_greeting: "When a new lead is added to CRM, they receive a greeting message.",
  appointment_confirmation: "When an appointment is booked, the patient receives confirmation details.",
  visit_thankyou_review: "After a visit is completed, the patient gets a thank you message with a Google review link.",
  billing_invoice: "When billing is processed, the patient receives their invoice details.",
  prescription_sent: "When a prescription is created, the patient is notified to collect it from pharmacy.",
};

const AVAILABLE_VARS: Record<string, string[]> = {
  checkin_doctor_schedule: ["doctorName", "patientName", "uhid", "time", "department"],
  lead_greeting: ["leadName"],
  appointment_confirmation: ["patientName", "doctorName", "date", "time"],
  visit_thankyou_review: ["patientName", "reviewLink"],
  billing_invoice: ["patientName", "invoiceNumber", "amount", "paymentStatus", "balanceDue"],
  prescription_sent: ["patientName", "itemCount", "doctorName"],
};

export default function WhatsAppTemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [logs, setLogs] = useState<WhatsAppLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [tab, setTab] = useState<"templates" | "logs">("templates");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tplRes, logRes] = await Promise.all([
        fetch("/api/admin/whatsapp/templates", { credentials: "include" }),
        fetch("/api/admin/whatsapp/logs?limit=50", { credentials: "include" }),
      ]);
      const tplJson = await tplRes.json();
      const logJson = await logRes.json();
      if (tplJson.ok) setTemplates(tplJson.data);
      if (logJson.ok) setLogs(logJson.data);
    } catch (e) {
      console.error("Failed to load WhatsApp data:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveTemplate = async (trigger: string) => {
    const tpl = templates.find((t) => t.trigger === trigger);
    if (!tpl) return;
    setSaving(trigger);
    try {
      const res = await fetch("/api/admin/whatsapp/templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          trigger: tpl.trigger,
          label: tpl.label,
          body: tpl.body,
          enabled: tpl.enabled,
        }),
      });
      const json = await res.json();
      if (!json.ok) {
        alert(json.error || "Failed to save template");
      }
    } catch (e) {
      console.error("Failed to save template:", e);
      alert("Failed to save template");
    } finally {
      setSaving(null);
    }
  };

  const updateTemplate = (trigger: string, field: keyof Template, value: string | boolean) => {
    setTemplates((prev) =>
      prev.map((t) => (t.trigger === trigger ? { ...t, [field]: value } : t)),
    );
  };

  return (
    <PageChrome
      breadcrumbs={[
        { label: "Admin", href: "/app/admin" },
        { label: "WhatsApp Templates" },
      ]}
      title="WhatsApp Templates"
      meta="Gurgaon branch · Editable message templates"
    >
      <div className="mb-4 flex gap-2">
        <AttioButton
          variant={tab === "templates" ? "primary" : "secondary"}
          onClick={() => setTab("templates")}
        >
          Templates
        </AttioButton>
        <AttioButton
          variant={tab === "logs" ? "primary" : "secondary"}
          onClick={() => setTab("logs")}
        >
          Message Logs
        </AttioButton>
      </div>

      {loading ? (
        <Panel title="Loading...">
          <p className="text-[13px] text-neutral-500">Loading WhatsApp configuration...</p>
        </Panel>
      ) : tab === "templates" ? (
        <div className="space-y-4">
          {templates.map((tpl) => (
            <Panel key={tpl.trigger} title={tpl.label}>
              <div className="space-y-3">
                <p className="text-[12px] text-neutral-500">
                  {TRIGGER_DESCRIPTIONS[tpl.trigger] || ""}
                </p>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-neutral-700">
                    Template Label
                  </label>
                  <input
                    type="text"
                    value={tpl.label}
                    onChange={(e) => updateTemplate(tpl.trigger, "label", e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-[13px]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[12px] font-medium text-neutral-700">
                    Message Body
                  </label>
                  <textarea
                    value={tpl.body}
                    onChange={(e) => updateTemplate(tpl.trigger, "body", e.target.value)}
                    rows={5}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 text-[13px] font-mono"
                  />
                </div>

                <div>
                  <p className="mb-1 text-[11px] text-neutral-500">Available variables:</p>
                  <div className="flex flex-wrap gap-1">
                    {(AVAILABLE_VARS[tpl.trigger] || []).map((v) => (
                      <code
                        key={v}
                        className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600"
                      >
                        {`{{${v}}}`}
                      </code>
                    ))}
                    {tpl.trigger === "visit_thankyou_review" && (
                      <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] text-neutral-600">
                        {"{{reviewLink}}"}
                      </code>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-[13px]">
                    <input
                      type="checkbox"
                      checked={tpl.enabled}
                      onChange={(e) => updateTemplate(tpl.trigger, "enabled", e.target.checked)}
                    />
                    <span>Enabled</span>
                  </label>
                  <AttioButton
                    variant="primary"
                    onClick={() => void saveTemplate(tpl.trigger)}
                    disabled={saving === tpl.trigger}
                  >
                    {saving === tpl.trigger ? "Saving..." : "Save"}
                  </AttioButton>
                </div>
              </div>
            </Panel>
          ))}
        </div>
      ) : (
        <Panel title="Recent WhatsApp Messages">
          {logs.length === 0 ? (
            <p className="text-[13px] text-neutral-500">No messages sent yet.</p>
          ) : (
            <div className="space-y-2">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-md border border-neutral-200 p-3 text-[12px]"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{log.trigger}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                        log.status === "sent"
                          ? "bg-green-100 text-green-700"
                          : log.status === "failed"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {log.status}
                    </span>
                  </div>
                  <div className="mt-1 text-neutral-500">To: {log.recipient}</div>
                  <div className="mt-1 text-neutral-600">{log.body.slice(0, 150)}...</div>
                  {log.error && (
                    <div className="mt-1 text-red-500">Error: {log.error}</div>
                  )}
                  <div className="mt-1 text-neutral-400">
                    {new Date(log.createdAt).toLocaleString("en-IN")}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}
    </PageChrome>
  );
}
