// Phone-number / OTP authentication — the natural identity for a telecom-served
// platform (the SIM is the account). Wraps Supabase Auth's OTP flow:
//   requestOtp(phone)  → Supabase sends a one-time code by SMS
//   verifyOtp(phone, code) → exchanges the code for a session
// The telecom can later route the SMS through their own gateway via Supabase's
// custom SMS provider hook without changing this file.
//
// Until Supabase is configured these are inert and the platform treats the user
// as an anonymous local player (see profile/tournaments fallbacks).

import { isConfigured, supabase } from './supabase';

export interface AuthUser {
  id: string;
  phone: string;
  name: string;
}

export function authAvailable(): boolean {
  return isConfigured();
}

// DEV/DEMO only: when there is no SMS gateway, the send-sms hook (mock mode)
// writes each OTP to a public `dev_otps` table; with VITE_DEV_OTP_ECHO=true the
// sign-in UI fetches it and shows the code on screen, so any phone can sign in
// without real SMS. Always false in production (flag unset) — see supabase/dev.sql.
export function devOtpEcho(): boolean {
  return isConfigured() && import.meta.env.VITE_DEV_OTP_ECHO === 'true';
}

// Read the demo OTP for a phone (the most recent code the hook stored). Polls a
// few times because the auth hook fires a beat after signInWithOtp returns.
export async function fetchDevOtp(phone: string): Promise<string | null> {
  if (!devOtpEcho()) return null;
  const p = normalizePhone(phone);
  for (let i = 0; i < 8; i++) {
    try {
      const { data } = await supabase()
        .from('dev_otps').select('code, created_at').eq('phone', p).maybeSingle();
      if (data?.code) return String(data.code);
    } catch { /* table may not exist in a hardened deploy — just stop echoing */ return null; }
    await new Promise((r) => setTimeout(r, 600));
  }
  return null;
}

// Synchronous "is a user signed in" cache, kept fresh by currentUser() and
// onAuthChange(). Lets the wallet / payments / tournament modules choose the
// server path only for authenticated users (anonymous players stay on the local
// guest wallet, even when Supabase is configured) without an async hop.
let cachedUser: AuthUser | null = null;
export function isSignedIn(): boolean {
  return cachedUser !== null;
}

// Normalize to E.164-ish (Ethiopia default +251) so users can type 09… locally.
export function normalizePhone(input: string): string {
  let s = input.replace(/[^\d+]/g, '');
  if (s.startsWith('0')) s = '+251' + s.slice(1);
  else if (!s.startsWith('+')) s = '+' + s;
  return s;
}

export async function requestOtp(phone: string): Promise<void> {
  const { error } = await supabase().auth.signInWithOtp({ phone: normalizePhone(phone) });
  if (error) throw error;
}

export async function verifyOtp(phone: string, code: string): Promise<AuthUser> {
  const { data, error } = await supabase().auth.verifyOtp({
    phone: normalizePhone(phone),
    token: code.trim(),
    type: 'sms',
  });
  if (error) throw error;
  const u = data.user!;
  return { id: u.id, phone: u.phone ?? '', name: (u.user_metadata?.name as string) ?? '' };
}

export async function currentUser(): Promise<AuthUser | null> {
  if (!isConfigured()) return null;
  const { data } = await supabase().auth.getUser();
  const u = data.user;
  cachedUser = u ? { id: u.id, phone: u.phone ?? '', name: (u.user_metadata?.name as string) ?? '' } : null;
  return cachedUser;
}

export async function setDisplayName(name: string): Promise<void> {
  const { error } = await supabase().auth.updateUser({ data: { name: name.trim().slice(0, 24) } });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  if (isConfigured()) await supabase().auth.signOut();
}

// Subscribe to sign-in/out; returns an unsubscribe function.
export function onAuthChange(fn: (user: AuthUser | null) => void): () => void {
  if (!isConfigured()) return () => {};
  const { data } = supabase().auth.onAuthStateChange((_e, session) => {
    const u = session?.user;
    cachedUser = u ? { id: u.id, phone: u.phone ?? '', name: (u.user_metadata?.name as string) ?? '' } : null;
    fn(cachedUser);
  });
  return () => data.subscription.unsubscribe();
}
