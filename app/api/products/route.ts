import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('products')
    .select('title,slug,short_description,price,currency,thumbnail_url,featured')
    .eq('status', 'published')
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) return Response.json({ error: 'Failed to load' }, { status: 500 });
  return Response.json({ products: data });
}
