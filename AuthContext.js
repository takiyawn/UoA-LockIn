import { createContext, useContext, useEffect, useState } from 'react';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from './supabase';

WebBrowser.maybeCompleteAuthSession();

const ALLOWED_DOMAIN = 'aucklanduni.ac.nz';
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  async function signInWithGoogle() {
    const redirectTo = AuthSession.makeRedirectUri({ scheme: 'uoastudyspaces' });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

    if (result.type !== 'success') return { cancelled: true };

    const rawUrl = result.url;
    const normalized = rawUrl.includes('#') ? rawUrl.replace('#', '?') : rawUrl;
    const url = new URL(normalized);

    const access_token = url.searchParams.get('access_token');
    const refresh_token = url.searchParams.get('refresh_token');

    if (!access_token || !refresh_token) {
      throw new Error('Sign in failed. Only @aucklanduni.ac.nz accounts are allowed.');
    }

    const { data: sessionData, error: setError } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (setError) throw setError;

    const email = sessionData.session?.user?.email ?? '';
    if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
      await supabase.auth.signOut();
      throw new Error(`Only @${ALLOWED_DOMAIN} accounts are allowed.`);
    }

    return { cancelled: false };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{ session, loading, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}