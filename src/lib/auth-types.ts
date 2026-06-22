export type AuthDraft = {
  tenantId: string;
  tenantName: string;
  branchId?: string;
  branchName?: string;
};

export type CandelaClientSession = {
  tenant: string;
  tenantName: string;
  branchId: string;
  branchName: string;
  role: import("@/design-system/modules").CandelaRole;
  userName: string;
  userEmail: string;
  crmOperatorId?: string;
  pharmacyOperatorId?: string;
  hrOperatorId?: string;
};
