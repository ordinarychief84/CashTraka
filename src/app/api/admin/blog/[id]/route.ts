import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

type Ctx = { params: Promise<{ id: string }> };

/** GET /api/admin/blog/[id] */
export async function GET(_req: Request, ctx: Ctx) {
  await requireAdmin();
  const { id } = await ctx.params;
  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ post });
}

/** PATCH /api/admin/blog/[id], update a blog post */
export async function PATCH(req: Request, ctx: Ctx) {
  await requireAdmin();
  const { id } = await ctx.params;
  try {
    const body = await req.json();
    const { title, content, excerpt, coverImage, author, status, category, tags } = body;

    const existing = await prisma.blogPost.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const data: Record<string, unknown> = {};
    if (title !== undefined) data.title = title.trim();
    if (content !== undefined) data.content = content;
    if (excerpt !== undefined) data.excerpt = excerpt.trim();
    if (coverImage !== undefined) data.coverImage = coverImage || null;
    if (author !== undefined) data.author = author.trim();
    if (category !== undefined) data.category = category.trim();
    if (tags !== undefined) data.tags = tags.trim();

    if (status !== undefined) {
      data.status = status;
      if (status === 'published' && !existing.publishedAt) {
        data.publishedAt = new Date();
      }
      if (status === 'draft') {
        data.publishedAt = null;
      }
    }

    const post = await prisma.blogPost.update({ where: { id }, data });
    return NextResponse.json({ post });
  } catch (err) {
    console.error('PATCH /api/admin/blog/[id] error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

/** DELETE /api/admin/blog/[id] */
export async function DELETE(_req: Request, ctx: Ctx) {
  await requireAdmin();
  const { id } = await ctx.params;
  try {
    await prisma.blogPost.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Not found or already deleted' }, { status: 404 });
  }
}
