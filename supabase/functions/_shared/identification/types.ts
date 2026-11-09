// The identification contract shared by the server (Supabase Edge Functions, Deno)
// and the app (Expo). Keep this file free of runtime-specific APIs: no Deno.*, no
// React Native imports. Plain TypeScript only, so Node, Deno and Metro can all load it.

export type TaxonRank =
  | 'kingdom'
  | 'phylum'
  | 'class'
  | 'order'
  | 'family'
  | 'genus'
  | 'species'
  | 'subspecies';

export const TAXON_RANKS: readonly TaxonRank[] = [
  'kingdom',
  'phylum',
  'class',
  'order',
  'family',
  'genus',
  'species',
  'subspecies',
];

/** Names of the groups above (and including) the identified taxon. Empty when unknown. */
export interface Lineage {
  phylum?: string;
  class?: string;
  order?: string;
  family?: string;
  genus?: string;
  species?: string;
}

export interface TaxonGuess {
  /** Accepted scientific name at `rank`, e.g. "Felis catus" or "Buteo". */
  scientificName: string;
  /** Everyday English name, e.g. "House cat" or "Buteo hawks". */
  commonName: string;
  /** The most specific rank the provider is confident about. */
  rank: TaxonRank;
  /** 0..1 as reported by the provider. Not calibrated across providers. */
  confidence: number;
  lineage: Lineage;
  isDomestic: boolean;
}

export interface IdentificationResult {
  /** A real animal (kingdom Animalia, not a human) is the subject of the photo. */
  isAnimal: boolean;
  /** False for drawings, toys, screens, statues, etc. */
  isRealPhoto: boolean;
  /** A person's face or most of a person's body is visible. */
  containsPeople: boolean;
  /** Nudity, gore, or otherwise unsuitable for a 13+ audience. */
  inappropriate: boolean;
  /** Best guess first; at most 3 candidates. Empty when `isAnimal` is false. */
  candidates: TaxonGuess[];
  /** Short free-text note from the provider (optional). */
  notes?: string;
}

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface IdentifyRequest {
  /** Base64 image data, without a `data:` prefix. */
  imageBase64: string;
  mediaType: ImageMediaType;
}

/** Every identification provider implements this. */
export interface Identifier {
  /** Provider key, e.g. "mock", "claude", "http". */
  readonly provider: string;
  /** Model name if the provider has one (e.g. "claude-sonnet-5-5"), else null. */
  readonly model: string | null;
  identify(request: IdentifyRequest): Promise<IdentificationResult>;
}

export type IdentificationErrorCode =
  | 'config' // provider misconfigured (missing key, unknown provider)
  | 'bad_request' // the image or request was invalid
  | 'provider_rejected' // provider refused the request (4xx other than auth/rate)
  | 'provider_auth' // provider rejected our credentials
  | 'provider_rate_limited' // provider-side rate limit
  | 'provider_unavailable' // 5xx / network / timeout
  | 'bad_response'; // provider answered with something we couldn't parse

export class IdentificationError extends Error {
  code: IdentificationErrorCode;
  retryable: boolean;

  constructor(code: IdentificationErrorCode, message: string, retryable = false) {
    super(message);
    this.name = 'IdentificationError';
    this.code = code;
    this.retryable = retryable;
  }
}

export const MAX_CANDIDATES = 3;
