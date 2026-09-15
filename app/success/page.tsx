import Link from 'next/link';

export default function SuccessPage({ searchParams }: { searchParams: { session_id?: string; order_id?: string } }) {
  const ref = searchParams.order_id ?? searchParams.session_id;
  return (
    <div className="container-x max-w-2xl py-16 text-center">
      <h1 className="text-3xl font-bold">Payment received 🎉</h1>
      <p className="mt-3 text-zinc-600">
        Your order is being confirmed via payment webhook. Your download links will appear in{' '}
        <Link href="/account" className="underline">My Account</Link> within a minute.
      </p>
      {ref ? <p className="mt-4 text-xs text-zinc-400">Ref: {ref.slice(0, 24)}…</p> : null}
      <div className="mt-6"><Link href="/account" className="btn-primary">Go to my downloads</Link></div>
    </div>
  );
}
