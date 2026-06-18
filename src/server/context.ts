import { auth } from "@/auth";
import { ServerActionError } from "@/server/errors";

export type ServerContext = {
  userId: string;
  tenantId: string;
  branchId: string;
  role: string;
  sessionToken: string;
};

export async function getServerContext(): Promise<ServerContext> {
  const session = await auth();
  if (!session?.user) {
    throw new ServerActionError("UNAUTHORIZED", "Please sign in first.");
  }

  if (!session.user.tenantId || !session.user.branchId || !session.user.id) {
    throw new ServerActionError("INVALID_SESSION", "Session is missing tenant or branch context.");
  }

  return {
    userId: session.user.id,
    tenantId: session.user.tenantId,
    branchId: session.user.branchId,
    role: session.user.role,
    sessionToken: session.user.sessionToken,
  };
}
