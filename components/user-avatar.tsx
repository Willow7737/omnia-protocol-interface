'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';

/**
 * User avatar with graceful fallback.
 *
 * GitHub and Google OAuth both put the photo URL in
 * user_metadata.avatar_url (Google also sets `picture`). Email
 * sign-ins have neither, so we fall back to the initial. A plain
 * <img> is used deliberately: images are unoptimized in next.config
 * and remote avatar hosts would otherwise need a remotePatterns
 * allowlist.
 */
export function UserAvatar({
  user,
  size = 36,
  className = '',
}: {
  user: User | null;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  const url =
    (user?.user_metadata?.avatar_url as string | undefined) ??
    (user?.user_metadata?.picture as string | undefined);
  const initial = (user?.email ?? '?')[0].toUpperCase();

  if (url && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        width={size}
        height={size}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`rounded-full object-cover border border-border shrink-0 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div
      className={`rounded-full bg-secondary border border-border flex items-center justify-center text-foreground/70 font-semibold shrink-0 ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(12, size * 0.4) }}
    >
      {initial}
    </div>
  );
}
