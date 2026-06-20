import type { OpdReceiptPayload } from "@/lib/opd-receipt";
import { formatInr, formatReceiptDate } from "@/lib/opd-receipt";
import { NavayuLetterhead, letterheadStyles as s } from "@/components/doctor/print/navayu-letterhead";

type PrintableOpdReceiptProps = {
  receipt: OpdReceiptPayload;
};

export function PrintableOpdReceipt({ receipt }: PrintableOpdReceiptProps) {
  return (
    <NavayuLetterhead docTitle="OPD Tax Invoice / Receipt">
      <div style={s.metaGrid}>
        <div>
          <strong>Invoice:</strong> {receipt.invoiceNumber}
          <br />
          <strong>Date:</strong> {formatReceiptDate(receipt.issuedAt)}
          <br />
          <strong>Patient:</strong> {receipt.patientName}
          <br />
          <strong>Mobile:</strong> {receipt.patientPhone}
        </div>
        <div>
          <strong>UHID:</strong> {receipt.patientUhid}
          <br />
          <strong>Doctor:</strong> {receipt.doctorName}
          <br />
          <strong>Token:</strong> {receipt.token != null ? `#${receipt.token}` : "—"}
          <br />
          <strong>Payment:</strong> {receipt.paymentMode.toUpperCase()}
        </div>
      </div>

      <table style={s.table}>
        <thead>
          <tr>
            <th style={s.th}>#</th>
            <th style={s.th}>Description</th>
            <th style={s.th}>Qty</th>
            <th style={{ ...s.th, textAlign: "right" }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {receipt.lines.map((line, i) => (
            <tr key={`${line.label}-${i}`}>
              <td style={s.td}>{i + 1}</td>
              <td style={s.td}>{line.label}</td>
              <td style={s.td}>{line.quantity}</td>
              <td style={{ ...s.td, textAlign: "right" }}>{formatInr(line.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {receipt.discount > 0 && (
            <tr>
              <td style={s.td} colSpan={3}>
                Discount
              </td>
              <td style={{ ...s.td, textAlign: "right" }}>-{formatInr(receipt.discount)}</td>
            </tr>
          )}
          <tr>
            <td style={{ ...s.td, fontWeight: 700 }} colSpan={3}>
              Total
            </td>
            <td style={{ ...s.td, textAlign: "right", fontWeight: 700 }}>{formatInr(receipt.total)}</td>
          </tr>
          <tr>
            <td style={s.td} colSpan={3}>
              Collected
            </td>
            <td style={{ ...s.td, textAlign: "right" }}>{formatInr(receipt.amountPaid)}</td>
          </tr>
          {receipt.balanceDue > 0 && (
            <tr>
              <td style={s.td} colSpan={3}>
                Balance due
              </td>
              <td style={{ ...s.td, textAlign: "right", fontWeight: 700 }}>{formatInr(receipt.balanceDue)}</td>
            </tr>
          )}
        </tfoot>
      </table>

      <div style={{ marginTop: "16px", fontSize: "10px", color: "#6b7280" }}>
        Status: <strong>{receipt.billingStatus.toUpperCase()}</strong>
        {receipt.paymentScope ? ` · ${receipt.paymentScope} payment` : ""}
        {receipt.routingNote ? (
          <>
            <br />
            {receipt.routingNote}
          </>
        ) : null}
      </div>
      <div style={{ marginTop: "12px", fontSize: "10px", color: "#6b7280" }}>
        Thank you for choosing Navayu Spine & Joint Care · Gurgaon
      </div>
    </NavayuLetterhead>
  );
}
