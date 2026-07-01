'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Ghost, Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8 inline-block p-6 bg-primary/10 rounded-2xl">
          <Ghost className="w-16 h-16 text-primary" />
        </div>
        <h1 className="text-6xl font-bold text-foreground mb-4">404</h1>
        <p className="text-xl text-foreground/60 mb-8">
          This page drifted off the causal graph. It either never existed, was
          pruned, or you don&rsquo;t have access to it.
        </p>
        <Link href="/">
          <Button size="lg" className="gap-2">
            <Home className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
