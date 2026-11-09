// Supabase client for remote mode. Uses the PUBLISHABLE key only (safe to ship; RLS
// protects data). Secret keys and AI provider keys never appear in the app.

import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { config } from '../config';

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(config.supabaseUrl && config.supabasePublishableKey);
}

export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      'Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env',
    );
  }
  if (!client) {
    const created = createClient(config.supabaseUrl, config.supabasePublishableKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    });
    if (Platform.OS !== 'web') {
      // Only refresh tokens while the app is in the foreground.
      AppState.addEventListener('change', (state) => {
        if (state === 'active') created.auth.startAutoRefresh();
        else created.auth.stopAutoRefresh();
      });
    }
    client = created;
  }
  return client;
}

/**
 * Makes sure there's a signed-in user, creating an anonymous account on first use.
 * Only called after the age screen has been passed, so no account exists for under-13s.
 */
export async function ensureSession(): Promise<void> {
  const supabase = getSupabase();
  const { data } = await supabase.auth.getSession();
  if (data.session) return;
  const { error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
}
