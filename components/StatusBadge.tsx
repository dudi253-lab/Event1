import type { EventStatus } from '@/lib/mock-data';

const labels: Record<EventStatus, string> = {
  draft: 'Draft',
  ready: 'Ready',
  live: 'Live',
  post_event: 'Post Event',
  archived: 'Archived',
};

export function StatusBadge({ status }: { status: EventStatus }) {
  return <span className={`status status-${status}`}>{labels[status]}</span>;
}
