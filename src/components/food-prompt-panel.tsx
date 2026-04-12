"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Sparkles, Copy, Check, ThumbsUp, RefreshCw, ChefHat } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/db/client";

// ─── Design tokens (Calm Darkness) ───────────────────────────────────────────
const T = {
  card: "#1A1A1A",
  primary: "#B8906F",
  text: "#E5E2E1",
  secondary: "#A78B7D",
  muted: "#6B5B50",
  surface: "#242424",
  border: "#2A2A2A",
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

interface GeneratedPrompt {
  variante: string;
  prompt: string;
  angulo: string;
  estilo: string;
}

interface FoodPromptPanelProps {
  recipeId: string;
  hotelId: string;
  recipeName: string;
}

// ─── Single prompt card ───────────────────────────────────────────────────────

function PromptCard({
  prompt,
  index,
  onApprove,
  approved,
}: {
  prompt: GeneratedPrompt;
  index: number;
  onApprove: (idx: number) => void;
  approved: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(prompt.prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Prompt copiado");
  };

  return (
    <div
      style={{
        background: approved ? `${T.primary}15` : T.surface,
        border: `1px solid ${approved ? T.primary : T.border}`,
        borderRadius: 8,
        padding: 16,
        transition: "all 0.2s",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            style={{
              background: T.primary,
              color: "#000",
              fontSize: 10,
              fontWeight: 700,
              padding: "2px 8px",
              borderRadius: 4,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {prompt.variante}
          </span>
          <span style={{ fontSize: 11, color: T.muted }}>
            {prompt.angulo} · {prompt.estilo}
          </span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={handleCopy}
            style={{
              background: "transparent",
              border: `1px solid ${T.border}`,
              borderRadius: 6,
              padding: "4px 8px",
              cursor: "pointer",
              color: copied ? T.primary : T.secondary,
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 12,
              transition: "all 0.15s",
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? "Copiado" : "Copiar"}
          </button>
          {!approved && (
            <button
              onClick={() => onApprove(index)}
              style={{
                background: "transparent",
                border: `1px solid ${T.border}`,
                borderRadius: 6,
                padding: "4px 8px",
                cursor: "pointer",
                color: T.secondary,
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 12,
                transition: "all 0.15s",
              }}
            >
              <ThumbsUp size={12} />
              Aprobar
            </button>
          )}
          {approved && (
            <span style={{ fontSize: 12, color: T.primary, display: "flex", alignItems: "center", gap: 4 }}>
              <Check size={12} />
              Aprobado
            </span>
          )}
        </div>
      </div>

      {/* Prompt text */}
      <p
        style={{
          fontSize: 13,
          color: T.text,
          lineHeight: 1.6,
          fontFamily: "monospace",
          background: T.card,
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          padding: "10px 12px",
          margin: 0,
          wordBreak: "break-word",
        }}
      >
        {prompt.prompt}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function FoodPromptPanel({ recipeId, hotelId, recipeName }: FoodPromptPanelProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState<GeneratedPrompt[]>([]);
  const [generationId, setGenerationId] = useState("");
  const [approvedIdx, setApprovedIdx] = useState<number | null>(null);

  const supabase = createClient();

  const generate = useCallback(async () => {
    setLoading(true);
    setPrompts([]);
    setApprovedIdx(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/agent-foodprompt`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            recipe_id: recipeId,
            hotel_id: hotelId,
          }),
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Error generando prompts");
      }

      const data = await res.json();
      setPrompts(data.prompts ?? []);
      setGenerationId(data.generation_id ?? "");
    } catch (e) {
      toast.error((e as Error).message ?? "Error al generar prompts");
    } finally {
      setLoading(false);
    }
  }, [recipeId, hotelId, supabase]);

  const handleApprove = useCallback(async (idx: number) => {
    setApprovedIdx(idx);

    if (generationId) {
      await supabase
        .from("prompt_generations")
        .update({ aprobado_idx: idx })
        .eq("id", generationId);
    }

    const approved = prompts[idx];
    if (!approved) return;

    const combos = [
      { categoria: "angulo", valor: approved.angulo },
      { categoria: "estilo", valor: approved.estilo },
    ].filter(c => Boolean(c.valor));

    for (const combo of combos) {
      await supabase.rpc("upsert_hotel_prompt_pref", {
        p_hotel_id: hotelId,
        p_categoria: combo.categoria,
        p_valor: combo.valor,
      });
    }

    toast.success("Preferencia guardada — el sistema aprende de tu elección");
  }, [generationId, prompts, hotelId, supabase]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && prompts.length === 0 && !loading) {
      generate();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <button
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "8px 14px",
              borderRadius: 8,
              border: `1px solid ${T.muted}50`,
              background: T.surface,
              color: T.secondary,
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          />
        }
      >
        <Sparkles size={14} />
        Generar foto IA
      </DialogTrigger>

      <DialogContent
        style={{
          background: T.card,
          border: `1px solid ${T.border}`,
          color: T.text,
          maxWidth: 640,
          maxHeight: "85vh",
          overflowY: "auto",
        }}
      >
        <DialogHeader>
          <DialogTitle
            style={{ color: T.text, display: "flex", alignItems: "center", gap: 8 }}
          >
            <ChefHat size={18} style={{ color: T.primary }} />
            FoodPrompt — {recipeName}
          </DialogTitle>
          <p style={{ fontSize: 12, color: T.muted, marginTop: 4 }}>
            Prompts para Midjourney v6 personalizados con el estilo de tu local
          </p>
        </DialogHeader>

        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          {loading && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
                padding: "32px 0",
                color: T.secondary,
              }}
            >
              <Sparkles size={28} style={{ color: T.primary }} />
              <p style={{ fontSize: 13 }}>Generando prompts para {recipeName}...</p>
              <p style={{ fontSize: 11, color: T.muted }}>Claude Haiku · ~5 segundos</p>
            </div>
          )}

          {!loading && prompts.length > 0 && (
            <>
              <p style={{ fontSize: 12, color: T.muted }}>
                Aprueba el que mejor se adapte a tu local — el sistema aprenderá para la próxima generación.
              </p>
              {prompts.map((p, i) => (
                <PromptCard
                  key={i}
                  prompt={p}
                  index={i}
                  onApprove={handleApprove}
                  approved={approvedIdx === i}
                />
              ))}

              <button
                onClick={generate}
                style={{
                  background: "transparent",
                  border: "none",
                  color: T.muted,
                  fontSize: 12,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 0",
                }}
              >
                <RefreshCw size={12} />
                Nueva variación
              </button>
            </>
          )}

          {!loading && prompts.length === 0 && (
            <div style={{ textAlign: "center", padding: "24px 0", color: T.muted }}>
              <p style={{ fontSize: 13 }}>No se generaron prompts.</p>
              <button
                onClick={generate}
                style={{
                  marginTop: 12,
                  background: "transparent",
                  border: `1px solid ${T.border}`,
                  borderRadius: 6,
                  padding: "6px 12px",
                  color: T.secondary,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                Reintentar
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
