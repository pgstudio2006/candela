import type { Patient, Visit } from "@/design-system/frontdesk-data";
import type { ConsultationRecord } from "@/design-system/doctor-data";
import { formatConsultDate } from "@/lib/doctor-records";
import { NavayuLetterhead, letterheadStyles as s } from "./navayu-letterhead";

type PrintableInvoiceProps = {
  patient: Patient;
  visit: Visit;
  consult?: ConsultationRecord;
  doctorName: string;
  invoiceNo: string;
};

export function PrintableInvoice({
  patient,
  visit,
  consult,
  doctorName,
  invoiceNo,
}: PrintableInvoiceProps) {
  const amount = visit.billAmount ?? 1500;
  const date = formatConsultDate(consult?.completedAt ?? consult?.startedAt ?? new Date().toISOString());
  const description =
    consult?.treatmentMode === "ipd"
      ? "IPD consultation & care"
      : consult?.treatmentMode === "daycare"
        ? "Daycare procedure"
        : "OPD consultation";

  return (
    <NavayuLetterhead docTitle="Tax Invoice / Receipt">
      <div style={s.metaGrid}>
        <div>
          <strong>Invoice No:</strong> {invoiceNo}
          <br />
          <strong>Date:</strong> {date}
          <br />
          <strong>Patient:</strong> {patient.name}
        </div>
        <div>
          <strong>UHID:</strong> {patient.uhid}
          <br />
          <strong>Doctor:</strong> {doctorName}
          <br />
          <strong>Billing:</strong> {visit.billing}
        </div>
      </div>

      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>#</th>
            <th style={s.th}>Description</th>
            <th style={s.th}>Qty</th>
            <th style={{ ...s.th, textAlign: "right" }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style={s.td}>1</td>
            <td style={s.td}>{description}</td>
            <td style={s.td}>1</td>
            <td style={{ ...s.td, textAlign: "right" }}>{amount.toLocaleString("en-IN")}</td>
          </tr>
          {visit.deferredReason && (
            <tr>
              <td style={s.td}>—</td>
              <td style={s.td} colSpan={3}>
                <em>Deferred: {visit.deferredReason}</em>
              </td>
            </tr>
          )}
        </tbody>
        <tfoot>
          <tr>
            <td style={{ ...s.td, fontWeight: 700 }} colSpan={3}>
              Total
            </td>
            <td style={{ ...s.td, textAlign: "right", fontWeight: 700 }}>
              ₹{amount.toLocaleString("en-IN")}
            </td>
          </tr>
        </tfoot>
      </table>

      <div style={{ marginTop: "16px", fontSize: "10px", color: "#6b7280" }}>
        Payment status: <strong>{visit.billing.toUpperCase()}</strong>
        {visit.billing === "paid" && " · Thank you for choosing Navayu"}
      </div>
    </NavayuLetterhead>
  );
}
