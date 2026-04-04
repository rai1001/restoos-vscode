import { createBrowserClient } from "@supabase/ssr";

// Placeholder URL used during static export when env vars are absent.
// Pages pre-rendered at build time never actually call Supabase — they
// hydrate on the client where the real env vars are available.
const PLACEHOLDER_URL = "https://placeholder.supabase.co";
const PLACEHOLDER_KEY = "placeholder";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || PLACEHOLDER_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || PLACEHOLDER_KEY
  );
}
