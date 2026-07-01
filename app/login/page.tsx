'use client';

import { useState, useEffect, Suspense } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Network, Mail, ArrowRight, Info, LogIn, Loader2, AlertCircle, Shield } from 'lucide-react';

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

  const callbackError = searchParams.get('error');
  const nextPath = searchParams.get('next') || '/';

  useEffect(() => {
    if (isAwaitingEmail) setEmailSent(true);
  }, [isAwaitingEmail]);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-card flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="mb-6 inline-block p-5 bg-primary/10 rounded-2xl glow">
            <Network className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2 gradient-text">Omnia Protocol</h1>
          <p className="text-foreground/50 mb-8">
            Supabase is not configured. Using manual mode instead.
          </p>
          <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl text-left text-sm text-foreground/70 mb-6">
            <p className="font-semibold text-foreground mb-2">To enable user accounts:</p>
            <ol className="list-decimal list-inside space-y-1">
              <li>Create a project at <a href="https://supabase.com" className="text-primary underline" target="_blank" rel="noopener">supabase.com</a></li>
              <li>Copy <code className="text-xs">.env.example</code> to <code className="text-xs">.env.local</code></li>
              <li>Fill in your Supabase URL + keys</li>
              <li>Run <code className="text-xs">supabase/schema.sql</code> in the SQL Editor</li>
              <li>Restart <code className="text-xs">npm run dev</code></li>
            </ol>
          </div>
          <Button onClick={() => router.push(nextPath)} className="w-full gap-2" size="lg">
            Continue in Manual Mode
            <ArrowRight className="w-4 h-4" />
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
      {/* Ambient glow */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-md w-full relative">
        {/* Logo + heading */}
        <div className="text-center mb-8">
          <div className="mb-5 inline-block p-5 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl glow">
            <Network className="w-12 h-12 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-2 gradient-text">Omnia Protocol</h1>
          <p className="text-foreground/50">
            Sign in to access the dashboard, comment on proposals, and track your activity.
          </p>
        </div>

        {/* OAuth buttons */}
        <div className="space-y-3 mb-6">
          <Button
            onClick={handleGitHub}
            disabled={loading !== null}
            variant="outline"
            className="w-full h-12 gap-3 glass hover:glow transition-all"
            size="lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
            {loading === 'github' ? 'Redirecting...' : 'Continue with GitHub'}
          </Button>
          <Button
            onClick={handleGoogle}
            disabled={loading !== null}
            variant="outline"
            className="w-full h-12 gap-3 glass hover:glow transition-all"
            size="lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
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
            <span className="bg-background px-3 text-foreground/30">or</span>
          </div>
        </div>

        {/* Email magic link */}
        {emailSent ? (
          <div className="p-5 bg-primary/10 border border-primary/20 rounded-xl text-sm">
            <div className="flex items-center gap-2 text-primary mb-2">
              {isAwaitingEmail ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Info className="w-4 h-4" />
              )}
              <span className="font-medium">
                {isAwaitingEmail ? 'Waiting for confirmation…' : 'Magic link sent'}
              </span>
            </div>
            <p className="text-foreground/60 text-xs mb-3">
              Check your email ({email}) and click the magic link. This page will
              automatically detect your sign-in within a few seconds — no refresh needed.
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
              <Label htmlFor="email" className="text-xs text-foreground/50">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 h-12 glass"
              />
            </div>
            <Button
              onClick={handleEmail}
              disabled={loading !== null || !email}
              variant="outline"
              className="w-full h-12 gap-2 glass hover:glow transition-all"
              size="lg"
            >
              <Mail className="w-4 h-4" />
              {loading === 'email' ? 'Sending...' : 'Send Magic Link'}
            </Button>
          </div>
        )}

        {/* Callback error */}
        {callbackError && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>
              Sign-in failed: {callbackError}. Check your Supabase project's
              redirect URL settings — make sure{' '}
              <code className="text-xs">{typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback</code>{' '}
              is in the allowed list.
            </span>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-foreground/30">
          <Shield className="w-3 h-3" />
          <span>Secure authentication via Supabase Auth</span>
        </div>
        <p className="text-xs text-foreground/30 text-center mt-2">
          By signing in, you agree to create an Omnia DID linked to your account.
          A node JWT will be minted automatically.
        </p>
      </div>
    </div>
  );
}
