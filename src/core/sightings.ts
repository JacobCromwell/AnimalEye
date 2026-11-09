// Sightings: one photo of one animal, with where/when it came from and what the model
// and the user each said it was. Pure data + helpers; persistence lives in the app layer.

import type { IdentificationResult } from '../../supabase/functions/_shared/identification/types.ts';
import type { Resolution } from './taxonomy/resolve.ts';
import type { TaxonGuess } from '../../supabase/functions/_shared/identification/types.ts';
import type { ExtraTaxon } from './taxonomy/types.ts';

export type PhotoSource = 'camera' | 'gallery';
/** Where `observedAt` came from. */
export type TimeSource = 'capture' | 'photo_metadata' | 'upload_time';
/** Where `location` came from. */
export type LocationSource = 'device_gps' | 'photo_metadata' | 'none';

export type SightingStatus =
  | 'queued' // waiting to be identified (offline, daily limit reached, or not sent yet)
  | 'identifying'
  | 'identified'
  | 'no_animal'
  | 'rejected' // inappropriate content; photo deleted
  | 'failed'; // permanent error

export type QueueReason = 'pending' | 'offline' | 'daily_limit' | 'error';

export interface SightingLocation {
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
}

export interface SightingIdentification {
  provider: string;
  model: string | null;
  /** Server-side record id (remote mode only). */
  serverId?: string;
  identifiedAt: string;
  result: IdentificationResult;
}

export interface Sighting {
  id: string;
  createdAt: string;
  photoSource: PhotoSource;
  observedAt: string;
  observedAtSource: TimeSource;
  location: SightingLocation | null;
  locationSource: LocationSource;
  /** Small JPEG data URI kept on the device; null if never kept or discarded. */
  thumbnailUri: string | null;
  photoDiscardedReason?: 'contains_people' | 'inappropriate';
  status: SightingStatus;
  queueReason?: QueueReason;
  /** ISO time before which a queued sighting shouldn't be retried. */
  retryAfter?: string;
  lastError?: string;
  attempts: number;
  identification?: SightingIdentification;
  /** The model's best guess, resolved to our taxonomy. */
  modelTaxonId?: string;
  /** The user's correction, if they made one. Kept separate from the model's answer. */
  userTaxonId?: string;
  shareWithResearch: boolean;
}

export function finalTaxonId(sighting: Sighting): string | undefined {
  if (sighting.status !== 'identified') return undefined;
  return sighting.userTaxonId ?? sighting.modelTaxonId;
}

/** Leaderboards and rarity only count camera photos whose model ID wasn't overridden. */
export function countsForLeaderboard(sighting: Sighting): boolean {
  return (
    sighting.status === 'identified' &&
    sighting.photoSource === 'camera' &&
    !sighting.userTaxonId &&
    sighting.identification?.result.isRealPhoto !== false
  );
}

export function foundTaxonIds(sightings: readonly Sighting[]): Set<string> {
  const ids = new Set<string>();
  for (const s of sightings) {
    const id = finalTaxonId(s);
    if (id) ids.add(id);
  }
  return ids;
}

/** Identified sightings grouped by final taxon, newest first within each group. */
export function groupByTaxon(sightings: readonly Sighting[]): Map<string, Sighting[]> {
  const groups = new Map<string, Sighting[]>();
  for (const s of sightings) {
    const id = finalTaxonId(s);
    if (!id) continue;
    const list = groups.get(id) ?? [];
    list.push(s);
    groups.set(id, list);
  }
  for (const list of groups.values()) list.sort((a, b) => b.observedAt.localeCompare(a.observedAt));
  return groups;
}

/** The user's chosen cover photo for a taxon, else the newest sighting that still has a photo. */
export function coverFor(
  taxonId: string,
  groups: ReadonlyMap<string, Sighting[]>,
  covers: Readonly<Record<string, string>>,
): Sighting | undefined {
  const list = groups.get(taxonId) ?? [];
  const chosen = list.find((s) => s.id === covers[taxonId] && s.thumbnailUri);
  return chosen ?? list.find((s) => s.thumbnailUri) ?? list[0];
}

export interface IdentificationOutcome {
  sighting: Sighting;
  newExtras: ExtraTaxon[];
}

/** Applies a provider result to a sighting. `resolve` maps a guess onto the taxonomy. */
export function applyIdentification(
  sighting: Sighting,
  identification: SightingIdentification,
  resolve: (guess: TaxonGuess) => Resolution,
): IdentificationOutcome {
  const { result } = identification;
  const base: Sighting = {
    ...sighting,
    identification,
    queueReason: undefined,
    retryAfter: undefined,
    lastError: undefined,
  };
  if (result.inappropriate) {
    return {
      sighting: { ...base, status: 'rejected', thumbnailUri: null, photoDiscardedReason: 'inappropriate' },
      newExtras: [],
    };
  }
  const best = result.candidates[0];
  if (!result.isAnimal || !best) {
    return { sighting: { ...base, status: 'no_animal' }, newExtras: [] };
  }
  const resolution = resolve(best);
  const discardPhoto = result.containsPeople;
  return {
    sighting: {
      ...base,
      status: 'identified',
      modelTaxonId: resolution.taxonId,
      thumbnailUri: discardPhoto ? null : base.thumbnailUri,
      photoDiscardedReason: discardPhoto ? 'contains_people' : base.photoDiscardedReason,
    },
    newExtras: resolution.extra ? [resolution.extra] : [],
  };
}

/** Records a user's correction. Choosing the model's own answer clears the correction. */
export function applyCorrection(sighting: Sighting, taxonId: string): Sighting {
  if (sighting.status !== 'identified') return sighting;
  return { ...sighting, userTaxonId: taxonId === sighting.modelTaxonId ? undefined : taxonId };
}
