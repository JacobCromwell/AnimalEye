# AnimalEye (working title)

A phone app that encourages people to get outside: photograph animals, have them identified, and grow your own evolutionary tree of the animals you've seen.

- Product decisions and open questions: [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md)
- How the code fits together: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

Built with Expo SDK 58 (React Native + TypeScript) and Supabase.

---

## 1. Run it in your browser (no server needed)

You need **Node.js 22.18 or newer** (`node -v` to check) and Git.

```powershell
git clone https://github.com/JacobCromwell/AnimalEye
cd AnimalEye
npm install
Copy-Item .env.example .env
npm run web
```

Your browser opens at http://localhost:8081. The app starts in **mock mode**: identification runs inside the app and returns pretend answers, so you can try the whole flow (age screen, photo, tree, collection, corrections) without any keys.

If `npm install` reports version conflicts, run `npx expo install --fix`; it lines every package up with Expo SDK 58.

## 2. Run it on your phone (Expo Go)

1. Install **Expo Go** from the App Store or Google Play.
2. Sign in to the same Expo account in Expo Go and on your PC (`npx expo login`). Expo Go requires this.
3. With your phone on the same Wi-Fi as your PC, run `npm start` and scan the QR code (iPhone: Camera app; Android: Expo Go).

If Expo Go says the project is incompatible, the store version may not support SDK 58 yet. Tell Claude: moving the project to SDK 57 takes one command (`npx expo install expo@~57.0.0 --fix`).

## 3. Run the backend locally (Supabase, then Claude)

You need **Docker Desktop** running.

1. Start Supabase (the first run downloads several images and can take a few minutes):
   ```powershell
   npm run db:start
   ```
   It prints an **API URL** and a **Publishable key** (shown as `anon key` on older CLI versions). The database schema in `supabase/migrations/` is applied automatically.
2. Create the server's secret file and start the functions (keep this terminal open):
   ```powershell
   Copy-Item supabase\functions\.env.example supabase\functions\.env
   npm run functions:serve
   ```
   It starts with `IDENTIFIER_PROVIDER=mock`, so the server returns pretend answers too.
3. Point the app at it. In `.env`:
   ```
   EXPO_PUBLIC_IDENTIFIER_MODE=remote
   EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<the publishable key from step 1>
   ```
   Restart `npm run web`. On a phone, use your PC's Wi-Fi IP address instead of `127.0.0.1` (run `ipconfig` and look for "IPv4 Address").
4. **Switch to Claude.** Create an API key at https://console.anthropic.com (API access is billed separately from a Claude.ai subscription). In `supabase/functions/.env` set:
   ```
   IDENTIFIER_PROVIDER=claude
   ANTHROPIC_API_KEY=<your key>
   ```
   Restart `npm run functions:serve`.
5. **Make yourself an admin** (unlimited identifications). Identify one photo first so your account exists. Then open Supabase Studio at http://127.0.0.1:54323, find your user id under Authentication → Users, and run this in the SQL editor:
   ```sql
   update public.profiles set is_admin = true where id = '<your user id>';
   ```

## Where secrets live

| Secret | Where it goes | Committed? |
| --- | --- | --- |
| Claude API key, other provider keys | `supabase/functions/.env` (local) or `npx supabase secrets set` (hosted) | Never. The file is gitignored |
| Supabase publishable key, URL | `.env` (bundled into the app; designed to be public, protected by Row Level Security) | No. The file is gitignored |
| Supabase secret / service-role key | Provided to Edge Functions by Supabase automatically | Never |

The app itself never contains a provider key. Every push is scanned for leaked secrets by CI (gitleaks).

## Tests

```powershell
npm test         # core logic: taxonomy, tree layout, identification providers, sightings
npm run typecheck
```

`npm test` needs no `npm install`; it runs on Node 22.18+ directly.
