import { auth } from "@/auth";
import { db } from "@/lib/db";
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

  if (session.user.sessionToken) {
    const dbSession = await db.session.findFirst({
      where: {
        sessionToken: session.user.sessionToken,
        status: "ACTIVE",
        userId: session.user.id,
      },
    });
    if (!dbSession) {
      throw new ServerActionError("UNAUTHORIZED", "Your session has expired. Please sign in again.");
    }
  }

  return {
    userId: session.user.id,
    tenantId: session.user.tenantId,
    branchId: session.user.branchId,
    role: session.user.role,
    sessionToken: session.user.sessionToken,
  };
}
