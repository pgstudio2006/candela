"use client";

import { SessionWorkspace } from "@/components/counsellor/session-workspace";
import { useParams } from "next/navigation";

export default function CounsellorSessionPage() {
  const params = useParams();
  return <SessionWorkspace visitId={params.visitId as string} />;
}
