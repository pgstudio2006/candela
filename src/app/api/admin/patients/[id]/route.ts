import { auth } from "@/auth";
import { resolveAdminOperator } from "@/server/module-operator";
import { deleteAdminPatient } from "@/server/admin/patients";
import { NextResponse, type NextRequest } from "next/server";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { ok: false, error: "Please sign in first." },
      { status: 401 },
    );
  }

  try {
    const { id } = await params;
    const { ctx, operator } = await resolveAdminOperator();
    const result = await deleteAdminPatient(ctx, operator, id);
    return NextResponse.json({ ok: true, data: result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete patient.";
    console.error("[API] Error deleting patient:", error);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
