import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Supabase credentials are missing. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to your environment.',
  );
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  auth: {
    storage: AsyncStorage as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export async function setSessionFromOAuthRedirect(redirectUrl: string) {
  const url = new URL(redirectUrl);
  // Prefer hash fragment (common for implicit flows) but fall back to search params
  const params = new URLSearchParams(url.hash?.startsWith('#') ? url.hash.slice(1) : url.search);
  const errorDescription = params.get('error_description') ?? params.get('error');

  if (errorDescription) {
    throw new Error(errorDescription);
  }

  let access_token = params.get('access_token');
  let refresh_token = params.get('refresh_token');

  // Some callback formats embed the tokens in an encoded value or nested URL.
  // Try a fallback regex search over the full redirect URL if tokens weren't found above.
  if ((!access_token || !refresh_token) && typeof redirectUrl === 'string') {
    const accessMatch = redirectUrl.match(/[#&?]access_token=([^&]+)/);
    const refreshMatch = redirectUrl.match(/[#&?]refresh_token=([^&]+)/);
    if (accessMatch) access_token = decodeURIComponent(accessMatch[1]);
    if (refreshMatch) refresh_token = decodeURIComponent(refreshMatch[1]);
  }

  // If we still don't have tokens, check if an authorization code was returned.
  const code = params.get('code');
  if (!access_token || !refresh_token) {
    // Helpful debug info for diagnosing different OAuth redirect shapes.
    const entries: Record<string, string> = {};
    for (const [k, v] of params.entries()) entries[k] = v;
    console.warn('setSessionFromOAuthRedirect: missing tokens. redirectUrl:', redirectUrl);
    console.warn('setSessionFromOAuthRedirect: parsed params:', entries);

    if (code) {
      throw new Error('OAuth callback returned an authorization code. A server-side exchange is required to obtain session tokens.');
    }

    throw new Error('OAuth callback did not return the required session tokens. See console for parsed params.');
  }

  const { error } = await supabase.auth.setSession({ access_token, refresh_token });
  if (error) throw error;
}

