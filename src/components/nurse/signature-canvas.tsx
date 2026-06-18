"use client";

import { cn } from "@/lib/utils";
import { Eraser } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

type SignatureCanvasProps = {
  onCapture: (dataUrl: string) => void;
  className?: string;
};

export function SignatureCanvas({ onCapture, className }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const getPoint = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.MouseEvent | React.TouchEvent) => {
    drawing.current = true;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPoint(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPoint(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const end = () => {
    drawing.current = false;
    const canvas = canvasRef.current;
    if (canvas) onCapture(canvas.toDataURL("image/png"));
  };

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onCapture("");
  }, [onCapture]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#1b1b1b";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
  }, []);

  return (
    <div className={cn("relative rounded-lg border border-[var(--attio-border)] bg-white", className)}>
      <canvas
        ref={canvasRef}
        width={480}
        height={160}
        className="w-full touch-none"
        onMouseDown={start}
        onMouseMove={draw}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={draw}
        onTouchEnd={end}
      />
      <button
        type="button"
        onClick={clear}
        className="absolute right-2 top-2 flex items-center gap-1 rounded-md border border-[var(--attio-border)] bg-white px-2 py-1 text-[11px] text-[var(--attio-text-secondary)] hover:bg-[var(--attio-surface)]"
      >
        <Eraser className="size-3" />
        Clear
      </button>
      <p className="border-t border-[var(--attio-border-subtle)] px-3 py-2 text-[10px] text-[var(--attio-text-tertiary)]">
        Sign with finger or stylus · Patient or guardian
      </p>
    </div>
  );
}
