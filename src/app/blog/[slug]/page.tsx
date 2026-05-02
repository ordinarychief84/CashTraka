import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Calendar, User, Tag } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });
  if (!post || post.status !== 'published') return { title: 'Post not found' };
  const appUrl = process.env.APP_URL || 'https://cashtraka.com';
  const description = post.metaDescription || post.excerpt || `Read ${post.title} on CashTraka Blog`;
  const ogImage = post.ogImage || post.coverImage || `${appUrl}/icon-512.png`;
  return {
    title: post.ogTitle || `${post.title} | CashTraka Blog`,
    description,
    openGraph: {
      title: post.ogTitle || post.title,
      description,
      type: 'article',
      publishedTime: post.publishedAt?.toISOString(),
      authors: [post.author],
      images: ogImage ? [{ url: ogImage, width: 1200, height: 630 }] : [],
      url: `${appUrl}/blog/${post.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.ogTitle || post.title,
      description,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await prisma.blogPost.findUnique({ where: { slug } });

  if (!post || post.status !== 'published') notFound();

  const tags = post.tags
    ? post.tags.split(',').map((t) => t.trim()).filter(Boolean)
    : [];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white">
        {/* Back link */}
        <div className="border-b bg-slate-50">
          <div className="mx-auto max-w-3xl px-4 py-3">
            <Link
              href="/blog"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition"
            >
              <ArrowLeft size={14} />
              Back to Blog
            </Link>
          </div>
        </div>

        <article className="mx-auto max-w-3xl px-4 py-10">
          {/* Category badge */}
          <div className="mb-4">
            <span className="rounded-full bg-success-100 px-3 py-1 text-xs font-bold text-success-700">
              {post.category.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
            </span>
          </div>

          {/* Title */}
          <h1 className="text-3xl font-bold leading-tight text-slate-900 md:text-4xl">
            {post.title}
          </h1>

          {/* Meta row */}
          <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-slate-500">
            <span className="flex items-center gap-1.5">
              <User size={14} />
              {post.author}
            </span>
            {post.publishedAt && (
              <span className="flex items-center gap-1.5">
                <Calendar size={14} />
                {new Date(post.publishedAt).toLocaleDateString('en-NG', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </span>
            )}
          </div>

          {/* Cover image */}
          {post.coverImage && (
            <div className="mt-8 overflow-hidden rounded-xl">
              <img
                src={post.coverImage}
                alt={post.title}
                className="w-full object-cover"
              />
            </div>
          )}

          {/* Excerpt highlight */}
          {post.excerpt && (
            <p className="mt-8 border-l-4 border-success-400 pl-4 text-lg italic text-slate-600">
              {post.excerpt}
            </p>
          )}

          {/* Content, render as simple HTML paragraphs */}
          <div className="prose prose-slate mt-8 max-w-none prose-headings:text-slate-900 prose-a:text-success-700 prose-a:no-underline hover:prose-a:underline">
            {post.content.split('\n').map((paragraph, i) => {
              const trimmed = paragraph.trim();
              if (!trimmed) return null;

              if (trimmed.startsWith('### ')) {
                return <h3 key={i}>{trimmed.slice(4)}</h3>;
              }
              if (trimmed.startsWith('## ')) {
                return <h2 key={i}>{trimmed.slice(3)}</h2>;
              }
              if (trimmed.startsWith('# ')) {
                return <h1 key={i}>{trimmed.slice(2)}</h1>;
              }
              if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
                return (
                  <ul key={i} className="list-disc pl-5">
                    <li>{trimmed.slice(2)}</li>
                  </ul>
                );
              }
              return <p key={i}>{trimmed}</p>;
            })}
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className="mt-10 flex flex-wrap items-center gap-2 border-t pt-6">
              <Tag size={14} className="text-slate-400" />
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* CTA */}
          <div className="mt-10 rounded-xl border border-success-200 bg-success-50 p-6 text-center">
            <h3 className="text-lg font-bold text-slate-900">
              Ready to track your payments?
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              CashTraka helps Nigerian businesses and landlords stay on top of every naira.
            </p>
            <Link
              href="/signup"
              className="btn-primary mt-4 inline-flex text-sm"
            >
              Start free today
            </Link>
          </div>
        </article>
      </main>
      <Footer />
    </>
  );
}
