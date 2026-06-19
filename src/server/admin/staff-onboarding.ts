// @ts-nocheck
import { hash } from "bcryptjs";
import { db } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import type { StaffMember } from "@/design-system/admin-data";
import { doctorIdFromStaffId, moduleRoleForStaffRole, type HealthcareStaffRole } from "@/lib/healthcare-roles";
import type { ServerContext } from "@/server/context";
import { branchScope } from "@/server/tenancy";
import { writePlatformAudit } from "@/server/platform-audit";

function newStaffId() {
  return `st_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export async function addStaffWithLogin(
  ctx: ServerContext,
  input: {
    staff: Omit<StaffMember, "id">;
    moduleRole?: string;
    password?: string;
  },
) {
  const scope = branchScope(ctx);
  const staffId = newStaffId();
  const roleKey = input.moduleRole ?? moduleRoleForStaffRole(input.staff.role as HealthcareStaffRole);

  await prisma.adminStaff.create({
    data: { id: staffId, ...input.staff },
  });

  if (roleKey && input.staff.email) {
    const tenantUser = await db.user.findFirst({
      where: { email: input.staff.email.toLowerCase(), tenantId: scope.tenantId },
    });

    const passwordHash = await hash(input.password ?? "Welcome2026!", 10);
    const role = await db.role.findFirst({
      where: { key: roleKey, tenantId: scope.tenantId },
    });

    if (!tenantUser) {
      const userId = `user_${staffId}`;
      await db.user.create({
        data: {
          id: userId,
          tenantId: scope.tenantId,
          branchId: input.staff.branchId || scope.branchId,
          email: input.staff.email.toLowerCase(),
          name: input.staff.name,
          passwordHash,
          status: "ACTIVE",
          activeRoleId: role?.id,
          userRoles: role
            ? {
                create: {
                  roleId: role.id,
                  branchId: input.staff.branchId || scope.branchId,
                },
              }
            : undefined,
        },
      });
    }

    if (input.staff.role === "doctor" && input.staff.departmentIds.length) {
      for (const deptId of input.staff.departmentIds) {
        const dept = await prisma.adminDepartment.findUnique({ where: { id: deptId } });
        if (dept) {
          const doctorIds = Array.isArray(dept.doctorIds) ? [...dept.doctorIds] : [];
          const drId = doctorIdFromStaffId(staffId);
          if (!doctorIds.includes(drId)) {
            await prisma.adminDepartment.update({
              where: { id: deptId },
              data: { doctorIds: [...doctorIds, drId] },
            });
          }
        }
      }
    }
  }

  await writePlatformAudit({
    ctx,
    module: "admin",
    action: "staff_onboarded",
    entityType: "staff",
    entityId: staffId,
    summary: `Onboarded ${input.staff.name}${roleKey ? ` with ${roleKey} login` : ""}`,
  });

  return { staffId };
}
