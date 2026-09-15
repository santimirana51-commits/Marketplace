import { notFound, redirect } from 'next/navigation';
import { getSessionUser, isAdminEmail } from '@/lib/auth';
import { adminClient } from '@/lib/supabase/admin';
import { AdminProductEditor } from '@/components/AdminProductEditor';

export default async function EditProduct({ params }: { params: { id: string } }) {
  const user = await getSessionUser();
  if (!user || !isAdminEmail(user.email)) redirect('/login');
  const admin = adminClient();
  const { data: product } = await admin.from('products').select('*').eq('id', params.id).maybeSingle();
  if (!product) notFound();
  const { data: files } = await admin.from('product_files').select('*').eq('product_id', params.id);
  return (
    <div className="container-x max-w-3xl py-10">
      <h1 className="text-3xl font-bold">Edit product</h1>
      <AdminProductEditor product={product} files={files ?? []} />
    </div>
  );
}
