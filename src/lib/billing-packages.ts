/** Navayu global healthcare price list — branch-specific OPD & procedure packages. */

export type BillingBranchGroup = "gurgaon" | "pataudi_pune";

export type BillingPackage = {
  id: string;
  label: string;
  description?: string;
  category: "opd" | "injection" | "therapy" | "procedure" | "admission";
  amount: number;
  amountMax?: number;
  /** Display hint when list price is a range */
  priceLabel?: string;
  sessions?: number;
  dept?: string;
  services?: Array<{ serviceId: string; label: string; quantity: number; rate: number }>;
};

// Legacy packages for fallback - will be replaced with database data
const GURGAON_PACKAGES: BillingPackage[] = [
  { id: "opd", label: "OPD Fees", category: "opd", amount: 1500 },
  { id: "dscb", label: "DSCB Injection Only", category: "injection", amount: 12000 },
  { id: "knee_prolozone", label: "Knee Prolozone Therapy (Single Knee)", category: "therapy", amount: 10000 },
  { id: "shoulder_prolozone", label: "Shoulder Prolozone Therapy (Single Shoulder)", category: "therapy", amount: 10000 },
  { id: "ozone_uvbi", label: "Ozone Autohemotherapy with UVBI", category: "therapy", amount: 15000 },
  {
    id: "ozone_eboo_h2",
    label: "Ozone by EBOO + Hydrogen Nutraceutical Anti-Oxidant Blood Therapy",
    description: "Per session",
    category: "therapy",
    amount: 50000,
  },
  { id: "nutraceutical_only", label: "Only Nutraceutical Blood Therapy", category: "therapy", amount: 10000 },
  {
    id: "ozone_auto_nutra",
    label: "Ozone Autohemotherapy + Nutraceutical Blood Therapy",
    category: "therapy",
    amount: 20000,
  },
  {
    id: "ozone_discectomy_dscb",
    label: "Ozone Discectomy + DSCB Injection",
    description: "1 day admission required · 1st visit only",
    category: "admission",
    amount: 100000,
    amountMax: 120000,
    priceLabel: "₹1,00,000 – ₹1,20,000",
  },
  {
    id: "hip_avn_eboo",
    label: "HIP AVN — First sitting with EBOO",
    description: "1 day admission · Hip arthrodiastasis + M regime + autohemotherapy + blood test",
    category: "admission",
    amount: 150000,
    priceLabel: "₹1,50,000",
  },
];

const PATAUDI_PUNE_PACKAGES: BillingPackage[] = [
  { id: "opd", label: "OPD Fees", category: "opd", amount: 500 },
  { id: "dscb", label: "DSCB Injection Only", category: "injection", amount: 12000 },
  { id: "knee_prolozone", label: "Knee Prolozone Therapy (Single Knee)", category: "therapy", amount: 10000 },
  { id: "shoulder_prolozone", label: "Shoulder Prolozone Therapy (Single Shoulder)", category: "therapy", amount: 10000 },
  { id: "ozone_uvbi", label: "Ozone Autohemotherapy with UVBI", category: "therapy", amount: 15000 },
  {
    id: "ozone_eboo_h2",
    label: "Ozone by EBOO + Hydrogen Nutraceutical Anti-Oxidant Blood Therapy",
    description: "Per session",
    category: "therapy",
    amount: 50000,
  },
  { id: "nutraceutical_only", label: "Only Nutraceutical Blood Therapy", category: "therapy", amount: 10000 },
  {
    id: "ozone_auto_nutra",
    label: "Ozone Autohemotherapy + Nutraceutical Blood Therapy",
    category: "therapy",
    amount: 20000,
  },
  {
    id: "ozone_discectomy_dscb",
    label: "Ozone Discectomy + DSCB Injection",
    description: "1 day admission required · 1st visit only",
    category: "admission",
    amount: 65000,
    amountMax: 70000,
    priceLabel: "₹65,000 – ₹70,000",
  },
  {
    id: "hip_avn_eboo",
    label: "HIP AVN — First sitting with EBOO",
    description: "1 day admission · Hip arthrodiastasis + M regime + autohemotherapy + blood test",
    category: "admission",
    amount: 85000,
    amountMax: 90000,
    priceLabel: "₹85,000 – ₹90,000",
  },
];

export function resolveBillingBranchGroup(branchId?: string | null): BillingBranchGroup {
  const id = (branchId ?? "").toLowerCase();
  if (id.includes("gurgaon") || id.includes("ggn")) return "gurgaon";
  return "pataudi_pune";
}

// Fetch packages from database API
export async function fetchBillingPackagesFromAPI(): Promise<BillingPackage[]> {
  try {
    const res = await fetch("/api/admin/packages");
    const data = await res.json();
    if (data.ok) {
      return data.data.map((pkg: any) => ({
        id: pkg.id,
        label: pkg.label,
        description: pkg.description,
        category: "opd", // Default, can be enhanced
        amount: Number(pkg.amount),
        sessions: pkg.sessions,
        dept: pkg.dept,
        services: pkg.services,
      }));
    }
  } catch (err) {
    console.error("Failed to fetch packages from API, using fallback", err);
  }
  return [];
}

// Fetch service charges from database API
export async function fetchServiceChargesFromAPI(): Promise<BillingPackage[]> {
  try {
    const res = await fetch("/api/admin/service-charges");
    const data = await res.json();
    if (data.ok) {
      return data.data.map((charge: any) => ({
        id: charge.id,
        label: charge.label,
        description: charge.description,
        category: charge.category as any,
        amount: Number(charge.rate),
      }));
    }
  } catch (err) {
    console.error("Failed to fetch service charges from API, using fallback", err);
  }
  return [];
}

export function getBillingPackagesForBranch(branchId?: string | null): BillingPackage[] {
  // Try to fetch from API first, fallback to hardcoded
  const apiPackages = fetchBillingPackagesFromAPI();
  // Note: This is async, in practice the component should handle the async loading
  // For now, return the fallback data synchronously
  return resolveBillingBranchGroup(branchId) === "gurgaon"
    ? GURGAON_PACKAGES
    : PATAUDI_PUNE_PACKAGES;
}

export function getBillingPackage(
  packageId: string,
  branchId?: string | null,
): BillingPackage | undefined {
  return getBillingPackagesForBranch(branchId).find((p) => p.id === packageId);
}

export function formatPackagePrice(pkg: BillingPackage): string {
  if (pkg.priceLabel) return pkg.priceLabel;
  if (pkg.amountMax && pkg.amountMax > pkg.amount) {
    return `₹${pkg.amount.toLocaleString("en-IN")} – ₹${pkg.amountMax.toLocaleString("en-IN")}`;
  }
  return `₹${pkg.amount.toLocaleString("en-IN")}`;
}
