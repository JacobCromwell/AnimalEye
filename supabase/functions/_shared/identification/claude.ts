// Claude (Anthropic Messages API) identifier. Server-side only: it needs an API key,
// and API keys must never ship in the app. The key is passed in by the caller, which
// reads it from the server's environment; this module never reads env vars itself.

import { parseIdentificationResult } from './validate.ts';
import {
  IdentificationError,
  TAXON_RANKS,
  type IdentificationResult,
  type Identifier,
  type IdentifyRequest,
} from './types.ts';

export const DEFAULT_CLAUDE_MODEL = 'claude-sonnet-5-5';
const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
const TOOL_NAME = 'report_identification';

export const CLAUDE_SYSTEM_PROMPT = `You identify animals in photos for AnimalEye, a nature app where people photograph animals they see.

Rules:
- Identify the most prominent animal (kingdom Animalia). Humans never count as the animal.
- Be honest about uncertainty. Report the most specific rank you are genuinely confident about (roughly 70%+). If you can't tell the species, report the genus or family instead (for example "Buteo" for "some kind of hawk"). Never invent a species.
- Use currently accepted scientific names as used by GBIF and iNaturalist. Domestic animals use: Felis catus, Canis familiaris, Bos taurus, Equus caballus, Sus domesticus, Capra hircus, Ovis aries, Gallus domesticus.
- Fill the lineage with names for every rank at or above the reported rank; leave lower ranks empty.
- List up to 3 candidates, best first. Confidence is your probability (0 to 1) that the candidate is correct at its rank.
- is_real_photo is false for drawings, toys, statues, taxidermy displays, or photos of a screen or printed picture.
- contains_people is true if a person's face or most of a person's body is visible (a hand holding an animal does not count).
- inappropriate is true for nudity, gore, or anything unsuitable for teenagers.
- If there is no animal, set is_animal to false and return no candidates.
Always answer by calling the ${TOOL_NAME} tool.`;

const guessSchema = {
  type: 'object',
  properties: {
    scientific_name: { type: 'string', description: 'Accepted scientific name at the reported rank' },
    common_name: { type: 'string', description: 'Everyday English name' },
    rank: { type: 'string', enum: [...TAXON_RANKS] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    is_domestic: { type: 'boolean' },
    lineage: {
      type: 'object',
      properties: {
        phylum: { type: 'string' },
        class: { type: 'string' },
        order: { type: 'string' },
        family: { type: 'string' },
        genus: { type: 'string' },
        species: { type: 'string' },
      },
    },
  },
  required: ['scientific_name', 'common_name', 'rank', 'confidence', 'lineage'],
};

export const CLAUDE_TOOL = {
  name: TOOL_NAME,
  description: 'Report what animal is in the photo.',
  input_schema: {
    type: 'object',
    properties: {
      is_animal: { type: 'boolean' },
      is_real_photo: { type: 'boolean' },
      contains_people: { type: 'boolean' },
      inappropriate: { type: 'boolean' },
      candidates: { type: 'array', items: guessSchema, maxItems: 3 },
      notes: { type: 'string', description: 'Optional one-sentence note' },
    },
    required: ['is_animal', 'is_real_photo', 'contains_people', 'inappropriate', 'candidates'],
  },
};

export interface ClaudeIdentifierOptions {
  apiKey: string;
  model?: string;
  timeoutMs?: number;
  /** Injected in tests. Defaults to the global fetch. */
  fetchImpl?: typeof fetch;
}

export function buildClaudeRequestBody(request: IdentifyRequest, model: string) {
  return {
    model,
    max_tokens: 1024,
    system: CLAUDE_SYSTEM_PROMPT,
    tools: [CLAUDE_TOOL],
    tool_choice: { type: 'tool', name: TOOL_NAME },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: request.mediaType, data: request.imageBase64 },
          },
          { type: 'text', text: 'What animal is in this photo?' },
        ],
      },
    ],
  };
}

function errorForStatus(status: number): IdentificationError {
  if (status === 401 || status === 403) {
    return new IdentificationError('provider_auth', `Claude rejected the API key (HTTP ${status})`);
  }
  if (status === 429) {
    return new IdentificationError('provider_rate_limited', 'Claude rate limit reached', true);
  }
  if (status === 529 || status >= 500) {
    return new IdentificationError('provider_unavailable', `Claude is unavailable (HTTP ${status})`, true);
  }
  return new IdentificationError('provider_rejected', `Claude rejected the request (HTTP ${status})`);
}

export function extractToolInput(responseBody: unknown): unknown {
  if (typeof responseBody !== 'object' || responseBody === null) return undefined;
  const content = (responseBody as { content?: unknown }).content;
  if (!Array.isArray(content)) return undefined;
  const block = content.find(
    (item) =>
      typeof item === 'object' &&
      item !== null &&
      (item as { type?: unknown }).type === 'tool_use' &&
      (item as { name?: unknown }).name === TOOL_NAME,
  ) as { input?: unknown } | undefined;
  return block?.input;
}

export function createClaudeIdentifier(options: ClaudeIdentifierOptions): Identifier {
  if (!options.apiKey) {
    throw new IdentificationError('config', 'ANTHROPIC_API_KEY is not set');
  }
  const model = options.model || DEFAULT_CLAUDE_MODEL;
  const timeoutMs = options.timeoutMs ?? 45_000;
  const fetchImpl = options.fetchImpl ?? fetch;

  return {
    provider: 'claude',
    model,
    async identify(request: IdentifyRequest): Promise<IdentificationResult> {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      let response: Response;
      try {
        response = await fetchImpl(ANTHROPIC_URL, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': options.apiKey,
            'anthropic-version': ANTHROPIC_VERSION,
          },
          body: JSON.stringify(buildClaudeRequestBody(request, model)),
          signal: controller.signal,
        });
      } catch (error) {
        const reason = error instanceof Error && error.name === 'AbortError' ? 'timed out' : 'network error';
        throw new IdentificationError('provider_unavailable', `Claude request failed: ${reason}`, true);
      } finally {
        clearTimeout(timer);
      }

      if (!response.ok) {
        // Drain the body but never echo it: error bodies can contain request details.
        await response.text().catch(() => '');
        throw errorForStatus(response.status);
      }

      let body: unknown;
      try {
        body = await response.json();
      } catch {
        throw new IdentificationError('bad_response', 'Claude returned invalid JSON');
      }
      const input = extractToolInput(body);
      if (input === undefined) {
        throw new IdentificationError('bad_response', 'Claude did not call the identification tool');
      }
      return parseIdentificationResult(input);
    },
  };
}
