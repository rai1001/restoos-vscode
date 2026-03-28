"use client";

import { useRef, useEffect, useState, type KeyboardEvent } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Sparkles, Trash2, ArrowUp, Bot } from "lucide-react";
import { useAssistant, type ChatMessage } from "../hooks/use-assistant";
import { cn } from "@/lib/utils";

interface AssistantPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QUICK_ACTIONS = [
  "Coste del gazpacho",
  "Analizar menu",
  "Que comprar?",
  "Escalar solomillo x50",
];

function formatTime(date: Date): string {
  return date.toLocaleTimeString("es-ES", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn("flex w-full mb-3", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5",
          isUser
            ? "bg-[#F97316]/20 text-[#FBBF7A]"
            : "bg-[#1A1A1A] text-[#E5E2E1]"
        )}
      >
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1">
            <Bot className="h-3 w-3 text-[#F97316]" />
            <span className="text-[10px] uppercase tracking-widest text-[#A78B7D]">
              RestoOS AI
            </span>
          </div>
        )}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </p>
        <span className="block text-[10px] text-[#A78B7D] mt-1.5 text-right">
          {formatTime(message.timestamp)}
        </span>
      </div>
    </div>
  );
}

function LoadingDots() {
  return (
    <div className="flex justify-start mb-3">
      <div className="bg-[#1A1A1A] rounded-2xl px-4 py-3 flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-[#F97316] animate-bounce [animation-delay:0ms]" />
        <span className="h-2 w-2 rounded-full bg-[#F97316] animate-bounce [animation-delay:150ms]" />
        <span className="h-2 w-2 rounded-full bg-[#F97316] animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export function AssistantPanel({ open, onOpenChange }: AssistantPanelProps) {
  const { messages, sendMessage, isLoading, clearHistory } = useAssistant();
  const [input, setInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOnlyWelcome = messages.length <= 1;

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [open]);

  function handleSend() {
    if (!input.trim() || isLoading) return;
    sendMessage(input.trim());
    setInput("");
    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleQuickAction(action: string) {
    sendMessage(action);
  }

  // Auto-resize textarea
  function handleInputChange(value: string) {
    setInput(value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full sm:w-[420px] sm:max-w-[420px] bg-[#0A0A0A] p-0 flex flex-col border-l-0"
      >
        {/* Header */}
        <SheetHeader className="px-5 pt-5 pb-3 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F97316]/15">
                <Sparkles className="h-4 w-4 text-[#F97316]" />
              </div>
              <div>
                <span className="block text-[10px] uppercase tracking-widest text-[#A78B7D] mb-0.5">
                  Asistente IA
                </span>
                <SheetTitle className="text-[#E5E2E1] text-base font-medium">
                  RestoOS Assistant
                </SheetTitle>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={clearHistory}
              title="Limpiar historial"
              className="text-[#A78B7D] hover:text-[#E5E2E1] hover:bg-[#1A1A1A] h-8 w-8"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </SheetHeader>

        {/* Separator line */}
        <div className="h-px bg-[#1A1A1A] mx-5" />

        {/* Chat area */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {messages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isLoading && <LoadingDots />}

          {/* Quick actions */}
          {isOnlyWelcome && !isLoading && (
            <div className="mt-4">
              <span className="block text-[10px] uppercase tracking-widest text-[#A78B7D] mb-3">
                Sugerencias
              </span>
              <div className="flex flex-wrap gap-2">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action}
                    onClick={() => handleQuickAction(action)}
                    className="rounded-full bg-[#1A1A1A] px-3.5 py-1.5 text-xs text-[#E5E2E1] hover:bg-[#F97316]/15 hover:text-[#F97316] transition-colors"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Input area */}
        <div className="shrink-0 px-5 pb-5 pt-3">
          <div className="h-px bg-[#1A1A1A] mb-3 -mx-5" />
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pregunta sobre costes, eventos, compras..."
              disabled={isLoading}
              rows={1}
              className="flex-1 resize-none bg-[#111] text-[#E5E2E1] text-sm placeholder:text-[#A78B7D]/50 rounded-xl px-4 py-2.5 border border-[#333] focus:border-[#F97316]/50 focus:outline-none disabled:opacity-50 max-h-[120px]"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="h-10 w-10 shrink-0 rounded-xl bg-[#F97316] hover:bg-[#F97316]/80 text-white disabled:opacity-30 disabled:bg-[#F97316]/30 border-0"
              size="icon"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
