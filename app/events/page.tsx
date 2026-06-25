'use client';

import { useConfig } from '@/lib/config-context';
import { Sidebar } from '@/components/sidebar';
import { ConfigModal } from '@/components/config-modal';
import { useState } from 'react';
import useSWR from 'swr';
import { Event } from '@/lib/api-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Activity, Zap, ChevronDown, ChevronUp } from 'lucide-react';

export default function EventsPage() {
  const { isConfigured, apiClient } = useConfig();
  const [configOpen, setConfigOpen] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  const { data: events, error: eventsError } = useSWR<Event[]>(
    isConfigured ? 'events-list' : null,
    async () => apiClient!.getEvents(200),
    { refreshInterval: 5000, revalidateOnFocus: false }
  );

  if (!isConfigured) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Not Connected</h2>
            <p className="text-foreground/60 mb-4">Please configure your node connection</p>
          </div>
        </div>
        <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
      </div>
    );
  }

  const eventTypes = events ? Array.from(new Set(events.map((e) => e.event_type))) : [];
  const eventCounts = eventTypes.reduce(
    (acc, type) => {
      acc[type] = (events?.filter((e) => e.event_type === type) || []).length;
      return acc;
    },
    {} as Record<string, number>
  );

  const toggleExpanded = (id: string) => {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <div className="border-b border-border px-8 py-6">
          <h1 className="text-3xl font-bold text-foreground">Events</h1>
          <p className="text-foreground/60">Network events and transactions</p>
        </div>

        <div className="flex-1 overflow-auto p-8">
          {eventsError && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <p className="text-destructive text-sm">{String(eventsError)}</p>
            </div>
          )}

          {/* Event Type Distribution */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-foreground mb-4">Event Types</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {eventTypes.map((type) => (
                <Card key={type} className="bg-card/50">
                  <CardContent className="pt-6">
                    <p className="text-xs text-foreground/60 mb-2 truncate">{type}</p>
                    <p className="text-2xl font-bold text-primary">{eventCounts[type]}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Events List */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-bold text-foreground">Recent Events ({events?.length || 0})</h2>
            </div>

            <div className="space-y-3">
              {events && events.length > 0 ? (
                events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    expanded={expandedEvents.has(event.id)}
                    onToggle={() => toggleExpanded(event.id)}
                  />
                ))
              ) : (
                <Card className="bg-card/50">
                  <CardContent className="pt-6">
                    <p className="text-foreground/60 text-sm">No events found</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
      <ConfigModal open={configOpen} onOpenChange={setConfigOpen} />
    </div>
  );
}

function EventCard({
  event,
  expanded,
  onToggle,
}: {
  event: Event;
  expanded: boolean;
  onToggle: () => void;
}) {
  const getEventColor = (type: string) => {
    if (type.includes('Block')) return 'bg-blue-500/10 border-blue-500/30';
    if (type.includes('Vote')) return 'bg-purple-500/10 border-purple-500/30';
    if (type.includes('Proposal')) return 'bg-yellow-500/10 border-yellow-500/30';
    if (type.includes('Slash')) return 'bg-red-500/10 border-red-500/30';
    if (type.includes('Transfer')) return 'bg-green-500/10 border-green-500/30';
    return 'bg-gray-500/10 border-gray-500/30';
  };

  const getEventBadgeColor = (type: string) => {
    if (type.includes('Block')) return 'bg-blue-500/20 text-blue-300';
    if (type.includes('Vote')) return 'bg-purple-500/20 text-purple-300';
    if (type.includes('Proposal')) return 'bg-yellow-500/20 text-yellow-300';
    if (type.includes('Slash')) return 'bg-red-500/20 text-red-300';
    if (type.includes('Transfer')) return 'bg-green-500/20 text-green-300';
    return 'bg-gray-500/20 text-gray-300';
  };

  return (
    <div className={`border rounded-lg transition-all cursor-pointer ${getEventColor(event.event_type)}`} onClick={onToggle}>
      <div className="p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getEventBadgeColor(event.event_type)}`}>
                {event.event_type}
              </span>
              <span className="text-xs text-foreground/50">from {event.source}</span>
            </div>
            <div className="flex items-center justify-between">
              <code className="text-xs font-mono text-foreground/60">{event.id.slice(0, 20)}...</code>
              <span className="text-xs text-foreground/50">{new Date(event.timestamp).toLocaleString()}</span>
            </div>
          </div>
          <div className="flex-shrink-0">
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-foreground/60" />
            ) : (
              <ChevronDown className="w-4 h-4 text-foreground/60" />
            )}
          </div>
        </div>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-current border-opacity-20">
            <div className="bg-background/50 rounded p-3">
              <pre className="text-xs font-mono text-foreground/70 overflow-x-auto whitespace-pre-wrap break-words">
                {JSON.stringify(event.data, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
