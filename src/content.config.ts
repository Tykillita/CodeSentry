import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { glob } from 'astro/loaders';

const copy = z.object({
  title: z.string(), subtitle: z.string(), summary: z.string(), context: z.string(),
  features: z.array(z.string()).min(2), architecture: z.string(),
  decisions: z.array(z.string()).min(1), flow: z.array(z.string()).min(3).max(5),
  credit: z.string().optional(), note: z.string().optional(),
});
const projects = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/projects' }),
  schema: z.object({
    slug: z.string(), order: z.number().int().min(1).max(16),
    area: z.enum(['tools', 'operations', 'business', 'experiences']),
    visual: z.enum(['sleep', 'network', 'team', 'habits', 'court', 'documents', 'route', 'quote', 'vet', 'carwash', 'data', 'food', 'week', 'alert', 'video', 'game']),
    platforms: z.array(z.string()), technologies: z.array(z.string()),
    links: z.array(z.object({ type: z.enum(['demo', 'repo', 'docs']), url: z.url() })).default([]),
    media: z.array(z.object({ es: z.string(), en: z.string(), type: z.enum(['capture', 'frame', 'presentation']) })).default([]),
    es: copy, en: copy,
  }),
});
export const collections = { projects };
