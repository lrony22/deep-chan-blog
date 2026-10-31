import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    category: z.string().default('随笔'),
    cover: z.enum(['tide', 'window', 'moon', 'notebook', 'sea', 'ribbon']).default('tide'),
    draft: z.boolean().default(false),
    featured: z.boolean().default(false),
    demo: z.boolean().default(true),
  }),
});

export const collections = { blog };
