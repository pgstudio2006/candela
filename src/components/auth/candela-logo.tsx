import { CandelaMark } from "@/components/candela/candela-mark";
import { cn } from "@/lib/utils";

type CandelaLogoProps = {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
};

const sizes = { sm: 32, md: 40, lg: 48 };

export function CandelaLogo({
  size = "md",
  showWordmark = true,
  className,
}: CandelaLogoProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      <CandelaMark size={sizes[size]} />
      {showWordmark && (
        <div className="text-center">
          <p className="text-lg font-semibold tracking-tight text-foreground">Candela</p>
          <p className="text-xs text-muted-foreground">by Adrine</p>
        </div>
      )}
    </div>
  );
}

export { CandelaBrand } from "@/components/candela/candela-mark";
