"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

function renderInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-[var(--attio-text)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
}

type Block =
  | { type: "p"; text: string }
  | { type: "h"; level: number; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

function parseBlocks(content: string): Block[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: Block[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flushList = () => {
    if (!list || list.items.length === 0) return;
    blocks.push(list.ordered ? { type: "ol", items: list.items } : { type: "ul", items: list.items });
    list = null;
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    const heading = trimmed.match(/^#{1,4}\s+(.+)$/);
    if (heading) {
      flushList();
      blocks.push({ type: "h", level: trimmed.match(/^#+/)![0].length, text: heading[1] });
      continue;
    }

    const bullet = trimmed.match(/^[-*•]\s+(.+)$/);
    if (bullet) {
      if (!list || list.ordered) {
        flushList();
        list = { ordered: false, items: [] };
      }
      list.items.push(bullet[1]);
      continue;
    }

    const ordered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (ordered) {
      if (!list || !list.ordered) {
        flushList();
        list = { ordered: true, items: [] };
      }
      list.items.push(ordered[1]);
      continue;
    }

    flushList();
    blocks.push({ type: "p", text: trimmed });
  }

  flushList();
  return blocks;
}

type MarkdownMessageProps = {
  content: string;
  className?: string;
};

export function MarkdownMessage({ content, className }: MarkdownMessageProps) {
  const blocks = parseBlocks(content);

  return (
    <div className={cn("space-y-2.5 text-[13px] leading-relaxed", className)}>
      {blocks.map((block, i) => {
        if (block.type === "h") {
          const Tag = block.level <= 2 ? "h3" : "h4";
          return (
            <Tag
              key={i}
              className={cn(
                "font-semibold text-[var(--attio-text)]",
                block.level <= 2 ? "text-[14px] mt-1" : "text-[13px]",
              )}
            >
              {renderInline(block.text)}
            </Tag>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={i} className="ml-4 list-disc space-y-1 marker:text-[var(--attio-text-tertiary)]">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        if (block.type === "ol") {
          return (
            <ol key={i} className="ml-4 list-decimal space-y-1 marker:text-[var(--attio-text-tertiary)]">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ol>
          );
        }
        return (
          <p key={i} className="text-[var(--attio-text-secondary)]">
            {renderInline(block.text)}
          </p>
        );
      })}
    </div>
  );
}
