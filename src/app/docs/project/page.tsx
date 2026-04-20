import { promises as fs } from 'fs';
import path from 'path';
import { marked } from 'marked';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

export const dynamic = 'force-static';
export const metadata = { title: 'PROJECT.md · CashTraka' };

/**
 * Renders the PROJECT.md reference document as a styled HTML page at
 * /docs/project. Reads the file at build/request time and converts it
 * with `marked`. Styling is inline since Tailwind Typography isn't
 * installed — we hand-roll readable defaults that work with the brand
 * palette.
 */
export default async function ProjectDocPage() {
  const filePath = path.join(process.cwd(), 'PROJECT.md');
  const raw = await fs.readFile(filePath, 'utf-8');
  const html = marked.parse(raw, { async: false }) as string;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-5">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-ink"
          >
            <ArrowLeft size={15} />
            Home
          </Link>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
            <FileText size={14} className="text-brand-600" />
            PROJECT.md
          </div>
        </div>
      </header>

      {/* Article */}
      <article
        className="docs-body mx-auto max-w-3xl px-5 py-10 md:py-14"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Scoped typography */}
      <style>{`
        .docs-body {
          color: #334155;
          font-size: 15px;
          line-height: 1.7;
        }
        .docs-body h1 {
          font-size: 2.25rem;
          font-weight: 900;
          color: #0f172a;
          letter-spacing: -0.02em;
          margin: 0 0 1rem;
          line-height: 1.15;
        }
        .docs-body h2 {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.01em;
          margin: 2.5rem 0 1rem;
          padding-bottom: 0.5rem;
          border-bottom: 1px solid #e2e8f0;
        }
        .docs-body h3 {
          font-size: 1.125rem;
          font-weight: 700;
          color: #0f172a;
          margin: 2rem 0 0.75rem;
        }
        .docs-body h4 {
          font-size: 1rem;
          font-weight: 700;
          color: #0f172a;
          margin: 1.5rem 0 0.5rem;
        }
        .docs-body p { margin: 0 0 1rem; }
        .docs-body ul,
        .docs-body ol {
          margin: 0 0 1rem;
          padding-left: 1.5rem;
        }
        .docs-body li { margin: 0.25rem 0; }
        .docs-body li > ul,
        .docs-body li > ol { margin: 0.25rem 0 0.5rem; }
        .docs-body a {
          color: #009BC6;
          text-decoration: underline;
          text-decoration-color: rgba(0, 184, 232, 0.35);
          text-underline-offset: 2px;
          transition: text-decoration-color .2s;
        }
        .docs-body a:hover { text-decoration-color: #00B8E8; }
        .docs-body strong {
          color: #0f172a;
          font-weight: 700;
        }
        .docs-body code {
          background: #f1f5f9;
          color: #0f172a;
          padding: 0.1rem 0.4rem;
          border-radius: 6px;
          font-size: 0.85em;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          border: 1px solid #e2e8f0;
        }
        .docs-body pre {
          background: #0f172a;
          color: #e2e8f0;
          padding: 1rem 1.25rem;
          border-radius: 12px;
          overflow-x: auto;
          font-size: 0.82rem;
          line-height: 1.55;
          margin: 1rem 0 1.5rem;
        }
        .docs-body pre code {
          background: transparent;
          border: none;
          color: inherit;
          padding: 0;
          font-size: inherit;
        }
        .docs-body table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0 1.5rem;
          font-size: 0.9rem;
        }
        .docs-body thead {
          background: #f8fafc;
        }
        .docs-body th,
        .docs-body td {
          padding: 0.55rem 0.75rem;
          border: 1px solid #e2e8f0;
          text-align: left;
          vertical-align: top;
        }
        .docs-body th {
          font-weight: 700;
          color: #0f172a;
          font-size: 0.8rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .docs-body blockquote {
          border-left: 3px solid #00B8E8;
          padding: 0.1rem 0 0.1rem 1rem;
          margin: 1rem 0;
          color: #475569;
          background: linear-gradient(90deg, rgba(0, 184, 232, 0.06), transparent);
        }
        .docs-body blockquote p { margin: 0.5rem 0; }
        .docs-body hr {
          border: none;
          border-top: 1px solid #e2e8f0;
          margin: 2.5rem 0;
        }
        .docs-body input[type="checkbox"] {
          margin-right: 0.35rem;
          accent-color: #00B8E8;
        }
      `}</style>
    </div>
  );
}
