'use client';

import { AlertCircle } from 'lucide-react';

/**
 * A consistent, human-first error banner.
 * Leads with what went wrong and what to do; keeps the raw
 * error available underneath for debugging.
 */
export function ErrorBanner({
  error,
  title = "Couldn't reach the node",
  hint = 'Check that your node is online and your endpoint and token are correct in Node settings.',
}: {
  error: unknown;
  title?: string;
  hint?: string;
}) {
  const detail =
    error instanceof Error ? error.message : error ? String(error) : '';
  return (
    <div className="mb-6 p-4 bg-destructive/5 border border-destructive/20 rounded-xl flex items-start gap-3">
      <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-destructive">{title}</p>
        <p className="text-sm text-foreground/60 mt-0.5">{hint}</p>
        {detail && (
          <p className="text-xs text-muted-foreground font-mono mt-2 break-all">
            {detail}
          </p>
        )}
      </div>
    </div>
  );
}
