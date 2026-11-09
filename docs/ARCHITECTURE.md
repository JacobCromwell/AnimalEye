# Architecture

```
App (Expo: iOS · Android · web)                     Server (Supabase)
┌───────────────────────────────────────┐          ┌────────────────────────────────────┐
│ ui/        screens, tree drawing (SVG)│          │ functions/identify                  │
│ state/     sightings, queue, settings │──photo──▶│   1. verify session                 │
│ services/  camera, location, storage, │◀─result──│   2. pick provider (env)            │
│            identification client      │          │   3. daily limit (Postgres)         │
│ core/      taxonomy, tree, sightings  │          │   4. call provider, store answer    │
└───────────────────────────────────────┘          └───────────────┬────────────────────┘
                 ▲                                                  │ API key lives here only
                 │ shared, runtime-agnostic TypeScript              ▼
        supabase/functions/_shared/identification  ──────▶  Claude / mock / HTTP (self-hosted)
```

## Layers

- **`src/core/`**: pure TypeScript, no React Native. Tested with `npm test`.
  - `taxonomy/data.ts`: the curated tree (familiar groups → families → species, with regions).
  - `taxonomy/resolve.ts`: maps any provider's guess to a taxon ID. Exact names and synonyms resolve to curated nodes; otherwise the deepest known lineage name becomes the parent of an *extra* taxon, so off-list finds still get a branch.
  - `tree/visible.ts`: what's open (paths to finds, peeked groups), what's collapsed, region filtering.
  - `tree/layout.ts`: half-circle radial dendrogram with leaves on the outer ring.
  - `sightings.ts`: the Sighting record, the model-vs-user correction split, leaderboard eligibility.
  - `exif.ts`, `age.ts`: photo provenance and the neutral age screen.
- **`supabase/functions/_shared/identification/`**: the provider contract (`Identifier`) and adapters. Shared by the server and the app's mock mode. No runtime-specific APIs.
- **`src/services/`**: device and network edges (camera, location, AsyncStorage, Supabase client, identification client).
- **`src/state/AppState.tsx`**: one reducer, persisted to the device; runs the identification queue (offline, daily limit, back-off retries).
- **`src/ui/`**: screens and components. Navigation is a tiny tab and stack context.

## Swapping or adding an identification model

1. Write an adapter in `supabase/functions/_shared/identification/` that implements `Identifier` and returns an `IdentificationResult` (run provider output through `parseIdentificationResult`).
2. Add a `case` to `createIdentifierFromEnv` in `index.ts`.
3. Set `IDENTIFIER_PROVIDER` in the server environment.

Nothing in the app changes: results are resolved to our taxonomy IDs either way. A model we host ourselves can sit behind the existing `http` provider without new code.

## Data rules

- The **model's answer** is stored server-side in `identifications` and on the device in `Sighting.identification` / `modelTaxonId`. A **user's correction** is kept separately in `userTaxonId`.
- Leaderboards and rarity will count only `countsForLeaderboard(sighting)`: camera photos whose ID wasn't overridden.
- Photos showing people are discarded; inappropriate photos are rejected and deleted.
- Each sighting records where its time and location came from (`observedAtSource`, `locationSource`).

## Known limits (milestone 1)

- Sightings, corrections and photos live on the device; syncing them to Supabase is milestone 2.
- In the browser, device storage is about 5 MB (a few hundred thumbnails).
- The curated tree has about 480 species; the generated tree (~2,000, with GBIF/iNaturalist IDs) comes later.
- Undiscovered neighbors use a placeholder ring with a "?" until open-licensed silhouettes are added.
