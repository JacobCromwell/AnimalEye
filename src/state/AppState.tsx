// App-wide state: settings, sightings, extra taxa and cover choices, persisted on the
// device. Also runs the identification queue (offline photos, daily limit, retries).

import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef } from 'react';
import { AppState as RNAppState } from 'react-native';

import { provenanceFromExif } from '../core/exif';
import {
  applyCorrection,
  applyIdentification,
  type LocationSource,
  type Sighting,
  type SightingLocation,
  type TimeSource,
} from '../core/sightings';
import { getTaxonomy } from '../core/taxonomy';
import { resolveGuess } from '../core/taxonomy/resolve';
import type { ExtraTaxon, RegionSetting } from '../core/taxonomy/types';
import type { TaxonGuess } from '../../supabase/functions/_shared/identification/types';
import { getIdentificationClient, type Quota } from '../services/identification';
import { currentLocation } from '../services/location';
import { pickFromGallery, takePhoto, type CaptureOutcome } from '../services/photos';
import {
  clearAllLocalData,
  deleteQueueImage,
  loadJson,
  loadQueueImage,
  saveJson,
  saveQueueImage,
} from '../services/storage';

export interface Settings {
  ageGate?: 'passed' | 'blocked';
  onboardingComplete: boolean;
  region: RegionSetting;
  shareWithResearch: boolean;
}

export interface PersistedState {
  version: 1;
  settings: Settings;
  sightings: Sighting[];
  extras: Record<string, ExtraTaxon>;
  covers: Record<string, string>;
  lastQuota?: Quota;
}

interface State extends PersistedState {
  hydrated: boolean;
  storageError?: string;
}

const initialState: State = {
  version: 1,
  hydrated: false,
  settings: { onboardingComplete: false, region: 'GLOBAL', shareWithResearch: false },
  sightings: [],
  extras: {},
  covers: {},
};

type Action =
  | { type: 'hydrate'; state: PersistedState | null }
  | { type: 'settings'; patch: Partial<Settings> }
  | { type: 'upsertSighting'; sighting: Sighting }
  | { type: 'addExtras'; extras: ExtraTaxon[] }
  | { type: 'deleteSighting'; id: string }
  | { type: 'setCover'; taxonId: string; sightingId: string }
  | { type: 'quota'; quota: Quota }
  | { type: 'storageError'; message?: string }
  | { type: 'reset' };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'hydrate': {
      if (!action.state) return { ...state, hydrated: true };
      // A photo that was mid-request when the app closed goes back in the queue.
      const sightings = action.state.sightings.map((s) =>
        s.status === 'identifying' ? { ...s, status: 'queued' as const, queueReason: 'pending' as const } : s,
      );
      return { ...initialState, ...action.state, sightings, hydrated: true };
    }
    case 'settings':
      return { ...state, settings: { ...state.settings, ...action.patch } };
    case 'upsertSighting': {
      const exists = state.sightings.some((s) => s.id === action.sighting.id);
      const sightings = exists
        ? state.sightings.map((s) => (s.id === action.sighting.id ? action.sighting : s))
        : [action.sighting, ...state.sightings];
      return { ...state, sightings };
    }
    case 'addExtras': {
      if (action.extras.length === 0) return state;
      const extras = { ...state.extras };
      for (const extra of action.extras) extras[extra.id] = extra;
      return { ...state, extras };
    }
    case 'deleteSighting':
      return { ...state, sightings: state.sightings.filter((s) => s.id !== action.id) };
    case 'setCover':
      return { ...state, covers: { ...state.covers, [action.taxonId]: action.sightingId } };
    case 'quota':
      return { ...state, lastQuota: action.quota };
    case 'storageError':
      return { ...state, storageError: action.message };
    case 'reset':
      return { ...initialState, hydrated: true };
  }
}

function persistable(state: State): PersistedState {
  const { version, settings, sightings, extras, covers, lastQuota } = state;
  return { version, settings, sightings, extras, covers, lastQuota };
}

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function backoffMs(attempts: number): number {
  return Math.min(60 * 60 * 1000, 30_000 * 2 ** Math.max(0, attempts - 1));
}

export type CaptureResult = { status: 'ok'; sightingId: string } | Exclude<CaptureOutcome, { status: 'ok' }>;

interface AppActions {
  updateSettings(patch: Partial<Settings>): void;
  capture(source: 'camera' | 'gallery'): Promise<CaptureResult>;
  processQueue(options?: { force?: boolean }): Promise<void>;
  correct(sightingId: string, choice: { taxonId: string } | { guess: TaxonGuess }): void;
  setCover(taxonId: string, sightingId: string): void;
  deleteSighting(sightingId: string): Promise<void>;
  resetAll(): Promise<void>;
}

const StateContext = createContext<State>(initialState);
const ActionsContext = createContext<AppActions | null>(null);

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [state, reactDispatch] = useReducer(reducer, initialState);
  // A synchronous mirror of the state, so async work (the queue) always sees the latest
  // data without waiting for React to re-render. Every update goes through `dispatch`.
  const stateRef = useRef<State>(initialState);
  const dispatch = useCallback((action: Action) => {
    stateRef.current = reducer(stateRef.current, action);
    reactDispatch(action);
  }, []);
  const processing = useRef(false);
  const rerunRequested = useRef(false);
  const processQueueRef = useRef<(options?: { force?: boolean }) => Promise<void>>(async () => undefined);

  // Load from storage once.
  useEffect(() => {
    loadJson<PersistedState>()
      .then((saved) => dispatch({ type: 'hydrate', state: saved?.version === 1 ? saved : null }))
      .catch(() => dispatch({ type: 'hydrate', state: null }));
  }, [dispatch]);

  // Save (debounced) whenever persisted parts change.
  useEffect(() => {
    if (!state.hydrated) return;
    const timer = setTimeout(() => {
      saveJson(persistable(state))
        .then(() => {
          if (stateRef.current.storageError) dispatch({ type: 'storageError' });
        })
        .catch(() =>
          dispatch({ type: 'storageError', message: 'This device is out of space for AnimalEye data.' }),
        );
    }, 300);
    return () => clearTimeout(timer);
  }, [dispatch, state.hydrated, state.settings, state.sightings, state.extras, state.covers, state.lastQuota]);

  const upsert = useCallback((sighting: Sighting) => dispatch({ type: 'upsertSighting', sighting }), [dispatch]);

  const processQueue = useCallback(
    async (options: { force?: boolean } = {}) => {
      if (stateRef.current.settings.ageGate !== 'passed') return;
      if (processing.current) {
        // Something new was queued mid-run: go around again when this run finishes.
        rerunRequested.current = true;
        return;
      }
      processing.current = true;
      const client = getIdentificationClient();
      const tax = getTaxonomy();
      try {
        const now = Date.now();
        const queue = stateRef.current.sightings
          .filter((s) => s.status === 'queued')
          .filter((s) => {
            if (!s.retryAfter) return true;
            const due = Date.parse(s.retryAfter) <= now;
            // "Retry now" skips the backoff, but not the daily limit.
            return due || (options.force && s.queueReason !== 'daily_limit');
          })
          .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

        for (const queued of queue) {
          const current = stateRef.current.sightings.find((s) => s.id === queued.id);
          if (!current || current.status !== 'queued') continue;
          const image = await loadQueueImage(current.id);
          if (!image) {
            upsert({ ...current, status: 'failed', lastError: 'The photo is no longer on this device' });
            continue;
          }
          const attempt: Sighting = { ...current, status: 'identifying', attempts: current.attempts + 1 };
          upsert(attempt);

          const outcome = await client.identify(image);
          if (outcome.kind === 'ok') {
            const { sighting, newExtras } = applyIdentification(attempt, outcome.identification, (guess) =>
              resolveGuess(tax, guess),
            );
            dispatch({ type: 'addExtras', extras: newExtras });
            upsert(sighting);
            if (outcome.quota) dispatch({ type: 'quota', quota: outcome.quota });
            await deleteQueueImage(current.id);
            continue;
          }
          if (outcome.kind === 'failed') {
            upsert({ ...attempt, status: 'failed', lastError: outcome.message });
            await deleteQueueImage(current.id);
            continue;
          }
          // Everything else stays queued; stop for now so we don't hammer the server.
          if (outcome.kind === 'daily_limit') {
            dispatch({ type: 'quota', quota: outcome.quota });
            const waiting = stateRef.current.sightings.filter((s) => s.status === 'queued' || s.id === attempt.id);
            for (const s of waiting) {
              upsert({
                ...(s.id === attempt.id ? attempt : s),
                status: 'queued',
                queueReason: 'daily_limit',
                retryAfter: outcome.quota.resetAt,
              });
            }
          } else {
            upsert({
              ...attempt,
              status: 'queued',
              queueReason: outcome.kind === 'offline' ? 'offline' : 'error',
              lastError: outcome.message,
              retryAfter: new Date(Date.now() + backoffMs(attempt.attempts)).toISOString(),
            });
          }
          break;
        }
      } finally {
        processing.current = false;
        if (rerunRequested.current) {
          rerunRequested.current = false;
          setTimeout(() => processQueueRef.current(), 0);
        }
      }
    },
    [dispatch, upsert],
  );
  processQueueRef.current = processQueue;

  // Retry on start, when the app comes back to the foreground, and every minute.
  useEffect(() => {
    if (!state.hydrated || state.settings.ageGate !== 'passed') return;
    processQueue();
    const subscription = RNAppState.addEventListener('change', (next) => {
      if (next === 'active') processQueue();
    });
    const interval = setInterval(() => processQueue(), 60_000);
    return () => {
      subscription.remove();
      clearInterval(interval);
    };
  }, [state.hydrated, state.settings.ageGate, processQueue]);

  const capture = useCallback(
    async (source: 'camera' | 'gallery'): Promise<CaptureResult> => {
      const outcome = source === 'camera' ? await takePhoto() : await pickFromGallery();
      if (outcome.status !== 'ok') return outcome;
      const { photo } = outcome;
      const nowIso = new Date().toISOString();

      let observedAt = nowIso;
      let observedAtSource: TimeSource = 'capture';
      let location: SightingLocation | null = null;
      let locationSource: LocationSource = 'none';
      if (source === 'camera') {
        location = await currentLocation();
        if (location) locationSource = 'device_gps';
      } else {
        const exif = provenanceFromExif(photo.exif);
        observedAt = exif.takenAt ?? nowIso;
        observedAtSource = exif.takenAt ? 'photo_metadata' : 'upload_time';
        if (exif.location) {
          location = exif.location;
          locationSource = 'photo_metadata';
        }
      }

      const sighting: Sighting = {
        id: newId(),
        createdAt: nowIso,
        photoSource: source,
        observedAt,
        observedAtSource,
        location,
        locationSource,
        thumbnailUri: photo.thumbnailUri,
        status: 'queued',
        queueReason: 'pending',
        attempts: 0,
        shareWithResearch: stateRef.current.settings.shareWithResearch,
      };
      try {
        await saveQueueImage(sighting.id, photo.idImageBase64);
      } catch {
        return { status: 'error', message: 'Not enough space on this device to queue the photo.' };
      }
      upsert(sighting);
      processQueue();
      return { status: 'ok', sightingId: sighting.id };
    },
    [processQueue, upsert],
  );

  const actions = useMemo<AppActions>(
    () => ({
      updateSettings: (patch) => dispatch({ type: 'settings', patch }),
      capture,
      processQueue,
      correct(sightingId, choice) {
        const sighting = stateRef.current.sightings.find((s) => s.id === sightingId);
        if (!sighting) return;
        let taxonId: string;
        if ('guess' in choice) {
          const resolution = resolveGuess(getTaxonomy(), choice.guess);
          if (resolution.extra) dispatch({ type: 'addExtras', extras: [resolution.extra] });
          taxonId = resolution.taxonId;
        } else {
          taxonId = choice.taxonId;
        }
        upsert(applyCorrection(sighting, taxonId));
      },
      setCover: (taxonId, sightingId) => dispatch({ type: 'setCover', taxonId, sightingId }),
      async deleteSighting(sightingId) {
        dispatch({ type: 'deleteSighting', id: sightingId });
        await deleteQueueImage(sightingId).catch(() => undefined);
      },
      async resetAll() {
        await clearAllLocalData();
        dispatch({ type: 'reset' });
      },
    }),
    [capture, dispatch, processQueue, upsert],
  );

  return (
    <StateContext.Provider value={state}>
      <ActionsContext.Provider value={actions}>{children}</ActionsContext.Provider>
    </StateContext.Provider>
  );
}

export function useAppState(): State {
  return useContext(StateContext);
}

export function useActions(): AppActions {
  const actions = useContext(ActionsContext);
  if (!actions) throw new Error('useActions must be used inside AppStateProvider');
  return actions;
}
