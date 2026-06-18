import type { Patient, Visit } from "@/design-system/frontdesk-data";
import type { CounselQuote } from "@/design-system/counsellor-data";
import { formatConsultDate } from "@/lib/doctor-records";
import { NavayuLetterhead, letterheadStyles as s } from "@/components/doctor/print/navayu-letterhead";

type PrintableQuoteProps = {
  patient: Patient;
  visit: Visit;
  quote: CounselQuote;
  doctorName: string;
  counsellorName: string;
};

export function PrintableQuote({ patient, visit, quote, doctorName, counsellorName }: PrintableQuoteProps) {
  return (
    <NavayuLetterhead docTitle="Package Quotation">
      <div style={s.metaGrid}>
        <div>
          <strong>Patient:</strong> {patient.name}<br />
          <strong>UHID:</strong> {patient.uhid}<br />
          <strong>Date:</strong> {formatConsultDate(new Date().toISOString())}
        </div>
        <div>
          <strong>Doctor:</strong> {doctorName}<br />
          <strong>Counsellor:</strong> {counsellorName}<br />
          <strong>Token:</strong> #{visit.token ?? "—"}
        </div>
      </div>
      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>Description</th>
            <th style={{ ...s.th, textAlign: "right" }}>Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          {quote.lineItems.map((line) => (
            <tr key={line.id}>
              <td style={s.td}>{line.label}</td>
              <td style={{ ...s.td, textAlign: "right" }}>{line.amount.toLocaleString("en-IN")}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr><td style={s.td}>Subtotal</td><td style={{ ...s.td, textAlign: "right" }}>{quote.grossAmount.toLocaleString("en-IN")}</td></tr>
          {quote.discountPercent > 0 && (
            <tr><td style={s.td}>Discount ({quote.discountPercent}%)</td><td style={{ ...s.td, textAlign: "right" }}>-{quote.discountAmount.toLocaleString("en-IN")}</td></tr>
          )}
          <tr><td style={{ ...s.td, fontWeight: 700 }}>Net payable</td><td style={{ ...s.td, textAlign: "right", fontWeight: 700 }}>₹{quote.netAmount.toLocaleString("en-IN")}</td></tr>
        </tfoot>
      </table>
      {quote.emiMonths ? <p style={{ marginTop: 12, fontSize: 11 }}>EMI option: {quote.emiMonths} months available</p> : null}
      <p style={{ marginTop: 16, fontSize: 10, color: "#6b7280" }}>Valid for 7 days · Subject to clinical eligibility · {quote.consentCaptured ? "Consent captured" : "Pending consent"}</p>
    </NavayuLetterhead>
  );
}
