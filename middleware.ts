import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

function loginRedirect(req: NextRequest) {
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  return NextResponse.redirect(url);
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isProtected = pathname.startsWith('/admin');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  // Fail-closed without ever throwing: if env is missing (e.g. env-less
  // preview), auth cannot be verified, so protected routes go to /login
  // and public routes pass through. Prevents 500 MIDDLEWARE_INVOCATION_FAILED.
  if (!supabaseUrl || !supabaseAnonKey) {
    return isProtected ? loginRedirect(req) : NextResponse.next();
  }
  try {
    const res = NextResponse.next();
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies: { name: string; value: string; options?: object }[]) =>
          cookies.forEach((c) => res.cookies.set(c.name, c.value, c.options)),
      },
    });
    await supabase.auth.getUser(); // refresh session cookie
    if (isProtected) {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return loginRedirect(req);
    }
    return res;
  } catch {
    return isProtected ? loginRedirect(req) : NextResponse.next();
  }
}

export const config = { matcher: ['/admin/:path*'] };
