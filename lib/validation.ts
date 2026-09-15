import { z } from 'zod';

export const checkoutSchema = z.object({
  items: z
    .array(z.object({ slug: z.string().min(1).max(200), quantity: z.number().int().min(1).max(10) }))
    .min(1)
    .max(20),
  customerEmail: z.string().email().optional(),
});

export const adminProductSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9-]+$/, 'slug must be lowercase alphanumeric + dashes'),
  description: z.string().max(20000).default(''),
  short_description: z.string().max(500).default(''),
  price: z.number().min(0).max(1000000),
  currency: z.string().length(3).default('USD'),
  thumbnail_url: z.string().url().optional().or(z.literal('').transform(() => undefined)),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  featured: z.boolean().default(false),
});

export const adminFileSchema = z.object({
  name: z.string().min(1).max(300),
  google_drive_file_id: z.string().min(5).max(300),
});

export function errResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}
