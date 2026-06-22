import { db } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import type { StaffMember } from "@/design-system/admin-data";
import { validateAdminPassword } from "@/lib/admin-validation";
import { doctorIdFromStaffId, moduleRoleForStaffRole, type HealthcareStaffRole, generateStaffPassword } from "@/lib/healthcare-roles";
import type { ServerContext } from "@/server/context";
import { branchScope } from "@/server/tenancy";
import { ServerActionError } from "@/server/errors";
import { writePlatformAudit } from "@/server/platform-audit";
import { hashPassword } from "@/server/revenue/password";

function newStaffId() {
  return `st_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export async function syncDoctorToDepartments(staffId: string, departmentIds: string[]) {
  if (!departmentIds.length) return;
  const drId = doctorIdFromStaffId(staffId);
  for (const deptId of departmentIds) {
    const dept = await prisma.adminDepartment.findUnique({ where: { id: deptId } });
    if (!dept) continue;
    const doctorIds = Array.isArray(dept.doctorIds) ? [...dept.doctorIds] : [];
    if (!doctorIds.includes(drId)) {
      await prisma.adminDepartment.update({
        where: { id: deptId },
        data: { doctorIds: [...doctorIds, drId] },
      });
    }
  }
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
  if (input.staff.role === "doctor" && !input.staff.departmentIds.length) {
    throw new ServerActionError(
      "VALIDATION",
      "Assign at least one department when onboarding a doctor — this links their private OPD queue and dashboard.",
    );
  }

  const staffId = newStaffId();
  const roleKey = input.moduleRole ?? moduleRoleForStaffRole(input.staff.role as HealthcareStaffRole);
  const initialPassword = input.password?.trim()
    ? validateAdminPassword(input.password)
    : generateStaffPassword();
  const email = input.staff.email.trim().toLowerCase();
  const branchId = input.staff.branchId || scope.branchId;

  await prisma.adminStaff.create({
    data: {
      id: staffId,
      ...input.staff,
      email,
      branchId,
    },
  });

  if (input.staff.role === "doctor" && input.staff.departmentIds.length) {
    await syncDoctorToDepartments(staffId, input.staff.departmentIds);
  }

  const doctorId = input.staff.role === "doctor" ? doctorIdFromStaffId(staffId) : undefined;

  if (roleKey && email) {
    const tenantUser = await db.user.findFirst({
      where: { email, tenantId: scope.tenantId },
    });
    const passwordHash = await hashPassword(initialPassword);
    const role = await db.role.findFirst({
      where: { key: roleKey, tenantId: scope.tenantId },
    });

    if (!tenantUser) {
      const userId = `user_${staffId}`;
      await db.user.create({
        data: {
          id: userId,
          tenantId: scope.tenantId,
          branchId,
          email,
          name: input.staff.name,
          passwordHash,
          status: "ACTIVE",
          activeRoleId: role?.id,
          userRoles: role
            ? {
                create: {
                  roleId: role.id,
                  branchId,
                },
              }
            : undefined,
        },
      });
    } else {
      await db.user.update({
        where: { id: tenantUser.id },
        data: {
          name: input.staff.name,
          branchId,
          passwordHash: input.password?.trim() ? passwordHash : tenantUser.passwordHash,
          status: "ACTIVE",
          activeRoleId: role?.id ?? tenantUser.activeRoleId,
        },
      });
      if (role) {
        const existingRole = await db.userRole.findFirst({
          where: { userId: tenantUser.id, roleId: role.id, branchId },
        });
        if (!existingRole) {
          await db.userRole.create({
            data: {
              userId: tenantUser.id,
              roleId: role.id,
              branchId,
            },
          });
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

  return {
    staffId,
    doctorId,
    loginEmail: email,
    initialPassword: roleKey ? initialPassword : undefined,
  };
}
