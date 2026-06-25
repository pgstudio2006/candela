import { auth } from "@/auth";
import { searchAdminPatients } from "@/server/admin/patients";
import { resolveAdminOperator } from "@/server/module-operator";
import { serializeForClient } from "@/server/serialize";
import { NextResponse, type NextRequest } from "next/server";

/** Paginated admin patient search — avoids masked server-action failures in production. */
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  try {
    const { ctx } = await resolveAdminOperator();
    const { searchParams } = request.nextUrl;
    const view = searchParams.get("view");
    const parsedView =
      view === "today" || view === "balance" ? view : ("all" as const);
    const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
    const pageSize = Math.min(
      100,
      Math.max(10, Number(searchParams.get("pageSize") ?? "25") || 25),
    );
    const q = searchParams.get("q")?.trim() || undefined;

    const data = await searchAdminPatients(ctx, { q, page, pageSize, view: parsedView });
    return NextResponse.json({ ok: true, data: serializeForClient(data) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load patients.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
