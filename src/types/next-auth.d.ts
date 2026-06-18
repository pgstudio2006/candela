import type { DefaultSession } from "next-auth";
import type { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      tenantId: string;
      tenantSlug: string;
      tenantName: string;
      branchId: string;
      branchName: string;
      role: string;
      sessionToken: string;
    };
  }

  interface User {
    id: string;
    tenantId: string;
    tenantSlug: string;
    tenantName: string;
    branchId: string;
    branchName: string;
    role: string;
    sessionToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    tenantId?: string;
    tenantSlug?: string;
    tenantName?: string;
    branchId?: string;
    branchName?: string;
    role?: string;
    sessionToken?: string;
  }
}

export {};
