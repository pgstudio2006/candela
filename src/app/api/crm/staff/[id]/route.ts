import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getServerContext } from "@/server/context";
import { serializeForClient } from "@/server/serialize";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, error: "Please sign in first." }, { status: 401 });
  }

  try {
    const ctx = await getServerContext();
    const { id } = await params;

    // Get all leads for this agent
    const leads = await prisma.lead.findMany({
      where: { branchId: ctx.branchId, assigneeId: id },
      orderBy: { createdAt: "desc" },
      take: 500,
    });

    // Get commissions for this agent
    const commissions = await prisma.counsellorCommission.findMany({
      where: { branchId: ctx.branchId, counsellorId: id },
      orderBy: { createdAt: "desc" },
      take: 200,
    });

    // Get activities for this agent
    const activities = await prisma.activity.findMany({
      where: { branchId: ctx.branchId, leadId: { in: leads.map((l) => l.id) } },
      orderBy: { at: "desc" },
      take: 50,
    }).catch(() => []);

    // Build daily stats for the last 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyStats: { date: string; leads: number; conversions: number; calls: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const dayStr = day.toISOString().split("T")[0];
      const dayLeads = leads.filter((l) => l.createdAt.toISOString().split("T")[0] === dayStr);
      const dayConversions = dayLeads.filter((l) => l.leadStatus === "converted" || l.leadStatus === "visit_done");
      const dayCalls = (activities as any[]).filter((a) => {
        const aDate = new Date(a.at);
        return aDate.toISOString().split("T")[0] === dayStr && a.type === "call";
      });
      dailyStats.push({ date: dayStr, leads: dayLeads.length, conversions: dayConversions.length, calls: dayCalls.length });
    }

    // Status distribution
    const statusCounts: Record<string, number> = {};
    for (const l of leads) {
      const status = l.leadStatus ?? "fresh";
      statusCounts[status] = (statusCounts[status] ?? 0) + 1;
    }

    // Commission stats
    const totalCommission = commissions.reduce((s, c) => s + Number(c.commissionAmount), 0);
    const paidCommission = commissions.filter((c) => c.status === "paid").reduce((s, c) => s + Number(c.commissionAmount), 0);
    const pendingCommission = commissions.filter((c) => c.status === "pending").reduce((s, c) => s + Number(c.commissionAmount), 0);
    const totalRevenue = commissions.reduce((s, c) => s + Number(c.billAmount), 0);

    return NextResponse.json({
      ok: true,
      data: serializeForClient({
        agentId: id,
        totalLeads: leads.length,
        openLeads: leads.filter((l) => !["converted", "lost", "visit_done"].includes(l.leadStatus ?? "")).length,
        convertedLeads: leads.filter((l) => l.leadStatus === "converted" || l.leadStatus === "visit_done").length,
        lostLeads: leads.filter((l) => l.leadStatus === "lost").length,
        conversionRate: leads.length > 0 ? Math.round((leads.filter((l) => l.leadStatus === "converted" || l.leadStatus === "visit_done").length / leads.length) * 100) : 0,
        totalRevenue,
        totalCommission,
        paidCommission,
        pendingCommission,
        commissionCount: commissions.length,
        dailyStats,
        statusCounts,
        recentCommissions: commissions.slice(0, 10).map((c) => ({
          id: c.id,
          patientName: c.patientName ?? "",
          billAmount: Number(c.billAmount),
          commissionPercent: Number(c.commissionPercent),
          commissionAmount: Number(c.commissionAmount),
          status: c.status,
          createdAt: c.createdAt.toISOString(),
        })),
        recentActivities: (activities as any[]).slice(0, 20).map((a) => ({
          id: a.id,
          type: a.type,
          summary: a.summary,
          at: new Date(a.at).toISOString(),
        })),
      }),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load staff stats.";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
