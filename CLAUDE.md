# AnimalEye — working notes for Claude

Read `docs/PRODUCT_SPEC.md` (decisions, open questions) and `docs/ARCHITECTURE.md` (code layout) first.

## Hard rules
- **Never commit secrets.** No API keys, passwords, tokens or connection strings in code, config, tests, docs or commit messages. AI provider keys live only on the server (Supabase secrets in production, gitignored `supabase/functions/.env` locally). The client app never holds a provider key; anything in `EXPO_PUBLIC_*` is public.
- `.env` files are gitignored. Commit only `.env.example` files, which have variable names and no values.
- Identification goes through the `Identifier` interface (`supabase/functions/_shared/identification/`). Never call an AI vendor from app code. Resolve results to taxonomy IDs with `resolveGuess`.
- Keep the model's answer and the user's correction separate (`modelTaxonId` vs `userTaxonId`).

## Code conventions
- `src/core/` and `supabase/functions/_shared/` are runtime-agnostic TypeScript: no React Native, no Deno APIs. Relative imports there use explicit `.ts` extensions (Node and Deno need them). Use erasable syntax only: no enums, no namespaces, no parameter properties.
- App code (`src/ui`, `src/services`, `src/state`) imports without extensions.
- Package versions must match Expo SDK 58 (`npx expo install --fix` aligns them).

## Commands
- `npm test` — core tests (Node 22.18+, no install needed). Run after any change to `src/core` or `_shared`.
- `npm run typecheck`, `npm run web`, `npm start`
- `npm run db:start`, `npm run functions:serve` — local Supabase (needs Docker)

## Workflow
- Commit directly to `main` (owner's preference).
- The owner develops on Windows with VS Code, and tests in the browser and on iPhone and Android.
