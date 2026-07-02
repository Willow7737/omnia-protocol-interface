'use client';

import { useState } from 'react';
import { useConfig } from '@/lib/config-context';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ConfigModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { config, setConfig } = useConfig();
  const [endpoint, setEndpoint] = useState(config?.endpoint || '');
  const [token, setToken] = useState(config?.token || '');
  const [error, setError] = useState('');

  const handleSave = () => {
    if (!endpoint.trim() || !token.trim()) {
      setError('Enter both an endpoint and a token.');
      return;
    }

    if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
      setError('The endpoint must start with http:// or https://.');
      return;
    }

    // setConfig persists to localStorage and cookies (middleware reads the cookies)
    setConfig({ endpoint, token });

    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect to a node</DialogTitle>
          <DialogDescription>
            Enter your Omnia node REST API endpoint and authentication token to get started.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="endpoint">API Endpoint</Label>
            <Input
              id="endpoint"
              placeholder="https://node.example.com"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Your node&apos;s HTTPS URL</p>
          </div>
          <div>
            <Label htmlFor="token">JWT Token</Label>
            <Input
              id="token"
              type="password"
              placeholder="eyJhbGciOiJIUzI1NiIs..."
              value={token}
              onChange={(e) => setToken(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-muted-foreground mt-1">Obtain this from your node operator</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="">
              Connect
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
