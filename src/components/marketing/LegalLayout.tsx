import { Navbar } from './Navbar';
import { Footer } from './Footer';

type Props = {
  title: string;
  updated?: string;
  intro?: string;
  children: React.ReactNode;
};

/**
 * Shared layout for legal pages (Privacy, Terms). Applies consistent
 * typography to every descendant element — headings, paragraphs, lists —
 * so each page author can just write semantic HTML without re-specifying
 * classes on every tag.
 *
 * The tailwind classes in the wrapper target the plain HTML (`[&_h2]:...`)
 * so children stay clean:
 *
 *   <LegalLayout title="...">
 *     <h2>1. Introduction</h2>
 *     <p>...</p>
 *     <ul><li>...</li></ul>
 *   </LegalLayout>
 */
export function LegalLayout({ title, updated, intro, children }: Props) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />
      <main className="container-app py-12 md:py-16">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">{title}</h1>
          {updated && (
            <p className="mt-2 text-sm text-slate-500">Effective date: {updated}</p>
          )}
          {intro && (
            <p className="mt-6 rounded-xl border border-border bg-slate-50 p-4 text-sm text-slate-700">
              {intro}
            </p>
          )}
          <div
            className={[
              'mt-8 space-y-5 text-slate-700 leading-relaxed',
              '[&_h2]:mt-10 [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-ink',
              '[&_h2]:border-b [&_h2]:border-border [&_h2]:pb-2',
              '[&_h3]:mt-5 [&_h3]:mb-1 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink',
              '[&_p]:my-3',
              '[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1',
              '[&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:space-y-1',
              '[&_a]:text-brand-700 [&_a]:underline hover:[&_a]:text-brand-800',
              '[&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm',
              '[&_strong]:font-semibold [&_strong]:text-ink',
            ].join(' ')}
          >
            {children}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
