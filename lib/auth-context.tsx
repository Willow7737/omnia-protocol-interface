'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { createClient } from './supabase-browser';
import { APIClient } from './api-client';

/**
 * Auth context — bridges Supabase Auth with the Omnia node's JWT auth.
 *
 * Flow:
 *   1. User logs in via Supabase (GitHub / Google / email)
 *   2. This provider detects the Supabase session
 *   3. It calls /api/auth/session to mint a node JWT signed with
 *      OMNIA_JWT_SECRET (server-side — the secret never reaches the browser)
 *   4. The returned { did, nodeJwt } is stored in state
 *   5. The APIClient is constructed with the node endpoint (from localStorage)
 *      and the minted JWT
 *
 * If Supabase is not configured (no env vars), the app falls back to
 * manual mode — the user enters endpoint + JWT in the config modal.
 */

interface AuthState {
  // Supabase auth state
  supabaseUser: User | null;
  did: string | null;
  nodeJwt: string | null;

  // Node endpoint (entered by user, stored in localStorage)
  nodeEndpoint: string | null;

  // Combined API client (null if not fully configured)
  apiClient: APIClient | null;

  // Auth status
  isLoading: boolean;          // true while checking Supabase session
  isSupabaseConfigured: boolean; // false if env vars are missing
  isConfigured: boolean;       // true when both endpoint + JWT are present (can make API calls)

  // Auth actions
  signInWithGitHub: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;

  // Manual mode (fallback when Supabase isn't configured)
  setManualConfig: (endpoint: string, token: string) => void;

  // ── Compatibility fields (for useConfig() consumers) ──────────────
  // The old ConfigProvider exposed { config, setConfig }. These fields
  // let existing pages work without changes.
  /** Backward-compatible config object: { endpoint, token } */
  config: { endpoint: string; token: string } | null;
  /** Backward-compatible setter — calls setManualConfig under the hood */
  setConfig: (config: { endpoint: string; token: string }) => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

const ENDPOINT_KEY = 'omnia-node-endpoint';
const MANUAL_JWT_KEY = 'omnia-manual-jwt';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<User | null>(null);
  const [did, setDid] = useState<string | null>(null);
  const [nodeJwt, setNodeJwt] = useState<string | null>(null);
  const [nodeEndpoint, setNodeEndpoint] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isSupabaseConfigured =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Load endpoint + manual JWT from localStorage on mount
  useEffect(() => {
    const endpoint = localStorage.getItem(ENDPOINT_KEY);
    const manualJwt = localStorage.getItem(MANUAL_JWT_KEY);
    if (endpoint) setNodeEndpoint(endpoint);
    if (manualJwt && !isSupabaseConfigured) setNodeJwt(manualJwt);
  }, [isSupabaseConfigured]);

  // Listen to Supabase auth state changes
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session);
      setIsLoading(false);
    });

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleSession(session);
    });

    return () => subscription.unsubscribe();
  }, [isSupabaseConfigured]);

  // When we have a Supabase session, mint a node JWT
  const handleSession = useCallback(async (session: Session | null) => {
    if (!session) {
      setSupabaseUser(null);
      setDid(null);
      setNodeJwt(null);
      return;
    }

    setSupabaseUser(session.user);

    // Call the server route to mint a node JWT
    try {
      const res = await fetch('/api/auth/session', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!res.ok) {
        console.error('Failed to mint node JWT:', await res.text());
        return;
      }

      const data = await res.json();
      setDid(data.did);
      setNodeJwt(data.nodeJwt);
    } catch (e) {
      console.error('Error minting node JWT:', e);
    }
  }, []);

  // Auth actions
  const signInWithGitHub = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : '/' },
    });
  }, [isSupabaseConfigured]);

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : '/' },
    });
  }, [isSupabaseConfigured]);

  const signInWithEmail = useCallback(async (email: string) => {
    if (!isSupabaseConfigured) return;
    const supabase = createClient();
    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: typeof window !== 'undefined' ? window.location.origin : '/' },
    });
  }, [isSupabaseConfigured]);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured) {
      const supabase = createClient();
      await supabase.auth.signOut();
    }
    setSupabaseUser(null);
    setDid(null);
    setNodeJwt(null);
    localStorage.removeItem(MANUAL_JWT_KEY);
  }, [isSupabaseConfigured]);

  // Manual mode (fallback)
  const setManualConfig = useCallback((endpoint: string, token: string) => {
    setNodeEndpoint(endpoint);
    setNodeJwt(token);
    localStorage.setItem(ENDPOINT_KEY, endpoint);
    localStorage.setItem(MANUAL_JWT_KEY, token);
  }, []);

  // Update endpoint without changing auth
  const setEndpoint = useCallback((endpoint: string) => {
    setNodeEndpoint(endpoint);
    localStorage.setItem(ENDPOINT_KEY, endpoint);
  }, []);

  // Construct the API client when we have both endpoint + JWT
  const apiClient =
    nodeEndpoint && nodeJwt ? new APIClient(nodeEndpoint, nodeJwt) : null;

  // Determine if the user is "configured" (can make API calls)
  const isConfigured = !!apiClient;

  // Backward-compatible config object
  const config = nodeEndpoint
    ? { endpoint: nodeEndpoint, token: nodeJwt ?? '' }
    : null;

  // Backward-compatible setter
  const setConfig = useCallback(
    (cfg: { endpoint: string; token: string }) => {
      setManualConfig(cfg.endpoint, cfg.token);
    },
    [setManualConfig],
  );

  const value: AuthState & { setEndpoint: (e: string) => void } = {
    supabaseUser,
    did,
    nodeJwt,
    nodeEndpoint,
    apiClient,
    isLoading,
    isSupabaseConfigured,
    isConfigured,
    signInWithGitHub,
    signInWithGoogle,
    signInWithEmail,
    signOut,
    setManualConfig,
    setEndpoint,
    config,
    setConfig,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
}
