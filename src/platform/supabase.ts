// Supabase client, created lazily from public env vars (VITE_SUPABASE_URL /
// VITE_SUPABASE_ANON_KEY). The @supabase/supabase-js package is dynamically
// imported on first use so the hub and game shells can paint before ~180KB of SDK
// is downloaded. When env vars aren't set the backend layer stays dormant.
//
// The anon key is meant to be public; security is enforced server-side by RLS
// and Edge Functions. The service_role key must NEVER reach the frontend.

import type { SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;
let clientPromise: Promise<SupabaseClient> | null = null;

export function isConfigured(): boolean {
  return Boolean(url && anonKey);
}

/** Load the SDK chunk and return the singleton client. Safe to call repeatedly. */
export async function getSupabase(): Promise<SupabaseClient> {
  if (client) return client;
  if (!isConfigured()) {
    throw new Error('Supabase is not configured (missing VITE_SUPABASE_* env vars)');
  }
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js').then(({ createClient }) => {
      client = createClient(url!, anonKey!, {
        auth: { persistSession: true, autoRefreshToken: true },
      });
      return client;
    });
  }
  return clientPromise;
}

/** Sync accessor — only valid after {@link getSupabase} has resolved at least once. */
export function supabase(): SupabaseClient {
  if (!client) {
    throw new Error('Supabase not ready — await getSupabase() first');
  }
  return client;
}

export type { SupabaseClient };
