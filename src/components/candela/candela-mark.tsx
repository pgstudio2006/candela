import { cn } from "@/lib/utils";

type CandelaMarkProps = {
  size?: number;
  className?: string;
};

/** Candela brand mark — nested blue triangles */
export function CandelaMark({ size = 24, className }: CandelaMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden
    >
      <path d="M24 6L42 40H6L24 6Z" fill="#4285F4" />
      <path d="M24 16L34 36H14L24 16Z" fill="#7BAAF7" />
    </svg>
  );
}

type CandelaBrandProps = {
  showName?: boolean;
  name?: string;
  className?: string;
  iconSize?: number;
};

export function CandelaBrand({
  showName = true,
  name = "Candela",
  className,
  iconSize = 22,
}: CandelaBrandProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-2", className)}>
      <CandelaMark size={iconSize} />
      {showName && (
        <span className="truncate text-[14px] font-semibold tracking-[-0.01em] text-[var(--attio-text)]">
          {name}
        </span>
      )}
    </div>
  );
}
