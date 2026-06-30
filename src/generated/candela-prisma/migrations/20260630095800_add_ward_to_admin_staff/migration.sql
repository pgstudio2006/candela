-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "uhid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "age" INTEGER NOT NULL,
    "gender" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "balance" REAL NOT NULL DEFAULT 0,
    "lastVisit" TEXT,
    "referrer" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "OpdVisit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientId" TEXT NOT NULL,
    "token" INTEGER,
    "stage" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "doctorName" TEXT NOT NULL,
    "billing" TEXT NOT NULL,
    "exam" TEXT NOT NULL,
    "appointment" BOOLEAN NOT NULL,
    "appointmentTime" TEXT,
    "waitMin" INTEGER NOT NULL DEFAULT 0,
    "checkInAt" TEXT,
    "billAmount" REAL,
    "amountPaid" REAL,
    "balanceDue" REAL,
    "treatmentPath" TEXT,
    "ipdAdmissionId" TEXT,
    "counselPackageLabel" TEXT,
    "deferredReason" TEXT,
    "routingNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "layout" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL,
    "isSystem" BOOLEAN NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HrDepartment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "headId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HrEmployee" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "designation" TEXT NOT NULL,
    "managerId" TEXT,
    "joinDate" TEXT NOT NULL,
    "employmentType" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "role" TEXT NOT NULL,
    "crmAgentId" TEXT,
    "salaryMonthly" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HrShift" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HrLeaveRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromDate" TEXT NOT NULL,
    "toDate" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestedAt" TEXT NOT NULL,
    "resolvedAt" TEXT,
    "approverId" TEXT,
    "syncCrmAbsence" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HrAttendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "checkIn" TEXT,
    "checkOut" TEXT,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HrPayrollLine" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "employeeId" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "basic" REAL NOT NULL,
    "allowances" REAL NOT NULL,
    "deductions" REAL NOT NULL,
    "net" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HrCredential" (
    "employeeId" TEXT NOT NULL PRIMARY KEY,
    "password" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "HrSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "autoCrmSync" BOOLEAN NOT NULL DEFAULT true,
    "leaveApprovalNotify" BOOLEAN NOT NULL DEFAULT true,
    "attendanceReminder" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CrmAgent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "specialtyTags" JSONB NOT NULL,
    "maxOpenLeads" INTEGER NOT NULL,
    "unavailableUntil" TEXT,
    "unavailableReason" TEXT,
    "backupAgentId" TEXT,
    "leadWeightPercent" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CrmLead" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "assigneeId" TEXT,
    "source" TEXT NOT NULL,
    "valueEstimate" REAL NOT NULL,
    "priority" TEXT NOT NULL,
    "tags" JSONB NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TEXT NOT NULL,
    "updatedAt" TEXT NOT NULL,
    "convertedVisitId" TEXT,
    "lostReason" TEXT,
    "createdOn" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedOn" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdminStaff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "departmentIds" JSONB NOT NULL,
    "branchId" TEXT NOT NULL,
    "licenseNo" TEXT,
    "onDuty" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TEXT NOT NULL,
    "ward" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdminDepartment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "headStaffId" TEXT,
    "doctorIds" JSONB NOT NULL,
    "defaultPackageIds" JSONB NOT NULL,
    "revenuePolicyId" TEXT,
    "bays" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdminDiseaseNode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "icd" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "templateId" TEXT,
    "packageIds" JSONB NOT NULL,
    "consentTemplateIds" JSONB NOT NULL,
    "billingTemplateId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdminGeoPin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "pincode" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "patientCount" INTEGER NOT NULL,
    "opdCount" INTEGER NOT NULL,
    "ipdCount" INTEGER NOT NULL,
    "revenue" REAL NOT NULL,
    "topDiagnosis" TEXT NOT NULL,
    "severity" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdminDiseaseCluster" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "locality" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lng" REAL NOT NULL,
    "caseCount" INTEGER NOT NULL,
    "severity" TEXT NOT NULL,
    "topDisease" TEXT NOT NULL,
    "surgePercent" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdminExpense" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "date" TEXT NOT NULL,
    "vendor" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdminRevenuePolicy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "departmentId" TEXT NOT NULL,
    "doctorId" TEXT,
    "opdConsultPercent" REAL NOT NULL,
    "packageNetPercent" REAL NOT NULL,
    "ipdDayFixed" REAL NOT NULL,
    "appliesToPartial" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdminMrdRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "patientName" TEXT NOT NULL,
    "uhid" TEXT NOT NULL,
    "requestType" TEXT NOT NULL,
    "requestedAt" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "slaDue" TEXT NOT NULL,
    "documents" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdminMisReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "schedule" TEXT NOT NULL,
    "lastRun" TEXT,
    "format" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdminSetting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kAnonymityMin" INTEGER NOT NULL,
    "geoAggregateOnly" BOOLEAN NOT NULL,
    "auditRetentionYears" INTEGER NOT NULL,
    "outbreakAlerts" BOOLEAN NOT NULL,
    "autoMisDaily" BOOLEAN NOT NULL,
    "whatsappConsentFlag" BOOLEAN NOT NULL,
    "resolvedLeakageIds" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "FormSchemaOverride" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "schemaId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "at" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Patient_uhid_key" ON "Patient"("uhid");

-- CreateIndex
CREATE UNIQUE INDEX "HrEmployee_email_key" ON "HrEmployee"("email");

-- CreateIndex
CREATE UNIQUE INDEX "CrmAgent_email_key" ON "CrmAgent"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AdminStaff_email_key" ON "AdminStaff"("email");

-- CreateIndex
CREATE UNIQUE INDEX "FormSchemaOverride_schemaId_key" ON "FormSchemaOverride"("schemaId");
