// App configuration from EXPO_PUBLIC_* variables (see .env.example).
// These are inlined into the bundle at build time and are PUBLIC. Never read secrets here.
// Expo only inlines `process.env.EXPO_PUBLIC_*` written out in full, so keep the dot syntax.

export type IdentifierMode = 'local-mock' | 'remote';

export const config = {
  identifierMode: (process.env.EXPO_PUBLIC_IDENTIFIER_MODE === 'remote' ? 'remote' : 'local-mock') as IdentifierMode,
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? '',
  supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? '',
  allowUserCorrections: process.env.EXPO_PUBLIC_ALLOW_USER_CORRECTIONS !== 'false',
};
