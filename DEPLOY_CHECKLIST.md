# Deployment Checklist

## 1. Vercel
- [ ] Login to the correct Vercel account
- [ ] Open the target project
- [ ] Confirm GitHub repo is connected
- [ ] Confirm `main` is the production branch
- [ ] Add environment variables from `.env.production.example`
- [ ] Redeploy after env is set

## 2. Supabase
- [ ] Create or open Supabase project
- [ ] Copy project URL, anon key, and service role key
- [ ] Run all SQL migrations from `supabase/migrations/`
- [ ] Confirm tables exist: `products`, `product_files`, `site_content`
- [ ] Add admin emails to `ADMIN_EMAILS`
- [ ] Configure auth redirect URLs for production domain

## 3. Required Vercel env
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `NEXT_PUBLIC_SITE_URL`
- [ ] `ADMIN_EMAILS`
- [ ] `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- [ ] `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
- [ ] `GOOGLE_DRIVE_FOLDER_ID`

## 4. Security
- [ ] Do not commit `.env`, `.env.local`, or secrets
- [ ] Keep `.env.example` and `.env.production.example` as placeholders only
- [ ] Rotate any leaked private keys immediately

## 5. Smoke tests after deploy
- [ ] Home page loads
- [ ] Admin login works
- [ ] Product creation works
- [ ] Download route works
- [ ] Google Drive files load
- [ ] Build stays healthy

## 6. If deploy fails
- [ ] Read the first Vercel error message
- [ ] Fix only one missing or wrong variable at a time
- [ ] Redeploy and retest
