import { Navbar } from './Navbar';
import { Footer } from './Footer';

type Props = {
  title: string;
  updated?: string;
  children: React.ReactNode;
};

export function LegalLayout({ title, updated, children }: Props) {
  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Navbar />
      <main className="container-app py-12 md:py-16">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-3xl font-black tracking-tight md:text-4xl">{title}</h1>
          {updated && (
            <p className="mt-2 text-sm text-slate-500">Last updated: {updated}</p>
          )}
          <div className="mt-6 space-y-4 text-slate-700 leading-relaxed">{children}</div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
