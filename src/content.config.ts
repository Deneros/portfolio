import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const projectSchema = z.object({
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
  galleryLayout: z.enum(['desktop', 'mobile']).default('desktop'),
  video: z.string().optional(),
  featured: z.boolean().default(false),
  order: z.number().default(99),
  lang: z.enum(['es', 'en']).default('es'),
  slug: z.string().optional(),
});

const blogSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.string(),
  tags: z.array(z.string()),
  readTime: z.string().optional(),
  draft: z.boolean().default(false),
  lang: z.enum(['es', 'en']).default('es'),
  slug: z.string().optional(),
});

const projects_es = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects/es' }),
  schema: projectSchema,
});

const projects_en = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/projects/en' }),
  schema: projectSchema,
});

const blog_es = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './src/content/blog/es' }),
  schema: blogSchema,
});

const blog_en = defineCollection({
  loader: glob({ pattern: '*.{md,mdx}', base: './src/content/blog/en' }),
  schema: blogSchema,
});

export const collections = { projects_es, projects_en, blog_es, blog_en };
