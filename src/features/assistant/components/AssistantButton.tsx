"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssistantButtonProps {
  onClick: () => void;
  collapsed?: boolean;
}

export function AssistantButton({ onClick, collapsed }: AssistantButtonProps) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? "Asistente IA" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md py-2 text-sm font-medium transition-colors text-[#F97316] hover:bg-[#F97316]/10",
        collapsed ? "justify-center px-0 w-10 mx-auto" : "px-3 w-full"
      )}
    >
      <span className="relative shrink-0">
        <Sparkles className="h-4 w-4" />
        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-[#F97316] animate-pulse" />
      </span>
      {!collapsed && <span>Asistente IA</span>}
    </button>
  );
}
