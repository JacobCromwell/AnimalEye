// Turns untrusted provider output into a well-formed IdentificationResult.
// Providers are external systems; never trust their shape.

import {
  IdentificationError,
  MAX_CANDIDATES,
  TAXON_RANKS,
  type IdentificationResult,
  type Lineage,
  type TaxonGuess,
  type TaxonRank,
} from './types.ts';

const MAX_NAME_LENGTH = 120;
const MAX_NOTES_LENGTH = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function cleanString(value: unknown, maxLength = MAX_NAME_LENGTH): string {
  if (typeof value !== 'string') return '';
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function readBool(record: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    if (typeof record[key] === 'boolean') return record[key] as boolean;
  }
  return undefined;
}

function readField(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    if (key in record) return record[key];
  }
  return undefined;
}

function parseRank(value: unknown): TaxonRank | null {
  const rank = cleanString(value).toLowerCase();
  return (TAXON_RANKS as readonly string[]).includes(rank) ? (rank as TaxonRank) : null;
}

function parseLineage(value: unknown): Lineage {
  if (!isRecord(value)) return {};
  const lineage: Lineage = {};
  for (const key of ['phylum', 'class', 'order', 'family', 'genus', 'species'] as const) {
    const name = cleanString(value[key]);
    if (name) lineage[key] = name;
  }
  return lineage;
}

function parseConfidence(value: unknown): number {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
  if (!Number.isFinite(n)) return 0;
  // Some models answer in percent.
  const normalized = n > 1 && n <= 100 ? n / 100 : n;
  return Math.min(1, Math.max(0, normalized));
}

function parseGuess(value: unknown): TaxonGuess | null {
  if (!isRecord(value)) return null;
  const scientificName = cleanString(readField(value, 'scientificName', 'scientific_name'));
  const rank = parseRank(value.rank);
  if (!scientificName || !rank) return null;
  const commonName = cleanString(readField(value, 'commonName', 'common_name')) || scientificName;
  return {
    scientificName,
    commonName,
    rank,
    confidence: parseConfidence(value.confidence),
    lineage: parseLineage(value.lineage),
    isDomestic: readBool(value, 'isDomestic', 'is_domestic') ?? false,
  };
}

/**
 * Accepts camelCase (our contract) or snake_case (tool-call style) keys.
 * Throws IdentificationError('bad_response') if the essentials are missing.
 */
export function parseIdentificationResult(input: unknown): IdentificationResult {
  if (!isRecord(input)) {
    throw new IdentificationError('bad_response', 'Provider response was not an object');
  }
  const isAnimal = readBool(input, 'isAnimal', 'is_animal');
  if (isAnimal === undefined) {
    throw new IdentificationError('bad_response', 'Provider response is missing isAnimal');
  }

  const rawCandidates = readField(input, 'candidates');
  const candidates = Array.isArray(rawCandidates)
    ? rawCandidates
        .map(parseGuess)
        .filter((guess): guess is TaxonGuess => guess !== null)
        .slice(0, MAX_CANDIDATES)
    : [];

  const notes = cleanString(input.notes, MAX_NOTES_LENGTH);
  const result: IdentificationResult = {
    // An "animal" with no usable candidate can't be placed; treat it as not identified.
    isAnimal: isAnimal && candidates.length > 0,
    isRealPhoto: readBool(input, 'isRealPhoto', 'is_real_photo') ?? true,
    containsPeople: readBool(input, 'containsPeople', 'contains_people') ?? false,
    inappropriate: readBool(input, 'inappropriate') ?? false,
    candidates: isAnimal ? candidates : [],
  };
  if (notes) result.notes = notes;
  return result;
}
