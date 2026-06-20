"use server";

import { prisma } from "@/lib/prisma";
import { SEED_AGENT_PASSWORDS } from "@/lib/crm-auth";
import { SEED_STAFF_PASSWORDS } from "@/lib/pharmacy-auth";
import { defaultCounsellorState, defaultCrmState, defaultPharmacyState } from "@/server/revenue/state-seeds";
import { hashPassword, verifyPassword } from "@/server/revenue/password";

let bootstrapped = false;

export async function ensureRevenueSeeded() {
  if (bootstrapped) return;

  const [pharmacyCredentialCount, crmCredentialCount, counsellorCredentialCount] = await Promise.all([
    prisma.pharmacyOperatorCredential.count(),
    prisma.crmOperatorCredential.count(),
    prisma.counsellorOperatorCredential.count(),
  ]);

  if (pharmacyCredentialCount === 0) {
    const [pharmaHash, opdHash, purchaseHash] = await Promise.all([
      hashPassword("pharma2026"),
      hashPassword("opd2026"),
      hashPassword("purchase2026"),
    ]);
    await prisma.pharmacyOperatorCredential.createMany({
      data: [
        {
          id: "phm_mgr",
          name: "Pharmacy Manager",
          email: "pharmacy@navayu.in",
          role: "manager",
          active: true,
          licenseNo: "DL-GJ-12345",
          passwordHash: pharmaHash,
        },
        {
          id: "phm_opd",
          name: "Kavita Nair",
          email: "opd@navayu.in",
          role: "opd",
          active: true,
          licenseNo: "DL-GJ-67890",
          passwordHash: opdHash,
        },
        {
          id: "phm_pur",
          name: "Rajesh Patel",
          email: "purchase@navayu.in",
          role: "purchase",
          active: true,
          licenseNo: "DL-GJ-11223",
          passwordHash: purchaseHash,
        },
      ],
      skipDuplicates: true,
    });
  }

  if (crmCredentialCount === 0) {
    const [crmHash, priyaHash, anitaHash, rahulHash] = await Promise.all([
      hashPassword("crm2026"),
      hashPassword("priya2026"),
      hashPassword("anita2026"),
      hashPassword("rahul2026"),
    ]);
    await prisma.crmOperatorCredential.createMany({
      data: [
        {
          id: "crm_mgr",
          name: "CRM Manager",
          email: "crm@navayu.in",
          role: "manager",
          active: true,
          specialtyTags: [],
          maxOpenLeads: 999,
          leadWeightPct: 0,
          passwordHash: crmHash,
        },
        {
          id: "ag_priya",
          name: "Priya Sharma",
          email: "priya@navayu.in",
          role: "counsellor",
          active: true,
          specialtyTags: ["spine", "knee"],
          maxOpenLeads: 25,
          backupAgentId: "ag_anita",
          leadWeightPct: 40,
          passwordHash: priyaHash,
        },
        {
          id: "ag_anita",
          name: "Anita Desai",
          email: "anita@navayu.in",
          role: "counsellor",
          active: true,
          specialtyTags: ["shoulder", "wellness"],
          maxOpenLeads: 25,
          backupAgentId: "ag_priya",
          leadWeightPct: 35,
          passwordHash: anitaHash,
        },
        {
          id: "ag_rahul",
          name: "Rahul Verma",
          email: "rahul@navayu.in",
          role: "caller",
          active: true,
          specialtyTags: [],
          maxOpenLeads: 40,
          backupAgentId: "ag_priya",
          leadWeightPct: 25,
          passwordHash: rahulHash,
        },
      ],
      skipDuplicates: true,
    });
  }

  await Promise.all(
    Object.entries(SEED_AGENT_PASSWORDS).map(async ([id, plain]) => {
      const cred = await prisma.crmOperatorCredential.findUnique({ where: { id } });
      if (!cred || (await verifyPassword(plain, cred.passwordHash))) return;
      if (!(await verifyPassword("welcome123", cred.passwordHash))) return;
      await prisma.crmOperatorCredential.update({
        where: { id },
        data: { passwordHash: await hashPassword(plain) },
      });
    }),
  );

  if (counsellorCredentialCount === 0) {
    const [priyaCounsellorHash, anitaCounsellorHash] = await Promise.all([
      hashPassword("priya2026"),
      hashPassword("anita2026"),
    ]);
    await prisma.counsellorOperatorCredential.createMany({
      data: [
        {
          id: "counsellor_1",
          name: "Priya Sharma",
          email: "priya@navayu.in",
          role: "counsellor",
          active: true,
          passwordHash: priyaCounsellorHash,
        },
        {
          id: "counsellor_2",
          name: "Anita Desai",
          email: "anita@navayu.in",
          role: "counsellor",
          active: true,
          passwordHash: anitaCounsellorHash,
        },
      ],
      skipDuplicates: true,
    });
  }

  const [pharmacyState, counsellorState, crmState] = await Promise.all([
    prisma.pharmacyWorkspaceState.findUnique({ where: { id: "default" } }),
    prisma.counsellorWorkspaceState.findUnique({ where: { id: "default" } }),
    prisma.crmWorkspaceState.findUnique({ where: { id: "default" } }),
  ]);

  if (!pharmacyState) {
    await prisma.pharmacyWorkspaceState.create({
      data: {
        id: "default",
        payload: defaultPharmacyState({ ...SEED_STAFF_PASSWORDS }),
      },
    });
  }

  if (!counsellorState) {
    await prisma.counsellorWorkspaceState.create({
      data: { id: "default", payload: defaultCounsellorState() },
    });
  }

  if (!crmState) {
    await prisma.crmWorkspaceState.create({
      data: {
        id: "default",
        payload: defaultCrmState({ ...SEED_AGENT_PASSWORDS }),
      },
    });
  }

  const webhookCount = await prisma.crmWebhookConfig.count();
  if (webhookCount === 0) {
    const seeded = defaultCrmState({ ...SEED_AGENT_PASSWORDS }).integrations;
    await prisma.crmWebhookConfig.createMany({
      data: seeded.map((item) => ({
        id: item.id,
        label: item.label,
        description: item.description,
        icon: item.icon,
        connected: item.connected,
        webhookUrl: item.webhookUrl,
        lastEventAt: item.lastEventAt,
        leadsToday: item.leadsToday,
      })),
      skipDuplicates: true,
    });
  }

  bootstrapped = true;
}
