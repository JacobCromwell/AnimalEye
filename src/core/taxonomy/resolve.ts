// Maps a provider's guess onto the app's taxonomy. This is what makes models swappable:
// whatever a model says, the app stores one of our taxon IDs.
//
// - Exact match (scientific name or synonym)   → the curated node, inTree = true
// - Otherwise, the deepest lineage name we know → an "extra" taxon hung off that node,
//   so finds outside the curated tree still get their own branch.

import type { TaxonGuess } from '../../../supabase/functions/_shared/identification/types.ts';
import { normalizeName, slugify, type Taxonomy } from './index.ts';
import type { ExtraTaxon } from './types.ts';

export interface Resolution {
  taxonId: string;
  inTree: boolean;
  /** The curated node the find hangs off (equals taxonId when inTree). */
  anchorId: string;
  /** Present when the find is not in the curated tree. */
  extra?: ExtraTaxon;
}

function lookup(tax: Taxonomy, name: string | undefined): string | undefined {
  if (!name) return undefined;
  const key = normalizeName(name);
  const direct = tax.nameIndex.get(key);
  if (direct) return direct;
  // "Trachemys scripta elegans" → try "Trachemys scripta".
  const words = key.split(' ');
  if (words.length > 2) return tax.nameIndex.get(words.slice(0, 2).join(' '));
  return undefined;
}

export function extraIdFor(scientificName: string): string {
  return `x-${slugify(scientificName)}`;
}

export function resolveGuess(tax: Taxonomy, guess: TaxonGuess): Resolution {
  const exact = lookup(tax, guess.scientificName);
  if (exact) return { taxonId: exact, inTree: true, anchorId: exact };

  const { lineage } = guess;
  // Most specific first. Species is included in case the guess was reported at subspecies.
  const fallbacks = [lineage.species, lineage.genus, lineage.family, lineage.order, lineage.class, lineage.phylum];
  let anchorId = tax.rootId;
  for (const name of fallbacks) {
    if (name && normalizeName(name) === normalizeName(guess.scientificName)) continue;
    const hit = lookup(tax, name);
    if (hit) {
      anchorId = hit;
      break;
    }
  }

  const extra: ExtraTaxon = {
    id: extraIdFor(guess.scientificName),
    parentId: anchorId,
    commonName: guess.commonName,
    scientificName: guess.scientificName,
    rank: guess.rank,
  };
  return { taxonId: extra.id, inTree: false, anchorId, extra };
}
