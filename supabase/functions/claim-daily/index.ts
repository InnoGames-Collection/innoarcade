// @ts-nocheck — Deno Edge Function (Supabase). Not part of the Vite/Node build.
//
// claim-daily — award the daily-login XP streak (doc §3.1: day 1 = 5 XP …
// day 7+ = 50 XP, resets if a day is missed). Idempotent per day via the
// claim_daily_login() SQL function (service role). The hub calls this once on
// load for a signed-in player.
//
// Deploy: supabase functions deploy claim-daily

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'content-type': 'application/json' } });

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  const url = Deno.env.get('SUPABASE_URL')!;
  const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });
  const { data: u } = await userClient.auth.getUser();
  const user = u.user;
  if (!user) return json({ error: 'not signed in' }, 401);

  const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const { data: award, error } = await admin.rpc('claim_daily_login', { p_user: user.id });
  if (error) return json({ error: error.message }, 500);

  const { data: prof } = await admin.from('profiles').select('xp, xp_lifetime').eq('id', user.id).maybeSingle();
  return json({ award: Number(award ?? 0), xp: Number(prof?.xp ?? 0), lifetime: Number(prof?.xp_lifetime ?? 0) });
});
