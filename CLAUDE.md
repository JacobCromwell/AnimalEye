# AnimalEye — working notes for Claude

Read `docs/PRODUCT_SPEC.md` first: it holds every decision so far and the open questions.

## Hard rules
- **Never commit secrets.** No API keys, passwords, tokens or connection strings in code, config, tests, docs or commit messages. AI provider keys live only on the server (platform secret storage in production, a gitignored `.env` locally). The client app never holds a provider key.
- `.env` files are gitignored. Commit only `.env.example`, which has variable names and no values.
- Identification goes through the provider interface. Never call a specific AI vendor from UI code. Normalize results to a taxon ID.

## Workflow
- Commit directly to `main` (owner's preference).
- The owner develops on Windows with VS Code, and tests in the browser and on iPhone and Android.
