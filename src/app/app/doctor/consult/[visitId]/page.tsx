"use client";

import { ConsultationWorkspace } from "@/components/doctor/consultation-workspace";
import { useParams } from "next/navigation";

export default function DoctorConsultPage() {
  const params = useParams();
  const visitId = params.visitId as string;
  return <ConsultationWorkspace visitId={visitId} />;
}
