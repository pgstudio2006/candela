import { cn } from "@/lib/utils";

type CopilotMarkProps = {
  size?: number;
  active?: boolean;
  className?: string;
};

/**
 * Candela Copilot mark — nested flame triangles (brand-derived, not generic sparkles).
 */
export function CopilotMark({ size = 15, active = false, className }: CopilotMarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(
        "shrink-0",
        active ? "text-[var(--attio-text)]" : "text-[var(--attio-text-tertiary)]",
        className,
      )}
      aria-hidden
    >
      <path
        d="M8 1.5L13.5 14H2.5L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path
        d="M8 5.75L10.85 12.25H5.15L8 5.75Z"
        fill="#4285F4"
        className={cn("transition-opacity", active ? "opacity-100" : "opacity-70")}
      />
    </svg>
  );
}
