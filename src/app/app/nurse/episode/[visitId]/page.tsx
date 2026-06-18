import { ExecutionWorkspace } from "@/components/nurse/execution-workspace";

export default async function NurseEpisodePage({ params }: { params: Promise<{ visitId: string }> }) {
  const { visitId } = await params;
  return <ExecutionWorkspace visitId={visitId} />;
}
