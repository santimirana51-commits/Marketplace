import { getPublishedProduct } from '@/lib/products';

export async function GET(_: Request, { params }: { params: { slug: string } }) {
  const found = await getPublishedProduct(params.slug).catch(() => null);
  if (!found) return Response.json({ error: 'Not found' }, { status: 404 });
  return Response.json(found);
}
