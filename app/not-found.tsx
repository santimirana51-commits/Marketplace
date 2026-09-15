export default function NotFound() {
  return (
    <div className="container-x py-24 text-center">
      <h1 className="text-4xl font-bold">Not found</h1>
      <p className="mt-2 text-zinc-600">This page doesn&apos;t exist or the product is unpublished.</p>
      <a href="/products" className="btn-primary mt-6">Browse products</a>
    </div>
  );
}
