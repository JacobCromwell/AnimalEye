import type { TaxonRank } from '../../../supabase/functions/_shared/identification/types.ts';

/** Coarse regions for "neighbors near you". GLOBAL shows everything. */
export type RegionCode = 'NA' | 'SA' | 'EU' | 'AF' | 'AS' | 'OC';
export type RegionSetting = RegionCode | 'GLOBAL';

export const REGIONS: readonly { code: RegionSetting; label: string }[] = [
  { code: 'GLOBAL', label: 'Global' },
  { code: 'NA', label: 'North & Central America' },
  { code: 'SA', label: 'South America' },
  { code: 'EU', label: 'Europe' },
  { code: 'AF', label: 'Africa' },
  { code: 'AS', label: 'Asia' },
  { code: 'OC', label: 'Oceania' },
];

/** "group" = a familiar grouping that isn't a single formal rank (e.g. "Birds of prey"). */
export type NodeRank = TaxonRank | 'group' | 'root';

export interface TaxonNode {
  /** Stable ID. Species/families: slug of the scientific name. Groups: hand-picked slug. */
  id: string;
  parentId: string | null;
  commonName: string;
  /** Formal scientific name; null for informal groups like "Hoofed mammals". */
  scientificName: string | null;
  rank: NodeRank;
  /** Extra scientific names that should resolve to this node (orders, classes, families). */
  matchNames: readonly string[];
  /** Older or alternative scientific names for the same taxon. */
  synonyms: readonly string[];
  /** Where the species is commonly found. Empty for groups (derived from descendants). */
  regions: readonly RegionCode[];
  /** Farm animals and pets (shown in every region). */
  domestic: boolean;
  /** Commonly kept as a pet outside its wild range (shown in every region). */
  pet: boolean;
  childIds: string[];
}

/** A user's find that isn't in the curated tree. It hangs off the closest matching node. */
export interface ExtraTaxon {
  id: string;
  parentId: string;
  commonName: string;
  scientificName: string;
  rank: TaxonRank;
}
