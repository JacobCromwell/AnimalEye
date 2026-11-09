// How the app gets an identification. The UI only ever talks to `IdentificationClient`;
// it never calls an AI vendor directly.
//   local-mock → the shared mock identifier runs inside the app (no server, no key)
//   remote     → the Supabase "identify" function, which holds any keys and picks the provider

import { FunctionsFetchError, FunctionsHttpError, FunctionsRelayError } from '@supabase/supabase-js';

import { config } from '../config';
import type { SightingIdentification } from '../core/sightings';
import { createMockIdentifier } from '../../supabase/functions/_shared/identification/mock';
import { parseIdentificationResult } from '../../supabase/functions/_shared/identification/validate';
import { ensureSession, getSupabase, isSupabaseConfigured } from './supabase';

export interface Quota {
  used: number;
  /** null for admins (unlimited). */
  limit: number | null;
  resetAt: string;
  isAdmin: boolean;
}

export type IdentifyOutcome =
  | { kind: 'ok'; identification: SightingIdentification; quota?: Quota }
  | { kind: 'daily_limit'; quota: Quota }
  | { kind: 'offline'; message: string }
  | { kind: 'retry'; message: string }
  | { kind: 'failed'; message: string };

export interface IdentificationClient {
  /** Shown in Settings, e.g. "Mock (in the app)". */
  readonly label: string;
  identify(imageBase64: string): Promise<IdentifyOutcome>;
}

function createLocalMockClient(): IdentificationClient {
  const mock = createMockIdentifier({ delayMs: 700 });
  return {
    label: 'Mock answers (in the app, no server)',
    async identify(imageBase64) {
      const result = await mock.identify({ imageBase64, mediaType: 'image/jpeg' });
      return {
        kind: 'ok',
        identification: { provider: 'mock-local', model: null, identifiedAt: new Date().toISOString(), result },
      };
    },
  };
}

function isQuota(value: unknown): value is Quota {
  const q = value as Quota | null;
  return !!q && typeof q.used === 'number' && typeof q.resetAt === 'string';
}

function createRemoteClient(): IdentificationClient {
  return {
    label: 'AnimalEye server (Supabase)',
    async identify(imageBase64) {
      if (!isSupabaseConfigured()) {
        return { kind: 'failed', message: 'Remote mode is on but Supabase is not configured in .env' };
      }
      try {
        await ensureSession();
      } catch {
        return { kind: 'offline', message: 'Could not reach the server' };
      }

      const { data, error } = await getSupabase().functions.invoke('identify', {
        body: { imageBase64, mediaType: 'image/jpeg' },
      });

      if (error) {
        if (error instanceof FunctionsHttpError) {
          const response = error.context as Response;
          let body: { error?: string; message?: string; quota?: unknown } = {};
          try {
            body = await response.json();
          } catch {
            // non-JSON error body
          }
          if (response.status === 429 && body.error === 'daily_limit_reached' && isQuota(body.quota)) {
            return { kind: 'daily_limit', quota: body.quota };
          }
          if (response.status === 400) {
            return { kind: 'failed', message: body.message ?? 'The server could not use this photo' };
          }
          return { kind: 'retry', message: body.message ?? `Server error (${response.status})` };
        }
        if (error instanceof FunctionsFetchError) return { kind: 'offline', message: 'No connection to the server' };
        if (error instanceof FunctionsRelayError) return { kind: 'retry', message: 'The server had a hiccup' };
        return { kind: 'retry', message: error instanceof Error ? error.message : 'Unknown error' };
      }

      try {
        const payload = data as {
          identificationId?: string;
          provider?: string;
          model?: string | null;
          identifiedAt?: string;
          result?: unknown;
          quota?: unknown;
        };
        const result = parseIdentificationResult(payload.result);
        return {
          kind: 'ok',
          identification: {
            provider: payload.provider ?? 'unknown',
            model: payload.model ?? null,
            serverId: payload.identificationId,
            identifiedAt: payload.identifiedAt ?? new Date().toISOString(),
            result,
          },
          quota: isQuota(payload.quota) ? payload.quota : undefined,
        };
      } catch {
        return { kind: 'retry', message: 'The server sent an unexpected answer' };
      }
    },
  };
}

let instance: IdentificationClient | null = null;
export function getIdentificationClient(): IdentificationClient {
  if (!instance) instance = config.identifierMode === 'remote' ? createRemoteClient() : createLocalMockClient();
  return instance;
}
