import { adminClient } from '@/lib/supabase/admin';

/**
 * Server-only product reads. Uses the service-role client so the public
 * never needs SELECT on `product_files` (which holds Google Drive file
 * ids). Only safe columns (name/mime/size, never drive ids) are returned.
 * Callers are Server Components / Route Handlers — never client components.
 */
export async function listPublishedProducts(limit = 24) {
  const supabase = adminClient();
  const { data } = await supabase
    .from('products')
    .select('title,slug,short_description,price,currency,thumbnail_url,featured,created_at')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(limit);
  return data ?? [];
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
  const { data: files } = await supabase
    .from('product_files')
    .select('id,name,google_drive_mime_type,file_size')
    .eq('product_id', product.id);
  return { product, files: files ?? [] };
}
