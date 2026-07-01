'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { Home } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <Image src="/omnia-mark.png" alt="" width={64} height={64} className="mx-auto mb-8 opacity-40" />
        <h1 className="font-mono text-5xl font-bold text-foreground mb-4">404</h1>
        <p className="text-lg text-muted-foreground mb-8">
          This page drifted off the causal graph. It either never existed, was
          pruned, or you don&rsquo;t have access to it.
        </p>
        <Link href="/">
          <Button size="lg" className="gap-2">
            <Home className="w-4 h-4" />
            Back to dashboard
          </Button>
        </Link>
      </div>
    </div>
  );
}
