import { listPublishedProducts } from '@/lib/products';
import { ProductCard } from '@/components/ProductCard';

export const metadata = { title: 'Products' };

export default async function ProductsPage() {
  const products = await listPublishedProducts(60).catch(() => []);
  return (
    <div className="container-x py-10">
      <h1 className="text-3xl font-bold">All products</h1>
      <div className="mt-6 grid gap-5 sm:grid-cols-3">
        {products.map((p) => <ProductCard key={p.slug} p={{ ...p, price: Number(p.price) }} />)}
      </div>
      {!products.length ? <p className="mt-6 text-sm text-zinc-500">No published products yet. Add some from /admin.</p> : null}
    </div>
  );
}
