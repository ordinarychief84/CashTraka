import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

function slugify(text: string): string {
  return text.toLowerCase().trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** GET /api/admin/blog — list all blog posts */
export async function GET() {
  await requireAdmin();
  const posts = await prisma.blogPost.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ posts });
}

/** POST /api/admin/blog — create a blog post */
export async function POST(req: Request) {
  await requireAdmin();
  try {
    const body = await req.json();
    const { title, content, excerpt, coverImage, author, status, category, tags } = body;

    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
    }

    let slug = slugify(title);
    const existing = await prisma.blogPost.findUnique({ where: { slug } });
    if (existing) slug = slug + '-' + Date.now().toString(36);

    const post = await prisma.blogPost.create({
      data: {
        title: title.trim(),
        slug,
        content,
        excerpt: excerpt?.trim() || content.slice(0, 160).trim(),
        coverImage: coverImage || null,
        author: author?.trim() || 'CashTraka Team',
        status: status || 'draft',
        category: category?.trim() || 'general',
        tags: tags?.trim() || '',
        publishedAt: status === 'published' ? new Date() : null,
      },
    });

    return NextResponse.json({ post }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/blog error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
