'use client';

import { useState, useEffect, useCallback } from 'react';
import useSWR from 'swr';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MessageSquare, Send, User } from 'lucide-react';

interface Comment {
  id: string;
  proposal_id: string;
  user_id: string;
  did: string;
  body: string;
  created_at: string;
}

interface CommentsProps {
  proposalId: string;
  /** Whether the user is authenticated (can post). If false, shows a "sign in to comment" hint. */
  canComment: boolean;
}

const commentsFetcher = async (url: string): Promise<Comment[]> => {
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return data.comments ?? [];
};

/**
 * Proposal comments section — fetches and displays off-chain discussion
 * from Supabase. Comments are stored in the `proposal_comments` table
 * and are fully Supabase-owned (the node has no concept of comments).
 */
export function Comments({ proposalId, canComment }: CommentsProps) {
  const { data: comments, mutate } = useSWR<Comment[]>(
    `/api/comments?proposalId=${encodeURIComponent(proposalId)}`,
    commentsFetcher,
    { refreshInterval: 30000 },
  );

  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async () => {
    if (!body.trim()) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ proposalId, body: body.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `HTTP ${res.status}`);
      }
      setBody('');
      mutate();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  }, [body, proposalId, mutate]);

  return (
    <div className="mt-4 pt-4 border-t border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <MessageSquare className="w-4 h-4 text-foreground/60" />
        <span className="text-sm font-medium text-foreground/60">
          Discussion ({comments?.length ?? 0})
        </span>
      </div>

      {/* Existing comments */}
      <div className="space-y-2 mb-4">
        {comments && comments.length > 0 ? (
          comments.map((c) => (
            <div
              key={c.id}
              className="p-3 bg-background/50 rounded-lg border border-border/30"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-3 h-3 text-primary" />
                </div>
                <code className="text-xs font-mono text-primary">{c.did}</code>
                <span className="text-xs text-foreground/40">
                  {new Date(c.created_at).toLocaleString()}
                </span>
              </div>
              <p className="text-sm text-foreground/80 whitespace-pre-wrap break-words">
                {c.body}
              </p>
            </div>
          ))
        ) : (
          <p className="text-xs text-foreground/40 italic">No comments yet.</p>
        )}
      </div>

      {/* New comment form */}
      {canComment ? (
        <div className="space-y-2">
          <Label htmlFor={`comment-${proposalId}`} className="text-xs">
            Add a comment
          </Label>
          <div className="flex gap-2">
            <Input
              id={`comment-${proposalId}`}
              placeholder="Share your thoughts on this proposal..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={2000}
              className="flex-1 text-sm"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={submitting || !body.trim()}
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <p className="text-xs text-foreground/40">
            Press Enter to send. Max 2000 characters. Comments are stored in Supabase
            (off-chain) and visible to everyone.
          </p>
        </div>
      ) : (
        <p className="text-xs text-foreground/40 italic">
          Sign in to add a comment.
        </p>
      )}
    </div>
  );
}
