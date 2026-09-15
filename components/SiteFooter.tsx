export function SiteFooter() {
  return (
    <footer className="mt-16 border-t bg-zinc-50">
      <div className="container-x grid gap-8 py-10 sm:grid-cols-3">
        <div>
          <p className="font-bold">Pixelbay.</p>
          <p className="mt-2 text-sm text-zinc-600">Original digital products with instant, secure delivery. Files stream privately — never public Drive links.</p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Shop</p>
          <ul className="mt-2 space-y-1 text-zinc-600">
            <li><a href="/products" className="hover:underline">All products</a></li>
            <li><a href="/account" className="hover:underline">My downloads</a></li>
            <li><a href="/cart" className="hover:underline">Cart</a></li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Trust</p>
          <ul className="mt-2 space-y-1 text-zinc-600">
            <li>Stripe-verified payments only</li>
            <li>Hashed, expiring download tokens</li>
            <li>No account sharing of Drive files</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
