"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function GlassIconField({
  icon: Icon,
  type = "text",
  placeholder,
  defaultValue,
  value,
  onChange,
  autoComplete,
  id,
  trailing,
}: {
  icon: LucideIcon;
  type?: string;
  placeholder: string;
  defaultValue?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  autoComplete?: string;
  id?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="relative">
      <Icon className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
      <Input
        id={id}
        type={type}
        placeholder={placeholder}
        defaultValue={defaultValue}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className={cn(
          "h-12 rounded-2xl border-0 bg-white/65 pl-11 pr-11 text-[15px] text-zinc-800 shadow-sm",
          "placeholder:text-zinc-400",
          "focus-visible:border-0 focus-visible:bg-white/80 focus-visible:ring-2 focus-visible:ring-zinc-900/10",
        )}
      />
      {trailing && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">{trailing}</div>
      )}
    </div>
  );
}

export const glassCardClass = cn(
  "w-full rounded-[28px] p-8 sm:p-9",
  "border border-white/70 bg-white/40 shadow-[0_24px_80px_rgba(15,23,42,0.12)]",
  "backdrop-blur-2xl backdrop-saturate-150",
);

export const glassInnerCardClass = cn(
  "rounded-2xl border border-white/60 bg-white/45 p-4 shadow-sm",
  "transition-all hover:border-white/80 hover:bg-white/55 hover:shadow-md",
);

export const glassButtonClass = cn(
  "h-12 w-full rounded-2xl border-0 text-[15px] font-medium",
  "bg-zinc-900 text-white shadow-lg shadow-zinc-900/20",
  "hover:bg-zinc-800",
);
