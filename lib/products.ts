import { adminClient } from '@/lib/supabase/admin';

/**
 * Server-only product reads. Uses the service-role client so the public
 * never needs SELECT on `product_files` (which holds Google Drive file
 * ids). Only safe columns (name/mime/size, never drive ids) are returned.
 * Callers are Server Components / Route Handlers — never client components.
 */
const PRODUCT_LIST_COLS = 'title,slug,short_description,price,currency,thumbnail_url,featured,created_at,category';
const PRODUCT_LIST_COLS_LEGACY = 'title,slug,short_description,price,currency,thumbnail_url,featured,created_at';

export async function listPublishedProducts(limit = 24) {
  const supabase = adminClient();
  const first = await supabase
    .from('products')
    .select(PRODUCT_LIST_COLS)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (!first.error) return first.data ?? [];
  // Pre-0008 databases lack the category column.
  const retry = await supabase
    .from('products')
    .select(PRODUCT_LIST_COLS_LEGACY)
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);
  return (retry.data ?? []).map((p) => ({ ...(p as object), category: 'Lainnya' }));
}

export async function getPublishedProduct(slug: string) {
  const supabase = adminClient();
  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (!product) return null;
  type Row = { id: string; name: string; google_drive_mime_type?: string | null; file_size?: number | null; downloads?: number | null; external_url?: string | null };
  let files: Row[] | null = null;
  const first = await supabase
    .from('product_files')
    .select('id,name,google_drive_mime_type,file_size,downloads,external_url')
    .eq('product_id', product.id);
  if (first.error) {
    // Pre-0005 databases lack the downloads column — degrade gracefully.
    const retry = await supabase
      .from('product_files')
      .select('id,name,google_drive_mime_type,file_size')
      .eq('product_id', product.id);
    files = (retry.data as Row[] | null) ?? null;
  } else {
    files = (first.data as Row[] | null) ?? null;
  }
  return { product, files: files ?? [] };
}
