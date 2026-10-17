import type { SupabaseClient } from "npm:@supabase/supabase-js@2.57.4";

const encoder = new TextEncoder();

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(text));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function validateAdminToken(supabase: SupabaseClient, token: string): Promise<boolean> {
  if (!token) return false;
  const { data } = await supabase
    .from("admin_sessions").select("id, expires_at").eq("token", await sha256(token)).maybeSingle();
  return Boolean(data && new Date(data.expires_at) > new Date());
}
