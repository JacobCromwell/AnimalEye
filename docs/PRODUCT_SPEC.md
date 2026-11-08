# AnimalEye — Product Spec (working draft)

> "AnimalEye" is a placeholder name.
> Status: gathering requirements. This file records decisions as they're made and lists what's still open.

## Vision

A phone app that gets people outdoors and enjoying nature. Users photograph animals, an image AI identifies them, and each user builds a personal collection that grows as an evolutionary tree. In the long term, the sightings (photo, date, time, place) could be offered to scientists to help track migration and behavior.

## Hard rules

1. **No secrets in the codebase, ever.** API keys, passwords, tokens and connection strings are never hard-coded or committed.
   - AI provider keys live **only on the server**. Anything shipped inside the app or the browser bundle is effectively public, so the app never holds a provider key, not even one injected at build time.
   - Production: keys live in the hosting platform's secret storage (e.g., Supabase secrets).
   - Local development: keys go in a gitignored `.env` file. A committed `.env.example` lists variable names with no values.
   - A secret scanner should block commits that contain anything that looks like a key.
2. **The identification model must be easy to swap.** Each provider (Claude, other vendors, a mock, a future self-hosted model) is an adapter behind one interface, and config picks which one runs. Each model's answer is normalized to a stable taxon ID from a public taxonomy, so user lists and the tree never depend on which model produced them.

## Decisions (Round 1 — 2026-11-08)

### Platforms and workflow
- Targets iOS and Android, plus a browser build for testing locally on Windows with VS Code.
- Owner tests on both iPhone and Android devices.
- Owner knows TypeScript, React and Git. Node.js is installed on the dev machine.
- Repo is public. Commits go straight to `main`.
- Stack: **proposed** Expo (React Native) + TypeScript. Awaiting confirmation.

### The tree
- Visual reference: [`docs/design/tree-concept.png`](design/tree-concept.png). Dark background, glowing gradient branches colored by animal group, labels along the branches, animal images at the leaves.
- Only living animals; no extinct ones.
- Starts **collapsed** and shows commonly encountered animals.
- Branches fan out as the user finds animals. Example: photographing a house cat fills that leaf and reveals its neighbors (bobcat, mountain lion, …).
- Insects and other bugs: only common species people meet in everyday life. Exotic ones (e.g., rainforest species) stay out of the default tree. Microorganisms are not shown.
- Hard-to-define and very rare animals are left out of the default tree.
- Tapping a find shows the user's own photo plus the date, time and place.

### What counts as an animal
- All animal groups, curated as described above.
- Pets and farm animals count.
- Plants and fungi are out for v1, possibly added later.

### Identification
- When the model can't reach species level, the find is saved at the most specific level it's confident of (e.g., "a hawk").
- Users can correct an ID for themselves. The database stores **both** the model's answer and the user's correction. A setting must be able to disable user corrections later.
- Photos can come from the camera or the photo gallery.
- Offline: the photo is saved and queued, then identified once the phone is back online.
- Providers for now: a **mock** identifier (free, no key) and **Claude** for real testing. Leave a seam for a future self-hosted model; no current plans for one.
- **Limit: 5 identifications per user per day.** Admin accounts (the owner) are unlimited.
- No AI budget yet. It will be set after talks with AI providers.

### Data and backend
- v1 has no sign-up screen ("phone only").
- The server will run on Supabase or AWS; the owner has accounts on both.
- Store compressed copies of photos.
- Record location when available. A sighting is still saved without one.
- Long-term goal: offer sighting data to researchers.

### Audience
- Not for children under 13 in v1, to avoid COPPA obligations for now. Revisit later.

### Social
- Wanted: sharing finds, friends, leaderboards, rarity scores. Not yet phased.

### First milestone
Take or upload a photo → identify it (mock or Claude) → confirm or correct → it's saved to the user's list → it appears on the tree. All of this runs in Chrome on Windows.

## Open questions (Round 2)

### Resolving conflicts between answers
- **A. Accounts:** use Supabase anonymous sign-in (an account created silently on first launch, no sign-up screen) so the daily limit, admin exemption, stored corrections, science data and social features all work. Users can link email/Apple/Google later without losing data. *Proposed.*
- **B. Backend:** Supabase (auth, Postgres, photo storage, server functions holding the AI key) instead of AWS, with the AI layer kept portable. *Proposed.*
- **C. Fair leaderboards:** only camera-taken finds with an un-overridden model ID count toward leaderboards and rarity. Gallery uploads and user-corrected finds still appear on the personal tree. *Proposed.*
- **D. Location privacy:** store exact location, show other users only a coarse area, and blur rare or endangered species further. *Proposed.*
- **E. Age positioning:** present the app as 13+ (not "all ages"), with a neutral age question on first launch, a mature visual style, and no kid-targeted marketing. Get a lawyer's review before public launch. *Proposed.*
- **Always record provenance:** whether each photo came from the camera or the gallery, and where its date and location came from (device GPS, photo metadata, entered by the user, none), so researchers can filter. *Decided unless the owner objects.*

### Tree
- Should "common" be one global set or depend on the user's region?
- How many species should the curated tree hold in total?
- If a user finds an animal that isn't in the curated tree, does it still get added to their tree?
- How are undiscovered neighbors shown: silhouette + name, silhouette only, or name only?
- Strict evolutionary relationships (birds inside reptiles, "fish" not a single branch) or familiar groups as in the concept chart?
- Multiple sightings of the same species: one leaf with many sightings, plus a user-chosen cover photo?

### Identification and limits
- After the 5th ID of the day: block new photos, or queue them for tomorrow?
- Does a failed identification (no animal found, blurry photo) count toward the limit?
- Screening photos: don't store or share photos showing people or inappropriate content?

### Science, social and admin
- Sharing with researchers: opt-in during onboarding? Under which data license?
- Rarity: based on global observation data, on rarity among AnimalEye users, or a blend?
- Order of social features after the first milestone.
- Admin powers beyond unlimited IDs.

### Setup
- Is Docker Desktop installed (needed to run Supabase locally), or should we use a free hosted dev project?
- Does the owner have an Anthropic **API** key (console.anthropic.com)? It's separate from a Claude.ai subscription.

### Later rounds
Look and feel, animal facts and their sources, notifications, a reminder not to approach wildlife, monetization, naming, app-store release (developer accounts, possibly under the owner's LLC), privacy policy and terms.
