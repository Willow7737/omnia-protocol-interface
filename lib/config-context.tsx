'use client';

/**
 * Compatibility layer — re-exports the auth context as the config context.
 *
 * Originally the app used a simple ConfigProvider that held {endpoint, token}
 * in localStorage. With Supabase integration, auth is now handled by
 * AuthProvider (Supabase session → node JWT minting). To avoid rewriting
 * every page that calls useConfig(), this module re-exports the auth
 * context under the old names.
 *
 * Existing pages that call useConfig() continue to work — they get
 * { isConfigured, apiClient, config, setConfig } where:
 *   - config = { endpoint, token } (derived from auth state)
 *   - setConfig = setManualConfig (fallback for non-Supabase mode)
 *
 * New pages should use useAuth() directly to access the full auth state.
 */

export { AuthProvider as ConfigProvider, useAuth as useConfig } from './auth-context';
