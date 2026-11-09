// Provider registry. To add a provider: write an adapter that implements `Identifier`,
// then add a case below. Nothing else in the app or server needs to change.
//
// Selection is by environment variable (server side):
//   IDENTIFIER_PROVIDER = mock | claude | http
//   ANTHROPIC_API_KEY, CLAUDE_MODEL          (claude)
//   IDENTIFIER_HTTP_URL, IDENTIFIER_HTTP_TOKEN, IDENTIFIER_HTTP_MODEL   (http)

import { createClaudeIdentifier } from './claude.ts';
import { createHttpIdentifier } from './http.ts';
import { createMockIdentifier } from './mock.ts';
import { IdentificationError, type Identifier } from './types.ts';

export * from './types.ts';
export { parseIdentificationResult } from './validate.ts';
export { createMockIdentifier, MOCK_SCENARIOS } from './mock.ts';
export { createClaudeIdentifier, DEFAULT_CLAUDE_MODEL } from './claude.ts';
export { createHttpIdentifier } from './http.ts';

export type EnvReader = (name: string) => string | undefined;

export const PROVIDERS = ['mock', 'claude', 'http'] as const;
export type ProviderName = (typeof PROVIDERS)[number];

export function createIdentifierFromEnv(env: EnvReader, fetchImpl?: typeof fetch): Identifier {
  const provider = (env('IDENTIFIER_PROVIDER') || 'mock').trim().toLowerCase();
  switch (provider) {
    case 'mock':
      return createMockIdentifier();
    case 'claude':
      return createClaudeIdentifier({
        apiKey: env('ANTHROPIC_API_KEY') ?? '',
        model: env('CLAUDE_MODEL'),
        fetchImpl,
      });
    case 'http':
      return createHttpIdentifier({
        url: env('IDENTIFIER_HTTP_URL') ?? '',
        token: env('IDENTIFIER_HTTP_TOKEN'),
        model: env('IDENTIFIER_HTTP_MODEL'),
        fetchImpl,
      });
    default:
      throw new IdentificationError(
        'config',
        `Unknown IDENTIFIER_PROVIDER "${provider}". Expected one of: ${PROVIDERS.join(', ')}`,
      );
  }
}
