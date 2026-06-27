import { db } from "@/lib/db";
import { prisma } from "@/lib/prisma";
import type { StaffMember } from "@/design-system/admin-data";
import { validateAdminPassword, validateStaffInput } from "@/lib/admin-validation";
import { doctorIdFromStaffId, moduleRoleForStaffRole, type HealthcareStaffRole, generateStaffPassword } from "@/lib/healthcare-roles";
import {
  removeDoctorFromAllDepartments,
  syncDoctorToDepartments,
} from "@/server/admin/doctor-department-sync";
import type { ServerContext } from "@/server/context";
import { branchScope } from "@/server/tenancy";
import { ServerActionError } from "@/server/errors";
import { writePlatformAudit } from "@/server/platform-audit";
import { hashPassword } from "@/server/revenue/password";

function newStaffId() {
  return `st_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export { syncDoctorToDepartments } from "@/server/admin/doctor-department-sync";

export async function addStaffWithLogin(
  ctx: ServerContext,
  input: {
    staff: Omit<StaffMember, "id">;
    moduleRole?: string;
    password?: string;
  },
) {
  const scope = branchScope(ctx);
  const staffPayload = validateStaffInput({
    ...input.staff,
    branchId: scope.branchId,
  });
  if (staffPayload.role === "doctor" && !staffPayload.departmentIds.length) {
    throw new ServerActionError(
      "VALIDATION",
      "Assign at least one department when onboarding a doctor — this links their private OPD queue and dashboard.",
    );
  }

  const staffId = newStaffId();
  const roleKey = input.moduleRole ?? moduleRoleForStaffRole(staffPayload.role as HealthcareStaffRole);
  const initialPassword = input.password?.trim()
    ? validateAdminPassword(input.password)
    : generateStaffPassword();
  const email = staffPayload.email.trim().toLowerCase();
  const branchId = scope.branchId;

  const dup = await prisma.adminStaff.findFirst({ where: { email } });
  if (dup) {
    throw new ServerActionError(
      "CONFLICT",
      `A staff member with email ${email} already exists. Edit the existing record or use a different email.`,
    );
  }

  await prisma.adminStaff.create({
    data: {
      id: staffId,
      ...staffPayload,
      email,
      branchId,
    },
  });

  if (staffPayload.role === "doctor" && staffPayload.departmentIds.length) {
    await syncDoctorToDepartments(staffId, staffPayload.departmentIds);
  }

  const doctorId = staffPayload.role === "doctor" ? doctorIdFromStaffId(staffId) : undefined;

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
          name: staffPayload.name,
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
          name: staffPayload.name,
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

  // Create module-specific operator credentials for CRM, Counsellor, Pharmacy
  if (roleKey && email) {
    const passwordHashForOperator = await hashPassword(initialPassword);
    if (roleKey === "crm") {
      await prisma.crmOperatorCredential.upsert({
        where: { email },
        update: { name: staffPayload.name, active: true, passwordHash: passwordHashForOperator },
        create: {
          id: staffId,
          name: staffPayload.name,
          email,
          role: "executive",
          active: true,
          specialtyTags: [],
          passwordHash: passwordHashForOperator,
        },
      });
    } else if (roleKey === "counsellor") {
      await prisma.counsellorOperatorCredential.upsert({
        where: { email },
        update: { name: staffPayload.name, active: true, passwordHash: passwordHashForOperator },
        create: {
          id: staffId,
          name: staffPayload.name,
          email,
          role: "executive",
          active: true,
          passwordHash: passwordHashForOperator,
        },
      });
    } else if (roleKey === "pharmacy") {
      await prisma.pharmacyOperatorCredential.upsert({
        where: { email },
        update: { name: staffPayload.name, active: true, passwordHash: passwordHashForOperator },
        create: {
          id: staffId,
          name: staffPayload.name,
          email,
          role: "pharmacist",
          active: true,
          passwordHash: passwordHashForOperator,
        },
      });
    }
  }

  await writePlatformAudit({
    ctx,
    module: "admin",
    action: "staff_onboarded",
    entityType: "staff",
    entityId: staffId,
    summary: `Onboarded ${staffPayload.name}${roleKey ? ` with ${roleKey} login` : ""}`,
  });

  return {
    staffId,
    doctorId,
    loginEmail: email,
    initialPassword: roleKey ? initialPassword : undefined,
  };
}

export async function resetStaffLoginPassword(
  ctx: ServerContext,
  staffId: string,
  password?: string,
) {
  const scope = branchScope(ctx);
  const staff = await prisma.adminStaff.findFirst({
    where: { id: staffId, branchId: scope.branchId },
  });
  if (!staff) {
    throw new ServerActionError("NOT_FOUND", "Staff member not found in this branch.");
  }

  const roleKey = moduleRoleForStaffRole(staff.role as HealthcareStaffRole);
  if (!roleKey) {
    throw new ServerActionError("VALIDATION", "This staff role does not have a platform login.");
  }

  const email = staff.email.trim().toLowerCase();
  const initialPassword = password?.trim()
    ? validateAdminPassword(password)
    : generateStaffPassword();
  const passwordHash = await hashPassword(initialPassword);

  const tenantUser = await db.user.findFirst({
    where: { email, tenantId: scope.tenantId },
  });
  const role = await db.role.findFirst({
    where: { key: roleKey, tenantId: scope.tenantId },
  });

  if (!tenantUser) {
    const userId = `user_${staffId}`;
    await db.user.create({
      data: {
        id: userId,
        tenantId: scope.tenantId,
        branchId: scope.branchId,
        email,
        name: staff.name,
        passwordHash,
        status: "ACTIVE",
        activeRoleId: role?.id,
        userRoles: role
          ? {
              create: {
                roleId: role.id,
                branchId: scope.branchId,
              },
            }
          : undefined,
      },
    });
  } else {
    await db.user.update({
      where: { id: tenantUser.id },
      data: {
        name: staff.name,
        branchId: scope.branchId,
        passwordHash,
        status: "ACTIVE",
        activeRoleId: role?.id ?? tenantUser.activeRoleId,
      },
    });
    if (role) {
      const existingRole = await db.userRole.findFirst({
        where: { userId: tenantUser.id, roleId: role.id, branchId: scope.branchId },
      });
      if (!existingRole) {
        await db.userRole.create({
          data: {
            userId: tenantUser.id,
            roleId: role.id,
            branchId: scope.branchId,
          },
        });
      }
    }
  }

  // Update module-specific operator credentials for CRM, Counsellor, Pharmacy
  if (roleKey === "crm") {
    await prisma.crmOperatorCredential.upsert({
      where: { email },
      update: { name: staff.name, active: true, passwordHash },
      create: {
        id: staffId,
        name: staff.name,
        email,
        role: "executive",
        active: true,
        specialtyTags: [],
        passwordHash,
      },
    });
  } else if (roleKey === "counsellor") {
    await prisma.counsellorOperatorCredential.upsert({
      where: { email },
      update: { name: staff.name, active: true, passwordHash },
      create: {
        id: staffId,
        name: staff.name,
        email,
        role: "executive",
        active: true,
        passwordHash,
      },
    });
  } else if (roleKey === "pharmacy") {
    await prisma.pharmacyOperatorCredential.upsert({
      where: { email },
      update: { name: staff.name, active: true, passwordHash },
      create: {
        id: staffId,
        name: staff.name,
        email,
        role: "pharmacist",
        active: true,
        passwordHash,
      },
    });
  }

  await writePlatformAudit({
    ctx,
    module: "admin",
    action: "staff_password_reset",
    entityType: "staff",
    entityId: staffId,
    summary: `Reset login password for ${staff.name}`,
  });

  return { loginEmail: email, initialPassword };
}

/** Sync name/role/branch on linked User — never changes passwordHash. */
export async function syncStaffUserProfile(
  ctx: ServerContext,
  staff: { id: string; name: string; email: string; role: string },
) {
  const scope = branchScope(ctx);
  const email = staff.email.trim().toLowerCase();
  const roleKey = moduleRoleForStaffRole(staff.role as HealthcareStaffRole);
  if (!roleKey) return;

  const tenantUser = await db.user.findFirst({
    where: { email, tenantId: scope.tenantId },
  });
  if (!tenantUser) return;

  const role = await db.role.findFirst({
    where: { key: roleKey, tenantId: scope.tenantId },
  });

  await db.user.update({
    where: { id: tenantUser.id },
    data: {
      name: staff.name,
      branchId: scope.branchId,
      activeRoleId: role?.id ?? tenantUser.activeRoleId,
      status: "ACTIVE",
    },
  });

  if (role) {
    const existingRole = await db.userRole.findFirst({
      where: { userId: tenantUser.id, roleId: role.id, branchId: scope.branchId },
    });
    if (!existingRole) {
      await db.userRole.create({
        data: {
          userId: tenantUser.id,
          roleId: role.id,
          branchId: scope.branchId,
        },
      });
    }
  }
}

export async function removeStaffMember(ctx: ServerContext, staffId: string) {
  const scope = branchScope(ctx);
  const staff = await prisma.adminStaff.findFirst({
    where: {
      id: staffId,
      OR: [{ branchId: scope.branchId }, { branchId: "" }],
    },
  });
  if (!staff) {
    throw new ServerActionError("NOT_FOUND", "Staff member not found.");
  }

  const drId = staff.role === "doctor" ? doctorIdFromStaffId(staffId) : null;
  const email = staff.email.trim().toLowerCase();

  if (drId) {
    await removeDoctorFromAllDepartments(drId);
  }

  const departments = await prisma.adminDepartment.findMany();
  for (const dept of departments) {
    if (dept.headStaffId !== staffId) continue;
    await prisma.adminDepartment.update({
      where: { id: dept.id },
      data: { headStaffId: null },
    });
  }

  await prisma.adminStaff.delete({ where: { id: staffId } });

  const tenantUser = await db.user.findFirst({
    where: { email, tenantId: scope.tenantId },
  });
  if (tenantUser) {
    await db.session.updateMany({
      where: { userId: tenantUser.id, status: "ACTIVE" },
      data: { status: "REVOKED", revokedAt: new Date() },
    });
    await db.user.update({
      where: { id: tenantUser.id },
      data: { status: "INACTIVE" },
    });
  }
}
