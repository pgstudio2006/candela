import { auth } from "@/auth";
import type { CandelaRole } from "@/design-system/modules";
import { getWorkspace } from "@/design-system/workspace-config";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function AppIndex() {
  const session = await auth();
  if (session?.user?.role) {
    redirect(getWorkspace(session.user.role as CandelaRole).homePath);
  }
  const cookieStore = await cookies();
  if (cookieStore.has("candela-auth-draft")) {
    redirect("/workspace");
  }
  redirect("/login");
}
