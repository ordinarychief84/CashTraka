'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Eye,
  EyeOff,
  FileText,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Globe,
  Clock,
} from 'lucide-react';

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string | null;
  author: string;
  status: string;
  category: string;
  tags: string;
  publishedAt: string | null;
  createdAt: string;
};

const CATEGORIES = ['general', 'tips', 'product-updates', 'case-studies', 'guides'];

export function BlogManager() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const loadPosts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/blog');
      const data = await res.json();
      if (res.ok) setPosts(data.posts || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadPosts(); }, [loadPosts]);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  function openNew() {
    setEditingPost(null);
    setView('form');
  }

  function openEdit(post: Post) {
    setEditingPost(post);
    setView('form');
  }

  async function toggleStatus(post: Post) {
    const newStatus = post.status === 'published' ? 'draft' : 'published';
    try {
      const res = await fetch('/api/admin/blog/' + post.id, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setMsg({ ok: true, text: newStatus === 'published' ? 'Post published' : 'Post unpublished' });
        await loadPosts();
      }
    } catch {
      setMsg({ ok: false, text: 'Failed to update status' });
    }
  }

  async function deletePost(id: string) {
    if (!confirm('Delete this blog post? This cannot be undone.')) return;
    try {
      const res = await fetch('/api/admin/blog/' + id, { method: 'DELETE' });
      if (res.ok) {
        setMsg({ ok: true, text: 'Post deleted' });
        await loadPosts();
      }
    } catch {
      setMsg({ ok: false, text: 'Failed to delete' });
    }
  }

  if (view === 'form') {
    return (
      <BlogForm
        post={editingPost}
        onBack={() => { setView('list'); void loadPosts(); }}
        onSuccess={(text) => { setMsg({ ok: true, text }); setView('list'); void loadPosts(); }}
      />
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Blog</h1>
          <p className="text-sm text-slate-500">Create and manage blog posts</p>
        </div>
        <button onClick={openNew} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700">
          <Plus size={16} />
          New Post
        </button>
      </div>

      {msg && (
        <div className={'mb-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ' + (msg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700')}>
          {msg.ok ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
          {msg.text}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-500">Loading posts...</div>
      ) : posts.length === 0 ? (
        <div className="rounded-xl border bg-white py-16 text-center">
          <FileText size={32} className="mx-auto mb-3 text-slate-300" />
          <p className="text-sm font-medium text-slate-700">No blog posts yet</p>
          <p className="text-xs text-slate-500 mt-1">Create your first post to get started.</p>
          <button onClick={openNew} className="mt-4 inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700">
            <Plus size={16} />
            Create Post
          </button>
        </div>
      ) : (
        <div className="rounded-xl border bg-white shadow-sm divide-y">
          {posts.map((post) => (
            <div key={post.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-900 truncate">{post.title}</span>
                  <span className={'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ' +
                    (post.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                    {post.status === 'published' ? <Globe size={10} /> : <Clock size={10} />}
                    {post.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate">
                  {post.category} &middot; by {post.author} &middot; {new Date(post.createdAt).toLocaleDateString('en-NG')}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => toggleStatus(post)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" title={post.status === 'published' ? 'Unpublish' : 'Publish'}>
                  {post.status === 'published' ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button onClick={() => openEdit(post)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-blue-600" title="Edit">
                  <Edit3 size={16} />
                </button>
                <button onClick={() => deletePost(post.id)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-red-600" title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* --- Blog Form (Create / Edit) --- */

function BlogForm({
  post,
  onBack,
  onSuccess,
}: {
  post: Post | null;
  onBack: () => void;
  onSuccess: (text: string) => void;
}) {
  const isEdit = !!post;
  const [title, setTitle] = useState(post?.title || '');
  const [content, setContent] = useState(post?.content || '');
  const [excerpt, setExcerpt] = useState(post?.excerpt || '');
  const [coverImage, setCoverImage] = useState(post?.coverImage || '');
  const [author, setAuthor] = useState(post?.author || 'CashTraka Team');
  const [category, setCategory] = useState(post?.category || 'general');
  const [tags, setTags] = useState(post?.tags || '');
  const [status, setStatus] = useState(post?.status || 'draft');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = { title, content, excerpt, coverImage, author, category, tags, status };
      const url = isEdit ? '/api/admin/blog/' + post.id : '/api/admin/blog';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || 'Failed to save');
      }
      onSuccess(isEdit ? 'Post updated' : 'Post created');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button onClick={onBack} className="mb-4 inline-flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700">
        <ArrowLeft size={14} />
        Back to posts
      </button>

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-base font-bold text-slate-900">{isEdit ? 'Edit Post' : 'New Post'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Title</label>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Blog post title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Excerpt</label>
            <textarea
              rows={2}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none resize-y"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="Short summary shown on the blog listing page..."
              maxLength={300}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Content</label>
            <textarea
              rows={14}
              className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-mono focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none resize-y"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your blog post content here... (supports Markdown)"
              required
            />
            <p className="mt-1 text-xs text-slate-400">Supports Markdown formatting</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Category</label>
              <select
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Tags</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. payments, tips, invoicing"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Author</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Author name"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Cover Image URL</label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm focus:border-green-500 focus:ring-1 focus:ring-green-500 focus:outline-none"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status</label>
            <div className="flex gap-3">
              <label className={'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium cursor-pointer ' + (status === 'draft' ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 text-slate-600')}>
                <input type="radio" name="status" value="draft" checked={status === 'draft'} onChange={() => setStatus('draft')} className="sr-only" />
                <Clock size={14} />
                Draft
              </label>
              <label className={'flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium cursor-pointer ' + (status === 'published' ? 'border-green-400 bg-green-50 text-green-700' : 'border-slate-200 text-slate-600')}>
                <input type="radio" name="status" value="published" checked={status === 'published'} onChange={() => setStatus('published')} className="sr-only" />
                <Globe size={14} />
                Published
              </label>
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle size={15} />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-4">
            <button type="button" onClick={onBack} className="rounded-lg px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50">
              {saving ? 'Saving...' : isEdit ? 'Update Post' : 'Create Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
