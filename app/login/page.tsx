'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Network, Mail, ArrowRight, Info, LogIn, Loader2, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const { isSupabaseConfigured, signInWithGitHub, signInWithGoogle, signInWithEmail, isAwaitingEmail, stopEmailAwait } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState<'github' | 'google' | 'email' | null>(null);

  // Show error if callback failed
  const callbackError = searchParams.get('error');

  // When isAwaitingEmail flips true, show the "check your email" UI.
  // When it flips false (session detected or user cancelled), hide it.
  useEffect(() => {
    if (isAwaitingEmail) setEmailSent(true);
  }, [isAwaitingEmail]);

  if (!isSupabaseConfigured) {
    // Supabase not configured — show instructions
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-6 inline-block p-4 bg-primary/10 rounded-lg">
            <Network className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-foreground">Omnia Protocol</h1>
          <p className="text-foreground/60 mb-8">
            Supabase is not configured. Using manual mode instead.
          </p>
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-left text-sm text-foreground/70 mb-6">
            <p className="font-semibold text-foreground mb-2">To enable user accounts:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Create a project at <a href="https://supabase.com" className="text-primary underline" target="_blank" rel="noopener">supabase.com</a></li>
              <li>Copy <code>.env.local.example</code> to <code>.env.local</code></li>
              <li>Fill in your Supabase URL + keys</li>
              <li>Run <code>supabase/schema.sql</code> in the SQL Editor</li>
              <li>Restart <code>npm run dev</code></li>
            </ol>
          </div>
          <Button onClick={() => router.push('/')} className="w-full">
            Continue in Manual Mode
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  const handleGitHub = async () => {
    setLoading('github');
    try {
      await signInWithGitHub();
    } finally {
      setLoading(null);
    }
  };

  const handleGoogle = async () => {
    setLoading('google');
    try {
      await signInWithGoogle();
    } finally {
      setLoading(null);
    }
  };

  const handleEmail = async () => {
    if (!email) return;
    setLoading('email');
    try {
      await signInWithEmail(email);
      setEmailSent(true);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="mb-4 inline-block p-4 bg-primary/10 rounded-lg">
            <Network className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2 text-foreground">Omnia Protocol</h1>
          <p className="text-foreground/60">
            Sign in to access the dashboard, comment on proposals, and track your activity.
          </p>
        </div>

        {/* OAuth buttons */}
        <div className="space-y-3 mb-6">
          <Button
            onClick={handleGitHub}
            disabled={loading !== null}
            variant="outline"
            className="w-full"
          >
            <LogIn className="w-5 h-5 mr-2" />
            {loading === 'github' ? 'Redirecting...' : 'Continue with GitHub'}
          </Button>
          <Button
            onClick={handleGoogle}
            disabled={loading !== null}
            variant="outline"
            className="w-full"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {loading === 'google' ? 'Redirecting...' : 'Continue with Google'}
          </Button>
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-background px-2 text-foreground/40">or</span>
          </div>
        </div>

        {/* Email magic link */}
        {emailSent ? (
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg text-sm">
            <div className="flex items-center gap-2 text-blue-300 mb-2">
              {isAwaitingEmail ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Info className="w-4 h-4" />
              )}
              <span className="font-medium">
                {isAwaitingEmail ? 'Waiting for confirmation…' : 'Magic link sent'}
              </span>
            </div>
            <p className="text-foreground/70 text-xs mb-3">
              Check your email ({email}) and click the magic link. This page will
              automatically detect your sign-in within a few seconds of you clicking
              the link — no refresh needed.
            </p>
            {isAwaitingEmail && (
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={() => {
                  stopEmailAwait();
                  setEmailSent(false);
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
              />
            </div>
            <Button
              onClick={handleEmail}
              disabled={loading !== null || !email}
              variant="outline"
              className="w-full"
            >
              <Mail className="w-4 h-4 mr-2" />
              {loading === 'email' ? 'Sending...' : 'Send Magic Link'}
            </Button>
          </div>
        )}

        {/* Callback error */}
        {callbackError && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Sign-in failed: {callbackError}. Check your Supabase project&apos;s
              redirect URL settings — make sure{' '}
              <code>{typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback</code>{' '}
              is in the allowed list.
            </span>
          </div>
        )}

        <p className="text-xs text-foreground/40 text-center mt-6">
          By signing in, you agree to create an Omnia DID linked to your account.
          A node JWT will be minted automatically — no manual token needed.
        </p>
      </div>
    </div>
  );
}
