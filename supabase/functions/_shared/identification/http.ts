// Generic HTTP identifier: the seam for a model we host ourselves (or any vendor that
// can be wrapped behind a small adapter service). The endpoint receives
// { imageBase64, mediaType } as JSON and must answer with an IdentificationResult.

import { parseIdentificationResult } from './validate.ts';
import {
  IdentificationError,
  type IdentificationResult,
  type Identifier,
  type IdentifyRequest,
} from './types.ts';

export interface HttpIdentifierOptions {
  url: string;
  /** Optional bearer token, read from the server environment by the caller. */
  token?: string;
  model?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export function createHttpIdentifier(options: HttpIdentifierOptions): Identifier {
  if (!options.url) {
    throw new IdentificationError('config', 'IDENTIFIER_HTTP_URL is not set');
  }
  const fetchImpl = options.fetchImpl ?? fetch;
  const timeoutMs = options.timeoutMs ?? 45_000;

  return {
    provider: 'http',
    model: options.model || null,
    async identify(request: IdentifyRequest): Promise<IdentificationResult> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (options.token) headers.authorization = `Bearer ${options.token}`;
      let response: Response;
      try {
        response = await fetchImpl(options.url, {
          method: 'POST',
          headers,
          body: JSON.stringify(request),
          signal: controller.signal,
        });
      } catch {
        throw new IdentificationError('provider_unavailable', 'Identifier endpoint unreachable', true);
      } finally {
        clearTimeout(timer);
      }
      if (!response.ok) {
        await response.text().catch(() => '');
        const retryable = response.status >= 500 || response.status === 429;
        throw new IdentificationError(
          retryable ? 'provider_unavailable' : 'provider_rejected',
          `Identifier endpoint answered HTTP ${response.status}`,
          retryable,
        );
      }
      try {
        return parseIdentificationResult(await response.json());
      } catch (error) {
        if (error instanceof IdentificationError) throw error;
        throw new IdentificationError('bad_response', 'Identifier endpoint returned invalid JSON');
      }
    },
  };
}
