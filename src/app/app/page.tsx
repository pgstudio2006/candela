import { auth } from "@/auth";
import type { CandelaRole } from "@/design-system/modules";
import { getWorkspace } from "@/design-system/workspace-config";
import { redirect } from "next/navigation";

export default async function AppIndex() {
  const session = await auth();
  if (session?.user?.role) {
    redirect(getWorkspace(session.user.role as CandelaRole).homePath);
  }
  redirect("/login");
}
