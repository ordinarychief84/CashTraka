import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/** GET /api/blog, list published blog posts */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const category = url.searchParams.get('category') || undefined;
  const take = Math.min(Number(url.searchParams.get('take')) || 20, 50);
  const skip = Number(url.searchParams.get('skip')) || 0;

  const where: Record<string, unknown> = { status: 'published' };
  if (category) where.category = category;

  const [posts, total] = await Promise.all([
    prisma.blogPost.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take,
      skip,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        coverImage: true,
        author: true,
        category: true,
        tags: true,
        publishedAt: true,
      },
    }),
    prisma.blogPost.count({ where }),
  ]);

  return NextResponse.json({ posts, total });
}
