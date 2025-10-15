// lib/supabaseClient.js
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Guardrails: helpful errors if envs are missing
if (!supabaseUrl) {
  // Don't crash build, but log a clear hint in the console
  console.warn("NEXT_PUBLIC_SUPABASE_URL is not set");
}
if (!supabaseAnonKey) {
  console.warn("NEXT_PUBLIC_SUPABASE_ANON_KEY is not set");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce", // recommended for browser apps
  },
});
