import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    longDescription: z.string().optional(),
    status: z.enum(['production', 'mvp', 'development', 'design']),
    statusLabel: z.string(),
    stack: z.array(z.string()),
    tags: z.array(z.string()),
    github: z.string().optional(),
    demo: z.string().optional(),
    image: z.string().optional(),
    gallery: z.array(z.string()).optional(),
    featured: z.boolean().default(false),
    order: z.number().default(99),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.string(),
    tags: z.array(z.string()),
    readTime: z.string().optional(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, blog };
