// POST /functions/v1/identify   { imageBase64, mediaType }
//
// 1. Verifies the caller's Supabase session (anonymous users are fine).
// 2. Picks the identification provider from server env (IDENTIFIER_PROVIDER).
// 3. Counts the attempt against the daily limit (admins are unlimited).
// 4. Calls the provider, stores its answer, and returns it.
//
// Secrets (ANTHROPIC_API_KEY etc.) are read from the server environment only:
//   local:  supabase/functions/.env (gitignored)
//   hosted: `npx supabase secrets set --env-file supabase/functions/.env`

import { createClient } from 'npm:@supabase/supabase-js@2';

import { corsHeaders } from '../_shared/cors.ts';
import {
  createIdentifierFromEnv,
  IdentificationError,
  type IdentificationResult,
  type ImageMediaType,
} from '../_shared/identification/index.ts';

const MEDIA_TYPES: readonly ImageMediaType[] = ['image/jpeg', 'image/png', 'image/webp'];
// ~3.75 MB of image data. The app sends ~1024 px JPEGs (well under 1 MB).
const MAX_BASE64_LENGTH = 5_000_000;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });
}

/** Prefer the new secret key (sb_secret_…); fall back to the legacy service-role key. */
function serviceKey(): string | undefined {
  const raw = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'string') return parsed;
      if (parsed && typeof parsed === 'object') {
        const record = parsed as Record<string, unknown>;
        if (typeof record.default === 'string') return record.default;
        const first = Object.values(record).find((v): v is string => typeof v === 'string');
        if (first) return first;
      }
    } catch {
      const first = raw.split(',')[0]?.trim();
      if (first) return first;
    }
  }
  return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const key = serviceKey();
  if (!supabaseUrl || !key) {
    console.error('identify: SUPABASE_URL or service key missing from the function environment');
    return json({ error: 'server_misconfigured', message: 'Server is not configured' }, 500);
  }
  const admin = createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // 1. Who is calling?
  const token = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return json({ error: 'unauthorized', message: 'Sign-in required' }, 401);
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user) return json({ error: 'unauthorized', message: 'Session expired' }, 401);
  const userId = userData.user.id;

  // Validate the request before spending any of the user's quota.
  let body: { imageBase64?: unknown; mediaType?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'bad_request', message: 'Expected a JSON body' }, 400);
  }
  const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64.replace(/^data:[^,]*,/, '') : '';
  const mediaType = (MEDIA_TYPES as readonly unknown[]).includes(body.mediaType) ? (body.mediaType as ImageMediaType) : null;
  if (!imageBase64 || !mediaType || imageBase64.length > MAX_BASE64_LENGTH || !/^[A-Za-z0-9+/=\s]+$/.test(imageBase64.slice(0, 200))) {
    return json({ error: 'bad_request', message: 'Send a JPEG, PNG or WebP image under 3.5 MB' }, 400);
  }

  // 2. Provider (a config problem shouldn't cost the user an identification).
  let identifier;
  try {
    identifier = createIdentifierFromEnv((name) => Deno.env.get(name));
  } catch (error) {
    console.error('identify: provider configuration error:', error instanceof Error ? error.message : error);
    return json({ error: 'server_misconfigured', message: 'Identification is not configured on the server' }, 500);
  }

  // 3. Daily limit.
  const limit = Number.parseInt(Deno.env.get('DAILY_IDENTIFICATION_LIMIT') ?? '5', 10) || 5;
  const { data: quota, error: quotaError } = await admin.rpc('consume_identification', {
    p_user_id: userId,
    p_limit: limit,
  });
  if (quotaError || !quota) {
    console.error('identify: quota check failed:', quotaError?.message);
    return json({ error: 'server_error', message: 'Could not check your daily limit' }, 500);
  }
  if (!quota.allowed) {
    return json({ error: 'daily_limit_reached', message: 'Daily identification limit reached', quota }, 429);
  }

  // 4. Identify.
  const started = Date.now();
  const imageHash = await sha256Hex(imageBase64);
  let result: IdentificationResult;
  try {
    result = await identifier.identify({ imageBase64, mediaType });
  } catch (error) {
    const code = error instanceof IdentificationError ? error.code : 'unknown';
    const retryable = error instanceof IdentificationError ? error.retryable : true;
    console.error(`identify: provider ${identifier.provider} failed (${code})`);
    await admin.from('identifications').insert({
      user_id: userId,
      provider: identifier.provider,
      model: identifier.model,
      status: 'error',
      error_code: code,
      latency_ms: Date.now() - started,
      image_sha256: imageHash,
    });
    return json(
      { error: 'provider_error', code, retryable, message: 'The identification service had a problem. Try again soon.', quota },
      retryable ? 503 : 502,
    );
  }

  const { data: row, error: insertError } = await admin
    .from('identifications')
    .insert({
      user_id: userId,
      provider: identifier.provider,
      model: identifier.model,
      status: result.isAnimal ? 'ok' : 'no_animal',
      result,
      latency_ms: Date.now() - started,
      image_sha256: imageHash,
    })
    .select('id, created_at')
    .single();
  if (insertError) console.error('identify: could not store identification:', insertError.message);

  return json({
    identificationId: row?.id ?? null,
    identifiedAt: row?.created_at ?? new Date().toISOString(),
    provider: identifier.provider,
    model: identifier.model,
    result,
    quota,
  });
});
