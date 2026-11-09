# AnimalEye — Product Spec (working draft)

> "AnimalEye" is a placeholder name.
> This file records every decision made so far and lists what's still open. Technical layout: [ARCHITECTURE.md](ARCHITECTURE.md).

## Vision

A phone app that gets people outdoors and enjoying nature. Users photograph animals, an image AI identifies them, and each user builds a personal collection that grows as an evolutionary tree. In the long term, the sightings (photo, date, time, place) could be offered to scientists to help track migration and behavior.

## Hard rules

1. **No secrets in the codebase, ever.** API keys, passwords, tokens and connection strings are never hard-coded or committed.
   - AI provider keys live **only on the server**. Anything shipped inside the app or the browser bundle is effectively public, so the app never holds a provider key.
   - Production: keys live in Supabase's secret storage. Local development: keys go in gitignored `.env` files. The committed `.env.example` files list variable names with no values.
   - CI runs a secret scanner (gitleaks) on every push.
2. **The identification model must be easy to swap.** Each provider (mock, Claude, a generic HTTP endpoint for a future self-hosted model) is an adapter behind one interface, and an environment variable picks which one runs. Results are resolved to the app's taxonomy IDs, so lists and the tree never depend on which model produced them.

## Decisions

### Platforms and workflow
- iOS and Android, plus a browser build for local testing on Windows with VS Code.
- **Stack: Expo SDK 58 (React Native) + TypeScript.** Backend: **Supabase**.
- Owner tests on iPhone and Android. Node.js and Docker Desktop are installed on the dev machine.
- Repo is public. Commits go straight to `main`.

### The tree
- Visual reference: [`docs/design/tree-concept.png`](design/tree-concept.png). Dark background, glowing gradient branches colored by animal group, labels along the branches.
- Living animals only. **Familiar groups** (Mammals, Birds, Reptiles, Amphibians, Fish, Insects, Spiders & kin, Other invertebrates), not strict evolutionary relationships.
- Starts **collapsed** and shows commonly encountered animals. Branches fan out as the user finds things: finding a house cat lights up that leaf and reveals its neighbors (bobcat, mountain lion, …).
- Undiscovered neighbors appear as a **silhouette with a name**.
- Bugs: only common, everyday species. Exotic, very rare and hard-to-define animals stay out of the default tree.
- **A find outside the curated tree still gets its own branch** on that user's tree, attached at the closest matching group.
- **Region-specific** neighbors, with a **Global** default. The user picks a region in Settings.
- Curated tree target: about 2,000 species, built from public observation data plus all common pets and farm animals. (Milestone 1 ships a hand-curated seed of about 230 species.)
- Repeat sightings of a species: one leaf, every sighting kept, and the user picks the cover photo.
- Tapping a find shows the user's photo plus date, time and place.

### What counts
- All animal groups (curated as above). Pets and farm animals count.
- Plants and fungi are out for v1 and may come later.

### Identification
- When the model isn't sure of the species, the find is saved at the most specific level it is sure of (e.g., "a hawk").
- The model's best guess is accepted automatically. Users can **correct** it for themselves. The server stores the model's answer and the app stores the user's correction separately (both sync to the server in milestone 2). A config flag (`EXPO_PUBLIC_ALLOW_USER_CORRECTIONS`) can switch corrections off; a server-side switch can come later.
- Photos can come from the camera or the gallery.
- Offline: the photo is queued and identified once the phone is back online.
- Providers: **mock** (free, no key) and **Claude**. A generic **HTTP** provider is the seam for a future self-hosted model.
- **Limit: 5 identifications per user per day** (days reset at UTC midnight). Failed attempts count. After the limit, photos queue until the next day. **Admins are unlimited** (the only admin power for now).
- The identifier also flags photos showing **people** (the photo is discarded and the sighting kept) or **inappropriate content** (rejected entirely).
- No AI budget yet. It will be set after talks with providers.

### Accounts and data
- **Supabase anonymous accounts**: an account is created silently on first launch, with no sign-up screen. Users can link email/Apple/Google later and keep their data.
- No account is created until the user passes the age question.
- Every sighting records **provenance**: camera or gallery, where the date came from (capture time / photo metadata / none) and where the location came from (device GPS / photo metadata / none).
- Exact location is stored. Other users will see only a coarse area, with rare and endangered species blurred further (applies once social features exist).
- Compressed photos are kept. The app currently keeps a small thumbnail locally; server photo storage comes in milestone 2.
- Sharing with researchers is **opt-in**, asked during onboarding. Nothing is shared until the user says yes.

### Audience
- **13+.** A neutral age question on first launch, asking birth month and year without hinting at the cutoff. Under-13s are turned away; only the pass/fail result is stored. A mature visual style and no marketing aimed at kids. Get a lawyer's review before public launch.

### Social (after the first milestone, in this order)
1. Sharing finds 2. Friends 3. Leaderboards.
- Only **camera-taken finds whose model ID wasn't overridden** count toward leaderboards and rarity.
- Rarity starts from worldwide observation data and may later blend in AnimalEye's own data.

## Milestones

### Milestone 1 — the core loop (in progress)
Take or upload a photo → identify it (mock in the app, or mock/Claude through the local Supabase server) → the find appears on the tree and in the collection → the user can correct it. Runs in Chrome on Windows and in Expo Go.

### Milestone 2 — sync and storage
Sightings, corrections and compressed photos sync to Supabase; data survives reinstalling the app once an account is linked; a server-side corrections switch.

### Later
Taxonomy build pipeline (~2,000 species with GBIF/iNaturalist IDs, regional lists, rarity), real silhouettes (open-licensed, with attribution), automatic region detection, social features, admin tools, app-store release.

## Open questions (Round 3 — when convenient)
- **Look and feel:** apps whose style you love? Dark only, or light too? Any colors or fonts you have in mind?
- **Animal facts:** what to show per animal (description, conservation status, fun facts)? Sources need compatible licenses (e.g., Wikipedia requires attribution).
- **Safety messaging:** a gentle "keep your distance from wildlife" note, and where it should appear.
- **Notifications:** any? (e.g., "your queued photos were identified")
- **Monetization** ideas, if any, and the **name**.
- **App-store release:** Apple/Google developer accounts — under the planned LLC?
- **Privacy policy and terms:** needed before release, especially for location data and research sharing.
