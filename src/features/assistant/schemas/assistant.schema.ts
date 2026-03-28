import { z } from "zod";

// --- Chat Message ---
export const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  timestamp: z.string(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// --- Chat Request ---
export const ChatRequestSchema = z.object({
  message: z.string().min(1),
  context: z
    .object({
      recipeId: z.string().optional(),
      eventId: z.string().optional(),
    })
    .optional(),
});
export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// --- Chat Response ---
export const ChatResponseSchema = z.object({
  reply: z.string(),
  data: z.any().optional(),
  action: z.string().optional(),
});
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
