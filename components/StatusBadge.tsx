const STYLES: Record<string, string> = {
  paid: 'bg-green-100 text-green-700',
  succeeded: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  failed: 'bg-red-100 text-red-700',
  cancelled: 'bg-red-100 text-red-700',
  refunded: 'bg-zinc-200 text-zinc-700',
  draft: 'bg-zinc-200 text-zinc-700',
  published: 'bg-green-100 text-green-700',
  archived: 'bg-zinc-200 text-zinc-700',
};

/** Small status pill, shared by account + admin (server-safe, no JS). */
export function StatusBadge({ status }: { status: string }) {
  const cls = STYLES[status] ?? 'bg-zinc-200 text-zinc-700';
  return (
    <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold capitalize ${cls}`}>
      {status}
    </span>
  );
}
