import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { resolveAdminOperator } from "@/server/module-operator";
import { getAdminPatientHistory } from "@/server/admin/patients";
import AdminPatientDetailClientPage from "./client-page";

export default async function AdminPatientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: patientId } = await params;

  try {
    const { ctx } = await resolveAdminOperator();
    const history = await getAdminPatientHistory(ctx, patientId);
    return <AdminPatientDetailClientPage patientId={patientId} initialHistory={history} />;
  } catch (err) {
    if (err instanceof Error && err.message.includes("UNAUTHORIZED")) {
      redirect("/login");
    }
    if (err instanceof Error && err.message.includes("NOT_FOUND")) {
      notFound();
    }
    console.error("[AdminPatientDetailPage] failed:", err);
    return (
      <AdminPatientDetailClientPage
        patientId={patientId}
        initialHistory={null}
      />
    );
  }
}
