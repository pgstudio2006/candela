import { CLINIC_BRAND } from "@/design-system/document-templates";

const styles = {
  wrap: { fontFamily: "Arial, Helvetica, sans-serif", color: "#1b1b1b", fontSize: "11px", lineHeight: 1.45 },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "12px",
    paddingBottom: "10px",
    borderBottom: "1px solid #d8d8d6",
    marginBottom: "16px",
  },
  logoName: { fontSize: "28px", fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1 },
  logoNav: { color: "#7c3aed" },
  logoAyu: { color: "#2563eb" },
  tagline: { fontSize: "10px", color: "#6b7280", marginTop: "2px" },
  badge: {
    display: "inline-block",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "9px",
    fontWeight: 600,
    color: "#fff",
    marginRight: "6px",
    marginBottom: "4px",
  },
  centres: { fontSize: "9px", color: "#6b7280", marginTop: "6px" },
  qr: {
    width: "72px",
    height: "72px",
    border: "1px solid #e5e5e3",
    borderRadius: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "8px",
    color: "#9ca3af",
    textAlign: "center" as const,
  },
  footer: { marginTop: "24px", paddingTop: "10px", borderTop: "1px solid #e5e5e3" },
  footerBar: {
    height: "6px",
    background: "linear-gradient(90deg, #7c3aed, #6366f1)",
    borderRadius: "2px",
    marginTop: "8px",
  },
  disclaimer: { fontSize: "8px", color: "#9ca3af", textAlign: "center" as const, marginTop: "6px" },
  docTitle: {
    textAlign: "center" as const,
    fontSize: "14px",
    fontWeight: 700,
    letterSpacing: "0.12em",
    textTransform: "uppercase" as const,
    margin: "12px 0 16px",
    color: "#374151",
  },
  metaGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px 24px",
    marginBottom: "16px",
    fontSize: "11px",
  },
  table: { width: "100%", borderCollapse: "collapse" as const, marginTop: "8px" },
  th: {
    border: "1px solid #d1d5db",
    padding: "6px 8px",
    textAlign: "left" as const,
    fontSize: "10px",
    fontWeight: 600,
    background: "#f9fafb",
  },
  td: { border: "1px solid #d1d5db", padding: "6px 8px", fontSize: "10px" },
  section: { marginBottom: "14px" },
  sectionTitle: {
    fontSize: "10px",
    fontWeight: 700,
    textTransform: "uppercase" as const,
    letterSpacing: "0.06em",
    color: "#6b7280",
    marginBottom: "4px",
  },
  rxSymbol: { fontSize: "22px", fontWeight: 700, color: "#7c3aed", marginRight: "8px" },
};

export function NavayuLetterhead({ children, docTitle }: { children: React.ReactNode; docTitle: string }) {
  return (
    <div style={styles.wrap} className="print-root">
      <header style={styles.header}>
        <div>
          <div style={styles.logoName}>
            <span style={styles.logoNav}>Nav</span>
            <span style={styles.logoAyu}>ayu</span>
          </div>
          <div style={styles.tagline}>{CLINIC_BRAND.tagline}</div>
        </div>
        <div style={{ flex: 1, textAlign: "center", paddingTop: "4px" }}>
          <div>
            <span style={{ ...styles.badge, background: "#7c3aed" }}>
              {CLINIC_BRAND.stats.patients} patients treated
            </span>
            <span style={{ ...styles.badge, background: "#a78bfa" }}>
              With {CLINIC_BRAND.stats.successRate} success rate
            </span>
          </div>
          <div style={styles.centres}>
            OUR CENTRES · {CLINIC_BRAND.centres.map((c) => `•${c}`).join("  ")}
          </div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "8px", color: "#6b7280", maxWidth: "90px", marginBottom: "4px" }}>
            Scan for Navayu Health
          </div>
          <div style={styles.qr}>QR</div>
        </div>
      </header>

      <div style={styles.docTitle}>{docTitle}</div>
      {children}

      <footer style={styles.footer}>
        <div style={{ textAlign: "center", fontSize: "9px", color: "#6b7280" }}>
          {CLINIC_BRAND.legalEntity}
        </div>
        <div style={{ textAlign: "center", fontSize: "9px", color: "#6b7280", marginTop: "4px" }}>
          🌐 {CLINIC_BRAND.website} · 📍 {CLINIC_BRAND.address}
        </div>
        <div style={styles.footerBar} />
        <div style={styles.disclaimer}>{CLINIC_BRAND.disclaimer}</div>
      </footer>
    </div>
  );
}

export { styles as letterheadStyles };
