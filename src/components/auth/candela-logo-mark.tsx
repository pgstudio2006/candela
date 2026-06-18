import { CandelaMark } from "@/components/candela/candela-mark";
import { cn } from "@/lib/utils";

type CandelaLogoMarkProps = {
  size?: number;
  className?: string;
  showWordmark?: boolean;
};

export function CandelaLogoMark({
  size = 48,
  className,
  showWordmark = false,
}: CandelaLogoMarkProps) {
  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <CandelaMark size={size} />
      {showWordmark && (
        <div className="text-center">
          <p className="text-lg font-semibold tracking-tight">Candela</p>
          <p className="text-xs text-zinc-500">by Adrine</p>
        </div>
      )}
    </div>
  );
}
