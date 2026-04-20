import Link from 'next/link';
import { FileText, ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { Navbar } from '@/components/marketing/Navbar';
import { Footer } from '@/components/marketing/Footer';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Blog | CashTraka',
  description: 'Tips, guides, and product updates for Nigerian small businesses and landlords.',
};

export default async function BlogPage() {
  const posts = await prisma.blogPost.findMany({
    where: { status: 'published' },
    orderBy: { publishedAt: 'desc' },
    take: 30,
  });

  const categories = [...new Set(posts.map((p) => p.category))];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white">
        {/* Hero */}
        <div className="bg-gradient-to-b from-slate-50 to-white border-b">
          <div className="mx-auto max-w-5xl px-4 py-16 text-center">
            <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">CashTraka Blog</h1>
            <p className="mt-3 text-lg text-slate-600">
              Tips, guides, and product updates for Nigerian small businesses and landlords.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-5xl px-4 py-12">
          {posts.length === 0 ? (
            <div className="py-20 text-center">
              <FileText size={40} className="mx-auto mb-4 text-slate-300" />
              <h2 className="text-lg font-semibold text-slate-700">Coming Soon</h2>
              <p className="mt-1 text-sm text-slate-500">
                We are working on some great content. Check back soon.
              </p>
            </div>
          ) : (
            <>
              {/* Category filters */}
              {categories.length > 1 && (
                <div className="mb-8 flex flex-wrap gap-2">
                  {categories.map((cat) => (
                    <span key={cat} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                      {cat.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                    </span>
                  ))}
                </div>
              )}

              {/* Posts grid */}
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {posts.map((post) => (
                  <Link
                    key={post.id}
                    href={'/blog/' + post.slug}
                    className="group rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm hover:shadow-md transition"
                  >
                    {post.coverImage && (
                      <div className="aspect-video overflow-hidden bg-slate-100">
                        <img
                          src={post.coverImage}
                          alt={post.title}
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="rounded-full bg-success-100 px-2 py-0.5 text-[10px] font-bold text-success-700">
                          {post.category.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                        </span>
                        {post.publishedAt && (
                          <span className="text-[11px] text-slate-400">
                            {new Date(post.publishedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <h2 className="text-base font-bold text-slate-900 group-hover:text-success-700 transition line-clamp-2">
                        {post.title}
                      </h2>
                      <p className="mt-2 text-sm text-slate-600 line-clamp-3">{post.excerpt}</p>
                      <div className="mt-3 flex items-center gap-1 text-xs font-semibold text-success-600">
                        Read more <ArrowRight size={12} />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
